import { useState, useRef, useCallback, useEffect } from 'react';
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
  const stateCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dataRequestIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const isIntentionalStopRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false); // Ref для состояния записи (для использования в интервалах)

  /**
   * Получает доступ к микрофону
   */
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }, []);

  /**
   * Начинает запись аудио
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordingDuration(0);
      audioChunksRef.current = [];
      isProcessingRef.current = false;
      recordingStartTimeRef.current = null;
      isIntentionalStopRef.current = false;
      isRecordingRef.current = false;

      // Убеждаемся, что предыдущий MediaRecorder полностью остановлен
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        mediaRecorderRef.current = null;
      }

      const stream = await getMediaStream();

      // Даем потоку время для полной инициализации
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!stream.active || stream.getTracks().some(track => track.readyState !== 'live')) {
        throw new Error('Поток микрофона не готов. Попробуйте еще раз.');
      }

      // Определяем поддерживаемый формат
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      let normalizedMimeType = mimeType.split(';')[0];

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType });
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;

      const actualMimeType = mediaRecorder.mimeType || mimeType;
      normalizedMimeType = actualMimeType.split(';')[0];

      // Собираем аудио чанки
      mediaRecorder.ondataavailable = (event) => {
        if (import.meta.env.DEV) {
          console.log('[VoiceInput] ondataavailable called:', {
            hasData: !!event.data,
            dataSize: event.data?.size || 0,
            dataType: event.data?.type || 'none',
            currentChunks: audioChunksRef.current.length
          });
        }

        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          if (import.meta.env.DEV) {
            console.log('[VoiceInput] Data chunk added:', event.data.size, 'bytes, total chunks:', audioChunksRef.current.length);
          }
        } else {
          if (import.meta.env.DEV) {
            console.warn('[VoiceInput] Empty chunk ignored');
          }
        }
      };

      // Обрабатываем окончание записи
      mediaRecorder.onstop = async () => {
        if (import.meta.env.DEV) {
          console.log('[VoiceInput] onstop called, chunks before wait:', audioChunksRef.current.length);
        }

        // Защита от повторных вызовов onstop
        if (isProcessingRef.current) {
          return;
        }

        // Проверяем, не остановилась ли запись слишком быстро (менее 500мс)
        // НО только если это НЕ намеренная остановка пользователем
        const MIN_RECORDING_DURATION_MS = 500;
        if (recordingStartTimeRef.current && !isIntentionalStopRef.current) {
          const actualDuration = Date.now() - recordingStartTimeRef.current;
          if (actualDuration < MIN_RECORDING_DURATION_MS) {
            const errorMessage = 'Запись остановилась слишком быстро. Убедитесь, что микрофон работает и попробуйте еще раз.';
            setError(errorMessage);
            if (onError) {
              onError(errorMessage);
            }
            setIsRecording(false);
            isRecordingRef.current = false;
            recordingStartTimeRef.current = null;
            return;
          }
        }

        // Даем время для получения всех данных через ondataavailable
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
          if (import.meta.env.DEV) {
            console.log('[VoiceInput] Processing stopped, chunks:', audioChunksRef.current.length);
          }

          const hasValidChunks = audioChunksRef.current.some(chunk => chunk && chunk.size > 0);

          if (!hasValidChunks) {
            throw new Error('Не удалось записать аудио. Убедитесь, что вы говорили во время записи (минимум 1-2 секунды) и попробуйте еще раз.');
          }

          const validChunks = audioChunksRef.current.filter(chunk => chunk && chunk.size > 0);

          const actualMimeType = mediaRecorder.mimeType || normalizedMimeType;
          const blobMimeType = actualMimeType.split(';')[0];

          const audioBlob = new Blob(validChunks, { type: blobMimeType });

          if (import.meta.env.DEV) {
            console.log('[VoiceInput] Blob created:', {
              size: audioBlob.size,
              type: audioBlob.type,
              chunksCount: audioChunksRef.current.length
            });
          }

          const MIN_AUDIO_SIZE = 1024;
          if (audioBlob.size === 0) {
            throw new Error('Записанное аудио пусто. Попробуйте еще раз.');
          }
          if (audioBlob.size < MIN_AUDIO_SIZE) {
            throw new Error(`Записанное аудио слишком короткое (${audioBlob.size} байт). Убедитесь, что вы говорили во время записи (минимум 1-2 секунды) и попробуйте еще раз.`);
          }

          isProcessingRef.current = true;
          setIsProcessing(true);

          const transcribedText = await transcribeAudio(audioBlob);

          if (!transcribedText || !transcribedText.trim()) {
            throw new Error('Не удалось распознать речь. Попробуйте говорить четче.');
          }

          const { originalText, correctedText } = await correctText(transcribedText);

          onTextReady(originalText, correctedText);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Ошибка при обработке аудио';
          setError(errorMessage);
          if (onError) {
            onError(errorMessage);
          }
        } finally {
          isProcessingRef.current = false;
          setIsProcessing(false);
          recordingStartTimeRef.current = null;
        }
      };

      // Обрабатываем успешное начало записи
      mediaRecorder.onstart = () => {
        recordingStartTimeRef.current = Date.now();
        if (import.meta.env.DEV) {
          console.log('[VoiceInput] Recording confirmed started, state:', mediaRecorder.state);
        }
      };

      // Обрабатываем ошибки MediaRecorder
      mediaRecorder.onerror = () => {
        const errorMessage = 'Ошибка при записи аудио';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
        setIsRecording(false);
        isRecordingRef.current = false;
        setIsProcessing(false);
      };

      // Начинаем запись БЕЗ timeslice
      mediaRecorder.start();
      setIsRecording(true);
      isRecordingRef.current = true; // Устанавливаем ref СРАЗУ после начала записи

      // Периодически запрашиваем данные для предотвращения автоматической остановки
      const DATA_REQUEST_INTERVAL_MS = 250;
      dataRequestIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            mediaRecorderRef.current.requestData();
          } catch (e) {
            if (import.meta.env.DEV) {
              console.warn('[VoiceInput] Failed to request data:', e);
            }
          }
        } else {
          if (dataRequestIntervalRef.current) {
            clearInterval(dataRequestIntervalRef.current);
            dataRequestIntervalRef.current = null;
          }
        }
      }, DATA_REQUEST_INTERVAL_MS) as unknown as NodeJS.Timeout;

      // Периодически проверяем состояние записи
      stateCheckIntervalRef.current = setInterval(() => {
        const currentRecorder = mediaRecorderRef.current;
        const currentStream = streamRef.current;

        // ВАЖНО: используем isRecordingRef.current вместо isRecording для актуального значения
        if (currentRecorder && currentRecorder.state === 'inactive' && isRecordingRef.current) {
          // Запись остановилась неожиданно - перезапускаем
          if (currentStream && currentStream.active && currentStream.getTracks().every(t => t.readyState === 'live')) {
            try {
              currentRecorder.start();
            } catch (e) {
              if (stateCheckIntervalRef.current) {
                clearInterval(stateCheckIntervalRef.current);
                stateCheckIntervalRef.current = null;
              }
              if (dataRequestIntervalRef.current) {
                clearInterval(dataRequestIntervalRef.current);
                dataRequestIntervalRef.current = null;
              }
            }
          } else {
            if (stateCheckIntervalRef.current) {
              clearInterval(stateCheckIntervalRef.current);
              stateCheckIntervalRef.current = null;
            }
            if (dataRequestIntervalRef.current) {
              clearInterval(dataRequestIntervalRef.current);
              dataRequestIntervalRef.current = null;
            }
          }
        } else if (!isRecordingRef.current) {
          if (stateCheckIntervalRef.current) {
            clearInterval(stateCheckIntervalRef.current);
            stateCheckIntervalRef.current = null;
          }
          if (dataRequestIntervalRef.current) {
            clearInterval(dataRequestIntervalRef.current);
            dataRequestIntervalRef.current = null;
          }
        }
      }, 100) as unknown as NodeJS.Timeout;

      if (import.meta.env.DEV) {
        console.log('[VoiceInput] Recording started WITHOUT timeslice, using periodic requestData()');
      }

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
      isRecordingRef.current = false;
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [onTextReady, onError, getMediaStream]);

  /**
   * Останавливает запись
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      isIntentionalStopRef.current = true;

      if (import.meta.env.DEV) {
        console.log('[VoiceInput] Stopping recording, state:', mediaRecorderRef.current.state, 'duration:', recordingDuration);
      }

      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.requestData();

        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.requestData();

            setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.requestData();
                setTimeout(() => {
                  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                  }
                }, 200);
              }
            }, 200);
          }
        }, 200);
      } else {
        if (import.meta.env.DEV) {
          console.log('[VoiceInput] Recorder not in recording state, current state:', mediaRecorderRef.current.state);
        }
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }

      setIsRecording(false);
      isRecordingRef.current = false;

      // Останавливаем таймеры
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (stateCheckIntervalRef.current) {
        clearInterval(stateCheckIntervalRef.current);
        stateCheckIntervalRef.current = null;
      }
      if (dataRequestIntervalRef.current) {
        clearInterval(dataRequestIntervalRef.current);
        dataRequestIntervalRef.current = null;
      }

      setTimeout(() => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      }, 1000);
    }
  }, [isRecording, recordingDuration]);

  /**
   * Отменяет запись без обработки
   */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      isIntentionalStopRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      audioChunksRef.current = [];
      setRecordingDuration(0);
      setError(null);
      recordingStartTimeRef.current = null;

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (stateCheckIntervalRef.current) {
        clearInterval(stateCheckIntervalRef.current);
        stateCheckIntervalRef.current = null;
      }
      if (dataRequestIntervalRef.current) {
        clearInterval(dataRequestIntervalRef.current);
        dataRequestIntervalRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording]);

  /**
   * Cleanup при размонтировании компонента
   */
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (dataRequestIntervalRef.current) {
        clearInterval(dataRequestIntervalRef.current);
      }
      if (stateCheckIntervalRef.current) {
        clearInterval(stateCheckIntervalRef.current);
      }

      if (mediaRecorderRef.current && isRecordingRef.current) {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

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
