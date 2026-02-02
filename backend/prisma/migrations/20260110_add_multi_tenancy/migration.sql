-- Migration: Add Multi-Tenancy Support
-- This migration adds tenant support to the existing schema by:
-- 1. Creating the tenants and tenant_members tables
-- 2. Creating a default "System" tenant for existing data
-- 3. Adding tenant_id columns to all tenant-scoped tables

-- ============================================================================
-- Step 1: Create the tenants table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "tenants" (
    "tenant_id" BIGSERIAL PRIMARY KEY,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL UNIQUE,
    "domain" VARCHAR(255) UNIQUE,
    "logo_url" VARCHAR(500),
    "primary_color" VARCHAR(7) DEFAULT '#f1184c',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "plan" VARCHAR(50) NOT NULL DEFAULT 'FREE',
    "billing_email" VARCHAR(255),
    "trial_ends_at" TIMESTAMPTZ(6),
    "max_users" INTEGER NOT NULL DEFAULT 5,
    "max_projects" INTEGER NOT NULL DEFAULT 10,
    "max_storage" BIGINT NOT NULL DEFAULT 1073741824,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS "tenants_slug_idx" ON "tenants"("slug");
CREATE INDEX IF NOT EXISTS "tenants_status_idx" ON "tenants"("status");

-- ============================================================================
-- Step 2: Create the tenant_members table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "tenant_members" (
    "id" BIGSERIAL PRIMARY KEY,
    "tenant_id" BIGINT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "user_id" BIGINT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
    "role" VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "invited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "joined_at" TIMESTAMPTZ(6),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    UNIQUE("tenant_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "tenant_members_user_id_idx" ON "tenant_members"("user_id");

-- ============================================================================
-- Step 3: Create a default system tenant for existing data
-- ============================================================================
INSERT INTO "tenants" ("name", "slug", "status", "plan", "max_users", "max_projects")
VALUES ('Default Organization', 'default', 'ACTIVE', 'ENTERPRISE', 1000, 10000)
ON CONFLICT ("slug") DO NOTHING;

-- Get the default tenant ID
DO $$
DECLARE
    default_tenant_id BIGINT;
BEGIN
    SELECT tenant_id INTO default_tenant_id FROM tenants WHERE slug = 'default';
    
    -- ============================================================================
    -- Step 4: Add tenant_id columns to existing tables
    -- ============================================================================
    
    -- Positions table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'tenant_id') THEN
        ALTER TABLE "positions" ADD COLUMN "tenant_id" BIGINT;
        UPDATE "positions" SET "tenant_id" = default_tenant_id;
        ALTER TABLE "positions" ALTER COLUMN "tenant_id" SET NOT NULL;
        ALTER TABLE "positions" ADD CONSTRAINT "positions_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;
    END IF;
    
    -- Roles table (nullable for system roles)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'tenant_id') THEN
        ALTER TABLE "roles" ADD COLUMN "tenant_id" BIGINT;
        ALTER TABLE "roles" ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT false;
        -- Keep existing roles as system roles (null tenant_id)
        ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;
    END IF;
    
    -- Departments table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'tenant_id') THEN
        ALTER TABLE "departments" ADD COLUMN "tenant_id" BIGINT;
        UPDATE "departments" SET "tenant_id" = default_tenant_id;
        ALTER TABLE "departments" ALTER COLUMN "tenant_id" SET NOT NULL;
        ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;
    END IF;
    
    -- Projects table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'tenant_id') THEN
        ALTER TABLE "projects" ADD COLUMN "tenant_id" BIGINT;
        UPDATE "projects" SET "tenant_id" = default_tenant_id;
        ALTER TABLE "projects" ALTER COLUMN "tenant_id" SET NOT NULL;
        ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;
    END IF;
    
    -- Teams table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'tenant_id') THEN
        ALTER TABLE "teams" ADD COLUMN "tenant_id" BIGINT;
        UPDATE "teams" SET "tenant_id" = default_tenant_id;
        ALTER TABLE "teams" ALTER COLUMN "tenant_id" SET NOT NULL;
        ALTER TABLE "teams" ADD CONSTRAINT "teams_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;
    END IF;
    
    -- Workspaces table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'tenant_id') THEN
        ALTER TABLE "workspaces" ADD COLUMN "tenant_id" BIGINT;
        UPDATE "workspaces" SET "tenant_id" = default_tenant_id;
        ALTER TABLE "workspaces" ALTER COLUMN "tenant_id" SET NOT NULL;
        ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;
    END IF;
    
    -- Labels table (nullable for system labels)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labels' AND column_name = 'tenant_id') THEN
        ALTER TABLE "labels" ADD COLUMN "tenant_id" BIGINT;
        -- Keep existing labels as system labels (null tenant_id)
        ALTER TABLE "labels" ADD CONSTRAINT "labels_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;
    END IF;
    
    -- Meetings table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'tenant_id') THEN
        ALTER TABLE "meetings" ADD COLUMN "tenant_id" BIGINT;
        UPDATE "meetings" SET "tenant_id" = default_tenant_id;
        ALTER TABLE "meetings" ALTER COLUMN "tenant_id" SET NOT NULL;
        ALTER TABLE "meetings" ADD CONSTRAINT "meetings_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;
    END IF;
    
    -- Chat threads table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_threads' AND column_name = 'tenant_id') THEN
        ALTER TABLE "chat_threads" ADD COLUMN "tenant_id" BIGINT;
        UPDATE "chat_threads" SET "tenant_id" = default_tenant_id;
        ALTER TABLE "chat_threads" ALTER COLUMN "tenant_id" SET NOT NULL;
        ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;
    END IF;
    
    -- Task statuses table (nullable for system templates)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_statuses' AND column_name = 'tenant_id') THEN
        ALTER TABLE "task_statuses" ADD COLUMN "tenant_id" BIGINT;
        -- Keep existing statuses as-is, update non-project-scoped ones to default tenant
        UPDATE "task_statuses" SET "tenant_id" = default_tenant_id WHERE "project_id" IS NULL AND "department_id" IS NULL;
        ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;
    END IF;
    
    -- ============================================================================
    -- Step 5: Add all existing users to the default tenant as members
    -- ============================================================================
    INSERT INTO "tenant_members" ("tenant_id", "user_id", "role", "is_default", "status", "joined_at")
    SELECT default_tenant_id, "user_id", 'MEMBER', true, 'ACTIVE', NOW()
    FROM "users" WHERE "deleted_at" IS NULL
    ON CONFLICT ("tenant_id", "user_id") DO NOTHING;
    
    -- Make the first user an OWNER
    UPDATE "tenant_members" 
    SET "role" = 'OWNER' 
    WHERE "tenant_id" = default_tenant_id 
    AND "user_id" = (SELECT MIN("user_id") FROM "users" WHERE "deleted_at" IS NULL);

