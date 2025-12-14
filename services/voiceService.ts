import { getToken } from './apiHelpers';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'https://bugrov-space.onrender.com/api').replace(/\/$/, '');

const getHeaders = (custom: Record<string, string> = {}) => {
  const headers: Record<string, string> = { ...custom };
  if (!(custom['Content-Type'])) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Конвертирует Blob в base64 строку
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Убираем префикс data:audio/...;base64,
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Транскрибирует аудио файл в текст
 * @param audioBlob - Blob с аудио данными
 * @returns распознанный текст
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    // Конвертируем Blob в base64
    const base64Audio = await blobToBase64(audioBlob);
    
    // Определяем MIME тип
    const mimeType = audioBlob.type || 'audio/webm';
    
    // Определяем имя файла
    const extension = mimeType.split('/')[1] || 'webm';
    const filename = `audio.${extension}`;

    const response = await fetch(`${API_BASE_URL}/agents/voice/transcribe`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        audio: base64Audio,
        mimeType,
        filename,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Ошибка при распознавании речи';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json() as { text: string };
    return data.text;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Неизвестная ошибка при распознавании речи');
  }
}

/**
 * Исправляет расстановку знаков препинания в тексте
 * @param text - исходный текст
 * @returns объект с оригинальным и исправленным текстом
 */
export async function correctText(text: string): Promise<{ originalText: string; correctedText: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/agents/voice/correct`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Ошибка при исправлении текста';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json() as { originalText: string; correctedText: string };
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Неизвестная ошибка при исправлении текста');
  }
}

