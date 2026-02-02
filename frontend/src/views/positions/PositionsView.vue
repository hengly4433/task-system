<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  positionService,
  type Position,
  type CreatePositionDto,
} from "@/services/position.service";
import { useSnackbar } from "@/composables/useSnackbar";

const snackbar = useSnackbar();
const positions = ref<Position[]>([]);
const loading = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const editMode = ref(false);
const selectedPosition = ref<Position | null>(null);
const saving = ref(false);

// Pagination
const page = ref(1);
const itemsPerPage = ref(10);

const form = ref<CreatePositionDto>({
  positionName: "",
  description: "",
});

// Get row number based on pagination
const getRowNumber = (index: number) => {
  return (page.value - 1) * itemsPerPage.value + index + 1;
};

const headers = [
  { title: "No", key: "index", sortable: false, width: "70px" },
  { title: "Position Name", key: "positionName", sortable: true },
  { title: "Description", key: "description", sortable: false },
  { title: "Created", key: "createdAt", sortable: true, width: "140px" },
  { title: "Actions", key: "actions", sortable: false, align: "end" as const, width: "120px" },
];

onMounted(async () => {
  await loadPositions();
});

async function loadPositions() {
  loading.value = true;
  try {
    positions.value = await positionService.getAll();
  } catch (error) {
    snackbar.error("Failed to load positions");
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  editMode.value = false;
  selectedPosition.value = null;
  form.value = { positionName: "", description: "" };
  dialog.value = true;
}

function openEditDialog(position: Position) {
  editMode.value = true;
  selectedPosition.value = position;
  form.value = {
    positionName: position.positionName,
    description: position.description || "",
  };
  dialog.value = true;
}

function openDeleteDialog(position: Position) {
  selectedPosition.value = position;
  deleteDialog.value = true;
}

async function savePosition() {
  if (!form.value.positionName.trim()) {
    snackbar.error("Position name is required");
    return;
  }

  saving.value = true;
  try {
    if (editMode.value && selectedPosition.value) {
      await positionService.update(
        selectedPosition.value.positionId,
        form.value
      );
      snackbar.success("Position updated successfully");
    } else {
      await positionService.create(form.value);
      snackbar.success("Position created successfully");
    }
    dialog.value = false;
    await loadPositions();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to save position");
  } finally {
    saving.value = false;
  }
}

async function deletePosition() {
  if (!selectedPosition.value) return;

  saving.value = true;
  try {
    await positionService.delete(selectedPosition.value.positionId);
    snackbar.success("Position deleted successfully");
    deleteDialog.value = false;
    await loadPositions();
  } catch (error: any) {
    snackbar.error(
      error.response?.data?.message || "Failed to delete position"
    );
  } finally {
    saving.value = false;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}
</script>

<template>
  <div class="positions-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-briefcase-outline" size="28" />
          </div>
          <div>
            <h1 class="page-title">Positions</h1>
            <p class="page-subtitle">Manage job positions and titles</p>
          </div>
        </div>
      </div>
      <v-btn
        class="action-btn"
        prepend-icon="mdi-plus"
        @click="openCreateDialog"
        rounded="lg"
        elevation="0"
      >
        Add Position
      </v-btn>
    </div>

    <!-- Table Card -->
    <v-card class="rounded-xl table-card" elevation="0">
      <!-- Table Header Bar -->
      <div class="table-header-bar">
        <div class="table-header-left">
          <div class="table-header-icon">
            <v-icon icon="mdi-briefcase-outline" size="16" color="white" />
          </div>
          <span class="table-header-title">Position List</span>
          <span class="table-header-count">{{ positions.length }} positions</span>
        </div>
      </div>
      <v-data-table
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="positions"
        :loading="loading"
        item-value="positionId"
        class="positions-table"
        fixed-header
        height="400"
        hover
      >
        <template #item.index="{ index }">
          <span class="font-weight-medium text-grey-darken-2">{{ getRowNumber(index) }}</span>
        </template>

        <template #item.positionName="{ item }">
          <div class="d-flex align-center">
            <v-icon size="small" color="primary" class="mr-2">mdi-briefcase-outline</v-icon>
            <span class="font-weight-medium">{{ item.positionName }}</span>
          </div>
        </template>

        <template #item.description="{ item }">
          <span class="text-grey-darken-1">{{ item.description || "—" }}</span>
        </template>

        <template #item.createdAt="{ item }">
          <div class="d-flex align-center text-body-2">
            <v-icon size="small" color="grey" class="mr-2">mdi-calendar</v-icon>
            {{ formatDate(item.createdAt) }}
          </div>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-end" style="gap: 4px;">
            <v-btn
              icon
              variant="text"
              size="small"
              color="primary"
              @click="openEditDialog(item)"
            >
              <v-icon size="small">mdi-pencil-outline</v-icon>
              <v-tooltip activator="parent" location="top">Edit Position</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              color="error"
              @click="openDeleteDialog(item)"
            >
              <v-icon size="small">mdi-delete-outline</v-icon>
              <v-tooltip activator="parent" location="top">Delete Position</v-tooltip>
            </v-btn>
          </div>
        </template>

        <template #no-data>
          <div class="text-center py-10">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-briefcase-outline</v-icon>
            <p class="text-h6 text-grey-darken-1 mb-2">No positions found</p>
            <p class="text-body-2 text-grey mb-4">Create your first position to get started</p>
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="openCreateDialog"
            >
              Add First Position
            </v-btn>
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
        </template>
      </v-data-table>
    </v-card>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="520">
      <v-card class="position-modal rounded-xl overflow-hidden" elevation="8">
        <!-- Header -->
        <div class="modal-header pa-5">
          <div class="d-flex align-center">
            <div class="header-icon mr-3">
              <v-icon :icon="editMode ? 'mdi-briefcase-edit' : 'mdi-briefcase-plus'" size="24" color="white" />
            </div>
            <div>
              <h2 class="text-h6 font-weight-bold text-white">
                {{ editMode ? "Edit Position" : "Create New Position" }}
              </h2>
              <p class="text-caption text-white mt-1" style="opacity: 0.85;">
                {{ editMode ? "Update position details" : "Add a new job position" }}
              </p>
            </div>
          </div>
          <v-btn icon variant="text" size="small" @click="dialog = false" class="close-btn">
            <v-icon icon="mdi-close" color="white" />
          </v-btn>
        </div>

        <!-- Form Content -->
        <v-card-text class="pa-5">
          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-briefcase-outline</v-icon>
              Position Name <span class="text-error">*</span>
            </label>
            <v-text-field
              v-model="form.positionName"
              placeholder="e.g., Software Developer, QA Manager"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              autofocus
              hide-details
              class="mt-2"
            />
          </div>
          <div class="form-section">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-text-box-outline</v-icon>
              Description
            </label>
            <v-textarea
              v-model="form.description"
              placeholder="Optional description of this position"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              rows="3"
              hide-details
              class="mt-2"
            />
          </div>
        </v-card-text>

        <!-- Footer -->
        <v-divider />
        <v-card-actions class="pa-5 bg-grey-lighten-5">
          <v-spacer />
          <v-btn variant="outlined" @click="dialog = false" class="text-none px-5" rounded="lg">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="savePosition" class="text-none px-6 ml-3" rounded="lg" elevation="2">
            <v-icon size="18" class="mr-1">{{ editMode ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
            {{ editMode ? "Save Changes" : "Create Position" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card class="delete-modal rounded-xl overflow-hidden" elevation="8">
        <div class="delete-header pa-5">
          <div class="d-flex align-center">
            <div class="delete-icon mr-3">
              <v-icon icon="mdi-delete-alert" size="24" color="white" />
            </div>
            <div>
              <h2 class="text-h6 font-weight-bold text-white">Delete Position</h2>
              <p class="text-caption text-white mt-1" style="opacity: 0.85;">This action cannot be undone</p>
            </div>
          </div>
        </div>
        <v-card-text class="pa-5">
          <p class="text-body-1">
            Are you sure you want to delete the position
            <strong>{{ selectedPosition?.positionName }}</strong>?
          </p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-5 bg-grey-lighten-5">
          <v-spacer />
          <v-btn variant="outlined" @click="deleteDialog = false" class="text-none px-5" rounded="lg">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="saving" @click="deletePosition" class="text-none px-6 ml-3" rounded="lg" elevation="2">
            <v-icon size="18" class="mr-1">mdi-delete</v-icon>
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.positions-view {
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

.table-card {
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

.positions-table {
  background: transparent;
}

.positions-table :deep(thead) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.positions-table :deep(th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.75rem !important;
  letter-spacing: 0.05em;
  color: #64748b !important;
  border-bottom: 2px solid #e2e8f0 !important;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

.positions-table :deep(td) {
  border-bottom: 1px solid #f1f5f9 !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.positions-table :deep(tr:hover) {
  background: rgba(var(--v-theme-primary), 0.04) !important;
}

.positions-table :deep(.v-data-table-footer) {
  border-top: 1px solid #e2e8f0;
  background: #fafbfc;
}

.action-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  text-transform: none;
  padding: 0 20px;
  height: 42px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

/* Modal Styles */
.modal-header {
  background: linear-gradient(135deg, #ff6b8a 0%, #7c3aed 100%);
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

.form-section :deep(.v-field) {
  border-radius: 10px !important;
}

.delete-header {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  display: flex;
  align-items: center;
}

.delete-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
