import { z } from 'zod';

/**
 * Схема валидации агента-шаблона
 */
export const agentTemplateSchema = z.object({
  name: z.string().min(1, 'Название агента обязательно'),
  description: z.string().optional().default(''),
  systemInstruction: z.string().optional().default(''),
  summaryInstruction: z.string().optional().default(''),
  model: z.string().optional().default('gpt-5-mini'),
  role: z.string().optional().default(''),
  isHiddenFromSidebar: z.boolean().optional().default(false),
  quickMessages: z.array(z.string()).optional().default([]),
});

/**
 * Схема валидации файла
 */
export const fileSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  content: z.string().min(1),
  isKnowledgeBase: z.boolean().optional().default(false),
});

/**
 * Схема валидации привязки к типам проектов
 */
export const projectTypesSchema = z.object({
  projectTypeIds: z.array(z.string().min(1)).min(1, 'Необходимо указать хотя бы один тип проекта'),
});

/**
 * Валидировать данные агента-шаблона
 */
export const validateAgentTemplate = (data: unknown) => {
  return agentTemplateSchema.safeParse(data);
};

/**
 * Валидировать данные файла
 */
export const validateFile = (data: unknown) => {
  return fileSchema.safeParse(data);
};

/**
 * Валидировать типы проектов
 */
export const validateProjectTypeIds = (data: unknown) => {
  return projectTypesSchema.safeParse(data);
};

/**
 * Форматировать ошибки валидации для ответа
 */
export const formatValidationErrors = (error: z.ZodError): string => {
  return error.issues.map((err) => {
    if (err.path.length > 0) {
      return `${err.path.join('.')}: ${err.message}`;
    }
    return err.message;
  }).join(', ');
};

