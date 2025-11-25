-- CreateTable: создаем таблицу для связи many-to-many
CREATE TABLE IF NOT EXISTS "ProjectTypeAgentProjectType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectTypeAgentId" TEXT NOT NULL,
    "projectTypeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
-- Проверяем, существует ли колонка projectTypeId перед миграцией данных
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ProjectTypeAgent' 
        AND column_name = 'projectTypeId'
    ) THEN
        INSERT INTO "ProjectTypeAgentProjectType" ("id", "projectTypeAgentId", "projectTypeId", "order", "createdAt")
        SELECT 
            -- Генерируем cuid-подобный ID используя md5 и timestamp
            lower(substr(md5(random()::text || clock_timestamp()::text || row_number() OVER ()::text), 1, 25)),
            "id",
            "projectTypeId",
            0,
            CURRENT_TIMESTAMP
        FROM "ProjectTypeAgent"
        WHERE "projectTypeId" IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM "ProjectTypeAgentProjectType" 
            WHERE "projectTypeAgentProjectType"."projectTypeAgentId" = "ProjectTypeAgent"."id"
            AND "projectTypeAgentProjectType"."projectTypeId" = "ProjectTypeAgent"."projectTypeId"
        );
    END IF;
END $$;

-- DropIndex: удаляем старый индекс
DROP INDEX IF EXISTS "ProjectTypeAgent_projectTypeId_idx";

-- AlterTable: удаляем старое поле projectTypeId и поле order (которого нет в новой схеме)
-- В PostgreSQL нужно сначала удалить внешний ключ, потом поле
-- Проверяем существование колонок перед удалением
DO $$
BEGIN
    -- Удаляем внешний ключ, если существует
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'ProjectTypeAgent_projectTypeId_fkey'
        AND table_name = 'ProjectTypeAgent'
    ) THEN
        ALTER TABLE "ProjectTypeAgent" DROP CONSTRAINT "ProjectTypeAgent_projectTypeId_fkey";
    END IF;
    
    -- Удаляем колонку projectTypeId, если существует
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ProjectTypeAgent' 
        AND column_name = 'projectTypeId'
    ) THEN
        ALTER TABLE "ProjectTypeAgent" DROP COLUMN "projectTypeId";
    END IF;
    
    -- Удаляем колонку order, если существует
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ProjectTypeAgent' 
        AND column_name = 'order'
    ) THEN
        ALTER TABLE "ProjectTypeAgent" DROP COLUMN "order";
    END IF;
END $$;

