<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from "vue";
import { useTaskStore } from "@/stores/task.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { projectService } from "@/services/project.service";
import { sprintService } from "@/services/sprint.service";
import { userService } from "@/services/user.service";
import { attachmentService } from "@/services/attachment.service";
import { statusService, type TaskStatus } from "@/services/status.service";
import { departmentService, type Department } from "@/services/department.service";
import { useSnackbar } from "@/composables/useSnackbar";
import { useRouter } from "vue-router";
import { VueDatePicker } from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";
import TaskModal from "@/components/modals/TaskModal.vue";
import ConfirmDialog from "@/components/modals/ConfirmDialog.vue";
import AdvancedFilterDrawer from "@/components/AdvancedFilterDrawer.vue";
import Sortable from "sortablejs";

const taskStore = useTaskStore();
const workspaceStore = useWorkspaceStore();
const snackbar = useSnackbar();
const router = useRouter();

const viewMode = ref<"list" | "calendar" | "gantt" | "kanban" | "project">(
  "list"
);

// Advanced filter state
const showFilterDrawer = ref(false);
const advancedFilters = ref({
  departmentId: null as string | null,
  status: [] as string[],
  priority: [] as string[],
  projectId: null as string | null,
  sprintId: null as string | null,
  assigneeId: null as string | null,
  dateFrom: null as string | null,
  dateTo: null as string | null,
});

// Computed active filter count
const activeFilterCount = computed(() => {
  let count = 0;
  if (advancedFilters.value.departmentId) count++;
  if (advancedFilters.value.status.length > 0) count++;
  if (advancedFilters.value.priority.length > 0) count++;
  if (advancedFilters.value.projectId) count++;
  if (advancedFilters.value.sprintId) count++;
  if (advancedFilters.value.assigneeId) count++;
  if (advancedFilters.value.dateFrom) count++;
  if (advancedFilters.value.dateTo) count++;
  return count;
});

const searchQuery = ref("");
const searchSuggestions = ref<any[]>([]);
const isSearching = ref(false);

// Department data for filter
const departments = ref<Department[]>([]);

const handleSearch = async (val: string) => {
  if (!val || val.length < 2) {
    searchSuggestions.value = [];
    return;
  }
  isSearching.value = true;
  try {
    // Fetch tasks matching the query
    const response = await taskStore.fetchTasks({ search: val });
    searchSuggestions.value = taskStore.tasks.map((t) => ({
      title: `${t.title}`,
      value: t.taskId,
      subtitle: `ID: #${t.taskId} • ${t.status}`,
    }));
  } finally {
    isSearching.value = false;
  }
};

const selectTaskFromSearch = (taskId: string) => {
  if (!taskId) return;
  searchQuery.value = ""; // Clear
  openTaskDetail({ taskId });
};

// Watch for search query clearing to reset list
watch(searchQuery, async (newVal) => {
  if (!newVal) {
    await loadData();
  }
});

const performSearch = async () => {
  if (!searchQuery.value) return;
  // Trigger full list filter/reload based on search
  await taskStore.fetchTasks({ search: searchQuery.value });
};

const showTaskModal = ref(false);
const showDeleteDialog = ref(false);
const selectedTask = ref<any>(null);
const projects = ref<any[]>([]);
const sprints = ref<any[]>([]); // Sprints for modal
const users = ref<any[]>([]);
const modalLoading = ref(false);

const allSprints = ref<Record<string, string>>({}); // Map sprintId -> name
const sprintsByProjectId = ref<Record<string, any[]>>({}); // Map projectId -> sprints[]
const taskStatuses = ref<TaskStatus[]>([]); // Dynamic statuses from API (for Kanban)
const statusesByProjectId = ref<Record<string, TaskStatus[]>>({}); // Cache statuses per project
const userPrimaryProjectId = ref<string | null>(null); // User's primary project (from their tasks)

onMounted(async () => {
  await loadData();
});

const loadData = async () => {
  await taskStore.fetchTasks();
  try {
    projects.value = await projectService.getAll();
    // Load all sprints for all projects
    for (const p of projects.value) {
      try {
        const pSprints = await sprintService.getByProject(p.projectId);
        sprintsByProjectId.value[p.projectId] = pSprints;
        pSprints.forEach((s: any) => {
          allSprints.value[s.sprintId] =
            s.name || s.sprintName || `Sprint ${s.sprintId}`;
        });
      } catch (e) {
        // ignore
        sprintsByProjectId.value[p.projectId] = [];
      }
    }
  } catch (e) {
    projects.value = [];
  }
  try {
    const response = await userService.getAll();
    users.value = response.data || response;
  } catch (e) {
    users.value = [];
  }
  // Load departments for filter
  try {
    const deptResult = await departmentService.getAll({ isActive: true });
    departments.value = deptResult.data;
  } catch (e) {
    departments.value = [];
  }
  
  // Auto-detect user's primary project from their tasks and load statuses
  const userTasks = taskStore.tasks;
  if (userTasks.length > 0) {
    // Get the first task's project as the primary project context
    const firstProjectId = userTasks[0]?.projectId;
    if (firstProjectId) {
      userPrimaryProjectId.value = firstProjectId;
      await loadStatusesForProject(firstProjectId);
    }
  }
};

const loadSprintsForProject = async (projectId: string) => {
  if (!projectId) {
    sprints.value = [];
    return;
  }
  try {
    const result = await sprintService.getByProject(projectId);
    sprints.value = result.map((s: any) => ({
      sprintId: s.sprintId,
      name: s.name || s.sprintName || `Sprint ${s.sprintId}`,
    }));
  } catch (e) {
    sprints.value = [];
  }
};

// Load statuses for a specific project (for Kanban columns)
const loadStatusesForProject = async (projectId: string | null) => {
  if (!projectId) {
    taskStatuses.value = []; // Clear to use fallback defaults
    return;
  }
  // Check cache first
  if (statusesByProjectId.value[projectId]) {
    taskStatuses.value = statusesByProjectId.value[projectId];
    return;
  }
  try {
    const statuses = await statusService.getByProject(projectId);
    statusesByProjectId.value[projectId] = statuses; // Cache
    taskStatuses.value = statuses;
  } catch (e) {
    console.error('Failed to load statuses for project:', e);
    taskStatuses.value = []; // Fallback to defaults on error
  }
};

// Get status options for a specific task (uses cached statuses)
const getStatusOptionsForTask = (task: any) => {
  const projectId = task.projectId;
  // Use cached statuses if available
  if (projectId && statusesByProjectId.value[projectId]) {
    return statusesByProjectId.value[projectId].map(s => ({
      title: s.name,
      value: s.code,
      color: s.color,
    }));
  }
  // Use current taskStatuses if available (for same project)
  if (taskStatuses.value.length > 0) {
    return taskStatuses.value.map(s => ({
      title: s.name,
      value: s.code,
      color: s.color,
    }));
  }
  // Fallback to hardcoded defaults
  return [
    { title: 'Not Started', value: 'TODO', color: '#64748B' },
    { title: 'In Progress', value: 'IN_PROGRESS', color: '#10B981' },
    { title: 'In Review', value: 'IN_REVIEW', color: '#FBBF24' },
    { title: 'Completed', value: 'DONE', color: '#f1184c' },
    { title: 'Failed', value: 'FAILED', color: '#F97316' },
    { title: 'Cancelled', value: 'CANCELLED', color: '#EF4444' },
  ];
};

// Watch project filter to dynamically load statuses for Kanban
watch(() => advancedFilters.value.projectId, async (newProjectId) => {
  await loadStatusesForProject(newProjectId);
});

const tasks = computed(() => taskStore.tasks);
const loading = computed(() => taskStore.loading);

const filteredTasks = computed(() => {
  let result = tasks.value;
  
  // Filter by department
  if (advancedFilters.value.departmentId) {
    result = result.filter((t) => t.departmentId === advancedFilters.value.departmentId);
  }
  
  // Filter by project
  if (advancedFilters.value.projectId) {
    result = result.filter((t) => t.projectId === advancedFilters.value.projectId);
  }
  
  // Filter by sprint
  if (advancedFilters.value.sprintId) {
    result = result.filter((t) => t.sprintId === advancedFilters.value.sprintId);
  }
  
  // Filter by status (multi-select)
  if (advancedFilters.value.status.length > 0) {
    result = result.filter((t) => advancedFilters.value.status.includes(t.status));
  }
  
  // Filter by priority (multi-select)
  if (advancedFilters.value.priority.length > 0) {
    result = result.filter((t) => advancedFilters.value.priority.includes(t.priority));
  }
  
  // Filter by assignee
  if (advancedFilters.value.assigneeId) {
    result = result.filter((t) => t.assigneeId === advancedFilters.value.assigneeId);
  }
  
  // Filter by date range
  if (advancedFilters.value.dateFrom) {
    const fromDate = new Date(advancedFilters.value.dateFrom);
    result = result.filter((t) => t.dueDate && new Date(t.dueDate) >= fromDate);
  }
  if (advancedFilters.value.dateTo) {
    const toDate = new Date(advancedFilters.value.dateTo);
    result = result.filter((t) => t.dueDate && new Date(t.dueDate) <= toDate);
  }
  // Data Mapping for display
  return result.map((t) => {
    const pName =
      projects.value.find((p) => p.projectId === t.projectId)?.name || "-";
    const sName =
      (t.sprintId && allSprints.value[t.sprintId]) ||
      (t.sprint ? t.sprint.name : "-");
    // Assignee might be an object or ID. Handle both.
    const assigneeObj = users.value.find(
      (u) => u.userId === (t.assigneeId || t.assignee?.userId)
    );

    // Calculate progress based on status
    const progressMap: Record<string, number> = {
      TODO: 0,
      IN_PROGRESS: 50,
      IN_REVIEW: 80,
      DONE: 100,
      FAILED: 0,
      CANCELLED: 0,
    };
    const calculatedProgress = progressMap[t.status] || 0;

    return {
      ...t,
      projectName: pName,
      sprintName: sName,
      // Merge assignee data: combine both sources, preferring non-null values
      assignee: assigneeObj 
        ? { 
            ...t.assignee, 
            ...assigneeObj,
            // Prefer profileImageUrl from task's assignee data if user lookup doesn't have it
            profileImageUrl: assigneeObj.profileImageUrl || t.assignee?.profileImageUrl || null,
          } 
        : t.assignee,
      progress: calculatedProgress, // Override/Set progress based on status
    };
  });
});

