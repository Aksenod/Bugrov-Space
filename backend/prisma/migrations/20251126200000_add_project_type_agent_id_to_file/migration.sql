-- AlterTable
ALTER TABLE "File" ADD COLUMN "projectTypeAgentId" TEXT;

-- CreateIndex
CREATE INDEX "File_projectTypeAgentId_idx" ON "File"("projectTypeAgentId");

-- CreateIndex
CREATE INDEX "File_projectTypeAgentId_isKnowledgeBase_idx" ON "File"("projectTypeAgentId", "isKnowledgeBase");

-- CreateIndex
CREATE INDEX "File_projectTypeAgentId_createdAt_idx" ON "File"("projectTypeAgentId", "createdAt");

-- AlterTable: делаем agentId nullable
ALTER TABLE "File" ALTER COLUMN "agentId" DROP NOT NULL;

