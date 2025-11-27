import { prisma } from '../db/prisma';
import { withRetry } from '../utils/prismaRetry';
import { logger } from '../utils/logger';

const GLOBAL_PROMPT_ID = 1;
const CACHE_TTL_MS = 60 * 1000; // 60 секунд

type GlobalPromptRecord = {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

type CachedPrompt = {
  record: GlobalPromptRecord;
  expiresAt: number;
};

let cache: CachedPrompt | null = null;

async function findOrCreateGlobalPrompt(): Promise<GlobalPromptRecord> {
  const existing = await withRetry(
    () =>
      prisma.globalPrompt.findUnique({
        where: { id: GLOBAL_PROMPT_ID },
      }),
    3,
    'globalPrompt.findUnique',
  );

  if (existing) {
    return existing;
  }

  const created = await withRetry(
    () =>
      prisma.globalPrompt.create({
        data: {
          id: GLOBAL_PROMPT_ID,
          content: '',
        },
      }),
    3,
    'globalPrompt.create',
  );

  logger.info('Global prompt record created with default empty content');
  return created;
}

function updateCache(record: GlobalPromptRecord) {
  cache = {
    record,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

export async function getGlobalPromptRecord(forceRefresh = false): Promise<GlobalPromptRecord> {
  if (!forceRefresh && cache && cache.expiresAt > Date.now()) {
    return cache.record;
  }

  const record = await findOrCreateGlobalPrompt();
  updateCache(record);
  return record;
}

export async function getGlobalPromptText(): Promise<string> {
  const record = await getGlobalPromptRecord();
  return record.content ?? '';
}

export async function updateGlobalPrompt(content: string): Promise<GlobalPromptRecord> {
  const record = await withRetry(
    () =>
      prisma.globalPrompt.upsert({
        where: { id: GLOBAL_PROMPT_ID },
        update: { content },
        create: {
          id: GLOBAL_PROMPT_ID,
          content,
        },
      }),
    3,
    'globalPrompt.upsert',
  );

  updateCache(record);
  logger.info({ updatedAt: record.updatedAt }, 'Global prompt updated');
  return record;
}

export function invalidateGlobalPromptCache() {
  cache = null;
}

