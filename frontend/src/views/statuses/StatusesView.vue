<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import {
  useStatusManagement,
  type StatusScope,
} from "@/composables/useStatusManagement";
import { statusService, type TaskStatus } from "@/services/status.service";
import { projectService, type Project } from "@/services/project.service";
import {
  departmentService,
  type Department,
} from "@/services/department.service";
import { useSnackbar } from "@/composables/useSnackbar";
import StatusModal from "@/components/modals/StatusModal.vue";
import ConfirmDialog from "@/components/modals/ConfirmDialog.vue";
import Sortable from "sortablejs";

// ============================================================================
// COMPOSABLES
// ============================================================================

const snackbar = useSnackbar();
const {
  statuses,
  scope,
  selectedProjectId,
  selectedDepartmentId,
  loading,
  saving,
  error,
  loadStatuses,
  updateStatus,
  deleteStatus,
  reorderStatuses,
  initializeDefaults,
} = useStatusManagement();

// ============================================================================
// STATE
// ============================================================================

type ViewMode = "grid" | "list";

const projects = ref<Project[]>([]);
const departments = ref<Department[]>([]);
const viewMode = ref<ViewMode>("grid");
const searchQuery = ref("");
const showModal = ref(false);
const showDeleteDialog = ref(false);
const selectedStatus = ref<TaskStatus | null>(null);
const listRef = ref<HTMLElement | null>(null);
let sortableInstance: Sortable | null = null;

// ============================================================================
// COMPUTED
// ============================================================================

const filteredStatuses = computed(() => {
  if (!searchQuery.value.trim()) return statuses.value;
  const query = searchQuery.value.toLowerCase();
  return statuses.value.filter(
    (s) =>
      s.name.toLowerCase().includes(query) ||
      s.code.toLowerCase().includes(query),
  );
});

const hasSelection = computed(
  () =>
    (scope.value === "project" && selectedProjectId.value) ||
    (scope.value === "department" && selectedDepartmentId.value),
);

/** Get project name by ID */
const getProjectName = (projectId: string | null): string => {
  if (!projectId) return "No Project";
  const project = projects.value.find((p) => p.projectId === projectId);
  return project?.name || "Unknown Project";
};

// ============================================================================
// DATA LOADING
// ============================================================================

const loadProjects = async () => {
  try {
    projects.value = await projectService.getAll();
    if (projects.value.length > 0 && !selectedProjectId.value) {
      selectedProjectId.value = projects.value[0]!.projectId;
    }
  } catch (e) {
    snackbar.error("Failed to load projects");
  }
};

const loadDepartments = async () => {
  try {
    const result = await departmentService.getAll({ pageSize: 100 });
    departments.value = result.data;
  } catch (e) {
    console.error(e);
    snackbar.error("Failed to load departments");
  }
};

// ============================================================================
// SORTABLE (List View Only)
// ============================================================================

const initSortable = async () => {
  await nextTick();
  if (!listRef.value || viewMode.value !== "list") return;
  if (sortableInstance) sortableInstance.destroy();

  sortableInstance = Sortable.create(listRef.value, {
    handle: ".drag-handle",
    animation: 200,
    ghostClass: "sortable-ghost",
    onEnd: async (evt) => {
      if (evt.oldIndex !== undefined && evt.newIndex !== undefined) {
        const [item] = statuses.value.splice(evt.oldIndex, 1);
        if (item) {
          statuses.value.splice(evt.newIndex, 0, item);
        }
        try {
          await reorderStatuses(statuses.value.map((s) => s.statusId));
          snackbar.success("Order updated");
        } catch (e) {
          snackbar.error("Failed to update order");
        }
      }
    },
  });
};

// ============================================================================
// MODAL HANDLERS
// ============================================================================

const openCreateModal = () => {
  selectedStatus.value = null;
  showModal.value = true;
};

const openEditModal = (status: TaskStatus) => {
  selectedStatus.value = { ...status };
  showModal.value = true;
};

