import { fetch } from 'undici';
import { env } from '../env';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-5.1';

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

function buildSystemPrompt(agent: AgentWithFiles) {
  const intro = `Ты выступаешь как агент "${agent.name}". ${agent.systemInstruction || ''}`.trim();

  const fileContext =
    agent.files.length > 0
      ? `Вот контекст из документов проекта:\n${agent.files
          .map(
            (file: AgentFile) =>
              `---\nНазвание: ${file.name}\nТип: ${file.mimeType}\nСодержимое:\n${file.content}\n---`,
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


