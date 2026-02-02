<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import { VueDatePicker } from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";
import DatePickerField from "@/components/DatePickerField.vue";
import {
  taskService,
  type Task,
  type UpdateTaskDto,
} from "@/services/task.service";
import { commentService, type Comment } from "@/services/comment.service";
import {
  attachmentService,
  type Attachment,
} from "@/services/attachment.service";
import { userService, type User } from "@/services/user.service";
import { sprintService, type Sprint } from "@/services/sprint.service";
import { watcherService, type Watcher } from "@/services/watcher.service";
import { dependencyService, type Dependency } from "@/services/dependency.service";
import { milestoneService, type Milestone } from "@/services/milestone.service";
import { teamService, type Team } from "@/services/team.service";
import { useSnackbar } from "@/composables/useSnackbar";
import { useAuthStore } from "@/stores/auth.store";
import MilestoneModal from "@/components/modals/MilestoneModal.vue";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbar();
const authStore = useAuthStore();

const task = ref<Task | null>(null);
const comments = ref<Comment[]>([]);
const attachments = ref<Attachment[]>([]);
const loading = ref(false);
const commentLoading = ref(false);
const attachmentLoading = ref(false);
const newComment = ref("");
const uploadingFile = ref(false);
const emojiMenu = ref(false);
const commentEditor = ref<any>(null);

// Common emojis for quick access
const commonEmojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
  '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
  '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
  '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷',
  '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴',
  '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐',
  '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳',
  '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
  '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱',
  '👍', '👎', '👏', '🙌', '🤝', '💪', '🎉', '🎊',
  '✨', '⭐', '🌟', '💯', '🔥', '❤️', '🧡', '💛',
  '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕',
  '✅', '❌', '⚠️', '💡', '📌', '📝', '💬', '👀'
];

const insertEmoji = (emoji: string) => {
  // Append emoji to the comment content
  if (newComment.value === '' || newComment.value === '<p><br></p>') {
    newComment.value = `<p>${emoji}</p>`;
  } else {
    // Insert emoji before the closing </p> tag of the last paragraph
    newComment.value = newComment.value.replace(/<\/p>$/, `${emoji}</p>`);
  }
  emojiMenu.value = false;
};

// Editable description
const editableDescription = ref("");
const editableDetails = ref({
  milestoneId: '',
  team: '',
  module: '',
  buildVersion: '',
  externalLink: '',
});

watch(task, (t) => {
  if (t) {
    editableDetails.value = {
      milestoneId: t.milestoneId || '',
      team: t.teamId || t.team || '', // Prefer teamId (for dropdown value), fallback to team string
      module: t.module || '',
      buildVersion: t.buildVersion || '',
      externalLink: t.externalLink || '',
    };
  }
});

// Tab state
const activeTab = ref("comments");

// Watchers, Dependencies, History
const watchers = ref<Watcher[]>([]);
const dependencies = ref<Dependency[]>([]);
const history = ref<any[]>([]);
const watchersLoading = ref(false);

// Image preview dialog state
const previewDialog = ref(false);
const previewImage = ref<string>("");
const previewIndex = ref(0);

// Get only image attachments for gallery navigation
const imageAttachments = computed(() =>
  attachments.value.filter((a) => isImage(a.mimeType))
);

const openPreview = (imageUrl: string, index: number) => {
  previewImage.value = imageUrl;
  previewIndex.value = index;
  previewDialog.value = true;
};

const navigatePreview = (direction: number) => {
  const newIndex = previewIndex.value + direction;
  if (newIndex >= 0 && newIndex < imageAttachments.value.length) {
    previewIndex.value = newIndex;
    previewImage.value = imageAttachments.value[newIndex]?.fileUrl || '';
  }
};

// Inline editing state
const users = ref<User[]>([]);
const sprints = ref<Sprint[]>([]);
const milestones = ref<Milestone[]>([]);
const teams = ref<Team[]>([]);

// Options for dropdowns
const loadMilestones = async () => {
  try {
    if (task.value?.projectId) {
      milestones.value = await milestoneService.getAll(task.value.projectId);
    }
  } catch (e) {
    console.error("Failed to load milestones", e);
  }
};

const showCreateMilestoneModal = ref(false);

const openCreateMilestone = () => {
  showCreateMilestoneModal.value = true;
};

const handleMilestoneCreated = async (newMilestone: any) => {
  try {
     // Create is handled inside modal? No, modal emits 'save'.
     // Wait, my MilestoneModal emits 'save' with payload. It does NOT call service itself?
     // Let me check MilestoneModal code I wrote.
     // "const handleSave = async ... emit('save', { ...payload ... })"
     // AND "handleSaveMilestone" in ProjectMilestonesModal calls service.
     // So I need to call service here.
     if (newMilestone.milestoneId) {
        // Update logic - not needed for create modal usually
        await milestoneService.update(newMilestone.milestoneId, newMilestone);
        snackbar.success("Milestone updated");
     } else {
        const created = await milestoneService.create(newMilestone);
        snackbar.success("Milestone created");
        // Select it
        editableDetails.value.milestoneId = created.milestoneId;
        // Trigger update to task
        updateTaskDetails();
     }
     showCreateMilestoneModal.value = false;
     await loadMilestones();
  } catch (e) {
      console.error("Failed to create milestone", e);
      snackbar.error("Failed to create milestone");
  }
};

const loadTeams = async () => {
  try {
    if (task.value?.projectId) {
      teams.value = await teamService.getAll({ departmentId: task.value.departmentId || undefined });
    }
  } catch (e) {
    console.error("Failed to load teams", e);
  }
};

const statusOptions = [
  { title: "Not Started", value: "TODO" },
  { title: "In Progress", value: "IN_PROGRESS" },
  { title: "In Review", value: "IN_REVIEW" },
  { title: "Completed", value: "DONE" },
  { title: "Failed", value: "FAILED" },
  { title: "Cancelled", value: "CANCELLED" },
];

const priorityOptions = [
  { title: "Low", value: "LOW" },
  { title: "Medium", value: "MEDIUM" },
  { title: "High", value: "HIGH" },
  { title: "Urgent", value: "URGENT" },
];

const typeOptions = [
  { title: "User Story", value: "USER_STORY", icon: "mdi-bookmark-outline" },
  { title: "Task", value: "TASK", icon: "mdi-checkbox-marked-circle-outline" },
  { title: "Bug", value: "BUG", icon: "mdi-bug-outline" },
  { title: "Feature", value: "FEATURE", icon: "mdi-star-outline" },
  { title: "Epic", value: "EPIC", icon: "mdi-lightning-bolt-outline" },
];

const taskId = computed(() => route.params.taskId as string);
const isAdmin = computed(() => authStore.isAdmin);

// Calculate progress based on status (like in task list)
const calculatedProgress = computed(() => {
  const progressMap: Record<string, number> = {
    TODO: 0,
    IN_PROGRESS: 50,
    IN_REVIEW: 80,
    DONE: 100,
    CANCELLED: 0,
  };
  return task.value ? progressMap[task.value.status] ?? 0 : 0;
});