const openDeleteDialog = (status: TaskStatus) => {
  selectedStatus.value = status;
  showDeleteDialog.value = true;
};

const handleSave = async (data: any) => {
  try {
    if (data.statusId) {
      await updateStatus(data.statusId, {
        name: data.name,
        color: data.color,
        isDefault: data.isDefault,
      });
      snackbar.success("Status updated successfully!");
    } else {
      await statusService.create({
        projectId: data.projectId,
        name: data.name,
        code: data.code,
        color: data.color,
        isDefault: data.isDefault,
      });
      snackbar.success("Status created successfully!");
      scope.value = "project";
      selectedProjectId.value = data.projectId;
      await loadStatuses();
    }
    showModal.value = false;
    initSortable();
  } catch (err: any) {
    snackbar.error(
      err.response?.data?.message || error.value || "Failed to save status",
    );
  }
};

const handleDelete = async () => {
  if (!selectedStatus.value) return;
  try {
    await deleteStatus(selectedStatus.value.statusId);
    snackbar.success("Status deleted successfully!");
    showDeleteDialog.value = false;
    initSortable();
  } catch (err: any) {
    snackbar.error(err.response?.data?.message || "Failed to delete status");
  }
};

const handleInitializeDefaults = async () => {
  try {
    await initializeDefaults();
    snackbar.success("Default statuses created!");
    initSortable();
  } catch (err: any) {
    snackbar.error(
      err.response?.data?.message || "Failed to initialize defaults",
    );
  }
};

// ============================================================================
// WATCHERS
// ============================================================================

watch([selectedProjectId, selectedDepartmentId, scope], async () => {
  try {
    await loadStatuses();
    initSortable();
  } catch (e) {
    /* Error handled in composable */
  }
});

watch(scope, (newScope) => {
  statuses.value.splice(0, statuses.value.length);
  if (
    newScope === "project" &&
    !selectedProjectId.value &&
    projects.value.length > 0
  ) {
    selectedProjectId.value = projects.value[0]!.projectId.toString();
  }
  if (
    newScope === "department" &&
    !selectedDepartmentId.value &&
    departments.value.length > 0
  ) {
    selectedDepartmentId.value = departments.value[0]!.departmentId.toString();
  }
});

watch(viewMode, () => {
  if (viewMode.value === "list") {
    initSortable();
  } else if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
});

// ============================================================================
// LIFECYCLE
// ============================================================================

onMounted(async () => {
  await Promise.all([loadProjects(), loadDepartments()]);
  if (selectedProjectId.value) {
    await loadStatuses();
  }
  initSortable();
});
</script>

