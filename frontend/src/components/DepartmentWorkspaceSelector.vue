<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { departmentService, type Department } from '@/services/department.service'
import { workspaceService, type Workspace } from '@/services/workspace.service'
import { statusService, type TaskStatus } from '@/services/status.service'

const props = defineProps<{
  departmentId?: string | null
  workspaceId?: string | null
  statusId?: string | null
  showStatus?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:departmentId', value: string | null): void
  (e: 'update:workspaceId', value: string | null): void
  (e: 'update:statusId', value: string | null): void
  (e: 'statusesLoaded', value: TaskStatus[]): void
}>()

// State
const departments = ref<Department[]>([])
const workspaces = ref<Workspace[]>([])
const statuses = ref<TaskStatus[]>([])
const loading = ref({
  departments: false,
  workspaces: false,
  statuses: false,
})

// Selected values (local copies for v-model)
const selectedDepartment = ref<string | null>(props.departmentId || null)
const selectedWorkspace = ref<string | null>(props.workspaceId || null)
const selectedStatus = ref<string | null>(props.statusId || null)

// Load departments on mount
onMounted(async () => {
  loading.value.departments = true
  try {
    const result = await departmentService.getAll({ isActive: true })
    departments.value = result.data
  } catch (error) {
    console.error('Failed to load departments', error)
  } finally {
    loading.value.departments = false
  }

  // If department is already selected, load its workspaces
  if (selectedDepartment.value) {
    await loadWorkspaces(selectedDepartment.value)
  }
})

// Load workspaces when department changes
const loadWorkspaces = async (departmentId: string) => {
  loading.value.workspaces = true
  try {
    // Get workspaces filtered by department
    const result = await workspaceService.getAll({ departmentId })
    workspaces.value = result
  } catch (error) {
    console.error('Failed to load workspaces', error)
    workspaces.value = []
  } finally {
    loading.value.workspaces = false
  }
}

// Load statuses when workspace changes
const loadStatuses = async (workspaceId: string) => {
  // Statuses are now project-based, not workspace-based.
  // This component needs refactoring if it is to support status selection again.
  statuses.value = []
}

// Watch department changes
watch(selectedDepartment, async (newVal, oldVal) => {
  if (newVal !== oldVal) {
    emit('update:departmentId', newVal)
    // Reset workspace and status when department changes
    selectedWorkspace.value = null
    selectedStatus.value = null
    emit('update:workspaceId', null)
    emit('update:statusId', null)
    statuses.value = []
    
    if (newVal) {
      await loadWorkspaces(newVal)
    } else {
      workspaces.value = []
    }
  }
})

// Watch workspace changes
watch(selectedWorkspace, async (newVal, oldVal) => {
  if (newVal !== oldVal) {
    emit('update:workspaceId', newVal)
    // Reset status when workspace changes
    selectedStatus.value = null
    emit('update:statusId', null)
    
    if (newVal && props.showStatus) {
      await loadStatuses(newVal)
    } else {
      statuses.value = []
    }
  }
})

// Watch status changes
watch(selectedStatus, (newVal) => {
  emit('update:statusId', newVal)
})

// Watch for external prop changes
watch(() => props.departmentId, (newVal) => {
  if (newVal !== selectedDepartment.value) {
    selectedDepartment.value = newVal || null
  }
})

watch(() => props.workspaceId, (newVal) => {
  if (newVal !== selectedWorkspace.value) {
    selectedWorkspace.value = newVal || null
  }
})

watch(() => props.statusId, (newVal) => {
  if (newVal !== selectedStatus.value) {
    selectedStatus.value = newVal || null
  }
})

// Computed options for selects
const departmentOptions = computed(() =>
  departments.value.map(d => ({ title: d.name, value: d.departmentId, subtitle: d.code }))
)

const workspaceOptions = computed(() =>
  workspaces.value.map(w => ({ title: w.name, value: w.workspaceId }))
)

const statusOptions = computed(() =>
  statuses.value.map(s => ({
    title: s.name,
    value: s.statusId,
    color: s.color,
  }))
)
</script>

