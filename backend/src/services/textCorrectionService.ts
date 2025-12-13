import { fetch } from 'undici';
import { env } from '../env';
import { logger } from '../utils/logger';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-5-mini';

function ensureApiKey() {
  if (!env.openAiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server');
  }
  return env.openAiApiKey.trim();
}

/**
 * Исправляет расстановку знаков препинания в тексте с помощью OpenAI GPT
 * @param text - исходный текст для исправления
 * @param model - модель GPT для использования (по умолчанию gpt-5-mini)
 * @returns исправленный текст
 */
export async function correctText(text: string, model: string = DEFAULT_MODEL): Promise<string> {
  if (!text || !text.trim()) {
    throw new Error('Текст для исправления не может быть пустым');
  }

  const apiKey = ensureApiKey();

  const systemPrompt = `Ты помощник для исправления текста. Твоя задача - исправить расстановку знаков препинания в тексте, сохранив смысл и стиль автора.

Правила:
1. Исправь только знаки препинания (точки, запятые, тире, двоеточия, точки с запятой, кавычки и т.д.)
2. Сохрани все слова и их порядок без изменений
3. Сохрани стиль и тон текста
4. Не добавляй комментарии или объяснения
5. Верни ТОЛЬКО исправленный текст, без дополнительных пояснений

Если текст уже правильно оформлен, верни его без изменений.`;

  const userPrompt = `Исправь расстановку знаков препинания в следующем тексте:\n\n${text}`;

  logger.info({
    textLength: text.length,
    model,
  }, 'Correcting text punctuation with GPT');

  try {
    const requestBody = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Низкая температура для более детерминированного результата
      max_tokens: Math.max(1000, text.length * 2), // Достаточно токенов для исправленного текста
    };

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

      try {
        const errorData = await response.json() as { error?: { message?: string; code?: string } } | null;
        errorDetail = errorData?.error?.message ?? errorData?.error?.code ?? JSON.stringify(errorData);
      } catch (parseError) {
        try {
          const text = await response.text();
          errorDetail = text || statusText;
        } catch {
          // ignore
        }
      }

      logger.error({
        status,
        statusText,
        errorDetail,
        model,
        textLength: text.length,
      }, 'Text correction API request failed');

      throw new Error(`Text correction API error: ${errorDetail}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };

    const correctedText = data.choices?.[0]?.message?.content?.trim() || text;

    logger.info({
      originalLength: text.length,
      correctedLength: correctedText.length,
      model,
    }, 'Text corrected successfully');

    return correctedText;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      textLength: text.length,
      model,
    }, 'Failed to correct text');

    // В случае ошибки возвращаем оригинальный текст
    logger.warn('Returning original text due to correction error');
    return text;
  }
}

