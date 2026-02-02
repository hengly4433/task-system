In the project /task-management-web and /task-management-api on the @TaskService and @TaskController classes, @TaskRepository and @TaskRepositoryImpl classes, @TaskEntity and @TaskDto classes, @TaskMapper class, @TaskView.vue and @TaskEdit.vue components, @TaskDetail.vue component, 


## Context
I want to implement the task status management on the task operations.

## Task Status
The company can manage the task status on the task operations.
- Company A:
  - Not Started
  - In Progress
  - In Review
  - Completed
  - Failed
  - Cancelled
- Company B:
  - New
  - Developing
  - Ready to Test
  - Rejected
  - Test Failed
  - Ready to Production
  
## Action
- On the Kanban board, the company can change the task status.
- When user create a new Status, the Kanban should be add new column based on the new status.
- When user delete a Status, the Kanban should be remove the column based on the deleted status.


## Contraint
- For the Status select field make it searchable.
- Reusable searchable select field of status, don't duplicate the code.
- Add Status menu on the Sidebar, follow the same style of the other menus and the same style of the other components.
  - example: @TaskView.vue @TaskModal.vue


