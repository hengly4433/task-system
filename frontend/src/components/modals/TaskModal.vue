<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import { useAuthStore } from "@/stores/auth.store";
import { statusService, type TaskStatus } from "@/services/status.service";
import DatePickerField from "@/components/DatePickerField.vue";

const authStore = useAuthStore();

defineOptions({
  name: "TaskModal",
});

const props = defineProps<{
  modelValue: boolean;
  task?: {
    taskId?: string;
    title?: string;
    description?: string;
    projectId?: string;
    status?: string;
    statusId?: string;
    priority?: string;
    startDate?: string;
    dueDate?: string;
    assigneeId?: string;
    sprintId?: string;
    parentTaskId?: string;
  } | null;
  projects: { projectId: string; name: string }[];
  sprints?: { sprintId: string; name: string; sprintName?: string }[];
  users: { userId: string; fullName: string; profileImageUrl?: string }[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", data: any): void;
  (e: "projectChange", projectId: string): void;
}>();

const isEdit = ref(false);
const formValid = ref(false);
const file = ref<File[]>([]);
const projectStatuses = ref<TaskStatus[]>([]);
const statusLoading = ref(false);

const form = ref({
  title: "",
  description: "",
  projectId: "",
  status: "TODO",
  statusId: "" as string | null,
  priority: "MEDIUM",
  startDate: "",
  dueDate: "",
  assigneeId: "",
  sprintId: "",
  parentTaskId: "",
});

// Default statuses if no project selected
const defaultStatusOptions = [
  { title: "Not Started", value: "TODO", color: "#94a3b8" },
  { title: "In Progress", value: "IN_PROGRESS", color: "#3b82f6" },
  { title: "In Review", value: "IN_REVIEW", color: "#f59e0b" },
  { title: "Completed", value: "DONE", color: "#22c55e" },
  { title: "Cancelled", value: "CANCELLED", color: "#ef4444" },
];

const statusOptions = computed(() => {
  if (projectStatuses.value.length > 0) {
    return projectStatuses.value.map(s => ({
      title: s.name,
      value: s.code,
      color: s.color,
      statusId: s.statusId,
    }));
  }
  return defaultStatusOptions;
});

// Load statuses when project changes
const loadProjectStatuses = async (projectId: string) => {
  if (!projectId) {
    projectStatuses.value = [];
    return;
  }
  statusLoading.value = true;
  try {
    const statuses = await statusService.getByProject(projectId);
    projectStatuses.value = statuses;
  } catch (e) {
    console.error('Failed to load project statuses', e);
  } finally {
    statusLoading.value = false;
  }
};

watch(() => form.value.projectId, (newId) => {
  if (newId) {
    loadProjectStatuses(newId);
    emit("projectChange", newId);
  } else {
    projectStatuses.value = [];
  }
});

// Update statusId when status code changes
watch(() => form.value.status, (newCode) => {
  if (projectStatuses.value.length > 0) {
    const matched = projectStatuses.value.find(s => s.code === newCode);
    if (matched) {
      form.value.statusId = matched.statusId;
    }
  }
});

const priorityOptions = [
  { title: "Urgent", value: "URGENT", icon: "mdi-alert-circle", color: "#ef4444" },
  { title: "High", value: "HIGH", icon: "mdi-arrow-up", color: "#f97316" },
  { title: "Medium", value: "MEDIUM", icon: "mdi-minus", color: "#eab308" },
  { title: "Low", value: "LOW", icon: "mdi-arrow-down", color: "#22c55e" },
];

const rules = {
  required: (v: string) => !!v || "This field is required",
  title: (v: string) => (v && v.length >= 3) || "Title must be at least 3 characters",
};

// Map sprints to dropdown format
const sprintOptions = computed(() => {
  return (props.sprints || []).map((s) => ({
    title: s.name || s.sprintName || `Sprint ${s.sprintId}`,
    value: s.sprintId,
  }));
});

watch(
  () => form.value.projectId,
  (newProjectId) => {
    if (newProjectId) {
      emit("projectChange", newProjectId);
      if (!isEdit.value) {
        form.value.sprintId = "";
      }
    }
  }
);

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && props.task) {
      isEdit.value = !!props.task.taskId;
      form.value = {
        title: props.task.title || "",
        description: props.task.description || "",
        projectId: props.task.projectId || "",
        status: props.task.status || "TODO",
        statusId: props.task.statusId || null,
        priority: props.task.priority || "MEDIUM",
        startDate: props.task.startDate || "",
        dueDate: props.task.dueDate || "",
        assigneeId: props.task.assigneeId || "",
        sprintId: props.task.sprintId || "",
        parentTaskId: props.task.parentTaskId || "",
      };
      if (props.task.projectId) {
        emit("projectChange", props.task.projectId);
        loadPossibleParents(props.task.projectId);
        loadProjectStatuses(props.task.projectId);
      }
    } else if (newVal) {
      isEdit.value = false;
      form.value = {
        title: "",
        description: "",
        projectId: "",
        status: "TODO",
        statusId: null,
        priority: "MEDIUM",
        startDate: "",
        dueDate: "",
        assigneeId: "",
        sprintId: "",
        parentTaskId: "",
      };
      projectStatuses.value = [];
    }
  },
  { immediate: true }
);

