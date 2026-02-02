<script setup lang="ts">
import { ref, watch, computed } from "vue";
import DatePickerField from "@/components/DatePickerField.vue";
import { sprintTemplateService, type SprintTemplate } from "@/services/sprint-template.service";

defineOptions({
  name: "SprintModal",
});

const props = defineProps<{
  modelValue: boolean;
  projectId: string;
  projects?: any[];
  sprint?: {
    sprintId?: string;
    name?: string;
    sprintName?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    goal?: string;
  } | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", data: any): void;
  (e: "saveFromTemplate", projectId: string, templateId: string): void;
}>();

const isEdit = ref(false);
const formValid = ref(false);
const selectedTemplateId = ref<string | null>(null);
const templates = ref<SprintTemplate[]>([]);
const templatesLoading = ref(false);

const form = ref({
  projectId: "",
  sprintName: "",
  startDate: "",
  endDate: "",
  goal: "",
  status: "PLANNING",
});

const statusOptions = [
  { title: "Planning", value: "PLANNING" },
  { title: "Active", value: "ACTIVE" },
  { title: "Completed", value: "COMPLETED" },
];

const templateOptions = computed(() => {
  return templates.value.map(t => ({
    title: `${t.name} (${t.durationDays} days)`,
    value: t.templateId,
  }));
});

// Load templates when project changes
const loadTemplates = async (projectId: string) => {
  if (!projectId || !props.projects) return;
  
  const project = props.projects.find(p => p.projectId === projectId);
  if (!project?.departmentId) {
    templates.value = [];
    return;
  }
  
  templatesLoading.value = true;
  try {
    templates.value = await sprintTemplateService.getByDepartment(project.departmentId);
  } catch (e) {
    console.error("Failed to load sprint templates", e);
    templates.value = [];
  } finally {
    templatesLoading.value = false;
  }
};

// Apply template to form
const applyTemplate = (templateId: string | null) => {
  if (!templateId) return;
  
  const template = templates.value.find(t => t.templateId === templateId);
  if (!template) return;
  
  // Calculate dates
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + template.durationDays * 24 * 60 * 60 * 1000);
  
  // Generate sprint name from pattern
  const sprintName = template.namePattern?.replace('{number}', 'X') || template.name;
  
  form.value.sprintName = sprintName;
  form.value.goal = template.goalTemplate || "";
  form.value.startDate = startDate.toISOString().split('T')[0] || '';
  form.value.endDate = endDate.toISOString().split('T')[0] || '';
};

watch(() => form.value.projectId, (newId) => {
  if (newId && !isEdit.value) {
    loadTemplates(newId);
    selectedTemplateId.value = null;
  }
});

watch(selectedTemplateId, (newId) => {
  if (newId && !isEdit.value) {
    applyTemplate(newId);
  }
});

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.sprint) {
      isEdit.value = true;
      form.value = {
        projectId: props.sprint.projectId || props.projectId || "",
        sprintName: props.sprint.sprintName || props.sprint.name || "",
        startDate: props.sprint.startDate?.split("T")[0] || "",
        endDate: props.sprint.endDate?.split("T")[0] || "",
        goal: props.sprint.goal || "",
        status: props.sprint.status || "PLANNING",
      };
      templates.value = [];
      selectedTemplateId.value = null;
    } else if (val) {
      isEdit.value = false;
      resetForm();
      if (props.projectId) {
        loadTemplates(props.projectId);
      }
    }
  }
);

const resetForm = () => {
  form.value = {
    projectId: props.projectId || "",
    sprintName: "",
    startDate: "",
    endDate: "",
    goal: "",
    status: "PLANNING",
  };
  selectedTemplateId.value = null;
};

const close = () => {
  emit("update:modelValue", false);
};

