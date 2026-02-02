<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { departmentService, type Department, type CreateDepartmentDto } from '@/services/department.service'
import { useSnackbar } from '@/composables/useSnackbar'

const snackbar = useSnackbar()

const departments = ref<Department[]>([])
const loading = ref(false)
const search = ref('')
const showActiveOnly = ref(true)

// Dialog state
const showDialog = ref(false)
const isEditing = ref(false)
const editingDepartment = ref<Department | null>(null)
const formLoading = ref(false)

const form = ref<CreateDepartmentDto>({
  name: '',
  code: '',
  description: '',
  isActive: true,
})

const loadDepartments = async () => {
  loading.value = true
  try {
    const result = await departmentService.getAll({
      search: search.value || undefined,
      isActive: showActiveOnly.value ? true : undefined,
    })
    departments.value = result.data
  } catch (error) {
    snackbar.error('Failed to load departments')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDepartments()
})

const filteredDepartments = computed(() => {
  if (!search.value) return departments.value
  const searchLower = search.value.toLowerCase()
  return departments.value.filter(
    d => d.name.toLowerCase().includes(searchLower) || d.code.toLowerCase().includes(searchLower)
  )
})

const openCreateDialog = () => {
  isEditing.value = false
  editingDepartment.value = null
  form.value = { name: '', code: '', description: '', isActive: true }
  showDialog.value = true
}

// Auto-generate code from name (only when creating, not editing)
watch(() => form.value.name, (newName) => {
  if (!isEditing.value && newName) {
    // Convert to uppercase, replace spaces with underscores, remove special chars
    form.value.code = newName
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z_]/g, '')
  }
})

const openEditDialog = (dept: Department) => {
  isEditing.value = true
  editingDepartment.value = dept
  form.value = {
    name: dept.name,
    code: dept.code,
    description: dept.description || '',
    isActive: dept.isActive,
  }
  showDialog.value = true
}

const handleSubmit = async () => {
  formLoading.value = true
  try {
    if (isEditing.value && editingDepartment.value) {
      await departmentService.update(editingDepartment.value.departmentId, form.value)
      snackbar.success('Department updated successfully')
    } else {
      await departmentService.create(form.value)
      snackbar.success('Department created successfully')
    }
    showDialog.value = false
    await loadDepartments()
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || 'Failed to save department')
  } finally {
    formLoading.value = false
  }
}

const handleDelete = async (dept: Department) => {
  if (!confirm(`Are you sure you want to delete "${dept.name}"?`)) return
  
  try {
    await departmentService.delete(dept.departmentId)
    snackbar.success('Department deleted successfully')
    await loadDepartments()
  } catch (error) {
    snackbar.error('Failed to delete department')
  }
}

const toggleActive = async (dept: Department) => {
  try {
    await departmentService.update(dept.departmentId, { isActive: !dept.isActive })
    snackbar.success(`Department ${dept.isActive ? 'deactivated' : 'activated'}`)
    await loadDepartments()
  } catch (error) {
    snackbar.error('Failed to update department')
  }
}
</script>

