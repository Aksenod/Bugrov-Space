-- Add optional reference from Agent to ProjectTypeAgent for synchronization
ALTER TABLE "Agent"
ADD COLUMN "projectTypeAgentId" TEXT;

CREATE INDEX "Agent_projectTypeAgentId_idx" ON "Agent"("projectTypeAgentId");

ALTER TABLE "Agent"
ADD CONSTRAINT "Agent_projectTypeAgentId_fkey"
FOREIGN KEY ("projectTypeAgentId") REFERENCES "ProjectTypeAgent"("id")
ON DELETE CASCADE ON UPDATE CASCADE;