// Group tasks by project
const tasksByProject = computed(() => {
  const grouped: Record<
    string,
    { project: any; tasks: typeof filteredTasks.value }
  > = {};

  for (const task of filteredTasks.value) {
    const projectId = task.projectId || "unassigned";
    if (!grouped[projectId]) {
      const project = projects.value.find((p) => p.projectId === projectId);
      grouped[projectId] = {
        project: project || { projectId, name: "Unassigned" },
        tasks: [],
      };
    }
    grouped[projectId].tasks.push(task);
  }

  return Object.values(grouped).sort((a, b) =>
    a.project.name.localeCompare(b.project.name)
  );
});

const kanbanColumns = computed(() => {
  // Use dynamic statuses if available, fallback to defaults
  if (taskStatuses.value.length > 0) {
    return taskStatuses.value.map(s => ({
      title: s.name,
      status: s.code,
      color: s.color,
      tasks: filteredTasks.value.filter((t) => t.status === s.code),
    }));
  }
  // Fallback to hardcoded defaults
  return [
    {
      title: "Not Started",
      status: "TODO",
      color: "#64748B",
      tasks: filteredTasks.value.filter((t) => t.status === "TODO"),
    },
    {
      title: "In Progress",
      status: "IN_PROGRESS",
      color: "#10B981",
      tasks: filteredTasks.value.filter((t) => t.status === "IN_PROGRESS"),
    },
    {
      title: "In Review",
      status: "IN_REVIEW",
      color: "#FBBF24",
      tasks: filteredTasks.value.filter((t) => t.status === "IN_REVIEW"),
    },
    {
      title: "Completed",
      status: "DONE",
      color: "#f1184c",
      tasks: filteredTasks.value.filter((t) => t.status === "DONE"),
    },
    {
      title: "Failed",
      status: "FAILED",
      color: "#F97316",
      tasks: filteredTasks.value.filter((t) => t.status === "FAILED"),
    },
    {
      title: "Cancelled",
      status: "CANCELLED",
      color: "#EF4444",
      tasks: filteredTasks.value.filter((t) => t.status === "CANCELLED"),
    },
  ];
});

// Computed status filter options for dropdown
const statusFilterOptions = computed(() => {
  const defaultOption = { title: 'All Status', value: '' };
  if (taskStatuses.value.length > 0) {
    return [defaultOption, ...taskStatuses.value.map(s => ({ title: s.name, value: s.code }))];
  }
  return [
    defaultOption,
    { title: 'Not Started', value: 'TODO' },
    { title: 'In Progress', value: 'IN_PROGRESS' },
    { title: 'In Review', value: 'IN_REVIEW' },
    { title: 'Completed', value: 'DONE' },
    { title: 'Failed', value: 'FAILED' },
    { title: 'Cancelled', value: 'CANCELLED' },
  ];
});

// Drag and Drop Logic
const tbodyRef = ref<HTMLElement | null>(null);
const listTasksRef = ref<HTMLElement | null>(null);
const kanbanColumnRefs = ref<HTMLElement[]>([]);
const isDragging = ref(false);
let kanbanSortableInstances: Sortable[] = [];
let listSortableInstance: Sortable | null = null;

watch(
  () => [viewMode.value, filteredTasks.value],
  async () => {
    if (viewMode.value === "list") {
      await nextTick();
      initListSortable();
    } else if (viewMode.value === "kanban") {
      await nextTick();
      initKanbanSortable();
    }
  },
  { immediate: true }
);

const initListSortable = () => {
  if (!listTasksRef.value) return;
  
  // Destroy existing instance
  if (listSortableInstance) {
    listSortableInstance.destroy();
  }
  
  listSortableInstance = Sortable.create(listTasksRef.value, {
    handle: ".drag-handle",
    animation: 200,
    ghostClass: 'list-ghost',
    dragClass: 'list-drag',
    chosenClass: 'list-chosen',
    onStart: () => {
      isDragging.value = true;
    },
    onEnd: (evt) => {
      isDragging.value = false;
      console.log("Moved task from position", evt.oldIndex, "to", evt.newIndex);
      // Note: For persistence, you would update the task order on the backend here
    },
  });
};

const initSortable = () => {
  if (!tbodyRef.value) return;
  Sortable.create(tbodyRef.value, {
    handle: ".drag-handle",
    animation: 150,
    onEnd: (evt) => {
      console.log("Moved item from", evt.oldIndex, "to", evt.newIndex);
    },
  });
};

const initKanbanSortable = () => {
  // Destroy existing instances
  kanbanSortableInstances.forEach((instance) => instance.destroy());
  kanbanSortableInstances = [];

  const columns = document.querySelectorAll('.kanban-tasks');
  columns.forEach((column) => {
    const status = column.getAttribute('data-status');
    if (!status) return;

    const sortable = Sortable.create(column as HTMLElement, {
      group: 'kanban-board',
      animation: 200,
      ghostClass: 'kanban-ghost',
      dragClass: 'kanban-drag',
      chosenClass: 'kanban-chosen',
      forceFallback: true,
      fallbackClass: 'kanban-fallback',
      draggable: '.kanban-card', // Only allow kanban-card elements to be dragged
      filter: '.empty-column', // Exclude empty-column from being picked up
      onStart: () => {
        isDragging.value = true;
      },
      onEnd: async (evt) => {
        isDragging.value = false;
        const taskId = evt.item.getAttribute('data-task-id');
        const newStatus = evt.to.getAttribute('data-status');
        const oldStatus = evt.from.getAttribute('data-status');
        
        if (taskId && newStatus && newStatus !== oldStatus) {
          await handleKanbanDrop(taskId, newStatus);
        }
      },
    });
    kanbanSortableInstances.push(sortable);
  });
};

const handleKanbanDrop = async (taskId: string, newStatus: string) => {
  const task = tasks.value.find((t) => t.taskId === taskId);
  if (!task) return;

  try {
    // Calculate progress based on status
    let newProgress = 0;
    if (newStatus === "TODO") newProgress = 0;
    if (newStatus === "IN_PROGRESS") newProgress = 50;
    if (newStatus === "IN_REVIEW") newProgress = 80;
    if (newStatus === "DONE") newProgress = 100;

    await taskStore.updateTask(taskId, {
      status: newStatus,
      progress: newProgress,
    });

    snackbar.success(`Task moved to ${formatStatus(newStatus)}`);
    // Reload to sync state
    await loadData();
  } catch (error: any) {
    snackbar.error("Failed to update task status");
    await loadData(); // Revert on error
  }
};

const openCreateModal = () => {
  selectedTask.value = null;
  sprints.value = [];
  showTaskModal.value = true;
};

const openEditModal = (task: any) => {
  selectedTask.value = { ...task };
  showTaskModal.value = true;
};

const openTaskDetail = (task: any) => {
  router.push(`/tasks/${task.taskId}`);
};

const openDeleteDialog = (task: any) => {
  selectedTask.value = task;
  showDeleteDialog.value = true;
};

const handleSaveTask = async (data: any) => {
  modalLoading.value = true;
  try {
    if (data.taskId) {
      await taskStore.updateTask(data.taskId, data);
      snackbar.success("Task updated successfully!");
    } else {
      const newTask = await taskStore.createTask(data);
      // Handle file upload if present
      if (newTask && data.file) {
        const fileToUpload = Array.isArray(data.file)
          ? data.file[0]
          : data.file;
        if (fileToUpload) {
          try {
            await attachmentService.upload(newTask.taskId, fileToUpload);
          } catch (e) {
            console.error("Failed to upload attachment", e);
            snackbar.error("Task created but failed to upload attachment");
          }
        }
      }
      snackbar.success("Task created successfully!");
    }
    showTaskModal.value = false;
    await loadData();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to save task");
  } finally {
    modalLoading.value = false;
  }
};

const handleDeleteTask = async () => {
  if (!selectedTask.value) return;
  modalLoading.value = true;
  try {
    await taskStore.deleteTask(selectedTask.value.taskId);
    snackbar.success("Task deleted successfully!");
    showDeleteDialog.value = false;
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to delete task");
  } finally {
    modalLoading.value = false;
  }
};