<template>
  <div class="workflow-scope-selector">
    <!-- Department Row -->
    <div class="scope-row">
      <div class="scope-icon-wrapper department-icon">
        <v-icon icon="mdi-domain" size="16" />
      </div>
      <div class="scope-field-wrapper">
        <v-select
          v-model="selectedDepartment"
          :items="departmentOptions"
          :loading="loading.departments"
          :disabled="disabled"
          placeholder="Select department..."
          item-title="title"
          item-value="value"
          variant="outlined"
          density="compact"
          rounded="lg"
          bg-color="white"
          clearable
          hide-details
          class="scope-select"
        >
          <template #prepend-inner>
            <v-icon icon="mdi-office-building-outline" size="16" class="text-grey-darken-1" />
          </template>
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps" class="scope-list-item">
              <template #prepend>
                <v-avatar size="28" color="primary" variant="tonal" class="mr-2">
                  <span class="text-caption font-weight-bold">{{ item.raw.title?.charAt(0) }}</span>
                </v-avatar>
              </template>
              <template #subtitle>
                <span class="text-caption text-grey">{{ item.raw.subtitle }}</span>
              </template>
            </v-list-item>
          </template>
          <template #selection="{ item }">
            <div class="d-flex align-center gap-2">
              <v-avatar size="20" color="primary" variant="tonal">
                <span style="font-size: 10px; font-weight: 600;">{{ item.title?.charAt(0) }}</span>
              </v-avatar>
              <span class="text-body-2">{{ item.title }}</span>
            </div>
          </template>
        </v-select>
      </div>
    </div>

    <!-- Workflow Row -->
    <div class="scope-row" :class="{ 'is-disabled': !selectedDepartment }">
      <div class="scope-icon-wrapper workflow-icon" :class="{ 'icon-disabled': !selectedDepartment }">
        <v-icon icon="mdi-sitemap-outline" size="16" />
      </div>
      <div class="scope-field-wrapper">
        <v-select
          v-model="selectedWorkspace"
          :items="workspaceOptions"
          :loading="loading.workspaces"
          :disabled="disabled || !selectedDepartment"
          placeholder="Select workflow..."
          item-title="title"
          item-value="value"
          variant="outlined"
          density="compact"
          rounded="lg"
          bg-color="white"
          clearable
          hide-details
          class="scope-select"
          :hint="!selectedDepartment ? 'Select a department first' : ''"
        >
          <template #prepend-inner>
            <v-icon icon="mdi-source-branch" size="16" class="text-grey-darken-1" />
          </template>
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps" class="scope-list-item">
              <template #prepend>
                <v-icon icon="mdi-source-branch" size="18" color="teal" class="mr-2" />
              </template>
            </v-list-item>
          </template>
          <template #selection="{ item }">
            <div class="d-flex align-center gap-2">
              <v-icon icon="mdi-source-branch" size="16" color="teal" />
              <span class="text-body-2">{{ item.title }}</span>
            </div>
          </template>
          <template #no-data>
            <div class="pa-3 text-center text-grey">
              <v-icon icon="mdi-information-outline" size="18" class="mb-1" />
              <div class="text-caption">{{ selectedDepartment ? 'No workflows found' : 'Select a department first' }}</div>
            </div>
          </template>
        </v-select>
      </div>
    </div>

    <!-- Status Row (optional) -->
    <div v-if="showStatus" class="scope-row" :class="{ 'is-disabled': !selectedWorkspace }">
      <div class="scope-icon-wrapper status-icon" :class="{ 'icon-disabled': !selectedWorkspace }">
        <v-icon icon="mdi-flag-variant-outline" size="16" />
      </div>
      <div class="scope-field-wrapper">
        <v-select
          v-model="selectedStatus"
          :items="statusOptions"
          :loading="loading.statuses"
          :disabled="disabled || !selectedWorkspace"
          placeholder="Select status..."
          item-title="title"
          item-value="value"
          variant="outlined"
          density="compact"
          rounded="lg"
          bg-color="white"
          clearable
          hide-details
          class="scope-select"
        >
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps">
              <template #prepend>
                <div class="status-dot" :style="{ backgroundColor: item.raw.color }" />
              </template>
            </v-list-item>
          </template>
          <template #selection="{ item }">
            <div class="d-flex align-center gap-2">
              <div class="status-dot" :style="{ backgroundColor: item.raw.color }" />
              <span class="text-body-2">{{ item.title }}</span>
            </div>
          </template>
        </v-select>
      </div>
    </div>

    <!-- Helper text -->
    <div v-if="!selectedDepartment" class="helper-text">
      <v-icon icon="mdi-information-outline" size="14" class="mr-1" />
      Select a department to see available workflows
    </div>
  </div>
</template>

<style scoped>
.workflow-scope-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.03) 0%, rgba(6, 182, 212, 0.03) 100%);
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.scope-row {
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.2s ease;
}

.scope-row.is-disabled {
  opacity: 0.5;
}

.scope-icon-wrapper {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.department-icon {
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.15) 0%, rgba(241, 24, 76, 0.08) 100%);
  color: #f1184c;
}

.workflow-icon {
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(20, 184, 166, 0.08) 100%);
  color: #14b8a6;
}

.status-icon {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%);
  color: #3b82f6;
}

.icon-disabled {
  background: #f1f5f9 !important;
  color: #94a3b8 !important;
}

.scope-field-wrapper {
  flex: 1;
}

.scope-select {
  width: 100%;
}

.scope-select :deep(.v-field) {
  border-radius: 10px !important;
  font-size: 0.875rem;
}

.scope-select :deep(.v-field__input) {
  padding-top: 6px;
  padding-bottom: 6px;
}

.scope-list-item {
  border-radius: 8px;
  margin: 2px 4px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
}

.helper-text {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #94a3b8;
  padding-left: 42px;
  margin-top: 4px;
}
</style>