<template>
  <div class="statuses-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-tag-multiple-outline" size="28" />
          </div>
          <div>
            <h1 class="page-title">Task Statuses</h1>
            <p class="page-subtitle">
              Manage workflow statuses for your projects
            </p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <v-select
          v-if="scope === 'project'"
          v-model="selectedProjectId"
          :items="projects"
          item-title="name"
          item-value="projectId"
          label="Project"
          variant="outlined"
          density="compact"
          hide-details
          rounded="lg"
          class="scope-select"
        />
        <v-select
          v-else
          v-model="selectedDepartmentId"
          :items="departments"
          item-title="name"
          item-value="departmentId"
          label="Department"
          variant="outlined"
          density="compact"
          hide-details
          rounded="lg"
          class="scope-select"
        />
        <v-btn
          class="add-btn"
          prepend-icon="mdi-plus"
          rounded="lg"
          size="default"
          elevation="0"
          @click="openCreateModal"
          >Add New</v-btn
        >
      </div>
    </div>

    <!-- Controls Bar -->
    <div class="controls-bar">
      <!-- View Toggle -->
      <div class="view-toggle-wrapper">
        <button
          class="view-toggle-btn"
          :class="{ active: viewMode === 'grid' }"
          @click="viewMode = 'grid'"
        >
          <v-icon size="18">mdi-view-grid</v-icon>
          Grid
        </button>
        <button
          class="view-toggle-btn"
          :class="{ active: viewMode === 'list' }"
          @click="viewMode = 'list'"
        >
          <v-icon size="18">mdi-format-list-bulleted</v-icon>
          List
        </button>
      </div>

      <!-- Scope Toggle -->
      <v-btn-toggle
        v-model="scope"
        mandatory
        rounded="lg"
        color="primary"
        variant="outlined"
        density="compact"
        class="scope-toggle"
      >
        <v-btn value="project" class="text-none">Project</v-btn>
        <v-btn value="department" class="text-none">Department</v-btn>
      </v-btn-toggle>

      <!-- Search -->
      <v-text-field
        v-model="searchQuery"
        placeholder="Search statuses..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        rounded="lg"
        class="search-field"
        clearable
      />
    </div>

    <!-- No Selection -->
    <div v-if="!hasSelection" class="empty-state-card">
      <v-icon icon="mdi-folder-open-outline" size="64" color="grey-lighten-1" />
      <h3>Select a {{ scope === "project" ? "Project" : "Department" }}</h3>
      <p>Choose a {{ scope }} above to manage its statuses</p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="loading-container">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="mt-4 text-grey">Loading statuses...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="statuses.length === 0" class="empty-state-card">
      <v-icon icon="mdi-tag-off-outline" size="64" color="grey-lighten-1" />
      <h3>No Statuses Found</h3>
      <p>Get started by creating your first status or initialize defaults</p>
      <div class="empty-actions">
        <v-btn
          variant="outlined"
          color="primary"
          @click="handleInitializeDefaults"
          :loading="loading"
        >
          <v-icon class="mr-1">mdi-wizard-hat</v-icon>
          Initialize Defaults
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateModal">
          Create Status
        </v-btn>
      </div>
    </div>

    <!-- Grid View -->
    <div v-else-if="viewMode === 'grid'" class="status-grid">
      <div
        v-for="status in filteredStatuses"
        :key="status.statusId"
        class="status-card"
      >
        <!-- Card Header with Color Bar -->
        <div
          class="card-color-bar"
          :style="{ backgroundColor: status.color }"
        ></div>

        <!-- Card Content -->
        <div class="card-content">
          <div class="card-header">
            <div
              class="status-color-dot"
              :style="{ backgroundColor: status.color }"
            ></div>
            <h3 class="card-title">{{ status.name }}</h3>
            <v-menu location="bottom end">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  variant="text"
                  size="x-small"
                  class="menu-btn"
                >
                  <v-icon>mdi-dots-horizontal</v-icon>
                </v-btn>
              </template>
              <v-list density="compact" class="actions-menu">
                <v-list-item
                  @click="openEditModal(status)"
                  :disabled="scope === 'project' && !status.projectId"
                >
                  <template #prepend
                    ><v-icon size="18">mdi-pencil-outline</v-icon></template
                  >
                  <v-list-item-title>Edit</v-list-item-title>
                </v-list-item>
                <v-list-item
                  @click="openDeleteDialog(status)"
                  :disabled="status.isDefault"
                  class="delete-item"
                >
                  <template #prepend
                    ><v-icon size="18">mdi-delete-outline</v-icon></template
                  >
                  <v-list-item-title>Delete</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>

          <div class="card-badges">
            <span class="code-chip">{{ status.code }}</span>
            <v-chip
              v-if="status.isDefault"
              size="x-small"
              color="primary"
              variant="tonal"
              class="default-tag"
            >
              Default
            </v-chip>
            <v-chip
              v-if="status.isTerminal"
              size="x-small"
              color="success"
              variant="tonal"
              class="terminal-tag"
            >
              Terminal
            </v-chip>
            <v-chip
              v-if="
                scope === 'project' && !status.projectId && status.departmentId
              "
              size="x-small"
              color="info"
              variant="tonal"
              >Inherited</v-chip
            >
          </div>

          <!-- Project Tag -->
          <div v-if="status.projectId" class="project-tag">
            <v-icon size="12" class="mr-1">mdi-folder-outline</v-icon>
            {{ getProjectName(status.projectId) }}
          </div>

          <div class="card-footer">
            <span class="sort-order">Order: {{ status.sortOrder + 1 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <v-card v-else class="status-list-card" rounded="xl" elevation="0">
      <div class="list-title-bar">
        <div class="title-bar-left">
          <v-icon icon="mdi-format-list-bulleted" size="18" class="mr-2" />
          <span class="title-bar-text">{{
            scope === "project" ? "Project Statuses" : "Department Statuses"
          }}</span>
          <span class="count-badge"
            >{{ filteredStatuses.length }} statuses</span
          >
        </div>
      </div>

      <div class="list-header">
        <div class="list-row header-row">
          <div class="list-cell cell-drag"></div>
          <div class="list-cell cell-color">Color</div>
          <div class="list-cell cell-name">Name</div>
          <div class="list-cell cell-code">Code</div>
          <div class="list-cell cell-project">Project</div>
          <div class="list-cell cell-flags">Flags</div>
          <div class="list-cell cell-actions">Actions</div>
        </div>
      </div>

      <div ref="listRef" class="list-body">
        <div
          v-for="(status, index) in filteredStatuses"
          :key="status.statusId"
          class="list-row data-row"
          :class="{ 'row-alt': index % 2 === 1 }"
        >
          <div class="list-cell cell-drag">
            <v-icon
              v-if="scope === 'department' || status.projectId"
              icon="mdi-drag"
              class="drag-handle"
              size="20"
            />
          </div>
          <div class="list-cell cell-color">
            <span
              class="color-circle"
              :style="{ backgroundColor: status.color }"
            ></span>
          </div>
          <div class="list-cell cell-name">
            <span class="status-name">{{ status.name }}</span>
          </div>
          <div class="list-cell cell-code">
            <code class="code-tag">{{ status.code }}</code>
          </div>
          <div class="list-cell cell-project">
            <span v-if="status.projectId" class="project-label">
              <v-icon size="12" class="mr-1">mdi-folder-outline</v-icon>
              {{ getProjectName(status.projectId) }}
            </span>
            <span v-else class="text-grey">—</span>
          </div>
          <div class="list-cell cell-flags">
            <v-chip
              v-if="status.isDefault"
              size="x-small"
              color="primary"
              variant="tonal"
              >Default</v-chip
            >
            <v-chip
              v-if="status.isTerminal"
              size="x-small"
              color="success"
              variant="tonal"
              class="ml-1"
              >Terminal</v-chip
            >
            <v-chip
              v-if="
                scope === 'project' && !status.projectId && status.departmentId
              "
              size="x-small"
              color="info"
              variant="tonal"
              class="ml-1"
              >Inherited</v-chip
            >
          </div>
          <div class="list-cell cell-actions">
            <div class="action-buttons">
              <v-btn
                icon
                variant="text"
                size="x-small"
                @click="openEditModal(status)"
                :disabled="scope === 'project' && !status.projectId"
                ><v-icon size="18">mdi-pencil-outline</v-icon></v-btn
              >
              <v-btn
                icon
                variant="text"
                size="x-small"
                @click="openDeleteDialog(status)"
                :disabled="status.isDefault"
                class="delete-action"
                ><v-icon size="18">mdi-delete-outline</v-icon></v-btn
              >
            </div>
          </div>
        </div>
      </div>
    </v-card>

    <!-- Modals -->
    <StatusModal
      v-model="showModal"
      :status="selectedStatus"
      :projects="projects"
      :initial-project-id="selectedProjectId"
      :loading="saving"
      @save="handleSave"
    />

    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Delete Status"
      :message="`Are you sure you want to delete '${selectedStatus?.name}'? This action cannot be undone.`"
      confirmText="Delete"
      confirmColor="error"
      :loading="saving"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.statuses-page {
  padding: 0;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.page-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin: 4px 0 0 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.scope-select {
  width: 260px;
}

.add-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%) !important;
  color: white !important;
  font-weight: 600;
  text-transform: none;
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.3);
}

