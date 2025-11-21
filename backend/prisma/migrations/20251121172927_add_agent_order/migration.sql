-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "systemInstruction" TEXT NOT NULL DEFAULT '',
    "summaryInstruction" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT 'gpt-5.1',
    "role" TEXT DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Agent" ("createdAt", "description", "id", "model", "name", "role", "summaryInstruction", "systemInstruction", "updatedAt", "userId") SELECT "createdAt", "description", "id", "model", "name", "role", "summaryInstruction", "systemInstruction", "updatedAt", "userId" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Populate order per user based on creation time
WITH ordered AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt") - 1 AS rn
    FROM "Agent"
)
UPDATE "Agent"
SET "order" = (
    SELECT ordered.rn FROM ordered WHERE ordered.id = "Agent"."id"
);