// Inline Editing Handlers
const handleStatusChange = async (task: any, newStatus: string) => {
  try {
    // Calculate progress based on status
    let newProgress = task.progress || 0;
    if (newStatus === "TODO") newProgress = 0;
    if (newStatus === "IN_PROGRESS") newProgress = 50;
    if (newStatus === "IN_REVIEW") newProgress = 80;
    if (newStatus === "DONE") newProgress = 100;
    if (newStatus === "FAILED") newProgress = 0;
    if (newStatus === "CANCELLED") newProgress = 0;

    // Optimistic update
    const oldStatus = task.status;
    const oldProgress = task.progress;
    task.status = newStatus;
    task.progress = newProgress;

    await taskStore.updateTask(task.taskId, {
      ...task,
      status: newStatus,
      progress: newProgress,
    });

    snackbar.success("Status updated");
  } catch (error: any) {
    snackbar.error("Failed to update status");
    // Revert on fail
    await loadData();
  }
};

const handlePriorityChange = async (task: any, newPriority: string) => {
  try {
    const old = task.priority;
    task.priority = newPriority;
    await taskStore.updateTask(task.taskId, { ...task, priority: newPriority });
    snackbar.success("Priority updated");
  } catch {
    snackbar.error("Failed priority update");
    await loadData();
  }
};

const handleAssigneeChange = async (task: any, newAssigneeId: string) => {
  try {
    const old = task.assigneeId;
    task.assigneeId = newAssigneeId;
    // Update local object for display
    task.assignee = users.value.find((u) => u.userId === newAssigneeId);

    await taskStore.updateTask(task.taskId, {
      ...task,
      assigneeId: newAssigneeId,
    });
    snackbar.success("Assignee updated");
  } catch {
    snackbar.error("Failed assignee update");
    await loadData();
  }
};

const handleSprintChange = async (task: any, newSprintId: any) => {
  try {
    const old = task.sprintId;
    // Map 'null' from dropdown to null for API
    const sprintIdToSave = newSprintId === "unassigned" ? null : newSprintId;

    task.sprintId = sprintIdToSave;
    task.sprintName = sprintIdToSave ? allSprints.value[sprintIdToSave] : "-";

    await taskStore.updateTask(task.taskId, {
      ...task,
      sprintId: sprintIdToSave,
    });
    snackbar.success("Sprint updated");
  } catch {
    snackbar.error("Failed sprint update");
    await loadData();
  }
};

// Inline editing state
const editingTaskId = ref<string | null>(null);
const editingField = ref<string | null>(null);
const editingValue = ref<string>("");

const startEditing = (taskId: string, field: string, currentValue: string) => {
  editingTaskId.value = taskId;
  editingField.value = field;
  editingValue.value = currentValue || "";
};

const cancelEditing = () => {
  editingTaskId.value = null;
  editingField.value = null;
  editingValue.value = "";
};

const handleTaskNameChange = async (task: any) => {
  if (!editingValue.value.trim()) {
    cancelEditing();
    return;
  }
  try {
    const oldTitle = task.title;
    task.title = editingValue.value.trim();
    
    await taskStore.updateTask(task.taskId, {
      ...task,
      title: editingValue.value.trim(),
    });
    snackbar.success("Task name updated");
    cancelEditing();
  } catch {
    snackbar.error("Failed to update task name");
    await loadData();
    cancelEditing();
  }
};

const handleProjectChange = async (task: any, newProjectId: string) => {
  try {
    const oldProjectId = task.projectId;
    task.projectId = newProjectId;
    task.projectName = projects.value.find((p) => p.projectId === newProjectId)?.name || "-";
    // Reset sprint when project changes
    task.sprintId = null;
    task.sprintName = "-";

    await taskStore.updateTask(task.taskId, {
      ...task,
      projectId: newProjectId,
      sprintId: null,
    });
    snackbar.success("Project updated");
  } catch {
    snackbar.error("Failed to update project");
    await loadData();
  }
};

const handleDueDateChange = async (task: any, newDate: Date | null) => {
  try {
    const dateToSave = newDate ? newDate.toISOString() : null;
    task.dueDate = dateToSave;

    await taskStore.updateTask(task.taskId, {
      ...task,
      dueDate: dateToSave,
    });
    snackbar.success("Due date updated");
  } catch {
    snackbar.error("Failed to update due date");
    await loadData();
  }
};

// Get sprints for a specific project (for inline dropdown)
const getSprintsForProject = (projectId: string) => {
  return sprintsByProjectId.value[projectId] || [];
};


const getStatusColor = (status: string) => {
  // Use dynamic status color if available
  const dynamicStatus = taskStatuses.value.find(s => s.code === status);
  if (dynamicStatus) return dynamicStatus.color;
  
  // Fallback to hardcoded colors
  const colors: Record<string, string> = {
    TODO: "#64748B",
    IN_PROGRESS: "#10B981",
    IN_REVIEW: "#FBBF24",
    DONE: "#f1184c",
    FAILED: "#F97316",
    CANCELLED: "#EF4444",
  };
  return colors[status] || "#64748B";
};

// ========== Kanban Column Management ==========
const showColumnModal = ref(false);
const editingColumn = ref<{ statusId?: string; name: string; code: string; color: string } | null>(null);
const columnModalLoading = ref(false);
const showDeleteColumnDialog = ref(false);
const deletingColumn = ref<any>(null);
const kanbanBoardRef = ref<HTMLElement | null>(null);
let columnSortableInstance: Sortable | null = null;

// Auto-generate code from name
const generateStatusCode = (name: string) => {
  return name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
};

// Open add column modal
const openAddColumnModal = () => {
  editingColumn.value = { name: '', code: '', color: '#64748B' };
  showColumnModal.value = true;
};

// Open edit column modal
const openEditColumnModal = (column: any) => {
  const status = taskStatuses.value.find(s => s.code === column.status);
  if (status) {
    editingColumn.value = { 
      statusId: status.statusId, 
      name: status.name, 
      code: status.code, 
      color: status.color 
    };
    showColumnModal.value = true;
  }
};

// Open delete column dialog
const openDeleteColumnDialog = (column: any) => {
  const status = taskStatuses.value.find(s => s.code === column.status);
  if (status) {
    deletingColumn.value = status;
    showDeleteColumnDialog.value = true;
  }
};

// Save column (create or update)
const handleSaveColumn = async () => {
  if (!editingColumn.value) return;
  columnModalLoading.value = true;
  try {
    if (editingColumn.value.statusId) {
      // Update existing status
      await statusService.update(editingColumn.value.statusId, {
        name: editingColumn.value.name,
        color: editingColumn.value.color,
      });
      snackbar.success('Column updated successfully!');
    } else {
      // Create new status
      const code = generateStatusCode(editingColumn.value.name);
      await statusService.create({
        name: editingColumn.value.name,
        code: code,
        color: editingColumn.value.color,
      });
      snackbar.success('Column created successfully!');
    }
    showColumnModal.value = false;
    // Reload statuses
    // taskStatuses.value = await statusService.getByWorkspace(workspaceStore.selectedWorkspaceId || undefined);
    taskStatuses.value = []; // Reset or reload project statuses if project context available
    await loadData();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || 'Failed to save column');
  } finally {
    columnModalLoading.value = false;
  }
};

// Delete column
const handleDeleteColumn = async () => {
  if (!deletingColumn.value) return;
  columnModalLoading.value = true;
  try {
    await statusService.delete(deletingColumn.value.statusId);
    snackbar.success('Column deleted successfully!');
    showDeleteColumnDialog.value = false;
    // Reload statuses
    // taskStatuses.value = await statusService.getByWorkspace(workspaceStore.selectedWorkspaceId || undefined);
    taskStatuses.value = [];
    await loadData();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || 'Failed to delete column');
  } finally {
    columnModalLoading.value = false;
  }
};

// Initialize column drag-to-reorder
const initColumnSortable = () => {
  if (!kanbanBoardRef.value) return;
  if (columnSortableInstance) columnSortableInstance.destroy();
  
  columnSortableInstance = Sortable.create(kanbanBoardRef.value, {
    animation: 200,
    handle: '.column-drag-handle',
    ghostClass: 'column-ghost',
    onEnd: async (evt) => {
      if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
        // Reorder statuses array
        const [item] = taskStatuses.value.splice(evt.oldIndex, 1);
        if (item) {
          taskStatuses.value.splice(evt.newIndex, 0, item);
          // Save new order to backend
          try {
            await statusService.reorder(taskStatuses.value.map(s => s.statusId));
            snackbar.success('Column order updated!');
          } catch (e) {
            snackbar.error('Failed to update column order');
            // Reload on error
            // taskStatuses.value = await statusService.getByWorkspace(workspaceStore.selectedWorkspaceId || undefined);
            taskStatuses.value = [];
          }
        }
      }
    },
  });
};

// Watch for Kanban view mode to init column sortable
watch(
  () => viewMode.value,
  async (mode) => {
    if (mode === 'kanban') {
      await nextTick();
      initColumnSortable();
    }
  },
  { immediate: true }
);

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    URGENT: "#DC2626",
    HIGH: "#EF4444",
    MEDIUM: "#ff6b8a",
    LOW: "#10B981",
  };
  return colors[priority] || "#64748B";
};

const formatStatus = (status: string) =>
  status?.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "";