/* Controls Bar */
.controls-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.view-toggle-wrapper {
  display: flex;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
}

.view-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-toggle-btn.active {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(241, 24, 76, 0.3);
}

.scope-toggle {
  border-radius: 12px;
}

.search-field {
  width: 160px;
  max-width: 160px;
  flex-shrink: 0;
}

/* Empty States */
.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  background: white;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  text-align: center;
}

.empty-state-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 16px 0 8px 0;
}

.empty-state-card p {
  color: #64748b;
  margin: 0 0 24px 0;
}

.empty-actions {
  display: flex;
  gap: 12px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
}

/* Grid View */
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.status-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: all 0.2s ease;
}

.status-card:hover {
  border-color: #f1184c;
  box-shadow: 0 8px 24px rgba(241, 24, 76, 0.12);
  transform: translateY(-2px);
}

.card-color-bar {
  height: 4px;
  width: 100%;
}

.card-content {
  padding: 16px 20px 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.status-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  flex: 1;
}

.menu-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.status-card:hover .menu-btn {
  opacity: 1;
}

.card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.code-chip {
  padding: 4px 10px;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  font-family: monospace;
  color: #475569;
}

.card-footer {
  font-size: 0.75rem;
  color: #94a3b8;
}

.actions-menu {
  min-width: 140px;
}

