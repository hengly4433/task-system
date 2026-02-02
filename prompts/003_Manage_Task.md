1) Recommended hierarchy inside one company

Company (Tenant)
→ Workplace (Workspace)
→ Departments (Finance, Dev, HR, …)
→ Teams (usually under a department, sometimes cross-department)
→ Projects (owned by a department, but can include members from other departments)
→ Tasks (belong to a project and also have a “department/workstream” for workflow)

This gives you the best of both worlds:

Department controls workflow/status

Projects/Teams allow cross-department collaboration

2) Add Department (minimal but critical)
Department table

department(id, workplace_id, name, code, active)

User ↔ Department relationship

Best practice: many-to-many (because managers / QA / leads often span departments)

user_departments(user_id, department_id, is_primary, joined_at)

If you insist “one user = one department”, you can enforce it later with a unique constraint, but I strongly recommend keeping it flexible.

3) Convert “Status” into “Workflow/Status Set” (department-owned)

In real systems, status is not a global list. It is a list inside a workflow.

Workflow model

workflow(id, workplace_id, department_id, name, is_default, active)

workflow_status(id, workflow_id, name, position, category, is_terminal)

(recommended) workflow_transition(workflow_id, from_status_id, to_status_id)

Key idea:
Finance can have one default workflow; Dev can have another.
Optionally, a Project can override the department default workflow.

Optional: project override

project_workflows(project_id, workflow_id) (or a project.workflow_id column)

Fallback rule (very important):

If project has workflow override → use it

Else use department default workflow

Else use workplace default workflow (safety fallback)

4) Task should carry “department/workstream” + workflow reference

Even if a project is cross-department, a task should still be in one workflow.

Recommended task columns:

task.workplace_id

task.project_id

task.department_id ✅ (the workstream/owner department of the task)

task.workflow_id ✅

task.status_id ✅

task.team_id (optional but useful)

task.sprint_id (nullable)

assignee_id, reporter_id, watchers, etc.

Critical integrity rule (must-have)

You must prevent a task from using a status that belongs to another workflow.

In other words:

task.status_id must be a status inside task.workflow_id.

Enforce this in the database (best) via:

composite FK approach, or

trigger/check constraint depending on your DB.

This is what makes it “production-ready”.

5) How “Teams” and “Position” fit with Departments
Teams

Two common patterns:

Pattern A (recommended default): team belongs to a department

team(department_id, workplace_id, name, …)

Pattern B (support cross-department “project team”)

team(workplace_id, name, type=PROJECT, …)

team_members(user_id, team_id, role/position_id, …)

Users can come from any department.

You can support both by adding:

team.department_id nullable (null = cross-department team)

Position

“Position” should be used for authorization and responsibility scope, not for workflow.

Example positions:

Finance: Accountant, Approver

Dev: Developer, QA, Tech Lead

Positions can be:

scoped to a team, or

scoped to a project, or

workplace-wide roles

Most robust:

team_members(user_id, team_id, position_id)

project_members(user_id, project_id, role_id)

6) How Sprint works with departments

Sprint is typically a project planning tool (mainly for software teams), so:

Recommended

sprint(project_id, name, start_date, end_date, …)

tasks can optionally attach to sprint: task.sprint_id (nullable)

For Finance/HR tasks, sprint is usually null. No problem.

If you need department-based sprints inside one project:

Add sprint.department_id (optional), so Dev sprint ≠ Finance sprint.

7) Login-based “show data by department” (production rule)

You want: “Task and Status show based on the user’s department.”

Do it like this:

Status shown to user

When user views a task → show statuses from task.workflow_id only.

When user creates a task → choose department/workflow based on:

selected department, or

project default department/workflow, or

user primary department

Task visibility (do NOT use department-only)

A user can see a task if any of these are true:

They are a member of the project/workplace scope AND

One of:

task.department_id ∈ user_departments

user is assignee/reporter/watcher

user has role permission “view across departments” (Manager/Admin)

user is in the team that owns the task

This prevents real-world blockers.

8) Admin setup flow (how to operate it)

Inside a Workplace:

Create Departments (Finance, Dev, …)

For each Department:

Create default Workflow

Add Workflow Statuses (+ transitions if needed)

Create Teams under departments (optional cross-dept teams)

When creating a User:

Assign department(s) + primary department

Add to team(s) and project(s)

When creating a Project:

Set owner department (optional)

Optionally assign project workflow override

Add project members across departments

9) Migration plan from your current model (safe path)

If you currently have status as a global table:

Create department, workflow, workflow_status

Create a default department “General”

Create a default workflow “General Workflow”

Copy existing statuses → workflow_status under General Workflow

Update all tasks:

set department_id = General

set workflow_id = General Workflow

map old status_id → new workflow_status_id

Start creating real department workflows and move tasks gradually

This avoids breaking production.

Final recommendation

Yes—you can absolutely manage departments in one company with your modules, but the production-ready design is:

Department controls workflow/status (via workflow tables)

Task stores department/workflow/status explicitly

Projects/Teams allow cross-department collaboration

Visibility is permission-based, not department-only

DB constraints prevent wrong status/workflow combinations