import { fetch } from 'undici';
import { logger } from '../utils/logger';
import { env } from '../env';

const TAVILY_API_URL = 'https://api.tavily.com/search';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  answer?: string; // Краткий ответ от Tavily (если доступен)
  responseTime?: number;
}

/**
 * Выполняет глубокий веб-поиск с использованием Tavily API
 * Tavily специально разработан для AI-исследований и возвращает релевантный контент
 */
export async function performDeepWebSearch(
  query: string,
  maxResults: number = 5
): Promise<WebSearchResponse> {
  if (!env.tavilyApiKey) {
    logger.warn('Tavily API key not configured, skipping web search');
    throw new Error('Web search is not configured. Please set TAVILY_API_KEY in environment variables.');
  }

  try {
    const startTime = Date.now();
    
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: env.tavilyApiKey,
        query: query,
        search_depth: 'advanced', // 'basic' или 'advanced' для глубокого поиска
        include_answer: true, // Получить краткий ответ от Tavily
        include_raw_content: false, // Не включать сырой HTML
        max_results: maxResults,
        include_domains: [], // Можно указать конкретные домены для поиска
        exclude_domains: [], // Исключить определенные домены
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Tavily API error: ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `${errorMessage} - ${errorText}`;
      }

      logger.error(
        { status: response.status, error: errorText, query },
        'Tavily API request failed'
      );
      throw new Error(errorMessage);
    }

    const data = await response.json() as any;
    const responseTime = Date.now() - startTime;

    const results: SearchResult[] = (data.results || []).map((result: any) => ({
      title: result.title || 'Untitled',
      url: result.url || '',
      content: result.content || '',
      score: result.score,
    }));

    logger.info(
      { query, resultsCount: results.length, responseTime },
      'Web search completed successfully'
    );

    return {
      query,
      results,
      answer: data.answer, // Краткий ответ от Tavily
      responseTime,
    };
  } catch (error) {
    logger.error(
      { query, error: error instanceof Error ? error.message : 'Unknown error' },
      'Web search failed'
    );
    throw error;
  }
}

/**
 * Определяет, нужен ли веб-поиск для данного запроса
 * Проверяет роль агента - если роль "search", поиск выполняется всегда
 */
export function shouldPerformWebSearch(
  userMessage: string,
  agentRole?: string | null
): boolean {
  const message = userMessage.toLowerCase().trim();
  const role = (agentRole || '').toLowerCase();

  // Проверяем, есть ли у агента роль "search"
  const roles = role.split(',').map(r => r.trim().toLowerCase());
  const isSearchRole = roles.includes('search');

  // Если у агента роль search - ВСЕГДА выполняем поиск
  if (isSearchRole) {
    logger.info({ agentRole: role, message }, 'Agent has search role, performing web search');
    return true;
  }

  // Для остальных агентов проверяем ключевые слова
  const searchKeywords = [
    'найди', 'найти', 'поищи', 'поиск',
    'исследуй', 'исследование',
    'актуальн', 'текущ', 'сейчас', 'недавн',
    'новост', 'тренд', 'тренды',
    'статистик', 'данные',
    'информация о', 'что такое', 'кто такой',
    'когда', 'где', 'сколько',
    'latest', 'current', 'recent',
    'find', 'search', 'research',
    'what is', 'who is', 'when', 'where',
  ];

  const hasSearchKeywords = searchKeywords.some(keyword => 
    message.includes(keyword)
  );

  if (hasSearchKeywords) {
    return true;
  }

  // Если запрос содержит вопросительный знак и достаточно длинный
  if (message.includes('?') && message.length > 15) {
    return true;
  }

  return false;
}

