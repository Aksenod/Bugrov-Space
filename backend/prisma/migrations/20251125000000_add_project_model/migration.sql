-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Delete all existing agents as they cannot exist without a project
DELETE FROM "Agent";

-- AlterTable: Add projectId to Agent (required)
-- First, we need to recreate the table because SQLite doesn't support adding NOT NULL columns directly
CREATE TABLE "Agent_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "systemInstruction" TEXT NOT NULL DEFAULT '',
    "summaryInstruction" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT 'gpt-5.1',
    "role" TEXT DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy structure (but no data, as we deleted agents above)
-- Since we deleted all agents, we can just drop and rename

DROP TABLE "Agent";
ALTER TABLE "Agent_new" RENAME TO "Agent";

-- CreateIndex
CREATE INDEX "Agent_projectId_idx" ON "Agent"("projectId");
CREATE INDEX "Agent_userId_idx" ON "Agent"("userId");

