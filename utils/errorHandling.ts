/**
 * Функции для обработки и трансляции ошибок
 */

/**
 * Извлекает сообщение об ошибке из различных форматов ошибок
 */
export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    const err = error as any;
    
    if (err?.message && typeof err.message === 'string') {
      return err.message;
    }
    
    if (err?.error && typeof err.error === 'string') {
      return err.error;
    }
    
    // Если это объект валидации Zod с issues
    if (err.issues && Array.isArray(err.issues)) {
      return err.issues.map((issue: any) => {
        if (issue.path && issue.path.length > 0) {
          return `${issue.path.join('.')}: ${issue.message}`;
        }
        return issue.message;
      }).join(', ');
    }
    
    // Если это объект с _errors (Zod flatten)
    if (err._errors && Array.isArray(err._errors)) {
      return err._errors.join(', ');
    }
    
    // Пытаемся найти строковое сообщение в объекте
    const message = JSON.stringify(error);
    if (message !== '{}' && message.length < 200) {
      return message;
    }
  }
  
  return 'Произошла неизвестная ошибка';
};

/**
 * Транслирует технические сообщения об ошибках в понятные пользователю сообщения
 */
export const translateErrorMessage = (message: string): string => {
  const translations: Record<string, string> = {
    'Invalid credentials': 'Неверное имя пользователя или пароль',
    'Username already taken': 'Имя пользователя уже занято',
    'User not found': 'Пользователь не найден',
    'Unauthorized': 'Не авторизован',
    'Forbidden: Admin access required': 'Доступ запрещен: требуется права администратора',
    'Validation error:': 'Ошибка валидации:',
    'username: String must contain at least 1 character(s)': 'Имя пользователя не может быть пустым',
    'password: String must contain at least 6 character(s)': 'Пароль должен содержать минимум 6 символов',
    'newPassword: String must contain at least 6 character(s)': 'Новый пароль должен содержать минимум 6 символов',
    'Database error': 'Ошибка базы данных',
    'Database connection error': 'Ошибка подключения к базе данных',
    'Database is temporarily unavailable. Please try again later.': 'База данных временно недоступна. Попробуйте позже.',
    'A database error occurred. Please try again later.': 'Произошла ошибка базы данных. Попробуйте позже.',
    'Cannot reach database': 'Не удается подключиться к базе данных',
    'Server has closed the connection': 'Соединение с базой данных было закрыто',
    // Ошибки таймаута
    'Request timeout': 'Запрос превысил время ожидания',
    // Сетевые ошибки
    'Failed to fetch': 'Не удалось подключиться к серверу',
    'NetworkError': 'Ошибка сети',
    'Network request failed': 'Сетевой запрос не выполнен',
    'Load failed': 'Не удалось загрузить данные',
    // Ошибки сервера
    'Bad Gateway': 'Сервер временно недоступен',
    'Service Unavailable': 'Сервис временно недоступен',
    'Gateway Timeout': 'Сервер не отвечает',
    // Rate limit
    'Rate limit exceeded': 'Превышен лимит запросов',
    'Too many requests': 'Слишком много запросов',
  };

  // Проверяем точные совпадения
  if (translations[message]) {
    return translations[message];
  }

  // Обрабатываем ошибки валидации с несколькими полями
  if (message.includes('Validation error:')) {
    let translated = message.replace('Validation error:', 'Ошибка валидации:');
    translated = translated.replace(/username: String must contain at least 1 character\(s\)/g, 'Имя пользователя не может быть пустым');
    translated = translated.replace(/password: String must contain at least 6 character\(s\)/g, 'Пароль должен содержать минимум 6 символов');
    translated = translated.replace(/newPassword: String must contain at least 6 character\(s\)/g, 'Новый пароль должен содержать минимум 6 символов');
    return translated;
  }

  // Проверяем частичные совпадения
  for (const [key, value] of Object.entries(translations)) {
    if (message.includes(key)) {
      return message.replace(key, value);
    }
  }

  // Обработка сообщений с частичным совпадением для сетевых ошибок
  if (message.toLowerCase().includes('failed to fetch') || 
      message.toLowerCase().includes('networkerror') ||
      message.toLowerCase().includes('network request failed') ||
      message.toLowerCase().includes('load failed')) {
    return 'Не удалось подключиться к серверу. Проверьте подключение к интернету или попробуйте позже.';
  }

  // Обработка сообщений о таймауте
  if (message.toLowerCase().includes('timeout') || message.toLowerCase().includes('превысил время ожидания')) {
    // Если сообщение уже на русском и содержит информацию о секундах, оставляем как есть
    if (message.includes('секунд')) {
      return message;
    }
    return 'Запрос превысил время ожидания. Сервер может быть перегружен или недоступен.';
  }

  // Обработка сообщений о недоступности сервера
  if (message.toLowerCase().includes('unavailable') || 
      message.toLowerCase().includes('недоступен') ||
      message.toLowerCase().includes('не отвечает')) {
    // Если сообщение уже на русском, оставляем как есть
    if (/[а-яё]/i.test(message)) {
      return message;
    }
    return 'Сервер временно недоступен. Попробуйте позже.';
  }

  // Обработка rate limit
  if (message.toLowerCase().includes('rate limit') || 
      message.toLowerCase().includes('too many requests') ||
      message.toLowerCase().includes('превышен лимит')) {
    // Если сообщение уже на русском, оставляем как есть
    if (/[а-яё]/i.test(message)) {
      return message;
    }
    return 'Превышен лимит запросов. Пожалуйста, подождите немного и попробуйте снова.';
  }

  // Если сообщение содержит только техническую информацию, возвращаем понятное сообщение
  if (message.includes('Request failed') || 
      (message.includes('Network') && !/[а-яё]/i.test(message))) {
    return 'Ошибка соединения. Проверьте подключение к интернету.';
  }

  return message;
};