const close = () => {
  emit("update:modelValue", false);
};

const save = () => {
  if (formValid.value) {
    const data = {
      ...form.value,
      taskId: props.task?.taskId,
      file: file.value,
    };
    if (!data.sprintId) delete (data as any).sprintId;
    if (!data.assigneeId) delete (data as any).assigneeId;
    emit("save", data);
  }
};

// Parent Task Logic
import { taskService, type Task } from "@/services/task.service";
const possibleParents = ref<Task[]>([]);
const loadingParents = ref(false);

const loadPossibleParents = async (projectId: string) => {
  if (!projectId) {
    possibleParents.value = [];
    return;
  }
  loadingParents.value = true;
  try {
    const res = await taskService.getAll({ projectId, pageSize: 100 }); 
    possibleParents.value = res.data.filter(t => t.taskId !== props.task?.taskId);
  } catch (e) {
    console.error("Failed to load possible parents", e);
  } finally {
    loadingParents.value = false;
  }
};

watch(() => form.value.projectId, (newVal) => {
  if (newVal) loadPossibleParents(newVal);
});
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="920"
    persistent
  >
    <v-card class="task-modal rounded-xl overflow-hidden" elevation="12">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-content">
          <div class="header-icon">
            <v-icon :icon="isEdit ? 'mdi-file-document-edit' : 'mdi-file-document-plus'" size="26" />
          </div>
          <div class="header-text">
            <h2 class="header-title">{{ isEdit ? "Edit Task" : "Create New Task" }}</h2>
            <p class="header-subtitle">{{ isEdit ? "Update task details" : "Add a new task to your project" }}</p>
          </div>
        </div>
        <v-btn icon variant="text" size="small" @click="close" class="close-btn">
          <v-icon icon="mdi-close" />
        </v-btn>
      </div>

      <!-- Form Content -->
      <div class="modal-body">
        <v-form v-model="formValid" @submit.prevent="save">
          <div class="form-layout">
            <!-- Left Column: Main Content -->
            <div class="form-main">
              <!-- Title -->
              <div class="field-group">
                <label class="field-label">
                  <v-icon size="16">mdi-format-title</v-icon>
                  Task Title <span class="required">*</span>
                </label>
                <v-text-field
                  v-model="form.title"
                  placeholder="What needs to be done?"
                  :rules="[rules.required, rules.title]"
                  variant="outlined"
                  density="comfortable"
                  rounded="lg"
                  hide-details="auto"
                />
              </div>

              <!-- Description -->
              <div class="field-group">
                <label class="field-label">
                  <v-icon size="16">mdi-text-box-outline</v-icon>
                  Description
                </label>
                <div class="editor-wrapper">
                  <QuillEditor
                    v-model:content="form.description"
                    contentType="html"
                    theme="snow"
                    toolbar="essential"
                  />
                </div>
              </div>

              <!-- Attachment -->
              <div class="field-group">
                <label class="field-label">
                  <v-icon size="16">mdi-paperclip</v-icon>
                  Attachment
                </label>
                <v-file-input
                  v-model="file"
                  placeholder="Drop file or click to upload"
                  variant="outlined"
                  density="compact"
                  rounded="lg"
                  prepend-icon=""
                  prepend-inner-icon="mdi-cloud-upload-outline"
                  show-size
                  clearable
                  hide-details
                />
              </div>
            </div>

            <!-- Right Column: Meta Info -->
            <div class="form-sidebar">
              <div class="sidebar-card">
                <h4 class="sidebar-title">Task Details</h4>

                <!-- Project -->
                <div class="sidebar-field">
                  <label>Project <span class="required">*</span></label>
                  <v-select
                    v-model="form.projectId"
                    :items="projects"
                    item-title="name"
                    item-value="projectId"
                    placeholder="Select project"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="compact"
                    rounded="lg"
                    hide-details="auto"
                  />
                </div>

                <!-- Sprint -->
                <div class="sidebar-field">
                  <label>Sprint</label>
                  <v-select
                    v-model="form.sprintId"
                    :items="sprintOptions"
                    placeholder="Select sprint"
                    variant="outlined"
                    density="compact"
                    rounded="lg"
                    clearable
                    :disabled="!form.projectId"
                    hide-details
                  />
                </div>

                <!-- Assignee -->
                <div class="sidebar-field">
                  <label>Assignee</label>
                  <v-select
                    v-model="form.assigneeId"
                    :items="users"
                    item-title="fullName"
                    item-value="userId"
                    placeholder="Assign to..."
                    variant="outlined"
                    density="compact"
                    rounded="lg"
                    clearable
                    hide-details
                  />
                </div>

                <!-- Parent Task -->
                <div class="sidebar-field">
                  <label>Parent Task</label>
                  <v-autocomplete
                    v-model="form.parentTaskId"
                    :items="possibleParents"
                    item-title="title"
                    item-value="taskId"
                    placeholder="Select parent"
                    variant="outlined"
                    density="compact"
                    rounded="lg"
                    clearable
                    :loading="loadingParents"
                    :disabled="!form.projectId"
                    hide-details
                  />
                </div>

                <v-divider class="my-3" />

                <!-- Status -->
                <div class="sidebar-field">
                  <label>Status</label>
                  <v-select
                    v-model="form.status"
                    :items="statusOptions"
                    :loading="statusLoading"
                    variant="outlined"
                    density="compact"
                    rounded="lg"
                    hide-details
                  >
                    <template #item="{ item, props: itemProps }">
                      <v-list-item v-bind="itemProps">
                        <template #prepend v-if="item.raw.color">
                          <div class="status-dot" :style="{ backgroundColor: item.raw.color }" />
                        </template>
                      </v-list-item>
                    </template>
                  </v-select>
                </div>

                <!-- Priority -->
                <div class="sidebar-field">
                  <label>Priority</label>
                  <v-select
                    v-model="form.priority"
                    :items="priorityOptions"
                    variant="outlined"
                    density="compact"
                    rounded="lg"
                    hide-details
                  >
                    <template #item="{ item, props: itemProps }">
                      <v-list-item v-bind="itemProps">
                        <template #prepend>
                          <v-icon :icon="item.raw.icon" :color="item.raw.color" size="18" />
                        </template>
                      </v-list-item>
                    </template>
                  </v-select>
                </div>

                <!-- Due Date -->
                <div class="sidebar-field">
                  <label>Due Date</label>
                  <DatePickerField
                    v-model="form.dueDate"
                    placeholder="Select due date"
                  />
                </div>
              </div>
            </div>
          </div>
        </v-form>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <v-btn variant="text" @click="close" :disabled="loading" class="text-none">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="save"
          :loading="loading"
          :disabled="!formValid"
          class="text-none px-6 save-btn"
          rounded="lg"
        >
          <v-icon size="18" class="mr-1">{{ isEdit ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
          {{ isEdit ? "Save Changes" : "Create Task" }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.task-modal {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

/* Header */
.modal-header {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.header-text {
  color: white;
}

.header-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.header-subtitle {
  font-size: 0.8rem;
  opacity: 0.85;
  margin: 4px 0 0 0;
}

.close-btn {
  color: white;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Body */
.modal-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

.form-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}

/* Main Form */
.form-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.required {
  color: #f1184c;
}

.editor-wrapper {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.editor-wrapper:focus-within {
  border-color: #f1184c;
  box-shadow: 0 0 0 3px rgba(241, 24, 76, 0.1);
}

.editor-wrapper :deep(.ql-toolbar) {
  border: none;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
  padding: 8px 12px;
}

.editor-wrapper :deep(.ql-container) {
  border: none;
  font-size: 14px;
}

.editor-wrapper :deep(.ql-editor) {
  min-height: 140px;
  max-height: 140px;
  padding: 12px 16px;
}

/* Sidebar */
.form-sidebar {
  flex-shrink: 0;
}

.sidebar-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px;
}

.sidebar-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 16px 0;
}

.sidebar-field {
  margin-bottom: 14px;
}

.sidebar-field:last-child {
  margin-bottom: 0;
}

.sidebar-field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.sidebar-field :deep(.v-field) {
  background: white !important;
  border-radius: 10px !important;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}

/* Footer */
.modal-footer {
  padding: 16px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
  flex-shrink: 0;
}

.save-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%) !important;
  box-shadow: 0 4px 12px rgba(241, 24, 76, 0.3);
}

.save-btn:hover {
  box-shadow: 0 6px 16px rgba(241, 24, 76, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .form-layout {
    grid-template-columns: 1fr;
  }
  
  .form-sidebar {
    order: -1;
  }
}
</style>