const formatPriority = (priority: string) =>
  priority?.charAt(0).toUpperCase() + priority?.slice(1) || "";
const formatDate = (date: string | null | undefined) =>
  date
    ? new Date(date).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

// Advanced filter handlers
const handleApplyFilters = (filters: typeof advancedFilters.value) => {
  advancedFilters.value = { ...filters };
};

const handleResetFilters = () => {
  advancedFilters.value = {
    departmentId: null,
    status: [],
    priority: [],
    projectId: null,
    sprintId: null,
    assigneeId: null,
    dateFrom: null,
    dateTo: null,
  };
};

// Get all sprints for filter dropdown
const allSprintsForFilter = computed(() => {
  const sprintsList: { sprintId: string; name: string }[] = [];
  Object.entries(sprintsByProjectId.value).forEach(([_, sprints]) => {
    sprints.forEach((s: any) => {
      if (!sprintsList.find(sp => sp.sprintId === s.sprintId)) {
        sprintsList.push({
          sprintId: s.sprintId,
          name: s.name || s.sprintName || `Sprint ${s.sprintId}`,
        });
      }
    });
  });
  return sprintsList;
});
</script>

<template>
  <div class="tasks-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-clipboard-check-outline" size="28" />
          </div>
          <div>
            <h1 class="page-title">Tasks</h1>
            <p class="page-subtitle">Manage and track all your team tasks</p>
          </div>
        </div>
        <div class="d-flex align-center gap-4">
          <div class="view-toggle">
            <span
              class="view-toggle-item"
              :class="{ active: viewMode === 'list' }"
              @click="viewMode = 'list'"
            >
              <v-icon icon="mdi-format-list-bulleted" size="16" class="mr-1" />
              List
            </span>
            <span
              class="view-toggle-item"
              :class="{ active: viewMode === 'project' }"
              @click="viewMode = 'project'"
            >
              <v-icon icon="mdi-folder-outline" size="16" class="mr-1" />
              By Project
            </span>
            <span
              class="view-toggle-item"
              :class="{ active: viewMode === 'kanban' }"
              @click="viewMode = 'kanban'"
            >
              <v-icon icon="mdi-view-column-outline" size="16" class="mr-1" />
              Kanban
            </span>
          </div>
          <div class="search-field">
            <v-autocomplete
              v-model="searchQuery"
              :items="searchSuggestions"
              :loading="isSearching"
              label="Search by Name or #ID"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              hide-no-data
              hide-selected
              clearable
              @update:search="handleSearch"
              @update:model-value="selectTaskFromSearch"
              @keyup.enter="performSearch"
              rounded="lg"
              item-title="title"
              item-value="value"
            >
              <template #item="{ props, item }">
                <v-list-item
                  v-bind="props"
                  :subtitle="item.raw.subtitle"
                ></v-list-item>
              </template>
            </v-autocomplete>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <v-btn
          class="filter-btn"
          variant="outlined"
          rounded="lg"
          size="default"
          @click="showFilterDrawer = true"
        >
          <v-icon icon="mdi-filter-variant" size="18" class="mr-2" />
          Filters
          <v-badge
            v-if="activeFilterCount > 0"
            :content="activeFilterCount"
            color="#f1184c"
            inline
            class="ml-2"
          />
        </v-btn>
        <v-btn
          class="add-task-btn"
          prepend-icon="mdi-plus"
          rounded="lg"
          size="default"
          elevation="0"
          @click="openCreateModal"
        >Add New</v-btn>
      </div>
    </div>

    <!-- Loading -->
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <!-- Empty State -->
    <v-card
      v-if="!loading && filteredTasks.length === 0"
      class="pa-8 text-center"
      rounded="xl"
    >
      <v-icon
        icon="mdi-clipboard-text-outline"
        size="64"
        color="grey-lighten-1"
        class="mb-4"
      />
      <h3 class="text-h6 mb-2">No Tasks Found</h3>
      <p class="text-grey mb-4">Get started by creating your first task</p>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateModal"
        >Create Task</v-btn
      >
    </v-card>

    <!-- Project Grouped View -->
    <div v-else-if="viewMode === 'project'" class="project-view">
      <div
        v-for="group in tasksByProject"
        :key="group.project.projectId"
        class="project-card"
      >
        <div class="project-header">
          <div class="project-header-left">
            <div class="project-icon">
              <v-icon icon="mdi-folder-outline" size="16" color="white" />
            </div>
            <span class="project-name">{{ group.project.name }}</span>
            <span class="project-count">{{ group.tasks.length }} tasks</span>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            color="white"
          >
            <v-icon icon="mdi-dots-horizontal" />
          </v-btn>
        </div>
        <div class="project-tasks">
          <div
            v-for="task in group.tasks"
            :key="task.taskId"
            class="project-task-item"
            @click="openTaskDetail(task)"
          >
            <div class="task-left">
              <div 
                class="task-status-dot"
                :style="{ backgroundColor: getStatusColor(task.status) }"
              ></div>
              <div class="task-info">
                <span class="task-name">{{ task.title }}</span>
                <span class="task-id-small">#{{ task.taskId }}</span>
              </div>
            </div>
            <div class="task-right">
              <v-chip
                v-if="task.sprintName && task.sprintName !== '-'"
                size="x-small"
                class="task-chip sprint-chip"
                variant="flat"
              >
                <v-icon icon="mdi-flag-outline" size="10" class="mr-1" />
                {{ task.sprintName }}
              </v-chip>
              <v-chip
                size="x-small"
                class="task-chip priority-chip"
                :style="{
                  backgroundColor: getPriorityColor(task.priority) + '15',
                  color: getPriorityColor(task.priority),
                  borderColor: getPriorityColor(task.priority) + '30',
                }"
              >
                {{ formatPriority(task.priority) }}
              </v-chip>
              <span
                class="status-text"
                :style="{ color: getStatusColor(task.status) }"
              >
                {{ formatStatus(task.status) }}
              </span>
              <v-avatar v-if="task.assignee" size="24" class="task-avatar">
                <v-img
                  v-if="task.assignee.profileImageUrl"
                  :src="task.assignee.profileImageUrl"
                />
                <span v-else class="avatar-text">{{
                  task.assignee.fullName?.charAt(0) || "?"
                }}</span>
              </v-avatar>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn icon variant="text" size="x-small" v-bind="props" class="action-btn">
                    <v-icon icon="mdi-dots-vertical" size="16" />
                  </v-btn>
                </template>
                <v-list density="compact" class="action-menu">
                  <v-list-item
                    title="Edit"
                    prepend-icon="mdi-pencil"
                    @click.stop="openEditModal(task)"
                  />
                  <v-list-item
                    title="Delete"
                    prepend-icon="mdi-delete"
                    class="text-error"
                    @click.stop="openDeleteDialog(task)"
                  />
                </v-list>
              </v-menu>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else-if="viewMode === 'list'" class="list-view">
      <div class="list-card">
        <div class="list-header">
          <div class="list-header-left">
            <div class="list-icon">
              <v-icon icon="mdi-format-list-bulleted" size="16" color="white" />
            </div>
            <span class="list-title">All Tasks</span>
            <span class="list-count">{{ filteredTasks.length }} tasks</span>
          </div>
        </div>
        <!-- Column Headers -->
        <div class="list-column-headers">
          <div class="col-drag"><v-icon icon="mdi-dots-grid" size="16" color="grey-lighten-1" /></div>
          <div class="col-id">ID</div>
          <div class="col-name">Task Name</div>
          <div class="col-project">Project</div>
          <div class="col-sprint">Sprint</div>
          <div class="col-due">Due Date</div>
          <div class="col-status">Status</div>
          <div class="col-priority">Priority</div>
          <div class="col-progress">Progress</div>
          <div class="col-assignee">Assignee</div>
          <div class="col-actions"></div>
        </div>
        <!-- Task Rows -->
        <div ref="listTasksRef" class="list-tasks">
          <div
            v-for="task in filteredTasks"
            :key="task.taskId"
            class="list-task-row"
            @click="openTaskDetail(task)"
          >
            <div class="col-drag">
              <v-icon icon="mdi-drag-horizontal-variant" size="16" color="grey" class="drag-handle" />
            </div>
            <div class="col-id">
              <span class="task-id-text">#{{ task.taskId }}</span>
            </div>
            <div class="col-name" @click.stop>
              <div 
                class="task-status-dot"
                :style="{ backgroundColor: getStatusColor(task.status) }"
              ></div>
              <!-- Click to edit task name -->
              <v-text-field
                v-if="editingTaskId === task.taskId && editingField === 'title'"
                v-model="editingValue"
                density="compact"
                variant="outlined"
                hide-details
                autofocus
                class="inline-text-field"
                @blur="handleTaskNameChange(task)"
                @keyup.enter="handleTaskNameChange(task)"
                @keyup.escape="cancelEditing"
              />
              <span 
                v-else 
                class="task-name-text editable-field"
                @click="startEditing(task.taskId, 'title', task.title)"
              >{{ task.title }}</span>
            </div>
            <div class="col-project" @click.stop>
              <v-select
                :model-value="task.projectId"
                :items="projects"
                item-title="name"
                item-value="projectId"
                density="compact"
                variant="plain"
                hide-details
                class="inline-select"
                @update:model-value="(val) => handleProjectChange(task, val)"
              >
                <template #selection="{ item }">
                  <span class="project-text">{{ item.title }}</span>
                </template>
              </v-select>
            </div>
            <div class="col-sprint" @click.stop>
              <v-select
                :model-value="task.sprintId || 'unassigned'"
                :items="[
                  { title: 'No Sprint', value: 'unassigned' },
                  ...getSprintsForProject(task.projectId).map((s: any) => ({ 
                    title: s.name || s.sprintName || `Sprint ${s.sprintId}`, 
                    value: s.sprintId 
                  }))
                ]"
                density="compact"
                variant="plain"
                hide-details
                class="inline-select"
                @update:model-value="(val) => handleSprintChange(task, val)"
              >
                <template #selection="{ item }">
                  <v-chip
                    v-if="item.value !== 'unassigned'"
                    size="x-small"
                    class="sprint-chip"
                    variant="flat"
                  >
                    <v-icon icon="mdi-run" size="10" class="mr-1" />
                    {{ item.title }}
                  </v-chip>
                  <span v-else class="no-sprint">-</span>
                </template>
              </v-select>
            </div>
            <div class="col-due" @click.stop>
              <VueDatePicker
                :model-value="task.dueDate ? new Date(task.dueDate) : null"
                @update:model-value="(val: any) => handleDueDateChange(task, val)"
                auto-apply
                :teleport="true"
                :enable-time-picker="false"
                class="enhanced-date-picker-inline"
              >
                <template #trigger>
                  <span class="due-text editable-field">{{ formatDate(task.dueDate) }}</span>
                </template>
              </VueDatePicker>
            </div>
            <div class="col-status" @click.stop>
              <v-select
                :model-value="task.status"
                :items="getStatusOptionsForTask(task)"
                density="compact"
                variant="plain"
                hide-details
                class="inline-select status-select"
                @update:model-value="(val) => handleStatusChange(task, val)"
              >
                <template #selection="{ item }">
                  <span
                    class="status-badge"
                    :style="{ color: getStatusColor(item.value) }"
                  >
                    <span class="status-dot-inline" :style="{ backgroundColor: getStatusColor(item.value) }"></span>
                    {{ item.title }}
                  </span>
                </template>
                <template #item="{ props, item }">
                  <v-list-item v-bind="props" :title="undefined" class="status-menu-item-list">
                    <template #prepend>
                      <span class="status-dot-menu" :style="{ backgroundColor: item.raw.color }"></span>
                    </template>
                    <v-list-item-title class="text-body-2">{{ item.raw.title }}</v-list-item-title>
                  </v-list-item>
                </template>
              </v-select>
            </div>
            <div class="col-priority" @click.stop>
              <v-select
                :model-value="task.priority"
                :items="[
                  { title: 'Urgent', value: 'URGENT' },
                  { title: 'High', value: 'HIGH' },
                  { title: 'Medium', value: 'MEDIUM' },
                  { title: 'Low', value: 'LOW' },
                ]"
                density="compact"
                variant="plain"
                hide-details
                class="inline-select priority-select"
                @update:model-value="(val) => handlePriorityChange(task, val)"
              >
                <template #selection="{ item }">
                  <v-chip
                    size="x-small"
                    class="priority-chip"
                    :style="{
                      backgroundColor: getPriorityColor(item.value) + '15',
                      color: getPriorityColor(item.value),
                    }"
                  >
                    {{ item.title }}
                  </v-chip>
                </template>
              </v-select>
            </div>
            <div class="col-progress">
              <div class="progress-wrapper">
                <div class="progress-bar-mini">
                  <div 
                    class="progress-bar-fill-mini"
                    :style="{
                      width: (task.progress || 0) + '%',
                      backgroundColor: getStatusColor(task.status),
                    }"
                  ></div>
                </div>
                <span class="progress-text">{{ task.progress || 0 }}%</span>
              </div>
            </div>
            <div class="col-assignee" @click.stop>
              <v-select
                :model-value="task.assigneeId || task.assignee?.userId"
                :items="users"
                item-title="fullName"
                item-value="userId"
                density="compact"
                variant="plain"
                hide-details
                class="inline-select assignee-select"
                @update:model-value="(val) => handleAssigneeChange(task, val)"
              >
                <template #selection="{ item }">
                  <div class="assignee-info">
                    <v-avatar size="22" class="assignee-avatar">
                      <v-img
                        v-if="item.raw?.profileImageUrl"
                        :src="item.raw.profileImageUrl"
                      />
                      <span v-else class="avatar-initial">{{
                        item.title?.charAt(0) || "?"
                      }}</span>
                    </v-avatar>
                    <span class="assignee-name-text">{{ item.title || "Unassigned" }}</span>
                  </div>
                </template>
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <v-avatar size="24" class="mr-2">
                        <v-img
                          v-if="item.raw?.profileImageUrl"
                          :src="item.raw.profileImageUrl"
                        />
                        <span v-else class="avatar-initial">{{
                          item.raw?.fullName?.charAt(0) || "?"
                        }}</span>
                      </v-avatar>
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </div>
            <div class="col-actions">
              <v-menu>
                <template #activator="{ props }">
                  <v-btn icon variant="text" size="x-small" v-bind="props" class="action-btn">
                    <v-icon icon="mdi-dots-vertical" size="16" />
                  </v-btn>
                </template>
                <v-list density="compact" class="action-menu">
                  <v-list-item
                    title="Edit"
                    prepend-icon="mdi-pencil"
                    @click.stop="openEditModal(task)"
                  />
                  <v-list-item
                    title="Delete"
                    prepend-icon="mdi-delete"
                    class="text-error"
                    @click.stop="openDeleteDialog(task)"
                  />
                </v-list>
              </v-menu>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Kanban View -->
    <div v-else-if="viewMode === 'kanban'" class="kanban-container" :class="{ 'is-dragging': isDragging }">
      <div ref="kanbanBoardRef" class="kanban-board">
        <div
          v-for="column in kanbanColumns"
          :key="column.status"
          class="kanban-column"
          :class="{ 'drop-target': isDragging }"
        >
          <div class="kanban-column-header">
            <div class="d-flex align-center">
              <!-- Drag Handle for reordering columns -->
              <v-icon icon="mdi-drag-vertical" class="column-drag-handle mr-1" size="18" />
              <div
                :style="{ backgroundColor: column.color }"
                class="column-indicator"
              ></div>
              <span class="column-title">{{
                column.title
              }}</span>
              <span class="column-count">{{
                column.tasks.length
              }}</span>
            </div>
            <!-- Column Actions Menu -->
            <v-menu>
              <template #activator="{ props }">
                <v-btn icon variant="text" size="x-small" v-bind="props" class="column-menu-btn">
                  <v-icon icon="mdi-dots-vertical" size="16" />
                </v-btn>
              </template>
              <v-list density="compact" class="column-action-menu">
                <v-list-item @click="openEditColumnModal(column)" prepend-icon="mdi-pencil-outline">
                  <v-list-item-title>Edit Column</v-list-item-title>
                </v-list-item>
                <v-list-item @click="openDeleteColumnDialog(column)" prepend-icon="mdi-delete-outline" class="text-error">
                  <v-list-item-title>Delete Column</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
          <div 
            class="kanban-tasks" 
            :data-status="column.status"
            :style="{ '--column-color': column.color }"
          >
            <div
              v-for="task in column.tasks"
              :key="task.taskId"
              :data-task-id="task.taskId"
              class="kanban-card"
              :style="{ '--card-accent': column.color }"
            >
              <!-- Card Accent Bar -->
              <div class="card-accent-bar" :style="{ backgroundColor: column.color }"></div>
              
              <div class="card-content">
                <div class="card-header">
                  <!-- Inline Priority Selector -->
                  <v-select
                    :model-value="task.priority"
                    :items="[
                      { title: 'Urgent', value: 'urgent' },
                      { title: 'High', value: 'high' },
                      { title: 'Medium', value: 'medium' },
                      { title: 'Low', value: 'low' },
                    ]"
                    density="compact"
                    variant="plain"
                    hide-details
                    class="kanban-inline-select priority-select-kanban"
                    @update:model-value="(val) => handlePriorityChange(task, val)"
                    @click.stop
                  >
                    <template #selection="{ item }">
                      <span
                        class="priority-badge"
                        :style="{
                          backgroundColor: getPriorityColor(item.value) + '15',
                          color: getPriorityColor(item.value),
                          borderColor: getPriorityColor(item.value) + '30',
                        }"
                      >
                        <v-icon :icon="item.value === 'urgent' ? 'mdi-alert-circle' : item.value === 'high' ? 'mdi-arrow-up-bold' : item.value === 'medium' ? 'mdi-minus' : 'mdi-arrow-down-bold'" size="10" class="mr-1" />
                        {{ item.title }}
                      </span>
                    </template>
                  </v-select>
                  <span class="task-id" @click="openTaskDetail(task)">#{{ task.taskId }}</span>
                </div>
                
                <h4 class="task-title" @click="openTaskDetail(task)">
                  {{ task.title }}
                </h4>
                
                <!-- Status Change Section -->
                <div class="status-section" @click.stop>
                  <v-select
                    :model-value="task.status"
                    :items="getStatusOptionsForTask(task)"
                    density="compact"
                    variant="plain"
                    hide-details
                    class="kanban-inline-select status-select-kanban"
                    @update:model-value="(val) => handleStatusChange(task, val)"
                  >
                    <template #selection="{ item }">
                      <div
                        class="status-badge-kanban"
                        :style="{
                          backgroundColor: getStatusColor(item.value) + '15',
                          color: getStatusColor(item.value),
                          borderColor: getStatusColor(item.value) + '30',
                        }"
                      >
                        <span class="status-dot" :style="{ backgroundColor: getStatusColor(item.value) }"></span>
                        {{ item.title }}
                        <v-icon icon="mdi-chevron-down" size="12" class="ml-1" />
                      </div>
                    </template>
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props" class="status-menu-item">
                        <template #prepend>
                          <span class="status-dot-menu" :style="{ backgroundColor: item.raw.color }"></span>
                        </template>
                      </v-list-item>
                    </template>
                  </v-select>
                </div>
                
                <!-- Inline Sprint Selector -->
                <div class="meta-row">
                  <v-select
                    :model-value="task.sprintId || 'unassigned'"
                    :items="[
                      { title: 'No Sprint', value: 'unassigned' },
                      ...getSprintsForProject(task.projectId).map((s: any) => ({ 
                        title: s.name || s.sprintName || `Sprint ${s.sprintId}`, 
                        value: s.sprintId 
                      }))
                    ]"
                    density="compact"
                    variant="plain"
                    hide-details
                    class="kanban-inline-select sprint-select-kanban"
                    @update:model-value="(val) => handleSprintChange(task, val)"
                    @click.stop
                  >
                    <template #selection="{ item }">
                      <div
                        v-if="item.value !== 'unassigned'"
                        class="sprint-badge-enhanced"
                      >
                        <v-icon icon="mdi-flag-outline" size="11" />
                        {{ item.title }}
                      </div>
                      <span v-else class="no-sprint-text">
                        <v-icon icon="mdi-flag-off-outline" size="11" class="mr-1" />
                        No Sprint
                      </span>
                    </template>
                  </v-select>
                  
                  <!-- Project Badge -->
                  <div class="project-badge-mini" v-if="task.projectName && task.projectName !== '-'">
                    <v-icon icon="mdi-folder-outline" size="11" />
                    {{ task.projectName.length > 12 ? task.projectName.substring(0, 12) + '...' : task.projectName }}
                  </div>
                </div>
                
                <!-- Progress bar with percentage -->
                <div class="progress-container">
                  <div class="progress-bar-enhanced">
                    <div
                      class="progress-bar-fill-enhanced"
                      :style="{
                        width: (task.progress || 0) + '%',
                        background: `linear-gradient(90deg, ${column.color} 0%, ${column.color}dd 100%)`,
                      }"
                    ></div>
                  </div>
                  <span class="progress-percentage" :style="{ color: column.color }">{{ task.progress || 0 }}%</span>
                </div>
                
                <div class="card-footer">
                  <!-- Inline Assignee Selector -->
                  <v-select
                    :model-value="task.assigneeId || task.assignee?.userId"
                    :items="users"
                    item-title="fullName"
                    item-value="userId"
                    density="compact"
                    variant="plain"
                    hide-details
                    class="kanban-inline-select assignee-select-kanban"
                    @update:model-value="(val) => handleAssigneeChange(task, val)"
                    @click.stop
                  >
                    <template #selection="{ item }">
                      <div class="assignee-section">
                        <v-avatar size="24" class="assignee-avatar-enhanced">
                          <v-img
                            v-if="item.raw?.profileImageUrl"
                            :src="item.raw.profileImageUrl"
                          />
                          <span v-else class="avatar-initial-enhanced">{{
                            item.title?.charAt(0) || "?"
                          }}</span>
                        </v-avatar>
                        <span class="assignee-name">{{
                          item.title?.split(' ')[0] || "Unassigned"
                        }}</span>
                      </div>
                    </template>
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props">
                        <template #prepend>
                          <v-avatar size="28" class="mr-2">
                            <v-img
                              v-if="item.raw?.profileImageUrl"
                              :src="item.raw.profileImageUrl"
                            />
                            <span v-else class="avatar-initial-enhanced">{{
                              item.raw?.fullName?.charAt(0) || "?"
                            }}</span>
                          </v-avatar>
                        </template>
                      </v-list-item>
                    </template>
                  </v-select>
                  <!-- Inline Due Date Picker -->
                  <VueDatePicker
                    :model-value="task.dueDate ? new Date(task.dueDate) : null"
                    @update:model-value="(val: any) => handleDueDateChange(task, val)"
                    auto-apply
                    :teleport="true"
                    :enable-time-picker="false"
                    class="enhanced-date-picker-inline"
                    @click.stop
                  >
                    <template #trigger>
                      <div class="due-date-enhanced" :class="{ 'has-date': task.dueDate }" @click.stop>
                        <v-icon icon="mdi-calendar-outline" size="13" />
                        <span>{{ task.dueDate ? formatDate(task.dueDate) : 'Set Date' }}</span>
                      </div>
                    </template>
                  </VueDatePicker>
                </div>
              </div>
            </div>
            <!-- Empty state for column -->
            <div v-if="column.tasks.length === 0" class="empty-column">
              <div class="empty-column-icon">
                <v-icon icon="mdi-tray-arrow-down" size="28" />
              </div>
              <span class="empty-column-text">Drop tasks here</span>
              <span class="empty-column-hint">Drag cards from other columns</span>
            </div>
          </div>
        </div>
        <!-- Add Column Button -->
        <div class="add-column-card" @click="openAddColumnModal">
          <v-icon icon="mdi-plus" size="24" class="mb-2" />
          <span>Add Column</span>
        </div>
      </div>
    </div>


    <!-- Advanced Filter Drawer -->
    <AdvancedFilterDrawer
      v-model="showFilterDrawer"
      :departments="departments"
      :projects="projects"
      :sprints="allSprintsForFilter"
      :users="users"
      :status-options="statusFilterOptions"
      :filters="advancedFilters"
      @apply="handleApplyFilters"
      @reset="handleResetFilters"
    />

    <!-- Modals -->
    <TaskModal
      v-model="showTaskModal"
      :task="selectedTask"
      :projects="projects"
      :sprints="sprints"
      :users="users"
      :loading="modalLoading"
      @save="handleSaveTask"
      @project-change="loadSprintsForProject"
    />
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Delete Task"
      :message="`Are you sure you want to delete '${selectedTask?.title}'?`"
      :loading="modalLoading"
      @confirm="handleDeleteTask"
    />

    <!-- Column Edit Modal -->
    <v-dialog v-model="showColumnModal" max-width="400" persistent>
      <v-card class="rounded-xl">
        <div class="pa-5" style="background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);">
          <h3 class="text-h6 text-white font-weight-bold">
            {{ editingColumn?.statusId ? 'Edit Column' : 'Add New Column' }}
          </h3>
          <p class="text-caption text-white" style="opacity: 0.85;">
            {{ editingColumn?.statusId ? 'Update column details' : 'Create a new workflow stage' }}
          </p>
        </div>
        <v-card-text class="pa-5">
          <v-text-field
            v-model="editingColumn!.name"
            label="Column Name"
            placeholder="e.g., Code Review"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            autofocus
            :rules="[(v: string) => !!v || 'Name is required']"
            class="mb-3"
          />
          <div class="mb-3">
            <label class="text-body-2 font-weight-medium mb-2 d-block">Color</label>
            <div class="d-flex gap-2 flex-wrap">
              <div
                v-for="color in ['#64748B', '#10B981', '#FBBF24', '#f1184c', '#F97316', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4']"
                :key="color"
                class="color-option"
                :class="{ active: editingColumn?.color === color }"
                :style="{ backgroundColor: color }"
                @click="editingColumn!.color = color"
              >
                <v-icon v-if="editingColumn?.color === color" icon="mdi-check" size="14" color="white" />
              </div>
            </div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showColumnModal = false" :disabled="columnModalLoading">Cancel</v-btn>
          <v-btn 
            color="primary" 
            variant="flat" 
            @click="handleSaveColumn" 
            :loading="columnModalLoading"
            :disabled="!editingColumn?.name"
            rounded="lg"
          >
            {{ editingColumn?.statusId ? 'Save' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Column Dialog -->
    <ConfirmDialog
      v-model="showDeleteColumnDialog"
      title="Delete Column"
      :message="`Are you sure you want to delete '${deletingColumn?.name}'? Tasks in this column will keep their status.`"
      confirmText="Delete"
      confirmColor="error"
      :loading="columnModalLoading"
      @confirm="handleDeleteColumn"
    />
  </div>
</template>

<style scoped>
/* Page Layout */
.tasks-page {
  padding: 0;
  min-height: 100%;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 24px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 4px 0 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-filter {
  width: 150px;
}

.status-filter :deep(.v-field) {
  border-radius: 10px;
}

.department-filter {
  width: 160px;
}

.department-filter :deep(.v-field) {
  border-radius: 10px;
}

.priority-filter {
  width: 140px;
}

.priority-filter :deep(.v-field) {
  border-radius: 10px;
}

.search-field {
  width: 300px;
  margin-left: 16px;
}

.search-field :deep(.v-field) {
  border-radius: 10px;
}

.add-task-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  text-transform: none;
  padding: 0 20px;
  height: 42px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.add-task-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.filter-btn {
  border-color: #e2e8f0;
  color: #64748b;
  font-weight: 500;
  text-transform: none;
  height: 42px;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  border-color: #f1184c;
  color: #f1184c;
  background: rgba(241, 24, 76, 0.04);
}

.filter-btn :deep(.v-badge__badge) {
  font-size: 10px;
  font-weight: 600;
  min-width: 18px;
  height: 18px;
}

/* View Toggle Tabs - Enhanced */
.view-toggle {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
}

.view-toggle-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-toggle-item:hover {
  color: #475569;
  background: #f8fafc;
}

.view-toggle-item.active {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* Table Styling */
.task-row {
  transition: all 0.2s ease;
}

.task-row:hover {
  background-color: #f8fafc;
}

.task-item:hover {
  background-color: #f8fafc;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-move {
  cursor: move;
}

/* Progress Bar - List View */
.progress-bar {
  height: 6px;
  border-radius: 4px;
  background: #e2e8f0;
  overflow: hidden;
  min-width: 80px;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

/* Kanban Container */
.kanban-container {
  overflow-x: auto;
  padding: 8px 4px 20px;
  transition: all 0.3s ease;
}

.kanban-container.is-dragging {
  cursor: grabbing;
}

.kanban-board {
  display: flex;
  gap: 20px;
  min-width: max-content;
}

/* Kanban Column */
.kanban-column {
  width: 300px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.kanban-column.drop-target .kanban-tasks {
  background: linear-gradient(180deg, rgba(241, 24, 76, 0.05) 0%, rgba(241, 24, 76, 0.02) 100%);
  border: 2px dashed rgba(241, 24, 76, 0.3);
}

.kanban-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 8px;
  margin-bottom: 8px;
}

.column-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 10px;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.9);
}

.column-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  letter-spacing: -0.01em;
}

.column-count {
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  background: rgba(100, 116, 139, 0.1);
  border-radius: 10px;
}

/* Column Management Styles */
.column-drag-handle {
  cursor: grab;
  color: #94a3b8;
  opacity: 0;
  transition: all 0.2s ease;
}

.kanban-column:hover .column-drag-handle {
  opacity: 1;
}

.column-drag-handle:hover {
  color: #64748b;
}

.column-drag-handle:active {
  cursor: grabbing;
}

.column-menu-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.kanban-column:hover .column-menu-btn {
  opacity: 1;
}

.column-action-menu {
  min-width: 140px;
}

.column-ghost {
  opacity: 0.4;
  background: #e0f2fe;
}

/* Add Column Card */
.add-column-card {
  width: 280px;
  min-height: 120px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
  margin-top: 44px; /* Align with column content */
}

.add-column-card:hover {
  border-color: #f1184c;
  background: linear-gradient(180deg, rgba(241, 24, 76, 0.02) 0%, rgba(241, 24, 76, 0.05) 100%);
  color: #f1184c;
}

.add-column-card span {
  font-size: 13px;
  font-weight: 500;
}

/* Color Picker Options */
.color-option {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: white;
  box-shadow: 0 0 0 2px #374151;
}

/* Kanban Tasks Container */
.kanban-tasks {
  min-height: 500px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
}

/* Kanban Card - Enhanced & Polished */
.kanban-card {
  background: white;
  border-radius: 14px;
  padding: 0;
  margin-bottom: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  position: relative;
}

.kanban-card:hover {
  transform: translateY(-4px);
  box-shadow: 
    0 12px 32px rgba(0, 0, 0, 0.12), 
    0 4px 12px rgba(0, 0, 0, 0.06),
    0 0 0 1px var(--card-accent, rgba(241, 24, 76, 0.15));
  border-color: var(--card-accent, rgba(241, 24, 76, 0.2));
}

.kanban-card:active {
  transform: translateY(-2px);
}

/* Card Accent Bar */
.card-accent-bar {
  width: 100%;
  height: 4px;
  transition: height 0.2s ease;
}

.kanban-card:hover .card-accent-bar {
  height: 5px;
}

.card-content {
  padding: 14px 16px 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.priority-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 6px;
  border: 1px solid;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  transition: all 0.2s ease;
}

.priority-badge:hover {
  transform: scale(1.02);
}

.task-id {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  padding: 3px 8px;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.task-id:hover {
  background: rgba(241, 24, 76, 0.1);
  color: #f1184c;
}

.task-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s ease;
}

.kanban-card:hover .task-title {
  color: #0f172a;
}

/* Status Section Styling */
.status-section {
  margin-bottom: 10px;
}

.status-select-kanban {
  max-width: fit-content;
}

.status-badge-kanban {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-badge-kanban:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot-inline {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}

.status-dot-menu {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;
}

.status-menu-item-list {
  border-radius: 8px;
  margin: 2px 6px;
  transition: all 0.15s ease;
}

.status-menu-item-list:hover {
  background: rgba(241, 24, 76, 0.06);
}

/* Meta Row - Sprint & Project */
.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.sprint-badge-enhanced {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #f1184c;
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.1) 0%, rgba(241, 24, 76, 0.06) 100%);
  border-radius: 6px;
  border: 1px solid rgba(241, 24, 76, 0.15);
  transition: all 0.2s ease;
}

.sprint-badge-enhanced:hover {
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.15) 0%, rgba(241, 24, 76, 0.1) 100%);
  border-color: rgba(241, 24, 76, 0.25);
}