const save = () => {
  if (formValid.value) {
    const data = {
      ...form.value,
      sprintId: props.sprint?.sprintId,
    };
    emit("save", data);
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="560"
    persistent
  >
    <v-card class="sprint-modal rounded-xl overflow-hidden" elevation="8">
      <!-- Header -->
      <div class="modal-header pa-5">
        <div class="d-flex align-center">
          <div class="header-icon mr-3">
            <v-icon :icon="isEdit ? 'mdi-run' : 'mdi-run-fast'" size="24" color="white" />
          </div>
          <div>
            <h2 class="text-h6 font-weight-bold text-white">
              {{ isEdit ? "Edit Sprint" : "Create New Sprint" }}
            </h2>
            <p class="text-caption text-white mt-1" style="opacity: 0.85;">
              {{ isEdit ? "Update sprint details" : "Add a new sprint to your project" }}
            </p>
          </div>
        </div>
        <v-btn icon variant="text" size="small" @click="close" class="close-btn">
          <v-icon icon="mdi-close" color="white" />
        </v-btn>
      </div>

      <!-- Form Content -->
      <v-card-text class="pa-5">
        <v-form ref="formRef" v-model="formValid" @submit.prevent="save">
          <!-- Project -->
          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-folder-outline</v-icon>
              Project <span class="text-error">*</span>
            </label>
            <v-select
              v-model="form.projectId"
              :items="projects"
              item-title="name"
              item-value="projectId"
              placeholder="Select project"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              :rules="[(v) => !!v || 'Project is required']"
              required
              :disabled="isEdit"
              hide-details="auto"
              class="mt-2"
            />
          </div>

          <!-- Template Selection (only for new sprints) -->
          <div v-if="!isEdit && templateOptions.length > 0" class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-file-document-outline</v-icon>
              Use Template
              <v-chip size="x-small" color="info" variant="tonal" class="ml-2">Optional</v-chip>
            </label>
            <v-select
              v-model="selectedTemplateId"
              :items="templateOptions"
              :loading="templatesLoading"
              placeholder="Select a template to auto-fill fields"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              clearable
              hide-details
              class="mt-2"
            >
              <template #prepend-inner>
                <v-icon size="18" color="primary">mdi-lightning-bolt</v-icon>
              </template>
            </v-select>
          </div>

          <!-- Sprint Name -->
          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-run-fast</v-icon>
              Sprint Name <span class="text-error">*</span>
            </label>
            <v-text-field
              v-model="form.sprintName"
              placeholder="e.g. Sprint 1"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              :rules="[(v) => !!v || 'Sprint name is required']"
              required
              hide-details="auto"
              class="mt-2"
            />
          </div>

          <!-- Sprint Goal -->
          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-target</v-icon>
              Sprint Goal
            </label>
            <v-textarea
              v-model="form.goal"
              placeholder="What do you want to achieve in this sprint?"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              rows="2"
              hide-details
              class="mt-2"
            />
          </div>

          <!-- Dates Row -->
          <v-row class="mb-3">
            <v-col cols="12" sm="6">
              <div class="form-section">
                <label class="form-label">
                  <v-icon size="16" class="mr-1">mdi-calendar-start</v-icon>
                  Start Date
                </label>
                <DatePickerField
                  v-model="form.startDate"
                  placeholder="Select start date"
                  class="mt-2"
                />
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="form-section">
                <label class="form-label">
                  <v-icon size="16" class="mr-1">mdi-calendar-end</v-icon>
                  End Date
                </label>
                <DatePickerField
                  v-model="form.endDate"
                  placeholder="Select end date"
                  class="mt-2"
                />
              </div>
            </v-col>
          </v-row>

          <!-- Status -->
          <div class="form-section">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-flag-outline</v-icon>
              Status
            </label>
            <v-select
              v-model="form.status"
              :items="statusOptions"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details
              class="mt-2"
            />
          </div>
        </v-form>
      </v-card-text>

      <!-- Footer Actions -->
      <v-divider />
      <v-card-actions class="pa-5 bg-grey-lighten-5">
        <v-spacer />
        <v-btn variant="outlined" @click="close" class="text-none px-5" rounded="lg">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="save"
          :disabled="!formValid"
          class="text-none px-6 ml-3"
          rounded="lg"
          elevation="2"
        >
          <v-icon size="18" class="mr-1">{{ isEdit ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
          {{ isEdit ? "Save Changes" : "Create Sprint" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.sprint-modal {
  border: none;
}

.modal-header {
  background: linear-gradient(135deg, #f1184c 0%, #d11543 100%);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.form-label {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  letter-spacing: 0.01em;
}

.form-section :deep(.v-field) {
  border-radius: 10px !important;
}

.form-section :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(241, 24, 76, 0.15);
}
</style>