// Combine history for Activity tab
const activityItems = computed(() => {
  const items: any[] = [];
  
  // Add history items
  history.value.forEach((h: any) => {
    items.push({
      id: `history-${h.historyId}`,
      type: 'history',
      content: h.changeDescription || 'Task updated',
      createdAt: h.changedAt,
      user: h.user,
    });
  });
  
  // Sort by date descending (newest first)
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

onMounted(async () => {
  await loadTask();
  await loadDropdownData();
});

const loadTask = async () => {
  loading.value = true;
  try {
    task.value = await taskService.getById(taskId.value);
    // Initialize editable description
    editableDescription.value = task.value?.description || "";
    await Promise.all([
      loadComments(),
      loadAttachments(),
      loadWatchers(),
      loadDependencies(),
      loadHistory(),
    ]);
  } catch (error: any) {
    snackbar.error("Failed to load task");
    router.push("/tasks");
  } finally {
    loading.value = false;
  }
};

const loadDropdownData = async () => {
  try {
    // Load users for assignee dropdown
    const usersResult = await userService.getAll();
    users.value = usersResult.data || [];

    // Load sprints(if task has a project)
    if (task.value?.projectId) {
      sprints.value = await sprintService.getByProject(task.value.projectId);
      await loadMilestones();
      await loadTeams();
    } 
  } catch (error) {
    console.warn("Failed to load dropdown data:", error);
  }
};

const loadComments = async () => {
  try {
    comments.value = await commentService.getByTask(taskId.value);
  } catch (error) {
    comments.value = [];
  }
};

const loadAttachments = async () => {
  try {
    attachments.value = await attachmentService.getByTask(taskId.value);
  } catch (error) {
    attachments.value = [];
  }
};

const loadWatchers = async () => {
  try {
    watchers.value = await watcherService.getByTask(taskId.value);
  } catch (error) {
    watchers.value = [];
  }
};

const loadDependencies = async () => {
  try {
    dependencies.value = await dependencyService.getByTask(taskId.value);
  } catch (error) {
    dependencies.value = [];
  }
};

const loadHistory = async () => {
  try {
    history.value = await taskService.getHistory(taskId.value);
  } catch (error) {
    history.value = [];
  }
};

const addWatcher = async (userId: string) => {
  watchersLoading.value = true;
  try {
    await watcherService.add(taskId.value, userId);
    await loadWatchers();
    snackbar.success("Watcher added");
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to add watcher");
  } finally {
    watchersLoading.value = false;
  }
};

const removeWatcher = async (userId: string) => {
  try {
    await watcherService.remove(taskId.value, userId);
    await loadWatchers();
    snackbar.success("Watcher removed");
  } catch (error: any) {
    snackbar.error("Failed to remove watcher");
  }
};

const addComment = async () => {
  if (!newComment.value.trim()) return;

  commentLoading.value = true;
  try {
    await commentService.create({
      content: newComment.value,
      taskId: taskId.value,
    });
    newComment.value = "";
    await loadComments();
    snackbar.success("Comment added");
  } catch (error: any) {
    snackbar.error("Failed to add comment");
  } finally {
    commentLoading.value = false;
  }
};

const deleteComment = async (commentId: string) => {
  try {
    await commentService.delete(taskId.value, commentId);
    await loadComments();
    snackbar.success("Comment deleted");
  } catch (error: any) {
    snackbar.error("Failed to delete comment");
  }
};

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  uploadingFile.value = true;
  try {
    await attachmentService.upload(taskId.value, file);
    await loadAttachments();
    snackbar.success("File uploaded successfully");
  } catch (error: any) {
    snackbar.error("Failed to upload file");
  } finally {
    uploadingFile.value = false;
    input.value = "";
  }
};

const deleteAttachment = async (attachmentId: string) => {
  try {
    await attachmentService.delete(taskId.value, attachmentId);
    await loadAttachments();
    snackbar.success("Attachment deleted");
  } catch (error: any) {
    snackbar.error("Failed to delete attachment");
  }
};

const downloadAttachment = async (attachment: Attachment) => {
  try {
    const blob = await attachmentService.download(
      taskId.value,
      attachment.attachmentId
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = attachment.fileName;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    // Fallback: open in new tab
    window.open(attachment.fileUrl, "_blank");
  }
};

const addDependencyDialog = ref(false);
const targetTask = ref<Task | null>(null);
const taskSearchResults = ref<Task[]>([]);
const searchLoading = ref(false);

const searchTasks = async (query: string) => {
  if (!query || query.length < 2) return;
  searchLoading.value = true;
  try {
    const res = await taskService.getAll({ search: query, pageSize: 15 });
    // Filter out current task and existing dependencies
    taskSearchResults.value = res.data.filter((t) => 
      t.taskId !== taskId.value && 
      !dependencies.value.some((d) => d.dependsOnTaskId === t.taskId)
    );
  } finally {
    searchLoading.value = false;
  }
};

const addDependency = async () => {
  if (!targetTask.value) return;
  try {
    await dependencyService.create({
      taskId: taskId.value,
      dependsOnTaskId: targetTask.value.taskId
    });
    await loadDependencies();
    addDependencyDialog.value = false;
    targetTask.value = null;
    snackbar.success("Dependency added");
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to add dependency");
  }
};

const removeDependency = async (depId: string) => {
  try {
    await dependencyService.delete(depId);
    await loadDependencies();
    snackbar.success("Dependency removed");
  } catch (error) {
    snackbar.error("Failed to remove dependency");
  }
};

const getStatusColor = (status: string) => {
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

const getTypeIcon = (type: string) => {
  const t = typeOptions.find((opt) => opt.value === type);
  return t ? t.icon : "mdi-checkbox-marked-circle-outline";
};

const formatType = (type: string) => {
  const t = typeOptions.find((opt) => opt.value === type);
  return t ? t.title : type || "Task";
};

const formatDate = (date: string) =>
  date
    ? new Date(date).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

const formatDateTime = (date: string) =>
  date
    ? new Date(date).toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const isImage = (mimeType: string) => mimeType?.startsWith("image/");
const isPdf = (mimeType: string) => mimeType === "application/pdf";

// Date picker model for due date
const datePickerModel = computed({
  get: () => task.value?.dueDate ? new Date(task.value.dueDate) : null,
  set: (val) => {
    if (val && task.value) {
      task.value.dueDate = val.toISOString().split('T')[0] ?? null;
    }
  }
});

// Parent Task Logic
const parentMenu = ref(false);
const possibleParents = ref<Task[]>([]);
const loadingParents = ref(false);
const selectedParentId = ref<string | null>(null);

const loadPossibleParents = async () => {
  if (!task.value?.projectId) return;
  loadingParents.value = true;
  try {
    const res = await taskService.getAll({ 
      projectId: task.value.projectId, 
      pageSize: 100,
    }); 
    // Filter out current task
    possibleParents.value = res.data.filter(t => t.taskId !== task.value?.taskId);
  } catch (e) {
    console.error("Failed to load possible parents", e);
  } finally {
    loadingParents.value = false;
  }
};

watch(parentMenu, (isOpen) => {
  if (isOpen) {
    selectedParentId.value = task.value?.parentTaskId || null;
    loadPossibleParents();
  }
});

const saveParentTask = async (newParentId: string | null) => {
  // Check if changed
  if (newParentId !== task.value?.parentTaskId) {
    await updateTask({ parentTaskId: newParentId });
    parentMenu.value = false;
  }
};

// Inline update functions
const updateTask = async (updates: Partial<UpdateTaskDto>) => {
  if (!task.value) return;
  try {
    task.value = await taskService.update(taskId.value, updates);
    snackbar.success("Task updated");
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to update task");
  }
};

const updateTaskStatus = (status: string) => updateTask({ status });
const updateTaskPriority = (priority: string) => updateTask({ priority });
const updateTaskType = (type: string) => updateTask({ taskType: type });
const updateTaskSprint = (sprintId: string | null) => updateTask({ sprintId: sprintId || undefined });
const updateTaskAssignee = (assigneeId: string | null) => updateTask({ assigneeId: assigneeId || undefined });
const updateTaskTester = (testerId: string | null) => updateTask({ testerId: testerId || undefined });
const updateTaskDueDate = (date: Date | null) => {
  if (date) {
    updateTask({ dueDate: date.toISOString().split('T')[0] });
  }
};

const updateTaskDescription = () => {
  if (editableDescription.value !== task.value?.description) {
    updateTask({ description: editableDescription.value });
  }
};

const updateTaskDetails = () => {
  if (!task.value) return;
  const updates: Partial<UpdateTaskDto> = {};
  if (editableDetails.value.milestoneId !== task.value.milestoneId) {
    updates.milestoneId = editableDetails.value.milestoneId;
  }
  // Check if it's a valid ID (from dropdown) or just text
  const currentTeamValue = editableDetails.value.team;
  if (currentTeamValue !== task.value.teamId && currentTeamValue !== task.value.team) {
      // If it looks like an ID (numeric string), assume it's a teamId
      if (/^\d+$/.test(currentTeamValue)) {
          updates.teamId = currentTeamValue;
      } else {
          updates.team = currentTeamValue;
      }
  }
  if (editableDetails.value.module !== task.value.module) {
    updates.module = editableDetails.value.module;
  }
  if (editableDetails.value.buildVersion !== task.value.buildVersion) {
    updates.buildVersion = editableDetails.value.buildVersion;
  }
  if (editableDetails.value.externalLink !== task.value.externalLink) {
    updates.externalLink = editableDetails.value.externalLink;
  }
  if (Object.keys(updates).length > 0) {
    updateTask(updates);
  }
};
</script>

<template>
  <div class="task-detail-page">
    <!-- Loading -->
    <v-progress-linear v-if="loading" indeterminate color="primary" />

    <template v-if="task && !loading">
      <!-- Enhanced Header Card -->
      <div class="task-header-card">
        <!-- Accent Bar based on status -->
        <div class="header-accent-bar" :style="{ background: `linear-gradient(90deg, ${getStatusColor(task.status)} 0%, ${getStatusColor(task.status)}aa 100%)` }"></div>
        
        <div class="header-content">
          <!-- Top Row - Back Button & Actions -->
          <div class="header-top-row">
            <v-btn
              variant="text"
              size="small"
              rounded="lg"
              class="back-btn"
              @click="router.push('/tasks')"
            >
              <v-icon icon="mdi-arrow-left" size="18" class="mr-1" />
              Back to Tasks
            </v-btn>
            
            <div class="header-actions">
              <v-btn 
                variant="tonal" 
                size="small" 
                rounded="lg"
                class="action-btn-primary"
                prepend-icon="mdi-plus"
                @click="snackbar.info('Create Task modal coming soon')"
              >
                Create Subtask
              </v-btn>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn 
                    icon 
                    variant="text" 
                    size="small" 
                    rounded="lg"
                    v-bind="props"
                    class="more-btn"
                  >
                    <v-icon icon="mdi-dots-horizontal" />
                  </v-btn>
                </template>
                <v-list density="compact" class="action-menu">
                  <v-list-item prepend-icon="mdi-content-copy" title="Copy Link" />
                  <v-list-item prepend-icon="mdi-share-variant" title="Share" />
                  <v-divider class="my-1" />
                  <v-list-item prepend-icon="mdi-delete" title="Delete Task" class="text-error" />
                </v-list>
              </v-menu>
            </div>
          </div>
          
          <!-- Task ID Badge & Breadcrumb -->
          <div class="task-breadcrumb">
            <!-- Project Link -->
            <router-link
              v-if="task.project"
              to="/boards"
              class="breadcrumb-link"
            >
              <v-icon icon="mdi-folder" size="14" />
              {{ task.project.name }}
            </router-link>
            <span v-if="task.project" class="breadcrumb-separator">/</span>
            
            <!-- Parent Task Link -->
            <template v-if="task.parent">
              <router-link 
                :to="`/tasks/${task.parent.taskId}`" 
                class="breadcrumb-link"
              >
                <v-icon icon="mdi-subdirectory-arrow-right" size="14" />
                {{ task.parent.taskName }}
              </router-link>
              <span class="breadcrumb-separator">/</span>
            </template>
            
            <!-- Current Task ID -->
            <div class="task-id-badge">
              <v-icon icon="mdi-pound" size="12" />
              {{ task.taskId }}
            </div>
            
            <!-- Edit Parent Menu -->
            <v-menu
              v-model="parentMenu"
              :close-on-content-click="false"
              location="bottom start"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  variant="text"
                  size="x-small"
                  density="compact"
                  class="edit-parent-btn"
                  title="Change Parent Task"
                >
                  <v-icon icon="mdi-pencil" size="12" />
                </v-btn>
              </template>
              
              <v-card min-width="320" class="parent-menu-card">
                <div class="parent-menu-header">Change Parent Task</div>
                <v-autocomplete
                  v-model="selectedParentId"
                  :items="possibleParents"
                  item-title="title"
                  item-value="taskId"
                  label="Select Parent"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  autocomplete="off"
                  :loading="loadingParents"
                  placeholder="Search tasks..."
                  @update:model-value="saveParentTask"
                  class="mb-1"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="`#${item.raw.taskId}`" />
                  </template>
                </v-autocomplete>
              </v-card>
            </v-menu>
          </div>
          
          <!-- Task Title -->
          <h1 class="task-title-main">{{ task.title }}</h1>
          
          <!-- Status & Metadata Chips -->
          <div class="task-meta-chips">
            <!-- Type -->
            <div class="meta-field-wrapper">
              <span class="meta-field-label">Type</span>
              <v-menu location="bottom start">
                <template #activator="{ props }">
                  <div v-bind="props" class="meta-chip meta-chip-type">
                    <v-icon :icon="getTypeIcon(task.taskType)" size="14" />
                    <span>{{ formatType(task.taskType) }}</span>
                    <v-icon icon="mdi-chevron-down" size="12" class="chevron" />
                  </div>
                </template>
                <v-list density="compact" nav class="status-menu">
                  <v-list-item
                     v-for="type in typeOptions"
                     :key="type.value"
                     :value="type.value"
                     @click="updateTaskType(type.value)"
                     class="status-menu-item"
                     :class="{ 'active': task.taskType === type.value }"
                  >
                     <template #prepend>
                        <v-icon :icon="type.icon" size="16" class="mr-2" />
                     </template>
                     <v-list-item-title>{{ type.title }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>

            <!-- Status -->
            <div class="meta-field-wrapper">
              <span class="meta-field-label">Status</span>
              <v-menu location="bottom start">
                <template #activator="{ props }">
                  <div 
                    v-bind="props" 
                    class="meta-chip meta-chip-status"
                    :style="{
                      backgroundColor: getStatusColor(task.status) + '18',
                      color: getStatusColor(task.status),
                      borderColor: getStatusColor(task.status) + '40',
                    }"
                  >
                    <span class="status-dot" :style="{ backgroundColor: getStatusColor(task.status) }"></span>
                    <span>{{ formatStatus(task.status) }}</span>
                    <v-icon icon="mdi-chevron-down" size="12" class="chevron" />
                  </div>
                </template>
                <v-list density="compact" nav class="status-menu">
                  <v-list-item
                    v-for="status in statusOptions"
                    :key="status.value"
                    :value="status.value"
                    @click="updateTaskStatus(status.value)"
                    class="status-menu-item"
                    :class="{ 'active': task.status === status.value }"
                  >
                    <template #prepend>
                      <span class="status-dot-menu" :style="{ backgroundColor: getStatusColor(status.value) }"></span>
                    </template>
                    <v-list-item-title>{{ status.title }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>

            <!-- Priority -->
            <div class="meta-field-wrapper">
              <span class="meta-field-label">Priority</span>
              <v-menu location="bottom start">
                <template #activator="{ props }">
                  <div 
                    v-bind="props" 
                    class="meta-chip meta-chip-priority"
                    :style="{
                      backgroundColor: getPriorityColor(task.priority) + '15',
                      color: getPriorityColor(task.priority),
                      borderColor: getPriorityColor(task.priority) + '30',
                    }"
                  >
                    <v-icon 
                      :icon="task.priority === 'urgent' ? 'mdi-alert-circle' : task.priority === 'high' ? 'mdi-arrow-up-bold' : task.priority === 'medium' ? 'mdi-minus' : 'mdi-arrow-down-bold'" 
                      size="13" 
                    />
                    <span>{{ formatPriority(task.priority) }}</span>
                    <v-icon icon="mdi-chevron-down" size="12" class="chevron" />
                  </div>
                </template>
                <v-list density="compact" nav class="status-menu">
                  <v-list-item
                    v-for="priority in priorityOptions"
                    :key="priority.value"
                    :value="priority.value"
                    @click="updateTaskPriority(priority.value)"
                    class="status-menu-item"
                    :class="{ 'active': task.priority === priority.value }"
                  >
                    <v-list-item-title>{{ priority.title }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>

            <!-- Sprint -->
            <div class="meta-field-wrapper">
              <span class="meta-field-label">Sprint</span>
              <v-menu location="bottom start" max-height="300">
                <template #activator="{ props }">
                  <div v-bind="props" class="meta-chip meta-chip-sprint">
                    <v-icon icon="mdi-run" size="14" />
                    <span>{{ task.sprint?.name || "No Sprint" }}</span>
                    <v-icon icon="mdi-chevron-down" size="12" class="chevron" />
                  </div>
                </template>
                <v-list density="compact" nav width="220" class="status-menu">
                  <v-list-subheader class="menu-subheader">
                    Assign Sprint
                  </v-list-subheader>
                  <v-list-item
                    @click="updateTaskSprint(null)"
                    class="status-menu-item"
                    :class="{ 'active': !task.sprintId }"
                  >
                    <template #prepend>
                      <v-icon icon="mdi-cancel" size="16" color="grey" class="mr-2" />
                    </template>
                    <v-list-item-title class="text-grey">No Sprint</v-list-item-title>
                  </v-list-item>
                  <v-divider class="my-2" />
                  <template v-if="sprints.length">
                    <div style="max-height: 200px; overflow-y: auto" class="custom-scrollbar">
                      <v-list-item
                        v-for="sprint in sprints"
                        :key="sprint.sprintId"
                        :value="sprint.sprintId"
                        @click="updateTaskSprint(sprint.sprintId)"
                        class="status-menu-item"
                        :class="{ 'active': task.sprintId === sprint.sprintId }"
                      >
                        <template #prepend>
                          <v-icon
                            :icon="task.sprintId === sprint.sprintId ? 'mdi-run-fast' : 'mdi-run'"
                            size="16"
                            :color="task.sprintId === sprint.sprintId ? 'primary' : 'grey'"
                            class="mr-2"
                          />
                        </template>
                        <v-list-item-title>{{ sprint.name }}</v-list-item-title>
                      </v-list-item>
                    </div>
                  </template>
                  <v-list-item v-else disabled>
                    <v-list-item-title class="text-caption text-grey text-center">
                      No active sprints found
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>

            <!-- Assignee -->
            <div class="meta-field-wrapper">
              <span class="meta-field-label">Assignee</span>
              <v-menu location="bottom start" max-height="300">
                <template #activator="{ props }">
                  <div v-bind="props" class="meta-chip meta-chip-assignee">
                    <v-avatar size="18" v-if="task.assignee" class="assignee-avatar-mini">
                      <v-img v-if="task.assignee.profileImageUrl" :src="task.assignee.profileImageUrl" />
                      <span v-else class="avatar-text-mini">{{ task.assignee.fullName?.charAt(0) }}</span>
                    </v-avatar>
                    <v-icon v-else icon="mdi-account-plus-outline" size="14" />
                    <span>{{ task.assignee?.fullName || "Unassigned" }}</span>
                    <v-icon icon="mdi-chevron-down" size="12" class="chevron" />
                  </div>
                </template>
                <v-list density="compact" nav width="220" class="status-menu">
                  <v-list-subheader class="menu-subheader">Assignee</v-list-subheader>
                  <v-list-item
                    @click="updateTaskAssignee(null)"
                    class="status-menu-item"
                    :class="{ 'active': !task.assigneeId }"
                  >
                    <template #prepend>
                      <v-icon icon="mdi-account-off-outline" size="16" color="grey" class="mr-2" />
                    </template>
                    <v-list-item-title class="text-grey">Unassigned</v-list-item-title>
                  </v-list-item>
                  <v-divider class="my-2" />
                  <div style="max-height: 200px; overflow-y: auto" class="custom-scrollbar">
                    <v-list-item
                      v-for="user in users"
                      :key="user.userId"
                      :value="user.userId"
                      @click="updateTaskAssignee(user.userId)"
                      class="status-menu-item"
                      :class="{ 'active': task.assigneeId === user.userId }"
                    >
                      <template #prepend>
                        <v-avatar size="24" class="mr-2">
                          <v-img v-if="user.profileImageUrl" :src="user.profileImageUrl" />
                          <span v-else class="avatar-text-mini">{{ user.fullName?.charAt(0) }}</span>
                        </v-avatar>
                      </template>
                      <v-list-item-title>{{ user.fullName }}</v-list-item-title>
                    </v-list-item>
                  </div>
                </v-list>
              </v-menu>
            </div>

            <!-- Due Date -->
            <div class="meta-field-wrapper">
              <span class="meta-field-label">Due Date</span>
              <VueDatePicker
                v-model="datePickerModel"
                @update:model-value="updateTaskDueDate"
                auto-apply
                :teleport="true"
                :enable-time-picker="false"
                class="enhanced-date-picker-inline"
              >
                <template #trigger>
                  <div class="meta-chip meta-chip-date" :class="{ 'has-date': task.dueDate }">
                    <v-icon icon="mdi-calendar" size="14" />
                    <span>{{ formatDate(task.dueDate || "") || "Set Due Date" }}</span>
                    <v-icon icon="mdi-chevron-down" size="12" class="chevron" />
                  </div>
                </template>
              </VueDatePicker>
            </div>
          </div>
          
          <!-- Footer Meta Info -->
          <div class="task-footer-meta">
            <div class="footer-meta-item">
              <v-icon icon="mdi-account-edit" size="14" />
              <span>Created by <strong>{{ task.creator?.fullName || 'System' }}</strong></span>
            </div>
            <div class="footer-meta-separator">•</div>
            <div class="footer-meta-item">
              <v-icon icon="mdi-update" size="14" />
              <span>Updated <strong>{{ formatDateTime(task.updatedAt) }}</strong></span>
            </div>
            <div class="footer-meta-separator" v-if="task.tester">•</div>
            <div class="footer-meta-item" v-if="task.tester">
              <v-icon icon="mdi-clipboard-check-outline" size="14" />
              <span>Tester: <strong>{{ task.tester.fullName }}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Layout Row -->
      <v-row>
        <!-- Left Column - Unified Task Details Card -->
        <v-col cols="12" md="8">
          <v-card rounded="xl" class="unified-detail-card">
            <!-- Progress Section -->
            <div class="unified-section">
              <div class="section-header">
                <div class="section-icon bg-success">
                  <v-icon icon="mdi-chart-donut" size="16" color="white" />
                </div>
                <span class="section-title">Progress</span>
                <v-spacer />
                <span class="progress-percentage" :class="calculatedProgress === 100 ? 'text-success' : 'text-primary'">
                  {{ calculatedProgress }}%
                </span>
              </div>
              <div class="section-content">
                <v-progress-linear
                  :model-value="calculatedProgress"
                  :color="calculatedProgress === 100 ? 'success' : 'primary'"
                  bg-color="grey-lighten-3"
                  rounded
                  height="8"
                  class="progress-bar-enhanced"
                />
              </div>
            </div>

            <v-divider class="section-divider" />

            <!-- Description Section -->
            <div class="unified-section">
              <div class="section-header">
                <div class="section-icon bg-blue">
                  <v-icon icon="mdi-text-box-outline" size="16" color="white" />
                </div>
                <span class="section-title">Description</span>
              </div>
              <div class="section-content">
                <div class="quill-wrapper quill-compact">
                  <QuillEditor
                    v-model:content="editableDescription"
                    contentType="html"
                    theme="snow"
                    toolbar="essential"
                    placeholder="Enter task description..."
                    @blur="updateTaskDescription"
                  />
                </div>
              </div>
            </div>

            <v-divider class="section-divider" />

            <!-- People Section -->
            <div class="unified-section">
              <div class="section-header">
                <div class="section-icon bg-teal">
                  <v-icon icon="mdi-account-group-outline" size="16" color="white" />
                </div>
                <span class="section-title">People</span>
              </div>
              <div class="section-content">
                <v-row>
                  <v-col cols="12" md="6" class="field-col">
                    <div class="field-label">Assignee</div>
                    <v-autocomplete
                      v-model="task.assigneeId"
                      :items="users"
                      item-title="fullName"
                      item-value="userId"
                      density="compact"
                      variant="outlined"
                      hide-details
                      clearable
                      autocomplete="off"
                      placeholder="Select assignee"
                      class="field-input"
                      @update:model-value="updateTaskAssignee"
                    >
                      <template #prepend-inner>
                        <v-avatar size="22" class="mr-1">
                           <v-img v-if="task.assignee?.profileImageUrl" :src="task.assignee.profileImageUrl" />
                           <span v-else class="text-caption">{{ task.assignee?.fullName?.charAt(0) || '?' }}</span>
                        </v-avatar>
                      </template>
                    </v-autocomplete>
                  </v-col>
                  <v-col cols="12" md="6" class="field-col">
                    <div class="field-label">Tester</div>
                    <v-autocomplete
                      v-model="task.testerId"
                      :items="users"
                      item-title="fullName"
                      item-value="userId"
                      density="compact"
                      variant="outlined"
                      hide-details
                      clearable
                      autocomplete="off"
                      placeholder="Select tester"
                      class="field-input"
                      @update:model-value="updateTaskTester"
                    >
                      <template #prepend-inner>
                        <v-avatar size="22" class="mr-1">
                           <v-img v-if="task.tester?.profileImageUrl" :src="task.tester.profileImageUrl" />
                           <span v-else class="text-caption">{{ task.tester?.fullName?.charAt(0) || '?' }}</span>
                        </v-avatar>
                      </template>
                    </v-autocomplete>
                  </v-col>
                </v-row>
              </div>
            </div>

            <v-divider class="section-divider" />

            <!-- Details Section -->
            <div class="unified-section">
              <div class="section-header">
                <div class="section-icon bg-primary">
                  <v-icon icon="mdi-format-list-bulleted" size="16" color="white" />
                </div>
                <span class="section-title">Details</span>
              </div>
              <div class="section-content">
                <v-row>
                  <!-- Priority -->
                  <v-col cols="6" md="4" class="field-col">
                    <div class="field-label">Priority</div>
                    <v-select
                      v-model="task.priority"
                      :items="priorityOptions"
                      density="compact"
                      variant="outlined"
                      hide-details
                      class="field-input"
                      @update:model-value="updateTaskPriority"
                    >
                      <template #selection="{ item }">
                        <v-chip size="small" :color="getPriorityColor(task.priority)" variant="flat" label class="font-weight-medium">
                          {{ formatPriority(task.priority) }}
                        </v-chip>
                      </template>
                    </v-select>
                  </v-col>
                  <!-- Milestone -->
                  <v-col cols="6" md="4" class="field-col">
                    <div class="field-label">Milestone</div>
                    <v-autocomplete
                      v-model="editableDetails.milestoneId"
                      :items="milestones"
                      item-title="milestoneName"
                      item-value="milestoneId"
                      density="compact"
                      variant="outlined"
                      hide-details
                      clearable
                      autocomplete="off"
                      placeholder="Select milestone"
                      class="field-input"
                      @update:model-value="updateTaskDetails"
                    >
                      <template #append>
                        <v-btn
                          icon="mdi-plus"
                          variant="text"
                          size="x-small"
                          color="primary"
                          title="Create New Milestone"
                          @click.stop="openCreateMilestone"
                        />
                      </template>
                    </v-autocomplete>
                    <MilestoneModal
                      v-if="task && task.projectId"
                      v-model="showCreateMilestoneModal"
                      :project-id="task.projectId"
                      @save="handleMilestoneCreated"
                    />
                  </v-col>
                  <!-- Team -->
                  <v-col cols="6" md="4" class="field-col">
                    <div class="field-label">Team</div>
                    <v-autocomplete
                      v-model="editableDetails.team"
                      :items="teams"
                      item-title="teamName"
                      item-value="teamName"
                      density="compact"
                      variant="outlined"
                      hide-details
                      clearable
                      autocomplete="off"
                      placeholder="Select team"
                      class="field-input"
                      @update:model-value="updateTaskDetails"
                    />
                  </v-col>
                  <!-- Module -->
                  <v-col cols="6" md="4" class="field-col">
                    <div class="field-label">Module</div>
                    <v-text-field
                      v-model="editableDetails.module"
                      density="compact"
                      variant="outlined"
                      hide-details
                      placeholder="Enter module"
                      class="field-input"
                      @change="updateTaskDetails"
                    ></v-text-field>
                  </v-col>
                  <!-- Build Version -->
                  <v-col cols="6" md="4" class="field-col">
                    <div class="field-label">Build Version</div>
                    <v-text-field
                      v-model="editableDetails.buildVersion"
                      density="compact"
                      variant="outlined"
                      hide-details
                      placeholder="e.g. v1.2.0"
                      class="field-input"
                      @change="updateTaskDetails"
                    ></v-text-field>
                  </v-col>
                  <!-- Start Date -->
                  <v-col cols="6" md="4" class="field-col">
                    <div class="field-label">Start Date</div>
                    <VueDatePicker
                      :model-value="task.startDate ? new Date(task.startDate) : null"
                      @update:model-value="(val: any) => updateTask({ startDate: val ? val.toISOString() : undefined })"
                      auto-apply
                      :teleport="true"
                      :enable-time-picker="false"
                      class="enhanced-date-picker-inline"
                    >
                      <template #trigger>
                        <div class="field-date-trigger">
                          <v-icon icon="mdi-calendar" size="16" />
                          <span>{{ task.startDate ? formatDate(task.startDate) : 'Set start date' }}</span>
                        </div>
                      </template>
                    </VueDatePicker>
                  </v-col>
                  <!-- Due Date -->
                  <v-col cols="6" md="4" class="field-col">
                    <div class="field-label">Due Date</div>
                    <div class="field-value-display">
                      <v-icon icon="mdi-calendar" size="16" class="mr-1" />
                      {{ formatDate(task.dueDate || '') || 'Not set' }}
                    </div>
                  </v-col>
                  <!-- External Link -->
                  <v-col cols="12" v-if="task.externalLink" class="field-col">
                    <div class="field-label">External Link</div>
                    <a 
                      :href="task.externalLink" 
                      target="_blank" 
                      class="external-link"
                    >
                      <v-icon icon="mdi-open-in-new" size="14" class="mr-1" />
                      {{ task.externalLink }}
                    </a>
                  </v-col>
                </v-row>
              </div>
            </div>

            <v-divider class="section-divider" />

            <!-- Estimates Section -->
            <div class="unified-section">
              <div class="section-header">
                <div class="section-icon bg-indigo">
                  <v-icon icon="mdi-chart-timeline-variant" size="16" color="white" />
                </div>
                <span class="section-title">Estimates & Progress</span>
              </div>
              <div class="section-content">
                <v-row>
                  <v-col cols="6" md="4" class="field-col">
                    <div class="field-label">Estimated Work</div>
                    <v-text-field
                      v-model.number="task.estimatedHours"
                      suffix="hours"
                      density="compact"
                      variant="outlined"
                      hide-details
                      placeholder="0"
                      type="number"
                      class="field-input"
                      @change="updateTask({ estimatedHours: Number($event.target.value) })"
                    >
                      <template #prepend-inner>
                        <v-icon icon="mdi-clock-outline" size="16" color="grey" />
                      </template>
                    </v-text-field>
                  </v-col>
                  <v-col cols="6" md="4" class="field-col">
                    <div class="field-label">Remaining Work</div>
                    <v-text-field
                      v-model.number="task.remainingHours"
                      suffix="hours"
                      density="compact"
                      variant="outlined"
                      hide-details
                      placeholder="0"
                      type="number"
                      class="field-input"
                      @change="updateTask({ remainingHours: Number($event.target.value) })"
                    >
                      <template #prepend-inner>
                        <v-icon icon="mdi-timer-sand" size="16" color="grey" />
                      </template>
                    </v-text-field>
                  </v-col>
                  <v-col cols="6" md="4" class="field-col">
                    <div class="field-label">Story Points</div>
                    <v-text-field
                      v-model.number="task.storyPoints"
                      type="number"
                      density="compact"
                      variant="outlined"
                      hide-details
                      placeholder="0"
                      class="field-input"
                      @change="updateTask({ storyPoints: Number($event.target.value) })"
                    >
                      <template #prepend-inner>
                        <v-icon icon="mdi-star-outline" size="16" color="grey" />
                      </template>
                    </v-text-field>
                  </v-col>
                </v-row>
              </div>
            </div>
          </v-card>
        </v-col>

        <!-- Sidebar with Tabs -->
        <v-col cols="12" md="4">
          <v-card rounded="xl" class="sidebar-card">
            <!-- Tabs -->
            <v-tabs v-model="activeTab" density="compact" grow class="sidebar-tabs">
              <v-tab value="comments">
                <v-icon icon="mdi-comment-outline" class="mr-1" size="small" />
                Comments ({{ comments.length }})
              </v-tab>
              <v-tab value="activity">
                <v-icon icon="mdi-history" class="mr-1" size="small" />
                Activity
              </v-tab>
              <v-tab value="files">
                <v-icon icon="mdi-paperclip" class="mr-1" size="small" />
                Files ({{ attachments.length }})
              </v-tab>
              <v-tab value="relations">
                <v-icon icon="mdi-link-variant" class="mr-1" size="small" />
                Relations
              </v-tab>
              <v-tab value="watchers">
                <v-icon icon="mdi-eye-outline" class="mr-1" size="small" />
                Watchers
                <v-chip size="x-small" class="ml-1">{{ watchers.length }}</v-chip>
              </v-tab>
            </v-tabs>
            <v-divider />
            <!-- Tab Content -->
            <v-tabs-window v-model="activeTab">
              <!-- Comments Tab -->
              <v-tabs-window-item value="comments">
                <v-card-text class="pa-4">
                  <!-- Add Comment Input -->
                  <div class="comment-input-section mb-4">
                    <div class="comment-editor-wrapper">
                       <QuillEditor
                        ref="commentEditor"
                        v-model:content="newComment"
                        contentType="html"
                        theme="snow"
                        :toolbar="[['bold', 'italic', 'underline']]"
                        placeholder="Write a comment..."
                      />
                    </div>
                    <div class="comment-actions">
                      <v-menu
                        v-model="emojiMenu"
                        :close-on-content-click="false"
                        location="top start"
                        offset="8"
                      >
                        <template #activator="{ props }">
                          <v-btn
                            v-bind="props"
                            icon
                            variant="text"
                            size="small"
                            class="emoji-btn mr-2"
                            title="Add emoji"
                          >
                            <v-icon icon="mdi-emoticon-outline" size="20" />
                          </v-btn>
                        </template>
                        <v-card class="emoji-picker-card" width="320">
                          <div class="emoji-grid">
                            <button
                              v-for="emoji in commonEmojis"
                              :key="emoji"
                              class="emoji-item"
                              @click="insertEmoji(emoji)"
                            >
                              {{ emoji }}
                            </button>
                          </div>
                        </v-card>
                      </v-menu>
                      <v-btn
                        color="primary"
                        :loading="commentLoading"
                        :disabled="!newComment || newComment === '<p><br></p>'"
                        @click="addComment"
                        rounded="pill"
                        elevation="0"
                        size="small"
                        class="post-btn"
                      >
                        <v-icon icon="mdi-send" class="mr-1" size="14" />
                        POST
                      </v-btn>
                    </div>
                  </div>
                  
                  <!-- Comment List -->
                  <div v-if="comments.length === 0" class="empty-state-box text-center py-8">
                    <v-icon icon="mdi-comment-text-outline" size="56" color="grey-lighten-1" />
                    <p class="text-grey mt-3 text-body-2">No comments yet</p>
                    <p class="text-grey-lighten-1 text-caption">Be the first to add a comment</p>
                  </div>
                  <div v-else class="comments-list">
                    <div
                      v-for="comment in comments"
                      :key="comment.commentId"
                      class="comment-item mb-3"
                    >
                      <div class="d-flex align-start">
                        <v-avatar size="32" class="mr-3 mt-1">
                          <v-img v-if="comment.author?.profileImageUrl" :src="comment.author.profileImageUrl" />
                          <span v-else class="text-caption font-weight-bold">{{ comment.author?.fullName?.charAt(0) || '?' }}</span>
                        </v-avatar>
                        <div class="flex-grow-1">
                          <div class="d-flex align-center mb-1">
                            <span class="text-body-2 font-weight-bold">{{ comment.author?.fullName || 'User' }}</span>
                            <span class="text-caption text-grey ml-2">{{ formatDateTime(comment.createdAt) }}</span>
                            <v-spacer />
                            <v-btn 
                              icon 
                              variant="text" 
                              size="x-small" 
                              @click="deleteComment(comment.commentId)" 
                              class="comment-delete-btn"
                            >
                              <v-icon icon="mdi-trash-can-outline" size="16" />
                            </v-btn>
                          </div>
                          <div class="comment-content ql-editor" v-html="comment.content"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-tabs-window-item>
              <!-- Activity Tab -->
              <v-tabs-window-item value="activity">
                 <v-card-text class="activity-tab" style="min-height: 300px; max-height: 800px; overflow-y: auto;">
                  <!-- History entries -->
                  <div v-if="activityItems.length === 0" class="text-center py-4">
                    <v-icon icon="mdi-history" size="48" color="grey-lighten-1" />
                    <p class="text-grey mt-2">No activity yet</p>
                  </div>
                  <div v-else class="activity-list">
                    <!-- Combine and sort history + comments by date -->
                    <div
                      v-for="item in activityItems"
                      :key="item.id"
                      class="activity-item pa-2 mb-2 rounded-lg"
                      :class="item.type === 'comment' ? 'bg-grey-lighten-4' : ''"
                    >
                      <div class="d-flex align-center mb-1">
                        <v-avatar size="24" class="mr-2">
                          <v-img v-if="item.user?.profileImageUrl" :src="item.user.profileImageUrl" />
                          <span v-else class="text-caption">{{ item.user?.fullName?.charAt(0) || '?' }}</span>
                        </v-avatar>
                        <span class="text-caption font-weight-medium">{{ item.user?.fullName || 'System' }}</span>
                        <v-spacer />
                        <span class="text-caption text-grey">{{ formatDateTime(item.createdAt) }}</span>
                      </div>
                      <div class="text-body-2 ml-8 ql-editor" v-if="item.type === 'comment'" v-html="item.content"></div>
                      <p class="text-body-2 ml-8" v-else>{{ item.content }}</p>
                    </div>
                  </div>
                </v-card-text>
              </v-tabs-window-item>

              <!-- Files Tab -->
              <v-tabs-window-item value="files">
                <v-card-text>
                  <div class="d-flex justify-end mb-2">
                    <v-btn
                      color="primary"
                      variant="tonal"
                      size="small"
                      :loading="uploadingFile"
                      @click="($refs.fileInput as HTMLInputElement).click()"
                    >
                      <v-icon icon="mdi-upload" class="mr-1" />
                      Upload
                    </v-btn>
                    <input
                      ref="fileInput"
                      type="file"
                      hidden
                      multiple
                      @change="handleFileUpload"
                    />
                  </div>
                  <div v-if="attachments.length === 0" class="text-center py-4">
                    <v-icon icon="mdi-paperclip" size="48" color="grey-lighten-1" />
                    <p class="text-grey mt-2">No attachments</p>
                  </div>
                  <template v-else>
                    <!-- Image Gallery -->
                    <div v-if="imageAttachments.length > 0" class="attachment-gallery mb-3">
                      <div
                        v-for="(img, idx) in imageAttachments"
                        :key="img.attachmentId"
                        class="gallery-item"
                        @click="openPreview(img.fileUrl, idx)"
                      >
                        <v-img :src="img.fileUrl" aspect-ratio="1" cover class="gallery-thumb" />
                        <v-btn
                          icon size="x-small" variant="flat" color="error"
                          class="gallery-delete"
                          @click.stop="deleteAttachment(img.attachmentId)"
                        >
                          <v-icon icon="mdi-close" size="12" />
                        </v-btn>
                      </div>
                    </div>
                    <!-- File List -->
                    <div class="d-flex flex-column ga-2">
                      <v-card
                        v-for="attachment in attachments.filter((a) => !isImage(a.mimeType))"
                        :key="attachment.attachmentId"
                        variant="outlined" rounded="lg" class="pa-2"
                      >
                        <div class="d-flex align-center">
                          <v-icon
                            :icon="isPdf(attachment.mimeType) ? 'mdi-file-pdf-box' : 'mdi-file-document-outline'"
                            :color="isPdf(attachment.mimeType) ? 'red' : 'grey'" size="32" class="mr-2"
                          />
                          <div class="flex-grow-1" style="min-width: 0">
                            <div class="text-body-2 font-weight-medium text-truncate">{{ attachment.fileName }}</div>
                            <div class="text-caption text-grey">{{ formatFileSize(attachment.fileSize) }}</div>
                          </div>
                          <v-btn icon size="x-small" variant="text" @click="downloadAttachment(attachment)">
                            <v-icon icon="mdi-download" size="small" />
                          </v-btn>
                          <v-btn icon size="x-small" variant="text" color="error" @click="deleteAttachment(attachment.attachmentId)">
                            <v-icon icon="mdi-delete" size="small" />
                          </v-btn>
                        </div>
                      </v-card>
                    </div>
                  </template>
                </v-card-text>
              </v-tabs-window-item>

              <!-- Relations Tab -->
              <v-tabs-window-item value="relations">
                <v-card-text>
                  <div class="d-flex justify-end mb-2">
                    <v-btn
                      color="primary"
                      variant="tonal"
                      size="small"
                      @click="addDependencyDialog = true"
                    >
                      <v-icon icon="mdi-plus" class="mr-1" />
                      Add Relation
                    </v-btn>
                  </div>
                  <div v-if="dependencies.length === 0" class="text-center py-4">
                    <v-icon icon="mdi-link-variant" size="48" color="grey-lighten-1" />
                    <p class="text-grey mt-2">No dependencies</p>
                  </div>
                  <div v-else class="d-flex flex-column ga-2">
                    <v-card
                      v-for="dep in dependencies"
                      :key="dep.dependencyId"
                      variant="outlined" rounded="lg" class="pa-2"
                    >
                      <div class="d-flex align-center">
                        <v-icon
                          :icon="dep.type === 'BLOCKS' ? 'mdi-arrow-right-bold' : 'mdi-arrow-left-bold'"
                          :color="dep.type === 'BLOCKS' ? 'warning' : 'info'"
                          size="20" class="mr-2"
                        />
                        <div class="flex-grow-1">
                          <div class="text-caption text-grey">
                            {{ dep.type === 'BLOCKS' ? 'Blocks' : 'Blocked by' }}
                          </div>
                          <router-link
                            :to="`/tasks/${dep.dependsOnTaskId}`"
                            class="text-body-2 text-primary"
                          >
                            {{ dep.dependsOnTask?.title || `Task #${dep.dependsOnTaskId}` }}
                          </router-link>
                        </div>
                        <v-btn icon size="x-small" variant="text" color="error" @click="removeDependency(dep.dependencyId)">
                         <v-icon icon="mdi-close" size="small" />
                        </v-btn>
                      </div>
                    </v-card>
                  </div>
                </v-card-text>
              </v-tabs-window-item>

              <!-- Watchers Tab -->
              <v-tabs-window-item value="watchers">
                <v-card-text>
                  <div class="d-flex justify-end mb-2">
                    <v-menu location="bottom end">
                      <template #activator="{ props }">
                        <v-btn v-bind="props" color="primary" variant="tonal" size="small">
                          <v-icon icon="mdi-plus" class="mr-1" />
                          Add Watcher
                        </v-btn>
                      </template>
                      <v-list density="compact" nav width="200" style="max-height: 200px; overflow-y: auto;">
                        <v-list-item
                          v-for="user in users.filter(u => !watchers.some(w => w.userId === u.userId))"
                          :key="user.userId"
                          @click="addWatcher(user.userId)"
                        >
                          <template #prepend>
                            <v-avatar size="24" class="mr-2">
                              <v-img v-if="user.profileImageUrl" :src="user.profileImageUrl" />
                              <span v-else class="text-caption">{{ user.fullName?.charAt(0) }}</span>
                            </v-avatar>
                          </template>
                          <v-list-item-title class="text-caption">{{ user.fullName }}</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </div>
                  <div v-if="watchers.length === 0" class="text-center py-4">
                    <v-icon icon="mdi-eye-off-outline" size="48" color="grey-lighten-1" />
                    <p class="text-grey mt-2">No watchers</p>
                  </div>
                  <div v-else class="d-flex flex-column ga-2">
                    <v-card
                      v-for="watcher in watchers"
                      :key="watcher.watcherId"
                      variant="outlined" rounded="lg" class="pa-2"
                    >
                      <div class="d-flex align-center">
                        <v-avatar size="32" class="mr-2">
                          <v-img v-if="watcher.user?.profileImageUrl" :src="watcher.user.profileImageUrl" />
                          <span v-else class="text-caption">{{ watcher.user?.fullName?.charAt(0) }}</span>
                        </v-avatar>
                        <div class="flex-grow-1">
                          <div class="text-body-2 font-weight-medium">{{ watcher.user?.fullName }}</div>
                        </div>
                        <v-btn icon size="x-small" variant="text" color="error" @click="removeWatcher(watcher.userId)">
                          <v-icon icon="mdi-close" size="small" />
                        </v-btn>
                      </div>
                    </v-card>
                  </div>
                </v-card-text>
              </v-tabs-window-item>
            </v-tabs-window>
          </v-card>

          <!-- Image Preview Dialog -->
          <v-dialog v-model="previewDialog" max-width="900">
            <v-card class="preview-dialog">
              <v-btn
                icon
                variant="text"
                class="preview-close"
                @click="previewDialog = false"
              >
                <v-icon icon="mdi-close" />
              </v-btn>
              <v-img :src="previewImage" max-height="80vh" contain />
              <v-card-actions
                v-if="imageAttachments.length > 1"
                class="justify-center"
              >
                <v-btn
                  icon
                  variant="text"
                  :disabled="previewIndex === 0"
                  @click="navigatePreview(-1)"
                >
                  <v-icon icon="mdi-chevron-left" />
                </v-btn>
                <span class="mx-4 text-body-2">
                  {{ previewIndex + 1 }} / {{ imageAttachments.length }}
                </span>
                <v-btn
                  icon
                  variant="text"
                  :disabled="previewIndex === imageAttachments.length - 1"
                  @click="navigatePreview(1)"
                >
                  <v-icon icon="mdi-chevron-right" />
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-col>
      </v-row>
    </template>

    <!-- Add Dependency Dialog -->
    <v-dialog v-model="addDependencyDialog" max-width="500">
      <v-card title="Add Relation">
        <v-card-text>
          <v-autocomplete
            v-model="targetTask"
            label="Select Task"
            :items="taskSearchResults"
            item-title="title"
            item-value="id"
            return-object
            :loading="searchLoading"
            placeholder="Type to search..."
            @update:search="searchTasks"
            no-filter
            hide-no-data
            density="comfortable"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props" :subtitle="item.raw.project?.name || 'Unknown Project'"></v-list-item>
            </template>
          </v-autocomplete>
          <div class="text-caption text-grey mt-2">
            This task will be marked as "Dependent On" (Blocked By) the selected task.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="addDependencyDialog = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="!targetTask" @click="addDependency">Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
/* Task Detail Page Container */
.task-detail-page {
  padding: 0;
}

/* Enhanced Task Header Card */
.task-header-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}

/* =========================================
   UNIFIED DETAIL CARD STYLES
   ========================================= */
.unified-detail-card {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.03) !important;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.unified-detail-card:hover {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04) !important;
}

/* Section Styles */
.unified-section {
  padding: 20px 24px;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  margin-right: 12px;
  flex-shrink: 0;
}

.section-icon.bg-success {
  background: linear-gradient(135deg, #10B981, #34D399);
}

.section-icon.bg-blue {
  background: linear-gradient(135deg, #f1184c, #60A5FA);
}

.section-icon.bg-teal {
  background: linear-gradient(135deg, #14B8A6, #2DD4BF);
}

.section-icon.bg-primary {
  background: linear-gradient(135deg, #f1184c, #ff6b8a);
}

.section-icon.bg-indigo {
  background: linear-gradient(135deg, #6366F1, #A78BFA);
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.progress-percentage {
  font-size: 20px;
  font-weight: 700;
}

.section-content {
  padding-top: 0;
}

.section-divider {
  margin: 0 !important;
  border-color: rgba(0, 0, 0, 0.05) !important;
}

/* Field Styles */
.field-col {
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-bottom: 6px;
}

.field-input :deep(.v-field) {
  border-radius: 10px;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.field-input :deep(.v-field--focused) {
  background: white;
}

.field-input :deep(.v-field__outline__start),
.field-input :deep(.v-field__outline__end) {
  border-color: rgba(0, 0, 0, 0.08);
}

.field-input :deep(.v-field:hover .v-field__outline__start),
.field-input :deep(.v-field:hover .v-field__outline__end) {
  border-color: rgba(241, 24, 76, 0.4);
}

.field-input :deep(.v-field--focused .v-field__outline__start),
.field-input :deep(.v-field--focused .v-field__outline__end) {
  border-color: #f1184c !important;
}

.field-input :deep(.v-field__input) {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.field-value-display {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  min-height: 40px;
  padding: 8px 14px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.field-date-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  min-height: 40px;
  padding: 8px 14px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s ease;
}

.field-date-trigger:hover {
  border-color: #f1184c;
  background: white;
  box-shadow: 0 0 0 3px rgba(241, 24, 76, 0.08);
}

.field-date-trigger .v-icon {
  color: #f1184c;
}

.external-link {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: #f1184c;
  text-decoration: none;
  padding: 8px 14px;
  background: rgba(241, 24, 76, 0.06);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.external-link:hover {
  background: rgba(241, 24, 76, 0.12);
  text-decoration: underline;
}

.header-accent-bar {
  width: 100%;
  height: 5px;
}

.header-content {
  padding: 20px 24px 24px;
}

.header-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.back-btn {
  color: #64748b;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
}

.back-btn:hover {
  color: #f1184c;
  background: rgba(241, 24, 76, 0.08);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn-primary {
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.15) 0%, rgba(241, 24, 76, 0.1) 100%) !important;
  color: #f1184c !important;
  font-weight: 600;
  text-transform: none;
}

.action-btn-primary:hover {
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.25) 0%, rgba(241, 24, 76, 0.18) 100%) !important;
}

.more-btn {
  color: #64748b;
}

.more-btn:hover {
  background: rgba(100, 116, 139, 0.1);
}

.action-menu {
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Breadcrumb */
.task-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.breadcrumb-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: #f1184c;
  text-decoration: none;
  padding: 4px 10px;
  background: rgba(241, 24, 76, 0.08);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.breadcrumb-link:hover {
  background: rgba(241, 24, 76, 0.15);
}

.breadcrumb-separator {
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 300;
}

.task-id-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  padding: 4px 10px;
  background: rgba(100, 116, 139, 0.1);
  border-radius: 6px;
}

.edit-parent-btn {
  color: #94a3b8;
  margin-left: 4px;
  opacity: 0.6;
  transition: all 0.2s ease;
}

.edit-parent-btn:hover {
  opacity: 1;
  color: #f1184c;
  background: rgba(241, 24, 76, 0.1);
}

.parent-menu-card {
  padding: 16px;
  border-radius: 12px;
}

.parent-menu-header {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-bottom: 12px;
}

/* Task Title */
.task-title-main {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
  margin: 0 0 16px 0;
}

/* Meta Chips */
.task-meta-chips {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.meta-field-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-field-label {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-left: 4px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.meta-chip .chevron {
  opacity: 0.5;
  margin-left: 2px;
  transition: transform 0.2s ease;
}

.meta-chip:hover .chevron {
  opacity: 1;
}

.meta-chip-type {
  color: #475569;
  background: rgba(71, 85, 105, 0.1);
  border-color: rgba(71, 85, 105, 0.15);
}

.meta-chip-type:hover {
  background: rgba(71, 85, 105, 0.15);
}

.meta-chip-status {
  border: 1px solid !important;
}

.meta-chip-status:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot-menu {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 10px;
}

.meta-chip-priority {
  border: 1px solid !important;
}

.meta-chip-priority:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.meta-chip-sprint {
  color: #0891b2;
  background: rgba(8, 145, 178, 0.1);
  border-color: rgba(8, 145, 178, 0.2);
}

.meta-chip-sprint:hover {
  background: rgba(8, 145, 178, 0.15);
}

.meta-chip-assignee {
  color: #475569;
  background: #f8fafc;
  border-color: rgba(0, 0, 0, 0.08);
}

.meta-chip-assignee:hover {
  background: rgba(241, 24, 76, 0.06);
  border-color: rgba(241, 24, 76, 0.15);
}

.assignee-avatar-mini {
  border: 2px solid rgba(241, 24, 76, 0.2);
}

.avatar-text-mini {
  font-size: 10px;
  font-weight: 700;
  color: #f1184c;
  background: linear-gradient(135deg, #fef2f4 0%, #fce7eb 100%);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.meta-chip-date {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.15);
}

.meta-chip-date:hover {
  background: rgba(241, 24, 76, 0.08);
  color: #f1184c;
  border-color: rgba(241, 24, 76, 0.15);
}

.meta-chip-date.has-date {
  color: #64748b;
  background: rgba(100, 116, 139, 0.1);
}

/* Status Menu Styling */
.status-menu {
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.menu-subheader {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  padding: 12px 16px 8px;
}

.status-menu-item {
  border-radius: 8px;
  margin: 2px 8px;
  transition: all 0.15s ease;
}

.status-menu-item:hover {
  background: rgba(241, 24, 76, 0.06);
}

.status-menu-item.active {
  background: rgba(241, 24, 76, 0.1);
  color: #f1184c;
}

/* Footer Meta */
.task-footer-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.footer-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
}

.footer-meta-item strong {
  color: #475569;
  font-weight: 600;
}

.footer-meta-separator {
  color: #cbd5e1;
  font-size: 10px;
}

/* Existing styles below */
.comment-item {
  background: #f8fafc;
  border-radius: 8px;
}

.comments-list {
  max-height: 400px;
  overflow-y: auto;
}

.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.attachment-card {
  overflow: hidden;
}

.attachment-preview {
  background: #f1f5f9;
}

.attachment-icon {
  background: #f1f5f9;
  color: #64748b;
}

/* Smaller inline select fields */
.inline-select {
  max-width: 160px;
}

.inline-select :deep(.v-field) {
  font-size: 12px;
  min-height: 32px !important;
}

.inline-select :deep(.v-field__input) {
  font-size: 12px;
  padding: 4px 8px;
  min-height: 32px !important;
}

.inline-select :deep(.v-field__append-inner) {
  padding-top: 4px;
}

/* Attachment Gallery Grid */
.attachment-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.gallery-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.gallery-item:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.gallery-thumb {
  border-radius: 8px;
}

.gallery-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.gallery-item:hover .gallery-delete {
  opacity: 1;
}

/* Preview Dialog */
.preview-dialog {
  position: relative;
  background: #000;
}

.preview-close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  color: white !important;
  background: rgba(0, 0, 0, 0.5);
}



/* Quill Editor Styles */
.quill-wrapper {
  border: 1px solid rgba(0, 0, 0, 0.12); /* Match Vuetify outlined variant */
  border-radius: 4px;
  overflow: hidden;
  background-color: white;
}

.quill-wrapper:hover {
  border-color: rgba(0, 0, 0, 0.87); /* Darker on hover like v-text-field */
}

/* Adjust toolbar to match Vuetify look */
:deep(.ql-toolbar) {
  border: none !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12) !important;
  background-color: #f8fafc;
}

:deep(.ql-container) {
  border: none !important;
  font-family: inherit;
  font-size: 0.875rem; /* text-body-2 */
}

:deep(.ql-editor) {
  min-height: 200px;
}

/* Rendered HTML content styles */
:deep(.ql-editor) p {
  margin-bottom: 0.5em;
}

:deep(.ql-editor) ul, :deep(.ql-editor) ol {
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}

/* Enhanced Detail Cards */
.detail-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02) !important;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.detail-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04) !important;
  border-color: rgba(0, 0, 0, 0.08);
}

.detail-card-header {
  padding: 16px 20px;
  background: linear-gradient(to right, rgba(241, 24, 76, 0.03), transparent);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.detail-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  margin-right: 12px;
}

.detail-icon-wrapper.bg-primary {
  background: linear-gradient(135deg, #f1184c, #ff6b8a);
}

.detail-icon-wrapper.bg-indigo {
  background: linear-gradient(135deg, #4F46E5, #f1184c);
}

.detail-card-content {
  padding: 20px;
}

.detail-field {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

.detail-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-bottom: 6px;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid transparent;
}

.detail-link {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #f1184c;
  text-decoration: none;
  padding: 8px 12px;
  background: rgba(241, 24, 76, 0.08);
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.detail-link:hover {
  background: rgba(241, 24, 76, 0.15);
  text-decoration: underline;
}

.detail-input :deep(.v-field) {
  border-radius: 8px;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.detail-input :deep(.v-field--focused) {
  background: white;
}

.detail-input :deep(.v-field__outline__start),
.detail-input :deep(.v-field__outline__end) {
  border-color: rgba(0, 0, 0, 0.08);
}

.detail-input :deep(.v-field:hover .v-field__outline__start),
.detail-input :deep(.v-field:hover .v-field__outline__end) {
  border-color: rgba(241, 24, 76, 0.4);
}

.detail-input :deep(.v-field--focused .v-field__outline__start),
.detail-input :deep(.v-field--focused .v-field__outline__end) {
  border-color: #f1184c;
}

.detail-input :deep(.v-field__input) {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.detail-input :deep(.v-field__append-inner) {
  color: #94a3b8;
}

/* Additional Icon Wrapper Colors */
.detail-icon-wrapper.bg-success {
  background: linear-gradient(135deg, #10B981, #34D399);
}

.detail-icon-wrapper.bg-blue {
  background: linear-gradient(135deg, #f1184c, #60A5FA);
}

.detail-icon-wrapper.bg-teal {
  background: linear-gradient(135deg, #14B8A6, #2DD4BF);
}

/* Progress Bar Enhanced */
.progress-bar-enhanced {
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
}

.progress-bar-enhanced :deep(.v-progress-linear__determinate) {
  border-radius: 10px;
}

/* Compact Quill Editor */
.quill-compact :deep(.ql-editor) {
  min-height: 80px;
  max-height: 200px;
  overflow-y: auto;
}

.quill-compact :deep(.ql-toolbar) {
  padding: 6px 8px;
}

/* Comment Section Styling */
.comment-input-section {
  background: #fff;
  padding: 0;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: all 0.2s ease;
}

.comment-input-section:focus-within {
  border-color: #f1184c;
  box-shadow: 0 0 0 3px rgba(241, 24, 76, 0.08);
}

.comment-editor-wrapper {
  position: relative;
}

.comment-editor-wrapper :deep(.ql-container) {
  border: none !important;
  font-family: inherit;
}

.comment-editor-wrapper :deep(.ql-editor) {
  min-height: 80px;
  max-height: 150px;
  overflow-y: auto;
  padding: 16px 16px 8px 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
}

.comment-editor-wrapper :deep(.ql-editor.ql-blank::before) {
  color: #94a3b8;
  font-style: normal;
  left: 16px;
  right: 16px;
}

.comment-editor-wrapper :deep(.ql-toolbar) {
  border: none !important;
  border-top: 1px solid #f1f5f9 !important;
  padding: 8px 12px !important;
  background: #fafbfc;
  display: flex;
  align-items: center;
  gap: 4px;
}

.comment-editor-wrapper :deep(.ql-toolbar .ql-formats) {
  margin-right: 0 !important;
  display: flex;
  align-items: center;
  gap: 2px;
}

.comment-editor-wrapper :deep(.ql-toolbar button) {
  width: 26px !important;
  height: 26px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 6px !important;
  transition: all 0.15s ease !important;
  background: transparent !important;
}

.comment-editor-wrapper :deep(.ql-toolbar button:hover) {
  background: #f1f5f9 !important;
}

.comment-editor-wrapper :deep(.ql-toolbar button.ql-active) {
  background: linear-gradient(135deg, #f1184c, #ff6b8a) !important;
  color: white !important;
}

.comment-editor-wrapper :deep(.ql-toolbar button.ql-active .ql-stroke) {
  stroke: white !important;
}

.comment-editor-wrapper :deep(.ql-toolbar button.ql-active .ql-fill) {
  fill: white !important;
}

.comment-editor-wrapper :deep(.ql-toolbar .ql-stroke) {
  stroke: #64748b;
  stroke-width: 1.5;
}

.comment-editor-wrapper :deep(.ql-toolbar button:hover .ql-stroke) {
  stroke: #334155;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 12px 12px 12px;
  background: #fafbfc;
}

.post-btn {
  background: linear-gradient(135deg, #f1184c, #ff6b8a) !important;
  font-weight: 600 !important;
  letter-spacing: 0.5px !important;
  padding: 0 20px !important;
  text-transform: uppercase !important;
}

.emoji-btn {
  color: #64748b !important;
  transition: all 0.2s ease !important;
}

.emoji-btn:hover {
  color: #f1184c !important;
  background: rgba(241, 24, 76, 0.08) !important;
}

.emoji-picker-card {
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
  overflow: hidden;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  padding: 12px;
  max-height: 280px;
  overflow-y: auto;
}

.emoji-item {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.emoji-item:hover {
  background: #f1f5f9;
  transform: scale(1.15);
}

.empty-state-box {
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed rgba(0, 0, 0, 0.08);
}

.comment-item {
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.comment-item:hover {
  background: #f1f5f9;
  border-color: rgba(0, 0, 0, 0.04);
}

.comment-content {
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
  padding: 0 !important;
  margin-top: 4px;
}

.comment-content p {
  margin-bottom: 0.25em;
}

.comment-delete-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
  color: #94a3b8 !important;
}

.comment-item:hover .comment-delete-btn {
  opacity: 1;
}

.comment-delete-btn:hover {
  color: #EF4444 !important;
}

/* =========================================
   SIDEBAR CARD STYLES
   ========================================= */
.sidebar-card {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.03) !important;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.sidebar-card:hover {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04) !important;
}

.sidebar-tabs {
  background: linear-gradient(to bottom, rgba(241, 24, 76, 0.02), transparent);
}

.sidebar-tabs :deep(.v-tab) {
  font-size: 11px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.25px;
  min-width: 0;
  padding: 0 10px;
  color: #64748b;
}

.sidebar-tabs :deep(.v-tab--selected) {
  color: #f1184c;
}

.sidebar-tabs :deep(.v-tab__slider) {
  background: linear-gradient(90deg, #f1184c, #ff6b8a);
  height: 3px;
  border-radius: 3px 3px 0 0;
}

/* =========================================
   ENHANCED DATE PICKER STYLES
   ========================================= */
:deep(.v-date-picker) {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 
              0 8px 24px rgba(0, 0, 0, 0.1),
              0 0 0 1px rgba(0, 0, 0, 0.05) !important;
  border: none !important;
  background: white;
}

:deep(.v-date-picker-header) {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 50%, #ff8fab 100%);
  padding: 16px 16px 12px;
  border-radius: 16px 16px 0 0;
}

:deep(.v-date-picker-header__content) {
  color: white !important;
  font-weight: 600;
  font-size: 15px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

:deep(.v-date-picker-header .v-btn) {
  color: white !important;
  opacity: 0.9;
  transition: all 0.2s ease;
}

:deep(.v-date-picker-header .v-btn:hover) {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2) !important;
}

:deep(.v-date-picker-controls) {
  padding: 12px 16px 8px;
  background: linear-gradient(to bottom, rgba(241, 24, 76, 0.03), transparent);
}

:deep(.v-date-picker-controls .v-btn) {
  color: #475569;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.2s ease;
}

:deep(.v-date-picker-controls .v-btn:hover) {
  color: #f1184c;
  background: rgba(241, 24, 76, 0.08) !important;
}

:deep(.v-date-picker-month__weekday) {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 0;
}

:deep(.v-date-picker-month__day) {
  border-radius: 10px;
  transition: all 0.2s ease;
  font-weight: 500;
  color: #334155;
}

:deep(.v-date-picker-month__day:hover:not(.v-date-picker-month__day--selected)) {
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.08), rgba(255, 107, 138, 0.08)) !important;
  transform: scale(1.05);
}

:deep(.v-date-picker-month__day--selected) {
  background: linear-gradient(135deg, #f1184c, #ff6b8a) !important;
  color: white !important;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(241, 24, 76, 0.35);
  transform: scale(1.08);
}

:deep(.v-date-picker-month__day--today:not(.v-date-picker-month__day--selected)) {
  border: 2px solid #f1184c !important;
  color: #f1184c;
  font-weight: 700;
}

:deep(.v-date-picker-month__day--adjacent) {
  color: #cbd5e1;
}

:deep(.v-date-picker-years),
:deep(.v-date-picker-months) {
  padding: 16px;
}

:deep(.v-date-picker-years__content .v-btn),
:deep(.v-date-picker-months__content .v-btn) {
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

:deep(.v-date-picker-years__content .v-btn:hover),
:deep(.v-date-picker-months__content .v-btn:hover) {
  background: rgba(241, 24, 76, 0.08) !important;
  color: #f1184c;
}

:deep(.v-date-picker-years__content .v-btn--active),
:deep(.v-date-picker-months__content .v-btn--active) {
  background: linear-gradient(135deg, #f1184c, #ff6b8a) !important;
  color: white !important;
  font-weight: 700;
}

/* Date picker in menu popup */
.v-overlay__content:has(.v-date-picker) {
  border-radius: 16px;
  overflow: hidden;
}
</style>
