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

  // Если сообщение содержит только техническую информацию, возвращаем понятное сообщение
  if (message.includes('Request failed') || message.includes('Network')) {
    return 'Ошибка соединения. Проверьте подключение к интернету.';
  }

  return message;
};

