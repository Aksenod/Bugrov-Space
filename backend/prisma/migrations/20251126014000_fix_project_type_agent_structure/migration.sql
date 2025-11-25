-- CreateTable: создаем таблицу для связи many-to-many
CREATE TABLE IF NOT EXISTS "ProjectTypeAgentProjectType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectTypeAgentId" TEXT NOT NULL,
    "projectTypeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectTypeAgentProjectType_projectTypeAgentId_fkey" FOREIGN KEY ("projectTypeAgentId") REFERENCES "ProjectTypeAgent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectTypeAgentProjectType_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "ProjectType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectTypeAgentProjectType_projectTypeAgentId_idx" ON "ProjectTypeAgentProjectType"("projectTypeAgentId");
CREATE INDEX IF NOT EXISTS "ProjectTypeAgentProjectType_projectTypeId_idx" ON "ProjectTypeAgentProjectType"("projectTypeId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTypeAgentProjectType_projectTypeAgentId_projectTypeId_key" ON "ProjectTypeAgentProjectType"("projectTypeAgentId", "projectTypeId");

-- Миграция данных: переносим существующие связи из старого поля в новую таблицу
-- Используем cuid-подобный формат для генерации ID
INSERT INTO "ProjectTypeAgentProjectType" ("id", "projectTypeAgentId", "projectTypeId", "order", "createdAt")
SELECT 
    -- Генерируем cuid-подобный ID (24 символа)
    lower(substr(md5(random()::text || clock_timestamp()::text), 1, 24)) as id,
    "id" as "projectTypeAgentId",
    "projectTypeId",
    0 as "order",
    CURRENT_TIMESTAMP as "createdAt"
FROM "ProjectTypeAgent"
WHERE "projectTypeId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- DropIndex: удаляем старый индекс
DROP INDEX IF EXISTS "ProjectTypeAgent_projectTypeId_idx";

-- AlterTable: удаляем старое поле projectTypeId и поле order (которого нет в новой схеме)
-- В PostgreSQL нужно сначала удалить внешний ключ, потом поле
ALTER TABLE "ProjectTypeAgent" DROP CONSTRAINT IF EXISTS "ProjectTypeAgent_projectTypeId_fkey";
ALTER TABLE "ProjectTypeAgent" DROP COLUMN IF EXISTS "projectTypeId";
ALTER TABLE "ProjectTypeAgent" DROP COLUMN IF EXISTS "order";

