import { fetch, FormData, File } from 'undici';
import { env } from '../env';
import { logger } from '../utils/logger';

const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB - лимит Whisper API
const SUPPORTED_FORMATS = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'];

function ensureApiKey() {
  if (!env.openAiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server');
  }
  return env.openAiApiKey.trim();
}

/**
 * Определяет формат файла по MIME типу или расширению
 */
function getFileFormat(mimeType: string, filename?: string): string {
  // Пытаемся определить формат по MIME типу
  const mimeToFormat: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp4': 'mp4',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/x-m4a': 'm4a',
    'audio/m4a': 'm4a',
  };

  const formatFromMime = mimeToFormat[mimeType.toLowerCase()];
  if (formatFromMime) {
    return formatFromMime;
  }

  // Если не нашли по MIME, пытаемся по расширению файла
  if (filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (extension && SUPPORTED_FORMATS.includes(extension)) {
      return extension;
    }
  }

  // По умолчанию используем webm (наиболее распространенный формат для браузерной записи)
  return 'webm';
}

/**
 * Транскрибирует аудио файл в текст с помощью OpenAI Whisper API
 * @param audioBuffer - буфер с аудио данными
 * @param mimeType - MIME тип аудио файла
 * @param filename - опциональное имя файла для определения формата
 * @returns распознанный текст
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<string> {
  // Проверка размера файла
  if (audioBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`Файл слишком большой. Максимальный размер: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  if (audioBuffer.length === 0) {
    throw new Error('Аудио файл пуст');
  }

  const apiKey = ensureApiKey();
  const format = getFileFormat(mimeType, filename);

  logger.info({
    fileSize: audioBuffer.length,
    mimeType,
    format,
    filename: filename || 'unknown',
  }, 'Transcribing audio with Whisper API');

  // Создаем FormData для отправки файла используя undici
  const formData = new FormData();
  const audioFile = new File([audioBuffer], filename || `audio.${format}`, { type: mimeType });
  formData.append('file', audioFile);
  formData.append('model', 'whisper-1');
  formData.append('language', 'ru'); // Указываем русский язык для лучшего распознавания

  try {
    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const status = response.status;
      const statusText = response.statusText;
      let errorDetail = statusText;

      try {
        const errorData = await response.json();
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
        fileSize: audioBuffer.length,
        format,
      }, 'Whisper API request failed');

      throw new Error(`Whisper API error: ${errorDetail}`);
    }

    const data = await response.json() as { text: string };
    const transcribedText = data.text?.trim() || '';

    logger.info({
      textLength: transcribedText.length,
      format,
    }, 'Audio transcribed successfully');

    return transcribedText;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      fileSize: audioBuffer.length,
      format,
    }, 'Failed to transcribe audio');

    throw error;
  }
}

