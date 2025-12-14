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
  const dataRequestIntervalRef = useRef<NodeJS.Timeout | null>(null); // Интервал для периодического requestData()
  const isProcessingRef = useRef<boolean>(false); // Защита от повторных вызовов onstop
  const recordingStartTimeRef = useRef<number | null>(null); // Время начала записи
  const isIntentionalStopRef = useRef<boolean>(false); // Флаг намеренной остановки пользователем

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:54',message:'startRecording called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
      // #endregion
      setError(null);
      setRecordingDuration(0);
      audioChunksRef.current = [];
      isProcessingRef.current = false;
      recordingStartTimeRef.current = null;
      isIntentionalStopRef.current = false; // Сбрасываем флаг намеренной остановки

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:70',message:'Stream obtained',data:{streamId:stream.id,tracksCount:stream.getTracks().length,trackStates:stream.getTracks().map(t=>({id:t.id,readyState:t.readyState,enabled:t.enabled,kind:t.kind})),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Даем потоку время для полной инициализации перед началом записи
      // Это может помочь избежать проблем с автоматической остановкой MediaRecorder
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Проверяем, что поток все еще активен после задержки
      if (!stream.active || stream.getTracks().some(track => track.readyState !== 'live')) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:75',message:'WARNING: Stream not ready after delay',data:{streamActive:stream.active,trackStates:stream.getTracks().map(t=>({id:t.id,readyState:t.readyState,enabled:t.enabled})),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
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
      
      // Нормализуем MIME тип, убирая codecs (например, audio/webm;codecs=opus -> audio/webm)
      // Это будет обновлено после создания MediaRecorder с фактическим типом
      let normalizedMimeType = mimeType.split(';')[0];
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:84',message:'MIME type determined',data:{mimeType,normalizedMimeType,webmSupported:MediaRecorder.isTypeSupported('audio/webm'),mp4Supported:MediaRecorder.isTypeSupported('audio/mp4'),oggSupported:MediaRecorder.isTypeSupported('audio/ogg'),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      // Создаем новый MediaRecorder для каждой записи
      // Важно: не указываем mimeType в конструкторе, если он может быть не полностью поддерживаемым
      // Браузер выберет лучший формат автоматически
      let mediaRecorder: MediaRecorder;
      try {
        // Пробуем создать с указанным mimeType
        mediaRecorder = new MediaRecorder(stream, {
          mimeType,
        });
      } catch (e) {
        // Если не получилось, создаем без указания mimeType - браузер выберет сам
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:100',message:'Failed to create MediaRecorder with mimeType, trying without',data:{mimeType,error:e instanceof Error?e.message:'unknown',timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'L'})}).catch(()=>{});
        // #endregion
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;
      
      // Получаем фактический MIME тип, который использует браузер
      const actualMimeType = mediaRecorder.mimeType || mimeType;
      // Обновляем normalizedMimeType с фактическим типом
      normalizedMimeType = actualMimeType.split(';')[0];
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:110',message:'MediaRecorder created',data:{requestedMimeType:mimeType,actualMimeType,normalizedMimeType,recorderState:mediaRecorder.state,streamActive:stream.active,tracksState:stream.getTracks().map(t=>({id:t.id,readyState:t.readyState,enabled:t.enabled})),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'L'})}).catch(()=>{});
      // #endregion

      // Отслеживаем события треков потока для диагностики
      stream.getTracks().forEach((track, index) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:89',message:'Setting up track listeners',data:{trackId:track.id,index,readyState:track.readyState,enabled:track.enabled,kind:track.kind,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        track.onended = () => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:95',message:'TRACK ENDED EVENT',data:{trackId:track.id,index,recorderState:mediaRecorder.state,isRecording,streamActive:stream.active,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
        };
        
        track.onmute = () => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:101',message:'TRACK MUTED',data:{trackId:track.id,index,recorderState:mediaRecorder.state,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
        };
        
        track.onunmute = () => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:107',message:'TRACK UNMUTED',data:{trackId:track.id,index,recorderState:mediaRecorder.state,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
        };
      });

      // Собираем аудио чанки
      // Добавляем только чанки с данными (size > 0)
      mediaRecorder.ondataavailable = (event) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:93',message:'ondataavailable event',data:{hasData:!!event.data,dataSize:event.data?.size||0,dataType:event.data?.type||'none',currentChunks:audioChunksRef.current.length,recorderState:mediaRecorder.state,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
        // #endregion
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:105',message:'Chunk added to array',data:{chunkSize:event.data.size,chunkType:event.data.type,totalChunks:audioChunksRef.current.length,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
          // #endregion
          if (import.meta.env.DEV) {
            console.log('[VoiceInput] Data chunk added:', event.data.size, 'bytes, total chunks:', audioChunksRef.current.length);
          }
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:110',message:'Empty chunk ignored',data:{hasData:!!event.data,dataSize:event.data?.size||0,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          if (import.meta.env.DEV) {
            console.warn('[VoiceInput] Empty chunk ignored');
          }
        }
      };

      // Обрабатываем окончание записи
      mediaRecorder.onstop = async () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:115',message:'onstop called',data:{chunksBeforeWait:audioChunksRef.current.length,chunksDetails:audioChunksRef.current.map((c,i)=>({index:i,size:c.size,type:c.type})),recorderState:mediaRecorder.state,isRecordingState:isRecording,isProcessingRef:isProcessingRef.current,streamActive:streamRef.current?.active,streamTracksState:streamRef.current?.getTracks().map(t=>({id:t.id,readyState:t.readyState,enabled:t.enabled})),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,G,H'})}).catch(()=>{});
        // #endregion
        if (import.meta.env.DEV) {
          console.log('[VoiceInput] onstop called, chunks before wait:', audioChunksRef.current.length);
        }

        // Защита от повторных вызовов onstop
        if (isProcessingRef.current) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:122',message:'WARNING: onstop called again while processing',data:{isProcessingRef:isProcessingRef.current,recorderState:mediaRecorder.state,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
          return;
        }

        // Проверяем, не остановилась ли запись слишком быстро (менее 500мс)
        // Это может указывать на проблему с потоком или автоматическую остановку
        // НО только если это НЕ намеренная остановка пользователем
        const MIN_RECORDING_DURATION_MS = 500;
        if (recordingStartTimeRef.current && !isIntentionalStopRef.current) {
          const actualDuration = Date.now() - recordingStartTimeRef.current;
          if (actualDuration < MIN_RECORDING_DURATION_MS) {
            // Запись остановилась слишком быстро БЕЗ действия пользователя - это ошибка
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:122',message:'ERROR: Recording stopped too quickly',data:{actualDuration,minDuration:MIN_RECORDING_DURATION_MS,recorderState:mediaRecorder.state,streamActive:streamRef.current?.active,isIntentionalStop:isIntentionalStopRef.current,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'N'})}).catch(()=>{});
            // #endregion
            const errorMessage = 'Запись остановилась слишком быстро. Убедитесь, что микрофон работает и попробуйте еще раз.';
            setError(errorMessage);
            if (onError) {
              onError(errorMessage);
            }
            setIsRecording(false);
            recordingStartTimeRef.current = null;
            return;
          }
        }

        // Даем время для получения всех данных через ondataavailable
        await new Promise(resolve => setTimeout(resolve, 300));
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:121',message:'After 300ms wait',data:{chunksAfterWait:audioChunksRef.current.length,chunksDetails:audioChunksRef.current.map((c,i)=>({index:i,size:c.size,type:c.type})),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:138',message:'Validating chunks',data:{totalChunks:audioChunksRef.current.length,hasValidChunks,chunksDetails:audioChunksRef.current.map((c,i)=>({index:i,size:c.size,type:c.type,isValid:c&&c.size>0})),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,G'})}).catch(()=>{});
          // #endregion
          
          if (!hasValidChunks) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:141',message:'ERROR: No valid chunks found',data:{totalChunks:audioChunksRef.current.length,chunksDetails:audioChunksRef.current.map((c,i)=>({index:i,size:c?.size||0,type:c?.type||'none'})),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,G'})}).catch(()=>{});
            // #endregion
            throw new Error('Не удалось записать аудио. Убедитесь, что вы говорили во время записи (минимум 1-2 секунды) и попробуйте еще раз.');
          }

          // Фильтруем только чанки с данными перед созданием Blob
          const validChunks = audioChunksRef.current.filter(chunk => chunk && chunk.size > 0);
          
          if (import.meta.env.DEV) {
            console.log('[VoiceInput] Valid chunks:', validChunks.length, 'out of', audioChunksRef.current.length);
          }
          
          // Получаем фактический MIME тип из MediaRecorder, если он доступен
          const actualMimeType = mediaRecorder.mimeType || normalizedMimeType;
          const blobMimeType = actualMimeType.split(';')[0]; // Убираем codecs для Blob
          
          // Создаем Blob только из валидных чанков с фактическим MIME типом
          const audioBlob = new Blob(validChunks, { type: blobMimeType });

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
          // Whisper API требует минимум 1KB для декодирования
          const MIN_AUDIO_SIZE = 1024; // 1KB
          if (audioBlob.size === 0) {
            throw new Error('Записанное аудио пусто. Попробуйте еще раз.');
          }
          if (audioBlob.size < MIN_AUDIO_SIZE) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:248',message:'Audio too small for Whisper API',data:{audioBlobSize:audioBlob.size,minSize:MIN_AUDIO_SIZE,chunksCount:validChunks.length,recordingDuration:recordingDuration,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'})}).catch(()=>{});
            // #endregion
            throw new Error(`Записанное аудио слишком короткое (${audioBlob.size} байт). Убедитесь, что вы говорили во время записи (минимум 1-2 секунды) и попробуйте еще раз.`);
          }

          // Теперь устанавливаем isProcessing, так как данные валидны и начинаем транскрибацию
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:206',message:'Starting transcription - before setIsProcessing',data:{recorderState:mediaRecorder.state,isRecordingState:isRecording,isProcessingRef:isProcessingRef.current,streamActive:streamRef.current?.active,streamTracksState:streamRef.current?.getTracks().map(t=>({id:t.id,readyState:t.readyState,enabled:t.enabled})),audioBlobSize:audioBlob.size,audioBlobType:audioBlob.type,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
          isProcessingRef.current = true;
          setIsProcessing(true);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:208',message:'Calling transcribeAudio',data:{audioBlobSize:audioBlob.size,audioBlobType:audioBlob.type,recorderState:mediaRecorder.state,isRecordingState:isRecording,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
          // #endregion

          // Транскрибируем аудио
          const transcribedText = await transcribeAudio(audioBlob);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:212',message:'transcribeAudio completed',data:{transcribedTextLength:transcribedText?.length||0,transcribedTextPreview:transcribedText?.substring(0,50)||'empty',timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
          // #endregion

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
          isProcessingRef.current = false;
          setIsProcessing(false);
          recordingStartTimeRef.current = null;
        }
      };

      // Обрабатываем успешное начало записи
      mediaRecorder.onstart = () => {
        recordingStartTimeRef.current = Date.now();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:200',message:'MEDIARECORDER STARTED',data:{recorderState:mediaRecorder.state,streamActive:stream.active,tracksState:stream.getTracks().map(t=>({id:t.id,readyState:t.readyState,enabled:t.enabled})),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (import.meta.env.DEV) {
          console.log('[VoiceInput] Recording confirmed started, state:', mediaRecorder.state);
        }
      };

      // Обрабатываем ошибки MediaRecorder
      mediaRecorder.onerror = (event) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:200',message:'MEDIARECORDER ERROR',data:{recorderState:mediaRecorder.state,streamActive:stream.active,tracksState:stream.getTracks().map(t=>({id:t.id,readyState:t.readyState,enabled:t.enabled})),error:event.error?.message||'unknown',timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
        // #endregion
        const errorMessage = 'Ошибка при записи аудио';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
        setIsRecording(false);
        setIsProcessing(false);
      };
      
      // Отслеживаем изменения состояния MediaRecorder
      const originalStop = mediaRecorder.stop.bind(mediaRecorder);
      mediaRecorder.stop = function() {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:214',message:'stop() method called',data:{recorderState:mediaRecorder.state,isRecording,stackTrace:new Error().stack?.split('\n').slice(0,5).join('|')||'no stack',timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
        // #endregion
        return originalStop();
      };

      // Начинаем запись БЕЗ timeslice - используем периодический requestData() вместо этого
      // Timeslice может вызывать проблемы в некоторых браузерах
      mediaRecorder.start();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:212',message:'Recording started WITHOUT timeslice',data:{timeslice:'none',recorderState:mediaRecorder.state,streamActive:stream.active,tracksActive:stream.getTracks().every(t=>t.readyState==='live'),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,E'})}).catch(()=>{});
      // #endregion
      setIsRecording(true);
      
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
          // Если запись остановилась, очищаем интервал
          if (dataRequestIntervalRef.current) {
            clearInterval(dataRequestIntervalRef.current);
            dataRequestIntervalRef.current = null;
          }
        }
      }, DATA_REQUEST_INTERVAL_MS) as unknown as NodeJS.Timeout;
      
      // Периодически проверяем состояние записи и перезапускаем, если она остановилась неожиданно
      stateCheckIntervalRef.current = setInterval(() => {
        // Используем ref для получения актуального состояния
        const currentRecorder = mediaRecorderRef.current;
        const currentStream = streamRef.current;
        
        if (currentRecorder && currentRecorder.state === 'inactive' && isRecording) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:220',message:'WARNING: Recording stopped unexpectedly, restarting',data:{recorderState:currentRecorder.state,streamActive:currentStream?.active,tracksState:currentStream?.getTracks().map(t=>({id:t.id,readyState:t.readyState})),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
          // #endregion
          // Запись остановилась неожиданно - перезапускаем
          if (currentStream && currentStream.active && currentStream.getTracks().every(t => t.readyState === 'live')) {
            try {
              currentRecorder.start(); // Без timeslice
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:225',message:'Recording restarted',data:{recorderState:currentRecorder.state,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
              // #endregion
            } catch (e) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:229',message:'Failed to restart recording',data:{error:e instanceof Error?e.message:'unknown',timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
              // #endregion
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
        } else if (!isRecording) {
          if (stateCheckIntervalRef.current) {
            clearInterval(stateCheckIntervalRef.current);
            stateCheckIntervalRef.current = null;
          }
          if (dataRequestIntervalRef.current) {
            clearInterval(dataRequestIntervalRef.current);
            dataRequestIntervalRef.current = null;
          }
        }
      }, 100) as unknown as NodeJS.Timeout; // Проверяем каждые 100мс
      
      if (import.meta.env.DEV) {
        console.log('[VoiceInput] Recording started WITHOUT timeslice, using periodic requestData()');
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
      // Отмечаем, что это намеренная остановка пользователем
      isIntentionalStopRef.current = true;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:258',message:'stopRecording called',data:{recorderState:mediaRecorderRef.current.state,isRecording,recordingDuration,chunksBeforeStop:audioChunksRef.current.length,chunksDetails:audioChunksRef.current.map((c,i)=>({index:i,size:c.size,type:c.type})),isIntentionalStop:true,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F,G'})}).catch(()=>{});
      // #endregion
      if (import.meta.env.DEV) {
        console.log('[VoiceInput] Stopping recording, state:', mediaRecorderRef.current.state, 'duration:', recordingDuration);
      }

      // Запрашиваем все оставшиеся данные перед остановкой
      if (mediaRecorderRef.current.state === 'recording') {
        // Запрашиваем данные несколько раз для надежности
        mediaRecorderRef.current.requestData();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:267',message:'requestData call 1',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        // Даем больше времени для обработки запроса и получения данных
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            // Запрашиваем еще раз
            mediaRecorderRef.current.requestData();
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:273',message:'requestData call 2',data:{chunksAfterFirstRequest:audioChunksRef.current.length,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
            
            // Даем время для получения данных
            setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                // Последний запрос перед остановкой
                mediaRecorderRef.current.requestData();
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:279',message:'requestData call 3',data:{chunksAfterSecondRequest:audioChunksRef.current.length,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                // #endregion
                setTimeout(() => {
                  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:282',message:'Calling stop()',data:{chunksBeforeStop:audioChunksRef.current.length,chunksDetails:audioChunksRef.current.map((c,i)=>({index:i,size:c.size,type:c.type})),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F,G'})}).catch(()=>{});
                    // #endregion
                    mediaRecorderRef.current.stop();
                  }
                }, 200);
              }
            }, 200);
          }
        }, 200);
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:290',message:'Recorder not in recording state',data:{recorderState:mediaRecorderRef.current.state,chunksBeforeStop:audioChunksRef.current.length,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        if (import.meta.env.DEV) {
          console.log('[VoiceInput] Recorder not in recording state, current state:', mediaRecorderRef.current.state);
        }
        // Если уже не записывает, просто останавливаем
        if (mediaRecorderRef.current.state !== 'inactive') {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceInput.ts:295',message:'Calling stop() directly',data:{recorderState:mediaRecorderRef.current.state,chunksBeforeStop:audioChunksRef.current.length,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
          mediaRecorderRef.current.stop();
        }
      }
      
      setIsRecording(false);

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
      // Отмечаем как намеренную остановку, чтобы не показывать ошибку
      isIntentionalStopRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioChunksRef.current = [];
      setRecordingDuration(0);
      setError(null);
      recordingStartTimeRef.current = null;

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
      // Останавливаем таймеры
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (dataRequestIntervalRef.current) {
        clearInterval(dataRequestIntervalRef.current);
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

