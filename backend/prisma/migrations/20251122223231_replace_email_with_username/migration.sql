-- DropIndex
DROP INDEX IF EXISTS "User_email_key";

-- CreateTable (temporary table)
CREATE TABLE "User_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarColor" TEXT DEFAULT 'indigo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Copy data from old table (if any) - Note: email and name are not copied, user will need to re-register
-- For MVP, we skip data migration. Users will need to re-register with username.

-- DropTable
DROP TABLE "User";

-- RenameTable
ALTER TABLE "User_new" RENAME TO "User";

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

