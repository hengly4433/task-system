# Implementation Plan: Task Management Backend

This document outlines the plan to build a production-ready Task Management API using NestJS, Prisma, and PostgreSQL.

## 0. Engineering Standards

- **Architecture**: Clean architecture layering (Controller -> Service -> Repository -> DTO -> Mapper).
- **Validation**: `class-validator` + `class-transformer` for all inputs.
- **Error Handling**: Global filters mapping Prisma errors to HTTP errors. Do not leak internal errors.
- **Auditing**: `task_history` and `activity_logs` written transactionally with operations.
- **Persistence**: Prisma ORM with PostgreSQL. Use `@db.Timestamptz(6)` for dates.
- **Soft Deletes**: Use `deleted_at` pattern where applicable.

---

## 1. Project Setup

**Command:**
```bash
nest new task-management-api
```

**Dependencies:**
- `@nestjs/config`
- `@nestjs/swagger`
- `prisma`, `@prisma/client`
- `class-validator`, `class-transformer`
- `helmet`, `compression`
- `supertest` (dev)

**Environment (`.env`):**
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/taskdb?schema=public"
```

**Prisma Init:**
```bash
npx prisma init
```

---

## 2. Folder Structure

```
src/
  app.module.ts
  main.ts
  common/
    database/
      prisma.module.ts
      prisma.service.ts
      prisma-error.util.ts
    filters/
      all-exceptions.filter.ts
      prisma-exception.filter.ts
    interceptors/
      logging.interceptor.ts
    pagination/
      pagination.dto.ts
      pagination.util.ts
    audit/
      audit.service.ts
      audit.types.ts
    utils/
      dates.util.ts
  modules/
    users/
    roles/
    projects/
    tasks/
    comments/
    attachments/
    time-entries/
    dependencies/
    history/
    milestones/
    notifications/
    preferences/
    activity-logs/
    bug-reports/
    checklists/
    reminders/
    labels/
    sprints/
    announcements/
    teams/