.delete-item {
  color: #ef4444 !important;
}

/* List View */
.status-list-card {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: white;
}

.list-title-bar {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  padding: 14px 24px;
  display: flex;
  align-items: center;
}

.title-bar-left {
  display: flex;
  align-items: center;
  color: white;
}

.title-bar-text {
  font-size: 0.9375rem;
  font-weight: 600;
}

.count-badge {
  margin-left: 12px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.list-header {
  background: #fafbfc;
  border-bottom: 1px solid #e2e8f0;
}

.list-row {
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.header-row {
  padding: 14px 24px;
}

.header-row .list-cell {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.list-body {
  min-height: 80px;
}

.data-row {
  padding: 14px 24px;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s ease;
}

.data-row:hover {
  background: rgba(241, 24, 76, 0.02);
}

.data-row:last-child {
  border-bottom: none;
}

.row-alt {
  background: #fafbfc;
}

.list-cell {
  display: flex;
  align-items: center;
}

.cell-drag {
  width: 40px;
  flex-shrink: 0;
}
.cell-color {
  width: 50px;
  flex-shrink: 0;
}
.cell-name {
  flex: 1;
  min-width: 120px;
}
.cell-code {
  width: 130px;
  flex-shrink: 0;
}
.cell-project {
  width: 160px;
  flex-shrink: 0;
}
.cell-flags {
  width: 180px;
  flex-shrink: 0;
}
.cell-actions {
  width: 80px;
  flex-shrink: 0;
  justify-content: flex-end;
}

.project-tag {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 8px;
}

.project-label {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  color: #475569;
}

.drag-handle {
  cursor: grab;
  color: #cbd5e1;
  opacity: 0;
  transition: opacity 0.15s;
}

.data-row:hover .drag-handle {
  opacity: 1;
  color: #94a3b8;
}

.color-circle {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.status-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1e293b;
}

.code-tag {
  padding: 5px 10px;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: monospace;
  color: #475569;
}

.action-buttons {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.data-row:hover .action-buttons {
  opacity: 1;
}

.delete-action:hover {
  color: #ef4444 !important;
}

.sortable-ghost {
  opacity: 0.4;
  background: rgba(241, 24, 76, 0.05);
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .controls-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .search-field {
    width: 100%;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
