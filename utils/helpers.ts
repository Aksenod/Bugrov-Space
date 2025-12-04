/**
 * Вспомогательные функции
 */

import { Agent } from '../types';
import { COLOR_PRESETS, QUESTION_PREFIXES } from './constants';

/**
 * Выбирает цвет для аватара на основе ID
 */
export const pickColor = (id: string): string => {
  const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLOR_PRESETS[hash % COLOR_PRESETS.length];
};

/**
 * Сортирует список агентов по order, затем по id
 */
export const sortAgents = (agentList: Agent[]): Agent[] =>
  [...agentList].sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    if (orderA === orderB) {
      // Используем id для стабильной сортировки при одинаковом order
      return a.id.localeCompare(b.id);
    }
    return orderA - orderB;
  });

/**
 * Очищает строку от лишних символов и форматирует её
 */
export const sanitizeLine = (text: string): string =>
  text
    .replace(/^[-*•\d\)\(]+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s([,.!?;:])/g, '$1')
    .trim();

/**
 * Убеждается, что строка заканчивается указанным окончанием
 */
export const ensureEnding = (text: string, ending: string): string => {
  if (!text) return text;
  return text.endsWith(ending) ? text : `${text}${ending}`;
};

/**
 * Преобразует строку в sentence case (первая буква строчная)
 */
export const toSentenceCase = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
};

/**
 * Проверяет, является ли строка вопросом
 */
export const isQuestion = (text: string): boolean => {
  const lower = text.toLowerCase();
  return QUESTION_PREFIXES.some(prefix => lower.startsWith(prefix));
};

/**
 * Удаляет дубликаты из массива строк (без учета регистра)
 */
export const dedupe = (items: string[]): string[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/**
 * Извлекает фразы из описания агента
 */
export const extractAgentPhrases = (agent?: Agent, max = 4): string[] => {
  if (!agent) return [];
  const raw = [agent.systemInstruction, agent.summaryInstruction, agent.description]
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!raw) {
    return [];
  }

  const lines = raw
    .split(/\r?\n/)
    .map(line => sanitizeLine(line))
    .filter(line => line.length >= 12 && /[a-zA-Zа-яА-Я]/.test(line));

  const sentences = raw
    .split(/[.!?]+/)
    .map(sentence => sanitizeLine(sentence))
    .filter(sentence => sentence.length >= 25 && /[a-zA-Zа-яА-Я]/.test(sentence));

  const merged = dedupe([...lines, ...sentences]);
  return merged.slice(0, max);
};

/**
 * Форматирует пример запроса для агента
 */
export const formatExampleForAgent = (phrase: string, agentName: string): string => {
  const cleaned = sanitizeLine(phrase);
  if (!cleaned) return '';

  if (isQuestion(cleaned)) {
    return `Спроси ${agentName}: ${ensureEnding(cleaned, '?')}`;
  }

  const imperative = cleaned.replace(/^(?:можешь|может|нужно|должен|обязан|ты|вы)\s+/i, '').trim();
  const tail = imperative || cleaned;
  return `Попроси ${agentName} ${ensureEnding(toSentenceCase(tail), '')}`.trim();
};

/**
 * Возвращает дефолтные примеры запросов для агента
 */
export const getDefaultAgentExamples = (agentName: string): string[] => [
  `Спроси ${agentName}, какие шаги он предложит для вашей задачи`,
  `Попроси ${agentName} уточнить требования на основе документов проекта`,
  `Попроси ${agentName} улучшить результат прошлой итерации`,
  `Уточни у ${agentName}, какие данные ему нужны, чтобы начать работу`,
];

/**
 * Нормализует строку ролей в массив
 */
export const normalizeRoles = (rolesString?: string): string[] =>
  (rolesString || '')
    .split(',')
    .map(role => role.trim().toLowerCase())
    .filter(Boolean);

/**
 * Проверяет, имеет ли агент указанную роль
 */
export const agentHasRole = (agent: Pick<Agent, 'role'>, role: string): boolean =>
  normalizeRoles(agent.role).includes(role.toLowerCase());

/**
 * Выбирает ID агента по умолчанию из списка
 */
export const selectDefaultAgentId = (agentList: Agent[]): string | null => {
  if (!agentList || agentList.length === 0) {
    return null;
  }
  // Приоритет: выбираем копирайтера, если он есть
  const copywriter = agentList.find(agent => agentHasRole(agent, 'copywriter'));
  return copywriter?.id ?? agentList[0]?.id ?? null;
};

/**
 * Интерфейс для подсказки агента
 */
export interface AgentHint {
  title: string;
  description: string;
  examples: string[];
}

// Экспортируем для использования в других модулях
export type { AgentHint };

/**
 * Строит подсказку для агента
 */
export const buildAgentHint = (agent?: Agent): AgentHint | null => {
  if (!agent) return null;
  const descriptionSource = agent.description?.trim() || agent.systemInstruction?.trim() || '';
  const description = descriptionSource
    ? descriptionSource.slice(0, 260).trim() + (descriptionSource.length > 260 ? '…' : '')
    : `Используйте ${agent.name}, чтобы получить экспертизу по его специализации.`;

  const phrases = extractAgentPhrases(agent);
  const examples = phrases
    .map(phrase => formatExampleForAgent(phrase, agent.name))
    .filter(Boolean);

  return {
    title: `${agent.name}: идеи запросов`,
    description,
    examples: examples.length ? examples.slice(0, 4) : getDefaultAgentExamples(agent.name),
  };
};

/**
 * Читает файл и преобразует его в Base64 строку
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

