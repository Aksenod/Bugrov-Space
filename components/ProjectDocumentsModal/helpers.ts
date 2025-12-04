import { UploadedFile } from '../../types';
import { getAgentName, extractTimestamp, formatDateTime } from '../../utils/documentHelpers';

/**
 * Получить отображаемое имя документа
 */
export const getDocumentDisplayName = (doc: UploadedFile, agents: any[] = []): string => {
  // Проверяем, является ли это summary документом
  const isSummaryDocument = doc.name.match(/^(Summary|Документ)\s*[-–—]/);

  // Для загруженных пользователем файлов показываем оригинальное название
  if (!isSummaryDocument) {
    return doc.name;
  }

  // Для summary документов показываем имя агента и дату
  return `${getAgentName(doc, agents)} - ${extractTimestamp(doc)}`;
};

/**
 * Форматировать дату и время документа
 */
export const formatDocumentDateTime = (doc: UploadedFile): string => {
  return formatDateTime(doc);
};

// Re-export для обратной совместимости
export { getAgentName, formatDateTime } from '../../utils/documentHelpers';