```

Each module must contain: `controller`, `service`, `repository`, `dto`, `mapper`, `*.module.ts`.

---

## 3. Database Schema

**File:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  userId       BigInt   @id @default(autoincrement()) @map("user_id")
  username     String   @unique @db.VarChar(50)
  email        String   @unique @db.VarChar(255)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  fullName     String?  @map("full_name") @db.VarChar(150)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz(6)

  // Relations
  roles            UserRoleMapping[]
  ownedProjects     Project[] @relation("ProjectOwner")
  createdProjects   Project[] @relation("ProjectCreatedBy")
  projectMembers    ProjectMember[]
  createdTasks      Task[] @relation("TaskCreatedBy")
  assignedTasks     Task[] @relation("TaskAssignedTo")
  comments          TaskComment[]
  uploadedAttachments Attachment[]
  timeEntries       TimeEntry[]
  notifications     Notification[]
  preferences       UserPreference[]
  activityLogs      ActivityLog[]
  bugReports        BugReport[]
  taskHistory       TaskHistory[]
  announcements     Announcement[]
  teamsOwned        Team[] @relation("TeamOwner")
  teamMembers       TeamMember[]

  @@map("users")
}

model Role {
  roleId   BigInt @id @default(autoincrement()) @map("role_id")
  roleName String @unique @map("role_name") @db.VarChar(50)

  users UserRoleMapping[]

  @@map("roles")
}

model UserRoleMapping {
  mappingId  BigInt   @id @default(autoincrement()) @map("mapping_id")
  userId     BigInt   @map("user_id")
  roleId     BigInt   @map("role_id")
  assignedAt DateTime @default(now()) @map("assigned_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [userId], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [roleId], onDelete: Restrict)

  @@unique([userId, roleId])
  @@map("user_role_mappings")
}

model Project {
  projectId   BigInt   @id @default(autoincrement()) @map("project_id")
  projectName String   @map("project_name") @db.VarChar(120)
  description String?  @db.Text
  startDate   DateTime? @map("start_date") @db.Date
  endDate     DateTime? @map("end_date") @db.Date

  ownerId   BigInt @map("owner_id")
  createdBy BigInt @map("created_by")

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  teamId BigInt? @map("team_id")

  owner     User @relation("ProjectOwner", fields: [ownerId], references: [userId], onDelete: Restrict)
  creator   User @relation("ProjectCreatedBy", fields: [createdBy], references: [userId], onDelete: Restrict)

  team      Team? @relation(fields: [teamId], references: [teamId], onDelete: SetNull)

  members   ProjectMember[]
  tasks     Task[]
  milestones Milestone[]
  sprints   Sprint[]
  bugReports BugReport[]
  announcements Announcement[]

  @@map("projects")
}

model ProjectMember {
  memberId  BigInt   @id @default(autoincrement()) @map("member_id")
  projectId BigInt   @map("project_id")
  userId    BigInt   @map("user_id")
  joinedAt  DateTime @default(now()) @map("joined_at") @db.Timestamptz(6)

  project Project @relation(fields: [projectId], references: [projectId], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@unique([projectId, userId])
  @@map("project_members")
}

model Task {
  taskId       BigInt   @id @default(autoincrement()) @map("task_id")
  projectId    BigInt   @map("project_id")
  parentTaskId BigInt?  @map("parent_task_id")

  taskName     String   @map("task_name") @db.VarChar(200)
  description  String?  @db.Text
  status       String   @default("TODO") @db.VarChar(50)
  priority     String   @default("MEDIUM") @db.VarChar(50)

  createdBy    BigInt   @map("created_by")
  assignedTo   BigInt?  @map("assigned_to")

  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  dueDate      DateTime? @map("due_date") @db.Timestamptz(6)
  completedAt  DateTime? @map("completed_at") @db.Timestamptz(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz(6)

  sprintId BigInt? @map("sprint_id")

  project   Project @relation(fields: [projectId], references: [projectId], onDelete: Cascade)
  creator   User    @relation("TaskCreatedBy", fields: [createdBy], references: [userId], onDelete: Restrict)
  assignee  User?   @relation("TaskAssignedTo", fields: [assignedTo], references: [userId], onDelete: SetNull)

  parent    Task?   @relation("TaskParent", fields: [parentTaskId], references: [taskId], onDelete: Cascade)
  children  Task[]  @relation("TaskParent")

  sprint    Sprint? @relation(fields: [sprintId], references: [sprintId], onDelete: SetNull)

  comments      TaskComment[]
  attachments   Attachment[]
  timeEntries   TimeEntry[]
  dependencies  TaskDependency[] @relation("TaskDependencies")
  dependents    TaskDependency[] @relation("TaskDependents")
  history       TaskHistory[]
  checklists    Checklist[]
  reminders     TaskReminder[]
  labels        TaskLabel[]

  @@index([projectId])
  @@index([assignedTo])
  @@index([parentTaskId])
  @@map("tasks")
}

model TaskComment {
  commentId   BigInt   @id @default(autoincrement()) @map("comment_id")
  taskId      BigInt   @map("task_id")
  userId      BigInt   @map("user_id")
  commentText String   @map("comment_text") @db.Text

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz(6)

  task Task @relation(fields: [taskId], references: [taskId], onDelete: Cascade)
  user User @relation(fields: [userId], references: [userId], onDelete: Restrict)

  @@index([taskId])
  @@map("task_comments")
}

model Attachment {
  attachmentId BigInt   @id @default(autoincrement()) @map("attachment_id")
  taskId       BigInt   @map("task_id")
  fileName     String   @map("file_name") @db.VarChar(255)
  filePath     String   @map("file_path") @db.VarChar(1024)
  mimeType     String?  @map("mime_type") @db.VarChar(120)
  fileSize     BigInt?  @map("file_size")
  uploadedBy   BigInt?  @map("uploaded_by")
  uploadedAt   DateTime @default(now()) @map("uploaded_at") @db.Timestamptz(6)

  task Task @relation(fields: [taskId], references: [taskId], onDelete: Cascade)
  uploader User? @relation(fields: [uploadedBy], references: [userId], onDelete: SetNull)

  @@index([taskId])
  @@map("attachments")
}

model TimeEntry {
  timeEntryId BigInt   @id @default(autoincrement()) @map("time_entry_id")
  taskId      BigInt   @map("task_id")
  userId      BigInt   @map("user_id")
  startTime   DateTime @map("start_time") @db.Timestamptz(6)
  endTime     DateTime? @map("end_time") @db.Timestamptz(6)

  task Task @relation(fields: [taskId], references: [taskId], onDelete: Cascade)
  user User @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@index([taskId])
  @@index([userId])
  @@map("time_entries")
}

model TaskDependency {
  dependencyId    BigInt @id @default(autoincrement()) @map("dependency_id")
  taskId          BigInt @map("task_id")
  dependentTaskId BigInt @map("dependent_task_id")

  task      Task @relation("TaskDependencies", fields: [taskId], references: [taskId], onDelete: Cascade)
  dependent Task @relation("TaskDependents", fields: [dependentTaskId], references: [taskId], onDelete: Cascade)

  @@unique([taskId, dependentTaskId])
  @@map("task_dependencies")
}

model TaskHistory {
  historyId        BigInt   @id @default(autoincrement()) @map("history_id")
  taskId           BigInt   @map("task_id")
  changedBy        BigInt   @map("changed_by")
  changeDescription String  @map("change_description") @db.Text
  changedAt        DateTime @default(now()) @map("changed_at") @db.Timestamptz(6)

  task Task @relation(fields: [taskId], references: [taskId], onDelete: Cascade)
  user User @relation(fields: [changedBy], references: [userId], onDelete: Restrict)

  @@map("task_history")
}

model Milestone {
  milestoneId   BigInt   @id @default(autoincrement()) @map("milestone_id")
  projectId     BigInt   @map("project_id")
  milestoneName String   @map("milestone_name") @db.VarChar(150)
  dueDate       DateTime? @map("due_date") @db.Timestamptz(6)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  project Project @relation(fields: [projectId], references: [projectId], onDelete: Cascade)

  @@map("milestones")
}

model Notification {
  notificationId   BigInt   @id @default(autoincrement()) @map("notification_id")
  userId           BigInt   @map("user_id")
  notificationText String   @map("notification_text") @db.Text
  isRead           Boolean  @default(false) @map("is_read")
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@map("notifications")
}

model UserPreference {
  preferenceId    BigInt @id @default(autoincrement()) @map("preference_id")
  userId          BigInt @map("user_id")
  preferenceName  String @map("preference_name") @db.VarChar(80)
  preferenceValue String @map("preference_value") @db.VarChar(255)

  user User @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@unique([userId, preferenceName])
  @@map("user_preferences")
}

model ActivityLog {
  logId        BigInt   @id @default(autoincrement()) @map("log_id")
  userId       BigInt   @map("user_id")
  activityType String   @map("activity_type") @db.VarChar(80)
  details      String?  @db.Text
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@index([userId])
  @@map("activity_logs")
}

model BugReport {
  bugId         BigInt   @id @default(autoincrement()) @map("bug_id")
  projectId     BigInt   @map("project_id")
  reportedBy    BigInt   @map("reported_by")
  bugDescription String  @map("bug_description") @db.Text
  reportedAt    DateTime @default(now()) @map("reported_at") @db.Timestamptz(6)
  priority      String   @default("MEDIUM") @db.VarChar(50)
  status        String   @default("OPEN") @db.VarChar(50)

  project Project @relation(fields: [projectId], references: [projectId], onDelete: Cascade)
  reporter User   @relation(fields: [reportedBy], references: [userId], onDelete: Restrict)

  @@map("bug_reports")
}

model Checklist {
  checklistId   BigInt   @id @default(autoincrement()) @map("checklist_id")
  taskId        BigInt   @map("task_id")
  checklistName String   @map("checklist_name") @db.VarChar(150)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  task Task @relation(fields: [taskId], references: [taskId], onDelete: Cascade)
  items ChecklistItem[]

  @@map("checklists")
}

model ChecklistItem {
  checklistItemId BigInt  @id @default(autoincrement()) @map("checklist_item_id")
  checklistId     BigInt  @map("checklist_id")
  itemName        String  @map("item_name") @db.VarChar(200)
  isCompleted     Boolean @default(false) @map("is_completed")

  checklist Checklist @relation(fields: [checklistId], references: [checklistId], onDelete: Cascade)

  @@map("checklist_items")
}

model TaskReminder {
  reminderId   BigInt   @id @default(autoincrement()) @map("reminder_id")
  taskId       BigInt   @map("task_id")
  reminderText String   @map("reminder_text") @db.VarChar(200)
  reminderTime DateTime @map("reminder_time") @db.Timestamptz(6)

  task Task @relation(fields: [taskId], references: [taskId], onDelete: Cascade)

  @@map("task_reminders")
}

model Label {
  labelId    BigInt @id @default(autoincrement()) @map("label_id")
  labelName  String @unique @map("label_name") @db.VarChar(80)
  labelColor String @map("label_color") @db.VarChar(7)

  tasks TaskLabel[]

  @@map("labels")
}

model TaskLabel {
  taskLabelId BigInt @id @default(autoincrement()) @map("task_label_id")
  taskId      BigInt @map("task_id")
  labelId     BigInt @map("label_id")

  task  Task  @relation(fields: [taskId], references: [taskId], onDelete: Cascade)
  label Label @relation(fields: [labelId], references: [labelId], onDelete: Cascade)

  @@unique([taskId, labelId])
  @@map("task_labels")
}

model Sprint {
  sprintId   BigInt @id @default(autoincrement()) @map("sprint_id")
  projectId  BigInt @map("project_id")
  sprintName String @map("sprint_name") @db.VarChar(120)
  startDate  DateTime? @map("start_date") @db.Date
  endDate    DateTime? @map("end_date") @db.Date

  project Project @relation(fields: [projectId], references: [projectId], onDelete: Cascade)
  tasks   Task[]

  @@map("sprints")
}

model Announcement {
  announcementId   BigInt   @id @default(autoincrement()) @map("announcement_id")
  projectId        BigInt   @map("project_id")
  announcementText String   @map("announcement_text") @db.Text
  createdBy        BigInt?  @map("created_by")
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  project Project @relation(fields: [projectId], references: [projectId], onDelete: Cascade)
  creator User?    @relation(fields: [createdBy], references: [userId], onDelete: SetNull)

  @@map("announcements")
}

model Team {
  teamId    BigInt   @id @default(autoincrement()) @map("team_id")
  teamName  String   @unique @map("team_name") @db.VarChar(120)
  ownerId   BigInt   @map("owner_id")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  owner    User @relation("TeamOwner", fields: [ownerId], references: [userId], onDelete: Restrict)
  members  TeamMember[]
  projects Project[]

  @@map("teams")
}

model TeamMember {
  teamMemberId BigInt   @id @default(autoincrement()) @map("team_member_id")
  teamId       BigInt   @map("team_id")
  userId       BigInt   @map("user_id")
  joinedAt     DateTime @default(now()) @map("joined_at") @db.Timestamptz(6)

  team Team @relation(fields: [teamId], references: [teamId], onDelete: Cascade)
  user User @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@unique([teamId, userId])
  @@map("team_members")
}
```

