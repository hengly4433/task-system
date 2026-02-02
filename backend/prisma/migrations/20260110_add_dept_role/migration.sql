-- Add role column to user_departments table
ALTER TABLE "user_departments" 
ADD COLUMN IF NOT EXISTS "role" VARCHAR(20) NOT NULL DEFAULT 'MEMBER';

-- Set default value for existing records
UPDATE "user_departments" SET "role" = 'MEMBER' WHERE "role" IS NULL;
