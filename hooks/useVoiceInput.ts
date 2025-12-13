import { useState, useRef, useCallback } from 'react';
import { transcribeAudio, correctText } from '../services/voiceService';

interface UseVoiceInputReturn {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
}

/**
 * Хук для управления голосовым вводом
 * Обрабатывает запись аудио, транскрибацию и исправление текста
 */
export function useVoiceInput(
  onTextReady: (originalText: string, correctedText: string) => void,
  onError?: (error: string) => void
): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Начинает запись аудио
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordingDuration(0);
      audioChunksRef.current = [];

      // Запрашиваем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Определяем поддерживаемый формат
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      // Создаем MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });
      mediaRecorderRef.current = mediaRecorder;

      // Собираем аудио чанки
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Обрабатываем окончание записи
      mediaRecorder.onstop = async () => {
        try {
          setIsProcessing(true);

          // Создаем Blob из собранных чанков
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          // Транскрибируем аудио
          const transcribedText = await transcribeAudio(audioBlob);

          if (!transcribedText || !transcribedText.trim()) {
            throw new Error('Не удалось распознать речь. Попробуйте говорить четче.');
          }

          // Исправляем пунктуацию
          const { originalText, correctedText } = await correctText(transcribedText);

          // Вызываем callback с результатами
          onTextReady(originalText, correctedText);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Ошибка при обработке аудио';
          setError(errorMessage);
          if (onError) {
            onError(errorMessage);
          }
        } finally {
          setIsProcessing(false);
        }
      };

      // Обрабатываем ошибки MediaRecorder
      mediaRecorder.onerror = (event) => {
        const errorMessage = 'Ошибка при записи аудио';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
        setIsRecording(false);
        setIsProcessing(false);
      };

      // Начинаем запись
      mediaRecorder.start(100); // Собираем данные каждые 100мс
      setIsRecording(true);

      // Запускаем таймер длительности записи
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } catch (err) {
      let errorMessage = 'Не удалось получить доступ к микрофону';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Доступ к микрофону запрещен. Разрешите использование микрофона в настройках браузера.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'Микрофон не найден. Убедитесь, что микрофон подключен.';
        } else {
          errorMessage = err.message || errorMessage;
        }
      }

      setError(errorMessage);
      setIsRecording(false);
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [onTextReady, onError]);

  /**
   * Останавливает запись
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Останавливаем таймер
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Останавливаем поток
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording]);

  /**
   * Отменяет запись без обработки
   */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioChunksRef.current = [];
      setRecordingDuration(0);
      setError(null);

      // Останавливаем таймер
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Останавливаем поток
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording]);

  return {
    isRecording,
    isProcessing,
    error,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

