# Prompt: Department-Based Workspaces & Status Workflows (Production-Ready)

You are a senior software architect and lead engineer. Design and implement a **production-ready Task Management System enhancement** with the following requirements:

## Core Requirements (Must Implement)
1. **Department controls Workspace/Status (via Workspace tables)**
   - Each Department can have one or more **Workspaces**.
   - Each Workspace defines its own **Status Workflow** (e.g., Finance statuses differ from Software statuses).

2. **Task stores Department/Workspace/Status explicitly**
   - Every Task must reference:
     - `department_id`
     - `workspace_id`
     - `status_id`
   - Status must always belong to the same workspace as the task.

3. **Projects/Teams allow cross-department collaboration**
   - Projects can include members from multiple departments.
   - Teams can be department-owned or cross-department.
   - Tasks belong to a project, and project members can collaborate across departments (subject to permissions).

4. **Visibility is permission-based, not department-only**
   - Do NOT implement “department-only visibility”.
   - Use authorization rules: project membership, task roles (assignee/reporter/watcher), team membership, and role-based permissions.

5. **DB constraints prevent wrong Status/Workspace combinations**
   - Ensure a task cannot reference a status that is not part of the task’s workspace.
   - Enforce integrity at the database level (preferred) and also in the service layer.

---

## Target Stack & Standards
Implement this using one of the following stacks (choose based on project context; if not specified, implement the design in a stack-agnostic way but write concrete examples for PostgreSQL):
- **Option A**: NestJS + PostgreSQL + Prisma (or TypeORM)
- **Option B**: Spring Boot + PostgreSQL + JPA/Hibernate + Flyway (recommended for enterprise)

### Engineering Standards (Mandatory)
- Clean layering: `Controller -> Service -> Repository -> DTO -> Mapper`
- Strong validation (DTO-level validation + domain-level validation)
- Exception handling: central global handler; no internal error leaks
- Auditing: `created_by`, `updated_by`, `created_at`, `updated_at`, and structured activity logs
- Logging: structured logs with correlation/request id
- Migrations: raw SQL where needed for constraints and indexes
- Unit tests for domain logic + integration tests for permission rules

---

## Domain Model (High-Level)
### Entities
- **Department**
- **Workspace** (owned by a Department)
- **WorkspaceStatus** (statuses scoped to a Workspace)
- **Team** (optional department owner; may be cross-dept)
- **Project** (can be owned by a department; can include cross-dept members)
- **Task** (explicit department_id, workspace_id, status_id, project_id, etc.)
- **ProjectMember** (user membership + role)
- **TeamMember** (user membership + position/role)
- **TaskWatcher** (optional)
- **Permission / Role** (RBAC/ABAC hybrid recommended)

### Key Relationships
- Department 1..N Workspaces
- Workspace 1..N WorkspaceStatuses
- Project N..M Users (ProjectMember)
- Team N..M Users (TeamMember)
- Task belongs to Project and references exactly one Department + Workspace + Status

---

## Database Design (PostgreSQL) — Must Provide
Produce a complete schema proposal (tables + keys + indexes) covering:
- departments
- workspaces
- workspace_statuses
- teams, team_members
- projects, project_members
- tasks
- task_watchers (optional)
- audit/activity_logs (optional but recommended)

### Critical Constraint: Prevent Wrong Status/Workspace Pair
Implement one of these approaches (preferred in order):
1. **Composite foreign key**:
   - `workspace_statuses` has composite unique key `(workspace_id, id)`
   - `tasks` references `(workspace_id, status_id)` -> `(workspace_id, id)`
2. **Trigger-based validation** (if composite FK is not feasible in ORM)
3. **Service-level enforcement** (NOT sufficient alone; must still have DB enforcement if possible)

Also include:
- Indexes for `tasks(project_id)`, `tasks(workspace_id)`, `tasks(status_id)`, `tasks(assignee_id)`, `project_members(project_id, user_id)`
- Soft delete strategy if needed (`deleted_at`) and indexing considerations

---