---

## 4. Database Access Layer

### 4.1 Prisma Module
- `PrismaService` extends `PrismaClient`
- Enable graceful shutdown
- Enable query logging in `dev` only

### 4.2 Repository Pattern (Required)
- Create repository classes for each module (e.g., `TasksRepository`).
- Define methods: `create`, `findById`, `update`, `softDelete`, `list`, `setAssignee`.
- Encapsulate all Prisma query logic within repositories.

---

## 5. DTOs & Validation

### 5.1 DTO Rules
- **Request DTOs**: `CreateXDto`, `UpdateXDto`, `ListXQueryDto`
- **Response DTOs**: `XResponseDto` (Clean objects, no raw Prisma models)
- **Validation**:
  - decorators: `@IsString()`, `@IsOptional()`, `@IsEmail()`, `@IsIn()`, etc.
- **Pagination**: Use `page`, `pageSize`, `sortBy`, `sortDir`

### 5.2 Mappers
- Create `XMapper` with:
  - `toResponse(model): XResponseDto`
  - `toResponseList(models): XResponseDto[]`

---

## 6. Global Exception Handling

### 6.1 Prisma Error Mapping (`prisma-error.util.ts`)
- Unique constraint -> **409 Conflict**
- Not found -> **404 Not Found**
- FK violation -> **400 Bad Request**
- Generic -> **500 Internal Server Error**

