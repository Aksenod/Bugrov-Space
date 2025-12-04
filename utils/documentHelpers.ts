import { UploadedFile, Agent } from '../types';

/**
 * Лимит размера файла (2MB)
 */
export const FILE_SIZE_LIMIT = 2 * 1024 * 1024;

/**
 * Прочитать файл в base64
 */
export const readFileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Извлечь имя агента из документа
 */
export const getAgentName = (doc: UploadedFile, agents: Agent[]): string => {
  // Сначала пытаемся найти по agentId
  if (doc.agentId) {
    const agent = agents.find(agent => agent.id === doc.agentId);
    if (agent) {
      return agent.name;
    }
  }

  // Если агент не найден по ID, пытаемся извлечь название из имени файла
  // Формат имени: "Summary - {AgentName} - {Date}" или "Summary – {AgentName} – {Date}"
  const nameMatch = doc.name.match(/^Summary\s*[-–—]\s*(.+?)\s*[-–—]\s*\d/);
  if (nameMatch && nameMatch[1]) {
    const agentNameFromFile = nameMatch[1].trim();
    const agentByName = agents.find(agent => agent.name === agentNameFromFile);
    if (agentByName) {
      return agentByName.name;
    }
    return agentNameFromFile;
  }

  // Альтернативный формат: "Документ - {AgentName} - {Date}"
  const altNameMatch = doc.name.match(/^Документ\s*[-–—]\s*(.+?)\s*[-–—]\s*\d/);
  if (altNameMatch && altNameMatch[1]) {
    return altNameMatch[1].trim();
  }

  return 'Документ';
};

/**
 * Извлечь timestamp из имени файла
 */
export const extractTimestamp = (doc: UploadedFile): string => {
  const parts = doc.name.split(' - ');
  return parts.length > 1 ? parts[parts.length - 1].trim() : doc.name;
};

/**
 * Форматировать время в 24-часовом формате
 */
export const formatTime24h = (doc: UploadedFile): string => {
  const timestamp = extractTimestamp(doc);
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return timestamp;
    }
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return timestamp;
  }
};

/**
 * Форматировать дату и время
 */
export const formatDateTime = (doc: UploadedFile): string => {
  const timestamp = extractTimestamp(doc);
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return timestamp;
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch (e) {
    return timestamp;
  }
};

/**
 * Проверить, имеет ли агент определенную роль
 */
export const hasRole = (agentRole: string | undefined, roleName: string): boolean => {
  if (!agentRole) return false;
  const roles = agentRole.split(',').map(r => r.trim().toLowerCase());
  return roles.includes(roleName.toLowerCase());
};