## Authorization Model (Must Implement)
Implement **permission-based visibility**. At minimum:

### Who can view a task?
A user can view a task if ANY is true:
- User is a **member of the project** that contains the task
- OR user is the **assignee** / **reporter** / **watcher**
- OR user has an elevated permission (e.g., `TASK_READ_ALL` at workplace scope)

### Who can change status?
User can change task status if:
- They have `TASK_UPDATE` permission for the task’s project/workspace
- AND the new status belongs to the same workspace (enforced by DB + service)
- OPTIONAL: enforce status transitions if you add transitions later

### Who can manage statuses/workspaces?
- Only users with admin/manager roles scoped to the department/workplace can:
  - create/update workspaces
  - create/update workspace statuses
  - reorder statuses

Deliverables must include:
- Permission constants
- Role definitions (e.g., Workplace Admin, Department Admin, Project Manager, Member, Viewer)
- Middleware/guards/filters for enforcing access

---

## APIs (Must Provide)
Define REST endpoints (or GraphQL if used) for:

### Department / Workspace Management
- Create/Update Department (admin only)
- Create/Update Workspace under Department
- Add/Update/Reorder Workspace Statuses

### Project / Team Membership
- Create Project
- Add/Remove Project Members (role included)
- Create Team
- Add/Remove Team Members

### Tasks
- Create task (requires project membership)
  - Must include department_id + workspace_id + initial status_id (or default)
- List tasks with filters:
  - `project_id`, `workspace_id`, `department_id`, `status_id`, `assignee_id`
- Update task status (validated)
- Assign/unassign user
- Add/remove watchers (optional)

### Response Rules
- IDs as strings in API
- Use consistent pagination format
- Avoid returning internal DB errors
- Include audit metadata

---

## Business Rules (Must Implement)
1. **Task workspace must belong to the selected department**
   - Example: a Finance task must use a workspace owned by Finance department
2. **Task status must belong to the task workspace**
3. **Project can include cross-department members**
4. **A user’s department selection at creation**
   - Users can have one primary department, but system must support multiple departments (recommended)
5. **Default status**
   - Workspace can define a default status (e.g., first status by position)

---

## Implementation Deliverables (Must Output)
When responding, produce:

1. **Architecture & folder structure**
   - Modules (Department, Workspace, Status, Project, Team, Task, Auth)
   - Controller/Service/Repository/DTO/Mapper layout

2. **Database schema + migrations**
   - SQL migrations for all tables
   - Constraints (especially workspace/status constraint)
   - Indexes

3. **Entity models**
   - ORM entities (NestJS or Spring Boot)
   - Relations clearly defined

4. **DTOs + Validation**
   - Create/Update request DTOs
   - Response DTOs
   - Validation rules (e.g., not null, UUID format, length)

5. **Service Layer**
   - Transactional operations for:
     - create task
     - update status
     - membership updates
   - Consistent domain checks + error mapping

6. **Authorization/Guard**
   - Permission checks
   - Reusable policy helpers (e.g., `canViewTask(user, task)`)

7. **Error Handling**
   - Error codes and message standards
   - Map DB constraint violations to friendly errors

8. **Auditing & Logging**
   - Audit fields populated from authenticated user context
   - Activity log entries for key actions:
     - task created
     - status changed
     - assignee changed
     - workspace status updated

9. **Testing**
   - Unit tests: permission logic, status/workspace validation
   - Integration tests: DB constraint enforcement, task listing visibility filters

---

## Acceptance Criteria (Must Pass)
- A Finance user can create tasks using Finance workspace and Finance statuses.
- A Developer user can create tasks using Dev workspace and Dev statuses.
- A task cannot be updated to a status that belongs to another workspace (DB rejects it).
- Cross-department collaboration works via project membership:
  - a Dev can view/participate in Finance project tasks if they are project member, even if not in Finance department.
- Workspace/status administration is restricted to authorized roles.
- API responses are consistent, validated, and secure.
- Migrations run cleanly on a fresh database.

---

## Note:
- Implement the enterprice code level.