.project-badge-mini {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  background: linear-gradient(135deg, rgba(100, 116, 139, 0.1) 0%, rgba(100, 116, 139, 0.05) 100%);
  border-radius: 6px;
  border: 1px solid rgba(100, 116, 139, 0.12);
}

.no-sprint-text {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  color: #94a3b8;
  font-style: normal;
  padding: 5px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.no-sprint-text:hover {
  background: rgba(148, 163, 184, 0.1);
}

/* Enhanced Progress Container */
.progress-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.progress-bar-enhanced {
  flex: 1;
  height: 6px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 100%);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
}

.progress-bar-fill-enhanced {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.progress-percentage {
  font-size: 12px;
  font-weight: 700;
  min-width: 36px;
  text-align: right;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.assignee-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border-radius: 20px;
  transition: all 0.2s ease;
}

.assignee-section:hover {
  background: rgba(241, 24, 76, 0.06);
}

.assignee-avatar-enhanced {
  border: 2px solid rgba(241, 24, 76, 0.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}

.assignee-section:hover .assignee-avatar-enhanced {
  border-color: rgba(241, 24, 76, 0.3);
  transform: scale(1.05);
}

.avatar-initial-enhanced {
  font-size: 11px;
  font-weight: 700;
  color: #f1184c;
  background: linear-gradient(135deg, #fef2f4 0%, #fce7eb 100%);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.assignee-name {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.due-date-enhanced {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.08);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.due-date-enhanced:hover {
  background: rgba(241, 24, 76, 0.1);
  color: #f1184c;
}

.due-date-enhanced.has-date {
  color: #64748b;
  background: rgba(100, 116, 139, 0.1);
}

.due-date-enhanced.has-date:hover {
  background: rgba(241, 24, 76, 0.1);
  color: #f1184c;
}

/* Empty Column State - Enhanced */
.empty-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 280px;
  padding: 40px 20px;
  color: #94a3b8;
  gap: 6px;
  pointer-events: none;
}

.empty-column-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.15) 0%, rgba(148, 163, 184, 0.08) 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.empty-column-text {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}

.empty-column-hint {
  font-size: 12px;
  font-weight: 400;
  color: #94a3b8;
}

/* Drag and Drop Styles */
.kanban-ghost {
  opacity: 0.5;
  background: rgba(241, 24, 76, 0.1) !important;
  border: 2px dashed #f1184c !important;
  border-radius: 12px;
}

.kanban-drag {
  opacity: 0.9;
  transform: rotate(2deg) scale(1.02);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15), 0 5px 15px rgba(0, 0, 0, 0.1) !important;
}

