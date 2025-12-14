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

  /**
   * Получает доступ к микрофону
   * Создает новый поток каждый раз, но браузер не покажет диалог, если разрешение уже дано
   */
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    // Останавливаем предыдущий поток если он есть
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Запрашиваем новый доступ к микрофону
    // Если разрешение уже дано, браузер не покажет диалог повторно
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

      // Убеждаемся, что предыдущий MediaRecorder полностью остановлен
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          // Даем время для завершения остановки
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        mediaRecorderRef.current = null;
      }

      // Получаем поток (переиспользуем существующий или запрашиваем новый)
      const stream = await getMediaStream();

      // Определяем поддерживаемый формат
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }
      
      // Нормализуем MIME тип, убирая codecs (например, audio/webm;codecs=opus -> audio/webm)
      const normalizedMimeType = mimeType.split(';')[0];

      // Создаем новый MediaRecorder для каждой записи
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });
      mediaRecorderRef.current = mediaRecorder;

      // Собираем аудио чанки
      // Добавляем только чанки с данными (size > 0)
      mediaRecorder.ondataavailable = (event) => {
        if (import.meta.env.DEV) {
          console.log('[VoiceInput] ondataavailable called:', {
            hasData: !!event.data,
            dataSize: event.data?.size || 0,
            dataType: event.data?.type || 'none',
            currentChunks: audioChunksRef.current.length
          });
        }
        
        // Добавляем только чанки с данными
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          if (import.meta.env.DEV) {
            console.log('[VoiceInput] Data chunk added:', event.data.size, 'bytes, total chunks:', audioChunksRef.current.length);
          }
        } else if (import.meta.env.DEV) {
          console.warn('[VoiceInput] Empty chunk ignored');
        }
      };

      // Обрабатываем окончание записи
      mediaRecorder.onstop = async () => {
        if (import.meta.env.DEV) {
          console.log('[VoiceInput] onstop called, chunks before wait:', audioChunksRef.current.length);
        }

        // Даем время для получения всех данных через ondataavailable
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
          // НЕ устанавливаем isProcessing здесь - установим только после проверки валидности данных

          if (import.meta.env.DEV) {
            console.log('[VoiceInput] Processing stopped, chunks:', audioChunksRef.current.length);
            if (audioChunksRef.current.length > 0) {
              console.log('[VoiceInput] Chunks details:', audioChunksRef.current.map((chunk, i) => ({
                index: i,
                size: chunk.size,
                type: chunk.type
              })));
            }
          }

          // Проверяем, что есть валидные чанки с данными
          const hasValidChunks = audioChunksRef.current.some(chunk => chunk && chunk.size > 0);
          
          if (!hasValidChunks) {
            throw new Error('Не удалось записать аудио. Убедитесь, что вы говорили во время записи (минимум 1-2 секунды) и попробуйте еще раз.');
          }

          // Фильтруем только чанки с данными перед созданием Blob
          const validChunks = audioChunksRef.current.filter(chunk => chunk && chunk.size > 0);
          
          if (import.meta.env.DEV) {
            console.log('[VoiceInput] Valid chunks:', validChunks.length, 'out of', audioChunksRef.current.length);
          }
          
          // Создаем Blob только из валидных чанков с нормализованным MIME типом
          const audioBlob = new Blob(validChunks, { type: normalizedMimeType });

          if (import.meta.env.DEV) {
            console.log('[VoiceInput] Blob created:', {
              size: audioBlob.size,
              type: audioBlob.type,
              chunksCount: audioChunksRef.current.length,
              totalChunksSize: audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0),
              chunksDetails: audioChunksRef.current.map((chunk, i) => ({ index: i, size: chunk.size, type: chunk.type }))
            });
          }

          // Проверяем размер Blob (минимум 1KB для валидного аудио)
          const MIN_AUDIO_SIZE = 1024; // 1KB
          if (audioBlob.size === 0) {
            throw new Error('Записанное аудио пусто. Попробуйте еще раз.');
          }
          if (audioBlob.size < MIN_AUDIO_SIZE) {
            throw new Error(`Записанное аудио слишком короткое (${audioBlob.size} байт). Убедитесь, что вы говорили во время записи (минимум 1-2 секунды) и попробуйте еще раз.`);
          }

          // Теперь устанавливаем isProcessing, так как данные валидны и начинаем транскрибацию
          setIsProcessing(true);

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

      // Начинаем запись с timeslice для регулярного сбора данных
      // Используем интервал 250мс для надежного сбора данных
      mediaRecorder.start(250);
      setIsRecording(true);
      
      if (import.meta.env.DEV) {
        console.log('[VoiceInput] Recording started with timeslice (250ms)');
      }

      if (import.meta.env.DEV) {
        console.log('[VoiceInput] Recording started with stream:', {
          streamId: stream.id,
          tracksCount: stream.getTracks().length,
          trackState: stream.getTracks()[0]?.readyState,
          recorderState: mediaRecorder.state,
          mimeType
        });
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
      if (import.meta.env.DEV) {
        console.log('[VoiceInput] Stopping recording, state:', mediaRecorderRef.current.state, 'duration:', recordingDuration);
      }

      // Запрашиваем все оставшиеся данные перед остановкой
      if (mediaRecorderRef.current.state === 'recording') {
        // Запрашиваем данные несколько раз для надежности
        mediaRecorderRef.current.requestData();
        
        // Даем больше времени для обработки запроса и получения данных
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            // Запрашиваем еще раз
            mediaRecorderRef.current.requestData();
            
            // Даем время для получения данных
            setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                // Последний запрос перед остановкой
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
        // Если уже не записывает, просто останавливаем
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }
      
      setIsRecording(false);

      // Останавливаем таймер
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Останавливаем поток после задержки, чтобы дать время на обработку данных
      // Но создаем новый поток при следующей записи (браузер не покажет диалог, если разрешение уже дано)
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

  /**
   * Cleanup при размонтировании компонента
   */
  useEffect(() => {
    return () => {
      // Останавливаем таймер
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      // Останавливаем запись если она активна
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }

      // Останавливаем поток микрофона
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
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

