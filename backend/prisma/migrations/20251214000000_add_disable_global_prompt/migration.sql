-- AlterTable
ALTER TABLE "Agent" ADD COLUMN "disableGlobalPrompt" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProjectTypeAgent" ADD COLUMN "disableGlobalPrompt" BOOLEAN NOT NULL DEFAULT false;