<template>
  <div class="departments-view">
    <!-- Page Header - Single Row -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="header-icon">
            <v-icon icon="mdi-domain" size="28" />
          </div>
          <div>
            <h1 class="page-title">Departments</h1>
            <p class="page-subtitle">Manage organizational departments and workflows</p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search departments..."
          hide-details
          density="compact"
          variant="outlined"
          class="search-field"
          rounded="lg"
          @update:model-value="loadDepartments"
        />
        <v-switch
          v-model="showActiveOnly"
          label="Active only"
          hide-details
          color="primary"
          density="compact"
          @update:model-value="loadDepartments"
        />
        <v-btn
          class="add-btn"
          prepend-icon="mdi-plus"
          rounded="lg"
          @click="openCreateDialog"
          elevation="0"
        >Add Department</v-btn>
      </div>
    </div>

    <!-- Departments Table -->
    <v-card class="departments-table rounded-xl" elevation="0">
      <!-- Table Header Bar -->
      <div class="table-header-bar">
        <div class="table-header-left">
          <div class="table-header-icon">
            <v-icon icon="mdi-domain" size="16" color="white" />
          </div>
          <span class="table-header-title">Department List</span>
          <span class="table-header-count">{{ filteredDepartments.length }} departments</span>
        </div>
      </div>

      <v-data-table
        :items="filteredDepartments"
        :loading="loading"
        :headers="[
          { title: 'Name', key: 'name', width: '200px' },
          { title: 'Code', key: 'code', width: '120px' },
          { title: 'Description', key: 'description' },
          { title: 'Users', key: 'userCount', width: '80px', align: 'center' },
          { title: 'Workflows', key: 'workspaceCount', width: '100px', align: 'center' },
          { title: 'Status', key: 'isActive', width: '100px', align: 'center' },
          { title: 'Actions', key: 'actions', width: '120px', align: 'center', sortable: false },
        ]"
        item-value="departmentId"
        class="departments-data-table"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center">
            <v-avatar size="32" color="primary" variant="tonal" class="mr-3">
              <span class="text-caption font-weight-bold">{{ item.name.charAt(0) }}</span>
            </v-avatar>
            <span class="font-weight-medium">{{ item.name }}</span>
          </div>
        </template>

        <template #item.code="{ item }">
          <v-chip size="small" variant="outlined" color="grey-darken-2">
            {{ item.code }}
          </v-chip>
        </template>

        <template #item.description="{ item }">
          <span class="text-grey-darken-1 text-truncate" style="max-width: 300px; display: block;">
            {{ item.description || '-' }}
          </span>
        </template>

        <template #item.userCount="{ item }">
          <span class="text-body-2">{{ item.userCount || 0 }}</span>
        </template>

        <template #item.workspaceCount="{ item }">
          <span class="text-body-2">{{ item.workspaceCount || 0 }}</span>
        </template>

        <template #item.isActive="{ item }">
          <v-chip 
            :color="item.isActive ? 'success' : 'grey'" 
            size="small"
            variant="tonal"
          >
            {{ item.isActive ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-center" style="gap: 4px;">
            <v-btn
              icon
              variant="text"
              size="small"
              color="primary"
              @click="openEditDialog(item)"
            >
              <v-icon size="small">mdi-pencil-outline</v-icon>
              <v-tooltip activator="parent" location="top">Edit</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              :color="item.isActive ? 'warning' : 'success'"
              @click="toggleActive(item)"
            >
              <v-icon size="small">{{ item.isActive ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
              <v-tooltip activator="parent" location="top">{{ item.isActive ? 'Deactivate' : 'Activate' }}</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              color="error"
              @click="handleDelete(item)"
            >
              <v-icon size="small">mdi-delete-outline</v-icon>
              <v-tooltip activator="parent" location="top">Delete</v-tooltip>
            </v-btn>
          </div>
        </template>

        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-domain" size="48" color="grey-lighten-1" class="mb-2" />
            <h3 class="text-h6 mb-2">No Departments Found</h3>
            <p class="text-grey mb-4">Create your first department to organize workflows</p>
            <v-btn color="primary" @click="openCreateDialog">Create Department</v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="540" persistent>
      <v-card class="department-modal rounded-xl overflow-hidden" elevation="8">
        <!-- Gradient Header -->
        <div class="modal-header pa-5">
          <div class="d-flex align-center">
            <div class="header-icon-modal mr-3">
              <v-icon :icon="isEditing ? 'mdi-domain' : 'mdi-domain'" size="24" color="white" />
            </div>
            <div>
              <h2 class="text-h6 font-weight-bold text-white">
                {{ isEditing ? 'Edit Department' : 'Create New Department' }}
              </h2>
              <p class="text-caption text-white mt-1" style="opacity: 0.85;">
                {{ isEditing ? 'Update department details' : 'Add a new department to organize workflows' }}
              </p>
            </div>
          </div>
          <v-btn icon variant="text" size="small" @click="showDialog = false" class="close-btn">
            <v-icon icon="mdi-close" color="white" />
          </v-btn>
        </div>

        <!-- Form Content -->
        <v-card-text class="pa-5">
          <v-form @submit.prevent="handleSubmit">
            <!-- Department Name -->
            <div class="form-section mb-4">
              <label class="form-label">
                <v-icon size="16" class="mr-1">mdi-office-building-outline</v-icon>
                Department Name <span class="text-error">*</span>
              </label>
              <v-text-field
                v-model="form.name"
                placeholder="e.g., Finance, Engineering"
                :rules="[v => !!v || 'Name is required']"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                hide-details="auto"
                class="mt-2"
              />
            </div>

            <!-- Code -->
            <div class="form-section mb-4">
              <label class="form-label">
                <v-icon size="16" class="mr-1">mdi-code-tags</v-icon>
                Code <span class="text-error">*</span>
              </label>
              <v-text-field
                v-model="form.code"
                placeholder="e.g., FINANCE, ENG"
                :rules="[
                  v => !!v || 'Code is required',
                  v => /^[A-Z_]+$/.test(v) || 'Use uppercase letters and underscores only'
                ]"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                hide-details="auto"
                class="mt-2"
                @update:model-value="form.code = form.code.toUpperCase().replace(/[^A-Z_]/g, '')"
              />
            </div>

            <!-- Description -->
            <div class="form-section mb-4">
              <label class="form-label">
                <v-icon size="16" class="mr-1">mdi-text-box-outline</v-icon>
                Description
              </label>
              <v-textarea
                v-model="form.description"
                placeholder="Brief description of this department"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                rows="2"
                hide-details
                class="mt-2"
              />
            </div>

            <!-- Active Status -->
            <div class="form-section">
              <label class="form-label mb-2">
                <v-icon size="16" class="mr-1">mdi-toggle-switch-outline</v-icon>
                Status
              </label>
              <v-switch
                v-model="form.isActive"
                :label="form.isActive ? 'Active' : 'Inactive'"
                color="primary"
                hide-details
                inset
              />
            </div>
          </v-form>
        </v-card-text>

        <!-- Footer Actions -->
        <v-divider />
        <v-card-actions class="pa-5 bg-grey-lighten-5">
          <v-spacer />
          <v-btn variant="outlined" @click="showDialog = false" :disabled="formLoading" class="text-none px-5" rounded="lg">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="handleSubmit"
            :loading="formLoading"
            class="text-none px-6 ml-3"
            rounded="lg"
            elevation="2"
          >
            <v-icon size="18" class="mr-1">{{ isEditing ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
            {{ isEditing ? 'Save Changes' : 'Create Department' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.departments-view {
  max-width: 1200px;
  padding: 4px;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 24px;
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

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.3);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-field {
  width: 220px;
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

.add-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%) !important;
  color: white !important;
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.3);
  font-weight: 600;
  text-transform: none;
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(241, 24, 76, 0.4);
}

/* Table Styles */
.departments-table {
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.table-header-bar {
  background: linear-gradient(135deg, #f1184c 0%, #f1184c 100%);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.table-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.table-header-icon {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-header-title {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.table-header-count {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.15);
  padding: 3px 8px;
  border-radius: 12px;
}

.departments-data-table {
  background: transparent;
}

.departments-data-table :deep(thead) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.departments-data-table :deep(th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.75rem !important;
  letter-spacing: 0.05em;
  color: #64748b !important;
  border-bottom: 2px solid #e2e8f0 !important;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

.departments-data-table :deep(td) {
  border-bottom: 1px solid #f1f5f9 !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.departments-data-table :deep(tr:hover) {
  background: rgba(var(--v-theme-primary), 0.04) !important;
}

.departments-data-table :deep(.v-data-table-footer) {
  border-top: 1px solid #e2e8f0;
  background: #fafbfc;
}

/* Modal Styles */
.department-modal {
  border: none;
}

.modal-header {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.header-icon-modal {
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
