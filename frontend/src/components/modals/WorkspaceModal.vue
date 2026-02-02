<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  modelValue: boolean;
  workspace?: {
    workspaceId?: string;
    name?: string;
    description?: string;
  } | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", data: any): void;
}>();

const isEdit = ref(false);
const formValid = ref(false);

const form = ref({
  name: "",
  description: "",
});

const rules = {
  required: (v: string) => !!v || "This field is required",
  minLength: (min: number) => (v: string) =>
    (v && v.length >= min) || `Must be at least ${min} characters`,
};

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && props.workspace) {
      isEdit.value = !!props.workspace.workspaceId;
      form.value = {
        name: props.workspace.name || "",
        description: props.workspace.description || "",
      };
    } else if (newVal) {
      isEdit.value = false;
      form.value = {
        name: "",
        description: "",
      };
    }
  },
  { immediate: true }
);

const close = () => {
  emit("update:modelValue", false);
};

const save = () => {
  if (formValid.value) {
    emit("save", { ...form.value, workspaceId: props.workspace?.workspaceId });
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500"
    persistent
  >
    <v-card class="workspace-modal rounded-xl overflow-hidden" elevation="8">
      <!-- Header -->
      <div class="modal-header pa-5">
        <div class="d-flex align-center">
          <div class="header-icon mr-3">
            <v-icon :icon="isEdit ? 'mdi-folder-edit' : 'mdi-folder-plus'" size="24" color="white" />
          </div>
          <div>
            <h2 class="text-h6 font-weight-bold text-white">
              {{ isEdit ? "Edit Workspace" : "Create New Workspace" }}
            </h2>
            <p class="text-caption text-white mt-1" style="opacity: 0.85;">
              {{ isEdit ? "Update workspace details" : "Organize your projects in a workspace" }}
            </p>
          </div>
        </div>
        <v-btn icon variant="text" size="small" @click="close" class="close-btn">
          <v-icon icon="mdi-close" color="white" />
        </v-btn>
      </div>

      <!-- Form Content -->
      <v-card-text class="pa-5">
        <v-form v-model="formValid" @submit.prevent="save">
          <!-- Workspace Name -->
          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-folder-outline</v-icon>
              Workspace Name <span class="text-error">*</span>
            </label>
            <v-text-field
              v-model="form.name"
              placeholder="e.g. Marketing, Development"
              :rules="[rules.required, rules.minLength(2)]"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details="auto"
              class="mt-2"
            />
          </div>

          <!-- Description -->
          <div class="form-section">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-text-box-outline</v-icon>
              Description
            </label>
            <v-textarea
              v-model="form.description"
              placeholder="Describe what this workspace is for..."
              variant="outlined"
              density="comfortable"
              rounded="lg"
              rows="3"
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
        <v-btn variant="outlined" @click="close" :disabled="loading" class="text-none px-5" rounded="lg">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="save"
          :loading="loading"
          :disabled="!formValid"
          class="text-none px-6 ml-3"
          rounded="lg"
          elevation="2"
        >
          <v-icon size="18" class="mr-1">{{ isEdit ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
          {{ isEdit ? "Save Changes" : "Create Workspace" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.workspace-modal {
  border: none;
}

.modal-header {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
}
</style>

