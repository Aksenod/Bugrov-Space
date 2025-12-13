import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { authMiddleware } from '../../middleware/authMiddleware';
import { AuthenticatedRequest } from '../../types/express';
import { transcribeAudio } from '../../services/whisperService';
import { correctText } from '../../services/textCorrectionService';
import { logger } from '../../utils/logger';

const router = Router();

// Валидация для транскрибации
const transcribeSchema = z.object({
  // Файл будет в req.file или req.body (зависит от middleware)
});

// Валидация для исправления текста
const correctSchema = z.object({
  text: z.string().min(1, 'Текст не может быть пустым'),
});

/**
 * POST /api/agents/voice/transcribe
 * Транскрибирует аудио файл в текст с помощью Whisper API
 */
router.post(
  '/transcribe',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId!;

    // Проверяем наличие файла в req.body (если отправлен как base64) или в req.file (если multipart)
    let audioBuffer: Buffer;
    let mimeType: string;
    let filename: string | undefined;

    // Вариант 1: файл отправлен как base64 в JSON body
    if (req.body && req.body.audio) {
      const { audio, mimeType: bodyMimeType, filename: bodyFilename } = req.body;
      
      if (!audio) {
        return res.status(400).json({ error: 'Аудио файл не предоставлен' });
      }

      try {
        // Декодируем base64
        audioBuffer = Buffer.from(audio, 'base64');
        mimeType = bodyMimeType || 'audio/webm';
        filename = bodyFilename;
      } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to decode base64 audio');
        return res.status(400).json({ error: 'Неверный формат аудио данных (ожидается base64)' });
      }
    } else {
      // Вариант 2: файл отправлен как multipart/form-data
      // В этом случае нужно использовать multer или другой middleware
      // Пока поддерживаем только base64 подход
      return res.status(400).json({ 
        error: 'Аудио файл должен быть отправлен как base64 в поле "audio" в JSON body',
        hint: 'Отправьте POST запрос с JSON: { "audio": "base64string", "mimeType": "audio/webm", "filename": "audio.webm" }'
      });
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'Аудио файл пуст' });
    }

    try {
      logger.info({ userId, fileSize: audioBuffer.length, mimeType, filename }, 'Transcribing audio');
      const text = await transcribeAudio(audioBuffer, mimeType, filename);
      
      res.json({ text });
    } catch (error) {
      logger.error(
        { 
          userId, 
          error: error instanceof Error ? error.message : 'Unknown error',
          fileSize: audioBuffer.length 
        },
        'Failed to transcribe audio'
      );
      
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при распознавании речи';
      res.status(500).json({ error: errorMessage });
    }
  })
);

/**
 * POST /api/agents/voice/correct
 * Исправляет расстановку знаков препинания в тексте
 */
router.post(
  '/correct',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId!;

    // Валидация входных данных
    const parsed = correctSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: parsed.error.flatten(),
      });
    }

    const { text } = parsed.data;

    try {
      logger.info({ userId, textLength: text.length }, 'Correcting text punctuation');
      const correctedText = await correctText(text);
      
      res.json({
        originalText: text,
        correctedText,
      });
    } catch (error) {
      logger.error(
        { 
          userId, 
          error: error instanceof Error ? error.message : 'Unknown error',
          textLength: text.length 
        },
        'Failed to correct text'
      );
      
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при исправлении текста';
      res.status(500).json({ error: errorMessage });
    }
  })
);

export default router;

