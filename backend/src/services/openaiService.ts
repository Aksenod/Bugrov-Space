import { fetch } from 'undici';
import { Buffer } from 'node:buffer';
import { env } from '../env';
import { logger } from '../utils/logger';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-5.1';
// Максимальный размер содержимого файла для включения в промпт (в символах)
const MAX_FILE_CONTENT_SIZE = 50000; // ~50KB текста

export type ConversationMessage = {
  role: 'USER' | 'MODEL';
  text: string;
};

type AgentFile = {
  name: string;
  mimeType: string;
  content: string;
};

type AgentWithFiles = {
  id: string;
  name: string;
  systemInstruction: string | null;
  summaryInstruction: string | null;
  model: string | null;
  files: AgentFile[];
};

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function ensureApiKey() {
  if (!env.openAiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server');
  }
  return env.openAiApiKey;
}

/**
 * Декодирует base64 строку в текст.
 * Обрабатывает ошибки и возвращает исходную строку, если декодирование не удалось.
 */
function decodeBase64ToText(base64String: string): string {
  try {
    const buffer = Buffer.from(base64String, 'base64');
    return buffer.toString('utf-8');
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to decode base64 content');
    return base64String;
  }
}

/**
 * Обрабатывает содержимое файла для использования в системном промпте.
 * Декодирует base64 в текст и ограничивает размер содержимого.
 * Теперь поддерживаются только текстовые файлы (.txt, .md).
 */
function processFileContent(file: AgentFile): string | null {
  try {
    const decodedContent = decodeBase64ToText(file.content);
    
    // Ограничиваем размер содержимого
    if (decodedContent.length > MAX_FILE_CONTENT_SIZE) {
      return decodedContent.substring(0, MAX_FILE_CONTENT_SIZE) + 
             `\n\n[Содержимое обрезано. Файл слишком большой (${decodedContent.length} символов). Показаны первые ${MAX_FILE_CONTENT_SIZE} символов.]`;
    }
    
    return decodedContent;
  } catch (error) {
    logger.warn({ fileName: file.name, error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to process file');
    return `[Ошибка обработки файла ${file.name}]`;
  }
}

function buildSystemPrompt(agent: AgentWithFiles) {
  const intro = `Ты выступаешь как агент "${agent.name}". ${agent.systemInstruction || ''}`.trim();

  // Логирование для диагностики
  logger.debug({
    agentId: agent.id,
    agentName: agent.name,
    totalFiles: agent.files.length,
    fileNames: agent.files.map(f => f.name),
  }, 'Building system prompt');

  // Обрабатываем все файлы (теперь поддерживаются только текстовые .txt, .md)
  const processedFiles = agent.files
    .map((file) => {
      const content = processFileContent(file);
      return content !== null ? { file, content } : null;
    })
    .filter((item): item is { file: AgentFile; content: string } => item !== null);

  logger.debug({
    agentId: agent.id,
    processedFilesCount: processedFiles.length,
    processedFileNames: processedFiles.map(f => f.file.name),
  }, 'Processed files for system prompt');

  const fileContext =
    processedFiles.length > 0
      ? `Вот контекст из документов проекта:\n${processedFiles
          .map(
            ({ file, content }) =>
              `---\nНазвание: ${file.name}\nТип: ${file.mimeType}\nСодержимое:\n${content}\n---`,
          )
          .join('\n')}`
      : 'Контекстных документов нет. Отвечай, исходя из своей инструкции.';

  return `${intro}\n\n${fileContext}`;
}

function mapHistory(history: ConversationMessage[]): ChatMessage[] {
  return history.map((message) => ({
    role: message.role === 'USER' ? 'user' : 'assistant',
    content: message.text,
  }));
}

async function callOpenAi(model: string, messages: ChatMessage[]) {
  const apiKey = ensureApiKey();
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data: any = await response.json();
      detail = data?.error?.message ?? JSON.stringify(data);
    } catch {
      // ignore
    }
    throw new Error(`OpenAI API error: ${detail}`);
  }

  return response.json();
}

function extractMessageText(payload: any) {
  return payload?.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function generateAgentResponse(
  agent: AgentWithFiles,
  history: ConversationMessage[],
  newMessage: string,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(agent);
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...mapHistory(history),
    { role: 'user', content: newMessage },
  ];

  const completion = await callOpenAi(agent.model ?? DEFAULT_MODEL, messages);
  const text = extractMessageText(completion);

  if (!text) {
    throw new Error('OpenAI did not return any content');
  }

  return text;
}

export async function generateSummaryContent(
  agent: Pick<AgentWithFiles, 'name' | 'summaryInstruction' | 'model'>,
  transcript: string,
): Promise<string> {
  const instruction =
    agent.summaryInstruction?.trim().length
      ? agent.summaryInstruction
      : 'Сформируй краткое содержательное резюме беседы, выдели ключевые решения и задачи.';

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты создаешь структурированные отчеты для агента "${agent.name}".`,
    },
    {
      role: 'user',
      content: `${instruction}\n\nДиалог:\n${transcript}`,
    },
  ];

  const completion = await callOpenAi(agent.model ?? DEFAULT_MODEL, messages);
  const text = extractMessageText(completion);

  if (!text) {
    throw new Error('OpenAI did not return any content');
  }

  return text;
}

export async function generateDocumentResult(
  agent: Pick<AgentWithFiles, 'name' | 'systemInstruction' | 'model' | 'files'> & { id?: string; summaryInstruction?: string | null },
  documentContent: string,
  role: 'dsl' | 'verstka',
): Promise<string> {
  const agentWithFiles: AgentWithFiles = {
    id: agent.id || '',
    name: agent.name,
    systemInstruction: agent.systemInstruction || '',
    summaryInstruction: agent.summaryInstruction || null,
    model: agent.model || null,
    files: agent.files,
  };
  const systemPrompt = buildSystemPrompt(agentWithFiles);
  
  const roleInstruction = role === 'dsl' 
    ? 'Преобразуй предоставленный контент в DSL формат согласно твоей инструкции.'
    : 'Преобразуй предоставленный контент в формат верстки согласно твоей инструкции.';

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${systemPrompt}\n\n${roleInstruction}`,
    },
    {
      role: 'user',
      content: `Вот контент документа для обработки:\n\n${documentContent}`,
    },
  ];

  const completion = await callOpenAi(agent.model ?? DEFAULT_MODEL, messages);
  const text = extractMessageText(completion);

  if (!text) {
    throw new Error('OpenAI did not return any content');
  }

  return text;
}


