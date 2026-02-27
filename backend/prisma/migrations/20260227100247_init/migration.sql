-- CreateTable
CREATE TABLE "tenants" (
    "tenant_id" BIGSERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "domain" VARCHAR(255),
    "logo_url" VARCHAR(500),
    "primary_color" VARCHAR(7) DEFAULT '#f1184c',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "industry" VARCHAR(100),
    "company_size" VARCHAR(50),
    "founded_year" INTEGER,
    "tax_id" VARCHAR(50),
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "website" VARCHAR(255),
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "plan" VARCHAR(50) NOT NULL DEFAULT 'FREE',
    "billing_email" VARCHAR(255),
    "trial_ends_at" TIMESTAMPTZ(6),
    "subscription_ends_at" TIMESTAMPTZ(6),
    "grace_period_ends_at" TIMESTAMPTZ(6),
    "grace_period_days" INTEGER NOT NULL DEFAULT 3,
    "max_users" INTEGER NOT NULL DEFAULT 5,
    "max_projects" INTEGER NOT NULL DEFAULT 10,
    "max_storage" BIGINT NOT NULL DEFAULT 1073741824,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "tenant_members" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "invited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joined_at" TIMESTAMPTZ(6),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" BIGSERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "full_name" VARCHAR(150),
    "position_id" BIGINT,
    "skype_id" VARCHAR(100),
    "profile_image_url" VARCHAR(500),
    "presence_status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "last_seen_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "positions" (
    "position_id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "position_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("position_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "role_id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "role_name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(7),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "user_role_mappings" (
    "mapping_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "role_id" BIGINT NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_mappings_pkey" PRIMARY KEY ("mapping_id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "permission_id" BIGSERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" BIGSERIAL NOT NULL,
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "department_id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("department_id")
);

-- CreateTable
CREATE TABLE "user_departments" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "department_id" BIGINT NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "project_id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "project_name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "owner_id" BIGINT NOT NULL,
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "team_id" BIGINT,
    "workspace_id" BIGINT,
    "department_id" BIGINT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "member_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "task_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "parent_task_id" BIGINT,
    "status_id" BIGINT,
    "task_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'TODO',
    "priority" VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    "task_type" VARCHAR(50) NOT NULL DEFAULT 'TASK',
    "estimated_hours" DECIMAL(5,2),
    "remaining_hours" DECIMAL(5,2),
    "story_points" INTEGER,
    "percent_complete" INTEGER NOT NULL DEFAULT 0,
    "created_by" BIGINT NOT NULL,
    "assigned_to" BIGINT,
    "tester_id" BIGINT,
    "milestone_id" BIGINT,
    "team" VARCHAR(100),
    "module" VARCHAR(200),
    "external_link" VARCHAR(500),
    "build_version" VARCHAR(100),
    "start_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "due_date" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "sprint_id" BIGINT,
    "team_assigned_id" BIGINT,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("task_id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "comment_id" BIGSERIAL NOT NULL,
    "task_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "comment_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "attachment_id" BIGSERIAL NOT NULL,
    "task_id" BIGINT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(1024) NOT NULL,
    "mime_type" VARCHAR(120),
    "file_size" BIGINT,
    "uploaded_by" BIGINT,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("attachment_id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "time_entry_id" BIGSERIAL NOT NULL,
    "task_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "hours" DECIMAL(4,2) NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("time_entry_id")
);

-- CreateTable
CREATE TABLE "task_dependencies" (
    "dependency_id" BIGSERIAL NOT NULL,
    "task_id" BIGINT NOT NULL,
    "dependent_task_id" BIGINT NOT NULL,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("dependency_id")
);

-- CreateTable
CREATE TABLE "task_history" (
    "history_id" BIGSERIAL NOT NULL,
    "task_id" BIGINT NOT NULL,
    "changed_by" BIGINT NOT NULL,
    "change_description" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_history_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "milestone_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "milestone_name" VARCHAR(150) NOT NULL,
    "due_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("milestone_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "notification_text" TEXT NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" VARCHAR(50),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "preference_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "preference_name" VARCHAR(80) NOT NULL,
    "preference_value" VARCHAR(255) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "log_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "activity_type" VARCHAR(80) NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "bug_reports" (
    "bug_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "reported_by" BIGINT NOT NULL,
    "bug_description" TEXT NOT NULL,
    "reported_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("bug_id")
);

-- CreateTable
CREATE TABLE "checklists" (
    "checklist_id" BIGSERIAL NOT NULL,
    "task_id" BIGINT NOT NULL,
    "checklist_name" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("checklist_id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "checklist_item_id" BIGSERIAL NOT NULL,
    "checklist_id" BIGINT NOT NULL,
    "item_name" VARCHAR(200) NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("checklist_item_id")
);

-- CreateTable
CREATE TABLE "task_reminders" (
    "reminder_id" BIGSERIAL NOT NULL,
    "task_id" BIGINT NOT NULL,
    "reminder_text" VARCHAR(200) NOT NULL,
    "reminder_time" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "task_reminders_pkey" PRIMARY KEY ("reminder_id")
);

-- CreateTable
CREATE TABLE "labels" (
    "label_id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "label_name" VARCHAR(80) NOT NULL,
    "label_color" VARCHAR(7) NOT NULL,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("label_id")
);

-- CreateTable
CREATE TABLE "task_labels" (
    "task_label_id" BIGSERIAL NOT NULL,
    "task_id" BIGINT NOT NULL,
    "label_id" BIGINT NOT NULL,

    CONSTRAINT "task_labels_pkey" PRIMARY KEY ("task_label_id")
);

-- CreateTable
CREATE TABLE "sprints" (
    "sprint_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "sprint_name" VARCHAR(120) NOT NULL,
    "goal" VARCHAR(500),
    "start_date" DATE,
    "end_date" DATE,
    "status" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("sprint_id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "announcement_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "announcement_text" TEXT NOT NULL,
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("announcement_id")
);

-- CreateTable
CREATE TABLE "teams" (
    "team_id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "team_name" VARCHAR(120) NOT NULL,
    "owner_id" BIGINT NOT NULL,
    "department_id" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("team_id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "team_member_id" BIGSERIAL NOT NULL,
    "team_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_member_id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "workspace_id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "owner_id" BIGINT NOT NULL,
    "department_id" BIGINT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("workspace_id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" BIGSERIAL NOT NULL,
    "workspace_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "meeting_id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "agenda" TEXT,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "duration" INTEGER,
    "location" VARCHAR(500),
    "meeting_url" VARCHAR(1024),
    "status" VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    "task_id" BIGINT,
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("meeting_id")
);

-- CreateTable
CREATE TABLE "meeting_attendees" (
    "id" BIGSERIAL NOT NULL,
    "meeting_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_attachments" (
    "attachment_id" BIGSERIAL NOT NULL,
    "meeting_id" BIGINT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(1024) NOT NULL,
    "mime_type" VARCHAR(120),
    "file_size" BIGINT,
    "uploaded_by" BIGINT,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_attachments_pkey" PRIMARY KEY ("attachment_id")
);

-- CreateTable
CREATE TABLE "password_setup_tokens" (
    "token_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_setup_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "chat_threads" (
    "thread_id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "title" VARCHAR(200),
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("thread_id")
);

-- CreateTable
CREATE TABLE "chat_participants" (
    "participant_id" BIGSERIAL NOT NULL,
    "thread_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "is_marked" BOOLEAN NOT NULL DEFAULT false,
    "last_read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("participant_id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "message_id" BIGSERIAL NOT NULL,
    "thread_id" BIGINT NOT NULL,
    "sender_id" BIGINT NOT NULL,
    "content" TEXT NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "attachment_url" VARCHAR(1024),
    "attachment_type" VARCHAR(50),
    "attachment_name" VARCHAR(255),

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "chat_message_reactions" (
    "reaction_id" BIGSERIAL NOT NULL,
    "message_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "emoji" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_reactions_pkey" PRIMARY KEY ("reaction_id")
);

-- CreateTable
CREATE TABLE "task_watchers" (
    "watcher_id" BIGSERIAL NOT NULL,
    "task_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_watchers_pkey" PRIMARY KEY ("watcher_id")
);

-- CreateTable
CREATE TABLE "task_statuses" (
    "status_id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "project_id" BIGINT,
    "department_id" BIGINT,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#64748B',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "task_statuses_pkey" PRIMARY KEY ("status_id")
);

-- CreateTable
CREATE TABLE "sprint_templates" (
    "template_id" BIGSERIAL NOT NULL,
    "department_id" BIGINT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "name_pattern" VARCHAR(200),
    "duration_days" INTEGER NOT NULL DEFAULT 14,
    "goal_template" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sprint_templates_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "payment_history" (
    "payment_id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "status" VARCHAR(50) NOT NULL DEFAULT 'succeeded',
    "payment_provider" VARCHAR(50) NOT NULL,
    "external_id" VARCHAR(255),
    "plan" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_history_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "usage_alerts" (
    "alert_id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "alert_type" VARCHAR(50) NOT NULL,
    "threshold" INTEGER NOT NULL,
    "percentage" INTEGER NOT NULL,
    "sent_via_email" BOOLEAN NOT NULL DEFAULT false,
    "sent_via_app" BOOLEAN NOT NULL DEFAULT true,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_alerts_pkey" PRIMARY KEY ("alert_id")
);

-- CreateTable
CREATE TABLE "_ProjectAssignedTeams" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_ProjectAssignedTeams_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenant_members_user_id_idx" ON "tenant_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_members_tenant_id_user_id_key" ON "tenant_members"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "positions_tenant_id_idx" ON "positions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "positions_tenant_id_position_name_key" ON "positions"("tenant_id", "position_name");

-- CreateIndex
CREATE INDEX "roles_tenant_id_idx" ON "roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_role_name_key" ON "roles"("tenant_id", "role_name");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_mappings_user_id_role_id_key" ON "user_role_mappings"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_category_idx" ON "permissions"("category");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "departments_tenant_id_idx" ON "departments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_code_key" ON "departments"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "user_departments_user_id_idx" ON "user_departments"("user_id");

-- CreateIndex
CREATE INDEX "user_departments_department_id_idx" ON "user_departments"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_departments_user_id_department_id_key" ON "user_departments"("user_id", "department_id");

-- CreateIndex
CREATE INDEX "projects_tenant_id_idx" ON "projects"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");

-- CreateIndex
CREATE INDEX "tasks_assigned_to_idx" ON "tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks"("parent_task_id");

-- CreateIndex
CREATE INDEX "tasks_status_id_idx" ON "tasks"("status_id");

-- CreateIndex
CREATE INDEX "task_comments_task_id_idx" ON "task_comments"("task_id");

-- CreateIndex
CREATE INDEX "attachments_task_id_idx" ON "attachments"("task_id");

-- CreateIndex
CREATE INDEX "time_entries_task_id_idx" ON "time_entries"("task_id");

-- CreateIndex
CREATE INDEX "time_entries_user_id_idx" ON "time_entries"("user_id");

-- CreateIndex
CREATE INDEX "time_entries_date_idx" ON "time_entries"("date");

-- CreateIndex
CREATE UNIQUE INDEX "time_entries_task_id_user_id_date_key" ON "time_entries"("task_id", "user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_task_id_dependent_task_id_key" ON "task_dependencies"("task_id", "dependent_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_preference_name_key" ON "user_preferences"("user_id", "preference_name");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "labels_tenant_id_idx" ON "labels"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "labels_tenant_id_label_name_key" ON "labels"("tenant_id", "label_name");

-- CreateIndex
CREATE UNIQUE INDEX "task_labels_task_id_label_id_key" ON "task_labels"("task_id", "label_id");

-- CreateIndex
CREATE INDEX "teams_tenant_id_idx" ON "teams"("tenant_id");

-- CreateIndex
CREATE INDEX "teams_department_id_idx" ON "teams"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_tenant_id_team_name_key" ON "teams"("tenant_id", "team_name");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "workspaces_tenant_id_idx" ON "workspaces"("tenant_id");

-- CreateIndex
CREATE INDEX "workspaces_department_id_idx" ON "workspaces"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "meetings_tenant_id_idx" ON "meetings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_attendees_meeting_id_user_id_key" ON "meeting_attendees"("meeting_id", "user_id");

-- CreateIndex
CREATE INDEX "meeting_attachments_meeting_id_idx" ON "meeting_attachments"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_setup_tokens_token_key" ON "password_setup_tokens"("token");

-- CreateIndex
CREATE INDEX "chat_threads_tenant_id_idx" ON "chat_threads"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_participants_thread_id_user_id_key" ON "chat_participants"("thread_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_messages_thread_id_created_at_idx" ON "chat_messages"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_thread_id_message_id_idx" ON "chat_messages"("thread_id", "message_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_message_reactions_message_id_user_id_emoji_key" ON "chat_message_reactions"("message_id", "user_id", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "task_watchers_task_id_user_id_key" ON "task_watchers"("task_id", "user_id");

-- CreateIndex
CREATE INDEX "task_statuses_tenant_id_idx" ON "task_statuses"("tenant_id");

-- CreateIndex
CREATE INDEX "task_statuses_project_id_idx" ON "task_statuses"("project_id");

-- CreateIndex
CREATE INDEX "task_statuses_department_id_idx" ON "task_statuses"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_statuses_tenant_id_project_id_department_id_code_key" ON "task_statuses"("tenant_id", "project_id", "department_id", "code");

-- CreateIndex
CREATE INDEX "sprint_templates_department_id_idx" ON "sprint_templates"("department_id");

-- CreateIndex
CREATE INDEX "payment_history_tenant_id_idx" ON "payment_history"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_history_created_at_idx" ON "payment_history"("created_at");

-- CreateIndex
CREATE INDEX "usage_alerts_tenant_id_idx" ON "usage_alerts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_alerts_tenant_id_alert_type_threshold_key" ON "usage_alerts"("tenant_id", "alert_type", "threshold");

-- CreateIndex
CREATE INDEX "_ProjectAssignedTeams_B_index" ON "_ProjectAssignedTeams"("B");

-- AddForeignKey
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("position_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_mappings" ADD CONSTRAINT "user_role_mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_mappings" ADD CONSTRAINT "user_role_mappings_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("team_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("workspace_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tester_id_fkey" FOREIGN KEY ("tester_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_team_assigned_id_fkey" FOREIGN KEY ("team_assigned_id") REFERENCES "teams"("team_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("milestone_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "task_statuses"("status_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("sprint_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_dependent_task_id_fkey" FOREIGN KEY ("dependent_task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "checklists"("checklist_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "labels"("label_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("team_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attachments" ADD CONSTRAINT "meeting_attachments_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attachments" ADD CONSTRAINT "meeting_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_setup_tokens" ADD CONSTRAINT "password_setup_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("thread_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("thread_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_reactions" ADD CONSTRAINT "chat_message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("message_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_reactions" ADD CONSTRAINT "chat_message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_templates" ADD CONSTRAINT "sprint_templates_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_alerts" ADD CONSTRAINT "usage_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectAssignedTeams" ADD CONSTRAINT "_ProjectAssignedTeams_A_fkey" FOREIGN KEY ("A") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectAssignedTeams" ADD CONSTRAINT "_ProjectAssignedTeams_B_fkey" FOREIGN KEY ("B") REFERENCES "teams"("team_id") ON DELETE CASCADE ON UPDATE CASCADE;
