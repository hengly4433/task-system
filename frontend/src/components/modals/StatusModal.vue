<script setup lang="ts">
import { ref, watch, computed } from 'vue';

defineOptions({
  name: 'StatusModal',
});

// ============================================================================
// TYPES
// ============================================================================

export interface StatusFormData {
  statusId?: string;
  name: string;
  code: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  projectId: string | null;
}

interface Project {
  projectId: string;
  projectName?: string;
  name?: string;
}

// ============================================================================
// PROPS & EMITS
// ============================================================================

const props = defineProps<{
  modelValue: boolean;
  status?: {
    statusId?: string;
    name?: string;
    code?: string;
    color?: string;
    sortOrder?: number;
    isDefault?: boolean;
    projectId?: string | null;
  } | null;
  projects: Project[];
  /** Pre-selected project ID (used when creating from context) */
  initialProjectId?: string | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', data: StatusFormData): void;
}>();

// ============================================================================
// STATE
// ============================================================================

const isEdit = ref(false);
const formValid = ref(false);

const form = ref({
  name: '',
  code: '',
  color: '#64748B',
  sortOrder: 0,
  isDefault: false,
  projectId: null as string | null,
});

// ============================================================================
// CONSTANTS
// ============================================================================

const colorPresets = [
  '#64748B', // Gray
  '#10B981', // Green
  '#FBBF24', // Yellow
  '#f1184c', // Brand Red
  '#F97316', // Orange
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

const rules = {
  required: (v: string) => !!v || 'This field is required',
  name: (v: string) => (v && v.length >= 2) || 'Name must be at least 2 characters',
  code: (v: string) => /^[A-Z][A-Z0-9_]*$/.test(v) || 'Code must be uppercase with underscores (e.g., IN_PROGRESS)',
  color: (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v) || 'Must be a valid hex color (e.g., #FF5733)',
  projectRequired: (v: string | null) => !!v || 'Please select a project',
};

// ============================================================================
// COMPUTED
// ============================================================================

const projectItems = computed(() => 
  props.projects.map(p => ({
    title: p.projectName || p.name || 'Unnamed Project',
    value: p.projectId,
  }))
);

const canSave = computed(() => formValid.value && !!form.value.projectId);

// ============================================================================
// METHODS
// ============================================================================

const autoGenerateCode = () => {
  if (!isEdit.value && form.value.name && !form.value.code) {
    form.value.code = form.value.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }
};

const close = () => {
  emit('update:modelValue', false);
};

const save = () => {
  if (canSave.value) {
    emit('save', {
      statusId: props.status?.statusId,
      name: form.value.name,
      code: form.value.code,
      color: form.value.color,
      sortOrder: form.value.sortOrder,
      isDefault: form.value.isDefault,
      projectId: form.value.projectId,
    });
  }
};

// ============================================================================
// WATCHERS
// ============================================================================

// Auto-generate code from name as user types (only in create mode)
watch(
  () => form.value.name,
  (newName) => {
    if (!isEdit.value && newName) {
      form.value.code = newName
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    }
  }
);

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && props.status?.statusId) {
      // Edit mode
      isEdit.value = true;
      form.value = {
        name: props.status.name || '',
        code: props.status.code || '',
        color: props.status.color || '#64748B',
        sortOrder: props.status.sortOrder || 0,
        isDefault: props.status.isDefault || false,
        projectId: props.status.projectId || null,
      };
    } else if (newVal) {
      // Create mode - use initial project from props
      isEdit.value = false;
      form.value = {
        name: '',
        code: '',
        color: '#64748B',
        sortOrder: 0,
        isDefault: false,
        projectId: props.initialProjectId || null,
      };
    }
  },
  { immediate: true }
);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="520"
    persistent
  >
    <v-card class="status-modal rounded-xl overflow-hidden" elevation="8">
      <!-- Header -->
      <div class="modal-header pa-5">
        <div class="d-flex align-center">
          <div class="header-icon mr-3">
            <v-icon :icon="isEdit ? 'mdi-tag-edit' : 'mdi-tag-plus'" size="24" color="white" />
          </div>
          <div>
            <h2 class="text-h6 font-weight-bold text-white">
              {{ isEdit ? 'Edit Status' : 'Create New Status' }}
            </h2>
            <p class="text-caption text-white mt-1" style="opacity: 0.85;">
              {{ isEdit ? 'Update status details' : 'Add a new task status' }}
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
          
          <!-- Project Selection -->
          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-view-dashboard</v-icon>
              Project <span class="text-error">*</span>
            </label>
            <v-select
              v-model="form.projectId"
              :items="projectItems"
              label="Select Project"
              :rules="[rules.projectRequired]"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details="auto"
              prepend-inner-icon="mdi-view-dashboard"
              class="mt-2"
              :disabled="isEdit"
            />
            <p v-if="!isEdit" class="text-caption text-grey mt-1">
              Status will be created for this project. Projects inherit department statuses by default.
            </p>
          </div>

          <v-divider class="mb-4" />

          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-format-title</v-icon>
              Status Name <span class="text-error">*</span>
            </label>
            <v-text-field
              v-model="form.name"
              placeholder="e.g., In Progress"
              :rules="[rules.required, rules.name]"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              autocomplete="off"
              hide-details="auto"
              class="mt-2"
              @blur="autoGenerateCode"
            />
          </div>

          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-tag</v-icon>
              Status Code <span class="text-error">*</span>
            </label>
            <v-text-field
              v-model="form.code"
              placeholder="e.g., IN_PROGRESS"
              :rules="[rules.required, rules.code]"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              autocomplete="off"
              hide-details="auto"
              class="mt-2"
              :disabled="isEdit"
              hint="Uppercase with underscores. Cannot be changed after creation."
              persistent-hint
            />
          </div>

          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-palette</v-icon>
              Color
            </label>
            <div class="color-picker-wrapper mt-2">
              <div class="color-presets">
                <div
                  v-for="color in colorPresets"
                  :key="color"
                  class="color-preset"
                  :class="{ active: form.color === color }"
                  :style="{ backgroundColor: color }"
                  @click="form.color = color"
                >
                  <v-icon v-if="form.color === color" icon="mdi-check" size="14" color="white" />
                </div>
              </div>
              <v-text-field
                v-model="form.color"
                :rules="[rules.color]"
                variant="outlined"
                density="compact"
                rounded="lg"
                autocomplete="off"
                hide-details="auto"
                class="mt-2"
                style="max-width: 120px;"
              >
                <template #prepend-inner>
                  <span class="color-preview" :style="{ backgroundColor: form.color }"></span>
                </template>
              </v-text-field>
            </div>
          </div>

          <div class="form-section">
            <v-checkbox
              v-model="form.isDefault"
              label="Set as default status for new tasks"
              density="compact"
              hide-details
              color="primary"
            />
          </div>
        </v-form>
      </v-card-text>

      <!-- Footer -->
      <v-divider />
      <v-card-actions class="pa-5 bg-grey-lighten-5">
        <v-spacer />
        <v-btn
          variant="outlined"
          @click="close"
          :disabled="loading"
          class="text-none px-5"
          rounded="lg"
        >Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="save"
          :loading="loading"
          :disabled="!canSave"
          class="text-none px-6 ml-3"
          rounded="lg"
          elevation="2"
        >
          <v-icon size="18" class="mr-1">{{ isEdit ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
          {{ isEdit ? 'Save Changes' : 'Create Status' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.status-modal {
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
}

.color-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-preset {
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

.color-preset:hover {
  transform: scale(1.1);
}

.color-preset.active {
  border-color: white;
  box-shadow: 0 0 0 2px #374151;
}

.color-preview {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: inline-block;
  margin-right: 4px;
}
</style>
