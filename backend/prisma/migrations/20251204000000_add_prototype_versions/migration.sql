-- CreateTable
CREATE TABLE "PrototypeVersion" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "dslContent" TEXT,
    "verstkaContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrototypeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrototypeVersion_fileId_idx" ON "PrototypeVersion"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "PrototypeVersion_fileId_versionNumber_key" ON "PrototypeVersion"("fileId", "versionNumber");

-- CreateIndex
CREATE INDEX "PrototypeVersion_fileId_versionNumber_idx" ON "PrototypeVersion"("fileId", "versionNumber");

-- AddForeignKey
ALTER TABLE "PrototypeVersion" ADD CONSTRAINT "PrototypeVersion_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

