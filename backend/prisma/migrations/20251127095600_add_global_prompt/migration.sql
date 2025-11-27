-- CreateTable
CREATE TABLE "GlobalPrompt" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GlobalPrompt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GlobalPrompt_singleton_check" CHECK ("id" = 1)
);