### 6.2 Filters
- `PrismaExceptionFilter`
- `AllExceptionsFilter` (Fallback)

---

## 7. Auditing Strategy

### 7.1 Task History
- **Trigger**: Status change, priority change, reassignment, due date, completion, title/desc.
- **Content**: `change_description`
- **Consistency**: Must be in the **same transaction** as the update.

### 7.2 Activity Logs
- **Trigger**: Create/update/delete task, join/leave project, add comment/attachment/time-entry/bug.
- **Content**: `activity_type`, `details`

### 7.3 Audit Service
- `logActivity(userId, type, details, tx?)`
- `logTaskHistory(taskId, changedBy, description, tx?)`
- Support passing `Prisma.TransactionClient`.

---

## 8. Implementation Steps

### Step 1: Users Module
- [ ] **Endpoints**: `POST`, `GET /:id`, `GET`, `PATCH`, `DELETE` (soft)
- [ ] **Rules**: Unique username/email, hide password hash in response.
- [ ] **Tests**: Uniqueness conflict, soft delete filtering.

### Step 2: Roles Module
- [ ] **Endpoints**: `POST`, `GET`, `POST assign`, `DELETE unassign`
- [ ] **Rules**: Enforce unique (user, role).
- [ ] **Seed**: Create default roles: `ADMIN`, `MEMBER`.