END $$;

-- ============================================================================
-- Step 6: Create indexes for tenant columns
-- ============================================================================
CREATE INDEX IF NOT EXISTS "positions_tenant_id_idx" ON "positions"("tenant_id");
CREATE INDEX IF NOT EXISTS "roles_tenant_id_idx" ON "roles"("tenant_id");
CREATE INDEX IF NOT EXISTS "departments_tenant_id_idx" ON "departments"("tenant_id");
CREATE INDEX IF NOT EXISTS "projects_tenant_id_idx" ON "projects"("tenant_id");
CREATE INDEX IF NOT EXISTS "teams_tenant_id_idx" ON "teams"("tenant_id");
CREATE INDEX IF NOT EXISTS "workspaces_tenant_id_idx" ON "workspaces"("tenant_id");
CREATE INDEX IF NOT EXISTS "labels_tenant_id_idx" ON "labels"("tenant_id");
CREATE INDEX IF NOT EXISTS "meetings_tenant_id_idx" ON "meetings"("tenant_id");
CREATE INDEX IF NOT EXISTS "chat_threads_tenant_id_idx" ON "chat_threads"("tenant_id");
CREATE INDEX IF NOT EXISTS "task_statuses_tenant_id_idx" ON "task_statuses"("tenant_id");

-- ============================================================================
-- Step 7: Update unique constraints to be tenant-scoped
-- ============================================================================

-- Drop old unique constraints and create new tenant-scoped ones
-- Note: Using DO blocks to handle cases where constraints may not exist

DO $$
BEGIN
    -- Positions: Drop global unique and add tenant-scoped
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'positions_position_name_key') THEN
        ALTER TABLE "positions" DROP CONSTRAINT "positions_position_name_key";
    END IF;
    
    -- Roles: Drop global unique and add tenant-scoped
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_role_name_key') THEN
        ALTER TABLE "roles" DROP CONSTRAINT "roles_role_name_key";
    END IF;
    
    -- Departments: Drop global unique and add tenant-scoped
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_code_key') THEN
        ALTER TABLE "departments" DROP CONSTRAINT "departments_code_key";
    END IF;
    
    -- Teams: Drop global unique and add tenant-scoped
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_team_name_key') THEN
        ALTER TABLE "teams" DROP CONSTRAINT "teams_team_name_key";
    END IF;
    
    -- Labels: Drop global unique and add tenant-scoped
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'labels_label_name_key') THEN
        ALTER TABLE "labels" DROP CONSTRAINT "labels_label_name_key";
    END IF;
    
    -- Task statuses: Update unique constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_statuses_project_id_department_id_code_key') THEN
        ALTER TABLE "task_statuses" DROP CONSTRAINT "task_statuses_project_id_department_id_code_key";
    END IF;
END $$;

-- Create new tenant-scoped unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "positions_tenant_id_position_name_key" ON "positions"("tenant_id", "position_name");
CREATE UNIQUE INDEX IF NOT EXISTS "roles_tenant_id_role_name_key" ON "roles"("tenant_id", "role_name");
CREATE UNIQUE INDEX IF NOT EXISTS "departments_tenant_id_code_key" ON "departments"("tenant_id", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "teams_tenant_id_team_name_key" ON "teams"("tenant_id", "team_name");
CREATE UNIQUE INDEX IF NOT EXISTS "labels_tenant_id_label_name_key" ON "labels"("tenant_id", "label_name");
CREATE UNIQUE INDEX IF NOT EXISTS "task_statuses_tenant_id_project_id_department_id_code_key" 
    ON "task_statuses"("tenant_id", "project_id", "department_id", "code");
