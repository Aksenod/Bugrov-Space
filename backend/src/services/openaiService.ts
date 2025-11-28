import { fetch } from 'undici';
import { Buffer } from 'node:buffer';
import { env } from '../env';
import { logger } from '../utils/logger';
import { getGlobalPromptText } from './globalPromptService';

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
  const apiKey = env.openAiApiKey.trim();
  // Логируем только если ключ очень короткий (возможная ошибка)
  if (apiKey.length < 10) {
    logger.warn({ keyLength: apiKey.length }, 'OpenAI API key seems very short');
  }
  return apiKey;
}

/**
 * Декодирует base64 строку в текст.
 * Обрабатывает ошибки и возвращает исходную строку, если декодирование не удалось.
 */
export function decodeBase64ToText(base64String: string): string {
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

async function buildSystemPrompt(agent: AgentWithFiles) {
  const [globalPrompt] = await Promise.all([getGlobalPromptText()]);
  const globalPromptText = globalPrompt.trim();
  const agentInstruction = (agent.systemInstruction || '').trim();

  const introParts = [`Ты выступаешь как агент "${agent.name}".`];

  if (globalPromptText) {
    introParts.push(`Глобальная инструкция (общая для всех агентов):\n${globalPromptText}`);
  }

  if (agentInstruction) {
    introParts.push(agentInstruction);
  }

  const intro = introParts.join('\n\n').trim();

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
      ? `Вот контекст из базы знаний и документов проекта:\n${processedFiles
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

// Функция для нормализации имени модели (приводит к формату API OpenAI)
function normalizeModelName(model: string | null | undefined): string {
  if (!model) {
    return DEFAULT_MODEL;
  }

  const normalized = model.trim().toLowerCase();

  // Маппинг различных вариантов написания моделей
  const modelMap: Record<string, string> = {
    'gpt-5.1': 'gpt-5.1',
    'gpt5.1': 'gpt-5.1',
    'gpt 5.1': 'gpt-5.1',
    // gpt-5-mini - попробуем простое имя без даты
    'gpt-5-mini': 'gpt-5-mini',
    'gpt5-mini': 'gpt-5-mini',
    'gpt-5mini': 'gpt-5-mini',
    'gpt5mini': 'gpt-5-mini',
    'gpt-5 mini': 'gpt-5-mini',
    'gpt 5 mini': 'gpt-5-mini',
    'gpt-4o': 'gpt-4o',
    'gpt4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
    'gpt4o-mini': 'gpt-4o-mini',
  };

  // Если есть точное совпадение в маппинге, используем его
  if (modelMap[normalized]) {
    return modelMap[normalized];
  }

  // Если модель уже в правильном формате (начинается с gpt-), возвращаем как есть
  if (normalized.startsWith('gpt-')) {
    return normalized;
  }

  // Если модель не распознана, логируем и возвращаем дефолтную модель
  logger.warn({
    originalModel: model,
    normalized,
    availableModels: Object.keys(modelMap)
  }, 'Unknown model format, using default');
  return DEFAULT_MODEL;
}

async function callOpenAi(model: string, messages: ChatMessage[]) {
  const apiKey = ensureApiKey();
  const modelToUse = normalizeModelName(model);
  const requestBody = {
    model: modelToUse,
    messages,
    temperature: 0.7,
  };

  logger.info({
    originalModel: model,
    normalizedModel: modelToUse,
    messagesCount: messages.length,
    apiKeyPrefix: apiKey.substring(0, 7) + '...',
  }, 'Sending request to OpenAI API');

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const status = response.status;
    const statusText = response.statusText;
    let errorDetail = statusText;
    let errorData: any = null;

    try {
      errorData = await response.json();
      errorDetail = errorData?.error?.message ?? errorData?.error?.code ?? JSON.stringify(errorData);
    } catch (parseError) {
      // Если не удалось распарсить JSON, пробуем получить текст
      try {
        const text = await response.text();
        errorDetail = text || statusText;
      } catch {
        // ignore
      }
    }

    // Детальное логирование ошибки
    logger.error({
      status,
      statusText,
      errorDetail,
      errorData,
      model: requestBody.model,
      apiKeyPrefix: apiKey.substring(0, 7) + '...',
    }, 'OpenAI API request failed');

    throw new Error(`OpenAI API error: ${errorDetail}`);
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
  const systemPrompt = await buildSystemPrompt(agent);
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...mapHistory(history),
    { role: 'user', content: newMessage },
  ];

  const modelToUse = agent.model ?? DEFAULT_MODEL;
  logger.info({
    agentId: agent.id,
    agentName: agent.name,
    modelFromAgent: agent.model,
    modelType: typeof agent.model,
    modelToUse,
    defaultModel: DEFAULT_MODEL,
  }, 'Generating agent response with model');

  const completion = await callOpenAi(modelToUse, messages);
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
  // Извлекаем последнее сообщение MODEL из транскрипта
  const modelMessages = transcript.split('\n\n').filter(msg => msg.startsWith('MODEL:'));
  const lastModelMessage = modelMessages.length > 0
    ? modelMessages[modelMessages.length - 1].replace(/^MODEL:\s*/, '')
    : null;

  const instruction =
    agent.summaryInstruction?.trim().length
      ? agent.summaryInstruction
      : 'Сформируй краткое содержательное резюме беседы, выдели ключевые решения и задачи. Используй markdown разметку для форматирования: заголовки (# ## ###), списки (- *), жирный текст (**текст**), курсив (*текст*).';

  // Улучшенный системный промпт для сохранения исходной разметки
  const systemPrompt = `Ты создаешь структурированные отчеты в формате Markdown для агента "${agent.name}". 

ВАЖНО: Если в последнем сообщении агента уже есть markdown разметка (заголовки, списки, жирный текст, курсив и т.д.), сохрани её ТОЧНО как есть, без изменений. Не переформулируй текст, не меняй структуру, не добавляй и не удаляй элементы разметки. Просто используй исходный текст с сохранением всей форматирования.

Если разметки нет или нужно создать резюме из всего диалога, используй markdown разметку для форматирования: заголовки (# ## ###), списки (- *), жирный текст (**текст**), курсив (*текст*), блоки кода (\`код\`).`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
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
  const systemPrompt = await buildSystemPrompt(agentWithFiles);

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


