-- AlterTable: добавляем projectTypeAgentId, если еще не существует
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'File' AND column_name = 'projectTypeAgentId'
    ) THEN
        ALTER TABLE "File" ADD COLUMN "projectTypeAgentId" TEXT;
    END IF;
END $$;

-- CreateIndex: создаем индексы, если они еще не существуют
CREATE INDEX IF NOT EXISTS "File_projectTypeAgentId_idx" ON "File"("projectTypeAgentId");
CREATE INDEX IF NOT EXISTS "File_projectTypeAgentId_isKnowledgeBase_idx" ON "File"("projectTypeAgentId", "isKnowledgeBase");
CREATE INDEX IF NOT EXISTS "File_projectTypeAgentId_createdAt_idx" ON "File"("projectTypeAgentId", "createdAt");

-- AlterTable: делаем agentId nullable, если еще не nullable
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'File' 
        AND column_name = 'agentId' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "File" ALTER COLUMN "agentId" DROP NOT NULL;
    END IF;
END $$;
