-- AlterTable
ALTER TABLE "Agent" ADD COLUMN "quickMessages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ProjectTypeAgent" ADD COLUMN "quickMessages" TEXT[] DEFAULT ARRAY[]::TEXT[];