### Step 3: Projects Module
- [ ] **Endpoints**: `POST`, `GET /:id`, `GET`, `PATCH`, `DELETE` (soft)
- [ ] **Members**: `POST /members` (add), `DELETE /members` (remove)
- [ ] **Audit**: Log activity on create, update, member changes.

### Step 4: Tasks Module (Core)
- [ ] **Endpoints**:
  - `POST /projects/:id/tasks`
  - `GET /tasks/:id`
  - `GET /projects/:id/tasks` (filters)
  - `PATCH /tasks/:id`
  - `DELETE /tasks/:id` (soft)
- [ ] **Subtasks**: Handle `parentTaskId`.
- [ ] **Audit**: Task History on updates, Activity Log on create/delete.

### Step 5: Comments Module
- [ ] **Endpoints**: `POST`, `GET`, `DELETE`
- [ ] **Audit**: Log activity.

### Step 6: Attachments Module
- [ ] **Endpoints**: `POST` (metadata), `GET`, `DELETE`
- [ ] **Rules**: Metadata only for now (File path storage).
- [ ] **Audit**: Log activity.

### Step 7: Time Entries Module
- [ ] **Endpoints**: `POST` (start/end), `PATCH` (set end), `GET`
- [ ] **Rules**: `end >= start`
- [ ] **Audit**: Log activity.

### Step 8: Task Dependencies Module
- [ ] **Endpoints**: `POST`, `GET`, `DELETE`
- [ ] **Rules**: Prevent cycles (DFS check), `id != dependentId`.

### Step 9: Labels Module
- [ ] **Endpoints**: `POST`, `GET`, `POST assign`, `DELETE unassign`

### Step 10: Checklists
- [ ] **Endpoints**: `POST checklist`, `POST item`, `PATCH item` (toggle), `GET`

### Step 11: Reminders
- [ ] **Endpoints**: `POST`, `GET`, `DELETE`

### Step 12: Milestones
- [ ] **Endpoints**: `POST`, `GET`

### Step 13: Sprints
- [ ] **Endpoints**: `POST`, `GET`, `PATCH task` (assign sprint)

### Step 14: Bug Reports
- [ ] **Endpoints**: `POST`, `GET`, `PATCH`
- [ ] **Audit**: Log activity.

### Step 15: Notifications
- [ ] **Endpoints**: `GET`, `PATCH read`

### Step 16: Preferences
- [ ] **Endpoints**: `PUT` (upsert), `GET`

### Step 17: Activity Logs (Read-only)
- [ ] **Endpoints**: `GET` (filters)

### Step 18: Announcements
- [ ] **Endpoints**: `POST`, `GET`

### Step 19: Teams (Optional)
- [ ] **Endpoints**: `POST`, `POST member`, `GET`, `GET member`

---

## 9. Testing Strategy

### 9.1 Unit Tests (Services)
- Mock repositories.
- Test business rules (cycles, subtasks, history, soft-delete).

### 9.2 Integration Tests (DB)
- Use Testcontainers or local Postgres.
- Run migrations.
- Validate constraints and transactions.

### 9.3 E2E Tests (Controllers)
- Supertest.
- Test happy paths and key errors (404, 409, 400).

---

## 10. Acceptance Criteria Checklist

- [ ] Prisma schema matches final DB schema.
- [ ] All modules implement Controller, Service, Repository, DTO, Mapper.
- [ ] Global exception filters map Prisma errors.
- [ ] Audit records written transactionally.
- [ ] Soft delete respected in queries.
- [ ] Unit, Integration, E2E tests pass.
- [ ] OpenAPI (Swagger) documentation generated.