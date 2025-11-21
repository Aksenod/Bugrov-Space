import { fetch } from 'undici';
import { Buffer } from 'node:buffer';
import { env } from '../env';

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
    console.warn('Failed to decode base64 content:', error);
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
    console.warn(`Failed to process file ${file.name}:`, error);
    return `[Ошибка обработки файла ${file.name}]`;
  }
}

function buildSystemPrompt(agent: AgentWithFiles) {
  const intro = `Ты выступаешь как агент "${agent.name}". ${agent.systemInstruction || ''}`.trim();

  // Логирование для диагностики
  console.log(`[buildSystemPrompt] Agent: ${agent.name} (${agent.id})`);
  console.log(`[buildSystemPrompt] Total files: ${agent.files.length}`);
  console.log(`[buildSystemPrompt] File names:`, agent.files.map(f => f.name));

  // Обрабатываем все файлы (теперь поддерживаются только текстовые .txt, .md)
  const processedFiles = agent.files
    .map((file) => {
      const content = processFileContent(file);
      return content !== null ? { file, content } : null;
    })
    .filter((item): item is { file: AgentFile; content: string } => item !== null);

  console.log(`[buildSystemPrompt] Processed files: ${processedFiles.length}`);
  console.log(`[buildSystemPrompt] Processed file names:`, processedFiles.map(f => f.file.name));

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


