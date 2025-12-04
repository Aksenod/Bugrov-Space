import { UploadedFile, PrototypeVersion } from '../types';

/**
 * Декодировать base64 в текст
 */
export const decodeBase64ToText = (base64: string): string => {
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (e) {
    return base64;
  }
};

/**
 * Получить контент прототипа для отображения
 */
export const getPrototypeContent = (
  file: UploadedFile | null,
  versions: PrototypeVersion[],
  selectedVersionNumber: number | null,
  subTab: 'preview' | 'dsl' | 'html'
): string | null => {
  if (!file) return null;

  // Если выбрана конкретная версия, используем её
  if (selectedVersionNumber !== null) {
    const version = versions.find(v => v.versionNumber === selectedVersionNumber);
    if (version) {
      if (subTab === 'dsl') return version.dslContent || null;
      if (subTab === 'html') return version.verstkaContent || null;
      return version.verstkaContent || null;
    }
  }

  // Иначе используем контент из файла
  if (subTab === 'dsl') return file.dslContent || null;
  if (subTab === 'html') return file.verstkaContent || null;
  return file.verstkaContent || null;
};

/**
 * Проверить, есть ли у файла прототип
 */
export const hasPrototype = (file: UploadedFile | null): boolean => {
  if (!file) return false;
  return !!(file.dslContent || file.verstkaContent);
};

/**
 * Получить последнюю версию прототипа
 */
export const getLatestVersion = (versions: PrototypeVersion[]): PrototypeVersion | null => {
  if (versions.length === 0) return null;
  return versions.reduce((latest, current) => 
    current.versionNumber > latest.versionNumber ? current : latest
  );
};


