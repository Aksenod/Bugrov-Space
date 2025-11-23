-- CreateTable
CREATE TABLE "ProjectType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectType_name_key" ON "ProjectType"("name");

-- Insert default project type
INSERT INTO "ProjectType" ("id", "name", "createdAt", "updatedAt")
VALUES ('default', 'По умолчанию', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: Add projectTypeId to Project
-- First, add the column as nullable
ALTER TABLE "Project" ADD COLUMN "projectTypeId" TEXT;

-- Update all existing projects to use the default project type
UPDATE "Project" SET "projectTypeId" = 'default' WHERE "projectTypeId" IS NULL;

-- Now make it NOT NULL by recreating the table
CREATE TABLE "Project_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "projectTypeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "ProjectType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy data
INSERT INTO "Project_new" SELECT * FROM "Project";

-- Drop old table and rename new one
DROP TABLE "Project";
ALTER TABLE "Project_new" RENAME TO "Project";

-- CreateIndex
CREATE INDEX "Project_projectTypeId_idx" ON "Project"("projectTypeId");

