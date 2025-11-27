-- CreateTable
CREATE TABLE "ProjectTypeAgent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "systemInstruction" TEXT NOT NULL DEFAULT '',
    "summaryInstruction" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT 'gpt-5.1',
    "role" TEXT DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectTypeAgent_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "ProjectType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProjectTypeAgent_projectTypeId_idx" ON "ProjectTypeAgent"("projectTypeId");






