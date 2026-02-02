<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import DatePickerField from "@/components/DatePickerField.vue";
import { departmentService, type Department } from "@/services/department.service";
import { teamService, type Team } from "@/services/team.service";

defineOptions({
  name: "ProjectModal",
});

const props = defineProps<{
  modelValue: boolean;
  project?: {
    projectId?: string;
    name?: string;
    description?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    teamId?: string;
  } | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", data: any): void;
}>();

const isEdit = ref(false);
const formValid = ref(false);

const departments = ref<Department[]>([]);
const teams = ref<Team[]>([]);

onMounted(async () => {
  try {
    const deptResult = await departmentService.getAll({ isActive: true });
    departments.value = deptResult.data;
  } catch (e) {
    console.error("Failed to fetch departments", e);
  }
  try {
    teams.value = await teamService.getAll();
  } catch (e) {
    console.error("Failed to fetch teams", e);
  }
});

const form = ref({
  projectName: "",
  description: "",
  status: "active",
  startDate: "",
  endDate: "",
  departmentId: "",
  teamId: "",
});

const statusOptions = [
  { title: "Active", value: "active" },
  { title: "On Hold", value: "on_hold" },
  { title: "Completed", value: "completed" },
  { title: "Archived", value: "archived" },
];

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.project) {
      isEdit.value = true;
      form.value = {
        projectName: props.project.name || "",
        description: props.project.description || "",
        status: props.project.status || "active",
        startDate: props.project.startDate?.split("T")[0] || "",
        endDate: props.project.endDate?.split("T")[0] || "",
        departmentId: props.project.departmentId || "",
        teamId: props.project.teamId || "",
      };
    } else if (val) {
      isEdit.value = false;
      resetForm();
    }
  }
);

const resetForm = () => {
  form.value = {
    projectName: "",
    description: "",
    status: "active",
    startDate: "",
    endDate: "",
    departmentId: "",
    teamId: "",
  };
};

const close = () => {
  emit("update:modelValue", false);
};

const save = () => {
  if (formValid.value) {
    const data: Record<string, any> = {
      projectName: form.value.projectName,
      description: form.value.description || undefined,
      startDate: form.value.startDate || undefined,
      endDate: form.value.endDate || undefined,
      departmentId: form.value.departmentId || undefined,
      teamId: form.value.teamId || undefined,
    };
    if (props.project?.projectId) {
      // For update, include projectId and optional status
      data.projectId = props.project.projectId;
      data.status = form.value.status;
    }
    emit("save", data);
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="640"
    persistent
  >
    <v-card class="project-modal rounded-xl d-flex flex-column" elevation="8" max-height="85vh">
      <!-- Header -->
      <div class="modal-header pa-5">
        <div class="d-flex align-center">
          <div class="header-icon mr-3">
            <v-icon :icon="isEdit ? 'mdi-folder-edit' : 'mdi-folder-plus'" size="24" color="white" />
          </div>
          <div>
            <h2 class="text-h6 font-weight-bold text-white">
              {{ isEdit ? "Edit Project" : "Create New Project" }}
            </h2>
            <p class="text-caption text-white-darken-2 mt-1" style="opacity: 0.85;">
              {{ isEdit ? "Update project details" : "Add a new project to your workspace" }}
            </p>
          </div>
        </div>
        <v-btn
          icon
          variant="text"
          size="small"
          @click="close"
          class="close-btn"
        >
          <v-icon icon="mdi-close" color="white" />
        </v-btn>
      </div>

      <!-- Form Content -->
      <v-card-text class="pa-5 overflow-y-auto">
        <v-form ref="formRef" v-model="formValid" @submit.prevent="save">
          <!-- Project Name -->
          <div class="form-section mb-5">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-folder-outline</v-icon>
              Project Name <span class="text-error">*</span>
            </label>
            <v-text-field
              v-model="form.projectName"
              placeholder="Enter project name"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              :rules="[(v) => !!v || 'Project name is required']"
              required
              hide-details="auto"
              class="mt-2"
            />
          </div>

          <!-- Department & Team Row -->
          <v-row class="mb-2">
            <v-col cols="12" sm="6">
              <div class="form-section">
                <label class="form-label">
                  <v-icon size="16" class="mr-1">mdi-domain</v-icon>
                  Department
                </label>
                <v-select
                  v-model="form.departmentId"
                  :items="departments"
                  item-title="name"
                  item-value="departmentId"
                  placeholder="Select department"
                  variant="outlined"
                  density="comfortable"
                  rounded="lg"
                  clearable
                  hide-details
                  class="mt-2"
                >
                  <template #prepend-inner>
                    <v-icon size="18" color="grey">mdi-briefcase-outline</v-icon>
                  </template>
                </v-select>
              </div>
            </v-col>

            <v-col cols="12" sm="6">
              <div class="form-section">
                <label class="form-label">
                  <v-icon size="16" class="mr-1">mdi-account-group-outline</v-icon>
                  Team
                </label>
                <v-select
                  v-model="form.teamId"
                  :items="teams"
                  item-title="teamName"
                  item-value="teamId"
                  placeholder="Select team"
                  variant="outlined"
                  density="comfortable"
                  rounded="lg"
                  clearable
                  hide-details
                  class="mt-2"
                >
                  <template #prepend-inner>
                    <v-icon size="18" color="grey">mdi-account-multiple-outline</v-icon>
                  </template>
                </v-select>
              </div>
            </v-col>
          </v-row>

          <!-- Description -->
          <div class="form-section mb-5">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-text-box-outline</v-icon>
              Description
            </label>
            <v-textarea
              v-model="form.description"
              placeholder="Enter project description"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              auto-grow
              rows="4"
              max-rows="8"
              hide-details="auto"
              class="mt-2"
            />
          </div>

          <!-- Status (Edit only) -->
          <div class="form-section mb-5" v-if="isEdit">
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
            >
              <template #prepend-inner>
                <v-icon size="18" color="grey">mdi-circle</v-icon>
              </template>
            </v-select>
          </div>

          <!-- Dates Row -->
          <v-row>
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
        </v-form>
      </v-card-text>

      <!-- Footer Actions -->
      <v-divider />
      <v-card-actions class="pa-5 bg-grey-lighten-5">
        <v-spacer />
        <v-btn
          variant="outlined"
          @click="close"
          class="text-none px-5"
          rounded="lg"
        >
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
          {{ isEdit ? "Save Changes" : "Create Project" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.project-modal {
  border: none;
}

.modal-header {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
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