.kanban-chosen {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12) !important;
}

.kanban-fallback {
  opacity: 1 !important;
  background: white;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2), 0 8px 20px rgba(0, 0, 0, 0.1) !important;
  border-radius: 12px;
}

/* Project View - Enhanced */
.project-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.project-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.project-header {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.project-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.project-icon {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.project-count {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.15);
  padding: 3px 8px;
  border-radius: 12px;
}

.project-tasks {
  padding: 8px 0;
}

.project-task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.project-task-item:last-child {
  border-bottom: none;
}

.project-task-item:hover {
  background: linear-gradient(90deg, rgba(241, 24, 76, 0.04) 0%, rgba(255, 107, 138, 0.02) 100%);
}

.task-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.task-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.task-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.task-name {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-id-small {
  font-size: 12px;
  color: #94a3b8;
  flex-shrink: 0;
}

.task-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.task-chip {
  font-size: 10px;
  font-weight: 600;
  height: 22px;
}

.sprint-chip {
  background: rgba(241, 24, 76, 0.1) !important;
  color: #f1184c !important;
}

.priority-chip {
  border: 1px solid;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  min-width: 80px;
  text-align: right;
}

.task-avatar {
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.avatar-text {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn {
  opacity: 0.5;
  transition: opacity 0.2s;
}

.project-task-item:hover .action-btn {
  opacity: 1;
}

.action-menu {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.hover-bg:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* Scrollbar Styling */
.kanban-container::-webkit-scrollbar {
  height: 8px;
}

.kanban-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.kanban-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.kanban-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* List View - Card Container */
.list-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.list-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.list-header {
  background: linear-gradient(135deg, #f1184c 0%, #f1184c 100%);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.list-icon {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.list-count {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.15);
  padding: 3px 8px;
  border-radius: 12px;
}

.list-tasks {
  padding: 0;
}

/* List View - Column Based */
.list-column-headers {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.list-task-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.list-task-row:last-child {
  border-bottom: none;
}

.list-task-row:hover {
  background: linear-gradient(90deg, rgba(241, 24, 76, 0.04) 0%, rgba(241, 24, 76, 0.02) 100%);
}

.list-task-row:hover .action-btn {
  opacity: 1;
}

/* Column widths */
.col-drag { width: 40px; flex-shrink: 0; }
.col-id { width: 50px; flex-shrink: 0; }
.col-name { flex: 1; min-width: 150px; display: flex; align-items: center; gap: 8px; }
.col-project { width: 180px; flex-shrink: 0; }
.col-sprint { width: 120px; flex-shrink: 0; }
.col-due { width: 100px; flex-shrink: 0; }
.col-status { width: 110px; flex-shrink: 0; }
.col-priority { width: 90px; flex-shrink: 0; }
.col-progress { width: 100px; flex-shrink: 0; }
.col-assignee { width: 140px; flex-shrink: 0; }
.col-actions { width: 40px; flex-shrink: 0; }

/* Cell content styling */
.task-id-text {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.task-name-text {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-text {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sprint-chip {
  background: rgba(241, 24, 76, 0.1) !important;
  color: #f1184c !important;
  font-size: 10px;
  font-weight: 600;
}

.no-sprint {
  color: #cbd5e1;
  font-size: 12px;
}

.due-text {
  font-size: 12px;
  color: #64748b;
}

.status-badge {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
}

.priority-chip {
  font-size: 10px;
  font-weight: 600;
}

.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar-mini {
  width: 50px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill-mini {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: #94a3b8;
  min-width: 30px;
}

.assignee-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assignee-avatar {
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.avatar-initial {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.assignee-name-text {
  font-size: 12px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
}

.drag-handle {
  cursor: grab;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.list-task-row:hover .drag-handle {
  opacity: 1;
}

/* List Drag and Drop Styles */
.list-ghost {
  opacity: 0.5;
  background: rgba(241, 24, 76, 0.1) !important;
  border: 2px dashed #f1184c !important;
  border-radius: 8px;
}

.list-drag {
  opacity: 0.9;
  background: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1) !important;
  border-radius: 8px;
}

.list-chosen {
  background: rgba(241, 24, 76, 0.05);
}

/* Inline Editing Styles - Enhanced & Polished */
.editable-field {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.editable-field:hover {
  background-color: rgba(241, 24, 76, 0.08);
  transform: translateY(-1px);
}

/* Base inline select styling */
.inline-select {
  max-width: 100%;
  min-height: 32px !important;
}

.inline-select :deep(.v-field) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  min-height: 32px !important;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.inline-select:hover :deep(.v-field) {
  background: rgba(241, 24, 76, 0.04) !important;
}

.inline-select :deep(.v-field__input) {
  padding: 4px 8px !important;
  min-height: 32px !important;
  font-size: 12px;
}

.inline-select :deep(.v-field__append-inner) {
  padding-top: 0 !important;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.inline-select:hover :deep(.v-field__append-inner),
.inline-select:focus-within :deep(.v-field__append-inner) {
  opacity: 0.5;
}

.inline-select :deep(.v-select__selection) {
  margin: 0 !important;
}

.inline-select :deep(.v-field__outline) {
  display: none !important;
}

/* Inline text field - Enhanced */
.inline-text-field {
  max-width: 200px;
  flex: 1;
}

.inline-text-field :deep(.v-field) {
  min-height: 32px !important;
  font-size: 13px;
  border-radius: 6px;
  background: rgba(241, 24, 76, 0.04) !important;
}

.inline-text-field :deep(.v-field__input) {
  padding: 4px 10px !important;
  min-height: 32px !important;
}

/* Project select - Show full text */
.col-project .inline-select {
  width: 100%;
}

.col-project .project-text {
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  white-space: nowrap;
}

/* Sprint select styling */
.col-sprint .inline-select :deep(.v-select__selection) {
  margin: 0 !important;
}

.sprint-chip {
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.12) 0%, rgba(241, 24, 76, 0.08) 100%) !important;
  color: #f1184c !important;
  font-size: 10px;
  font-weight: 600;
  padding: 0 8px !important;
  height: 20px !important;
  border: 1px solid rgba(241, 24, 76, 0.15) !important;
}

.no-sprint {
  color: #94a3b8;
  font-size: 12px;
  font-style: italic;
}

/* Status select - Premium styling */
.status-select :deep(.v-field__input) {
  color: inherit;
  padding: 0 4px !important;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-badge:hover {
  background: rgba(0, 0, 0, 0.04);
}

/* Priority select - Enhanced chips */
.priority-select :deep(.v-field__input) {
  padding: 0 !important;
}

.priority-chip {
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.3px;
  height: 22px !important;
  border: 1px solid transparent !important;
  transition: all 0.2s ease;
}

.priority-chip:hover {
  transform: scale(1.02);
}

/* Assignee select - Premium avatar styling */
.assignee-select :deep(.v-field__input) {
  padding: 0 !important;
}

.assignee-select :deep(.v-select__selection) {
  width: 100%;
}

.col-assignee .assignee-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 20px;
  transition: all 0.2s ease;
}

.col-assignee:hover .assignee-info {
  background: rgba(241, 24, 76, 0.06);
}

.assignee-avatar {
  border: 2px solid rgba(241, 24, 76, 0.15) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.col-assignee:hover .assignee-avatar {
  border-color: rgba(241, 24, 76, 0.3) !important;
  transform: scale(1.05);
}

.avatar-initial {
  font-size: 10px;
  font-weight: 700;
  color: #f1184c;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.assignee-name-text {
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

/* Column hover effects - Subtle & Elegant */
.col-project,
.col-sprint,
.col-status,
.col-priority,
.col-assignee,
.col-due {
  border-radius: 6px;
  transition: all 0.2s ease;
}

.col-project:hover,
.col-sprint:hover,
.col-status:hover,
.col-priority:hover,
.col-assignee:hover {
  background-color: transparent;
}

.col-due:hover {
  background-color: transparent;
}

/* Date picker trigger - Clean styling */
.col-due .due-text {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  transition: all 0.2s ease;
  background: transparent;
}

.col-due .due-text:hover {
  background-color: rgba(241, 24, 76, 0.08);
  color: #f1184c;
}

/* Task name hover indicator */
.task-name-text.editable-field {
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.task-name-text.editable-field:hover {
  background: rgba(241, 24, 76, 0.06);
  color: #f1184c;
}

/* List row hover enhancement */
.list-task-row {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-task-row:hover {
  background: linear-gradient(90deg, rgba(241, 24, 76, 0.03) 0%, rgba(241, 24, 76, 0.01) 100%);
  box-shadow: inset 0 0 0 1px rgba(241, 24, 76, 0.06);
}

/* Progress bar - Smooth design */
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar-mini {
  width: 50px;
  height: 5px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 100%);
  border-radius: 3px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.progress-bar-fill-mini {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
}

/* Kanban Inline Editing Styles */
.kanban-inline-select {
  max-width: 100%;
  min-height: 24px !important;
}

.kanban-inline-select :deep(.v-field) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  min-height: 24px !important;
}

.kanban-inline-select :deep(.v-field__input) {
  padding: 0 !important;
  min-height: 24px !important;
  font-size: 12px;
}

.kanban-inline-select :deep(.v-field__append-inner) {
  padding: 0 !important;
  opacity: 0;
  transition: opacity 0.2s;
}

.kanban-inline-select:hover :deep(.v-field__append-inner) {
  opacity: 0.5;
}

.kanban-inline-select :deep(.v-field__outline) {
  display: none !important;
}

.kanban-inline-select :deep(.v-select__selection) {
  margin: 0 !important;
}

/* Priority select on Kanban */
.priority-select-kanban {
  max-width: fit-content;
}

/* Sprint select on Kanban */
.sprint-select-kanban {
  margin: 8px 0;
}

.no-sprint-text {
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
}

/* Assignee select on Kanban */
.assignee-select-kanban {
  flex: 1;
  max-width: 120px;
}

/* Progress container on Kanban - show bar and percentage */
.kanban-card .progress-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}

.kanban-card .progress-bar-enhanced {
  flex: 1;
  height: 5px;
  border-radius: 4px;
  background: #e2e8f0;
  overflow: hidden;
}

.progress-percentage {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  min-width: 32px;
}

/* Card footer adjustments for inline selects */
.kanban-card .card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

/* Due date on Kanban - make clickable */
.kanban-card .due-date {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.kanban-card .due-date:hover {
  background-color: rgba(241, 24, 76, 0.08);
}

/* Task title clickable */
.kanban-card .task-title {
  cursor: pointer;
}

.kanban-card .task-title:hover {
  color: #f1184c;
}

/* Task ID clickable */
.kanban-card .task-id {
  cursor: pointer;
}

.kanban-card .task-id:hover {
  color: #f1184c;
}
</style>
