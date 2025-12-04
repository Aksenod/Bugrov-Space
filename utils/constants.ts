/**
 * Константы приложения
 */

export const FILE_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB

export const COLOR_PRESETS = ['indigo', 'emerald', 'amber', 'purple', 'rose', 'cyan', 'blue'] as const;

export const ADMIN_USERNAMES = new Set(['admin', 'aksenod']);

export const QUESTION_PREFIXES = [
  'как',
  'что',
  'зачем',
  'почему',
  'когда',
  'какие',
  'какой',
  'какая',
  'каких',
  'сколько',
  'можно ли',
  'how',
  'what',
  'why',
  'when',
  'which',
  'can',
  'should',
] as const;

