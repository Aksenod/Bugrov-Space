-- AlterTable
ALTER TABLE "Agent" ADD COLUMN "isHiddenFromSidebar" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProjectTypeAgent" ADD COLUMN "isHiddenFromSidebar" BOOLEAN NOT NULL DEFAULT false;
