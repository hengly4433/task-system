<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { projectService, type Project } from "@/services/project.service";
import { departmentService, type Department } from "@/services/department.service";
import { useSnackbar } from "@/composables/useSnackbar";
import ProjectModal from "@/components/modals/ProjectModal.vue";
import ConfirmDialog from "@/components/modals/ConfirmDialog.vue";

const snackbar = useSnackbar();

const viewMode = ref<"grid" | "list">("grid");
const categoryFilter = ref("");
const searchQuery = ref("");
const projects = ref<Project[]>([]);
const departments = ref<Department[]>([]);
const loading = ref(false);
const showProjectModal = ref(false);
const showDeleteDialog = ref(false);
const selectedProject = ref<any>(null);
const modalLoading = ref(false);

const boardColors = [
  "#10B981",
  "#FBBF24",
  "#f1184c",
  "#EC4899",
  "#F97316",
  "#ff6b8a",
  "#06B6D4",
  "#EF4444",
];

onMounted(async () => {
  await loadData();
});

const loadData = async () => {
  loading.value = true;
  try {
    projects.value = await projectService.getAll();
    const deptResult = await departmentService.getAll();
    departments.value = deptResult.data;
  } catch (error: any) {
    snackbar.error("Failed to load boards");
    projects.value = [];
    departments.value = [];
  } finally {
    loading.value = false;
  }
};

const filteredProjects = computed(() => {
  let result = projects.value;
  
  // Filter by department
  if (categoryFilter.value) {
    result = result.filter((p) => p.departmentId === categoryFilter.value);
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((p) => 
      p.name.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  }
  
  return result;
});

const getDepartmentName = (departmentId?: string) => {
  if (!departmentId) return "No Department";
  const dept = departments.value.find((d) => d.departmentId === departmentId);
  return dept?.name || "Unknown";
};

const getColor = (index: number) => boardColors[index % boardColors.length];

const getProgressColor = (status: string) => {
  const colors: Record<string, string> = {
    active: "#10B981",
    on_hold: "#FBBF24",
    completed: "#f1184c",
    cancelled: "#EF4444",
  };
  return colors[status] || "#10B981";
};

const openCreateModal = () => {
  selectedProject.value = null;
  showProjectModal.value = true;
};

const openEditModal = (project: any) => {
  selectedProject.value = { ...project };
  showProjectModal.value = true;
};

const openDeleteDialog = (project: any) => {
  selectedProject.value = project;
  showDeleteDialog.value = true;
};

const handleSaveProject = async (data: any) => {
  modalLoading.value = true;
  try {
    if (data.projectId) {
      // Create a clean payload removing projectId (in URL) and status (not in DB)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { projectId, status, ...updatePayload } = data;
      await projectService.update(data.projectId, updatePayload);
      snackbar.success("Board updated successfully!");
    } else {
      await projectService.create(data);
      snackbar.success("Board created successfully!");
    }
    showProjectModal.value = false;
    await loadData();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to save board");
  } finally {
    modalLoading.value = false;
  }
};

const handleDeleteProject = async () => {
  if (!selectedProject.value) return;
  modalLoading.value = true;
  try {
    await projectService.delete(selectedProject.value.projectId);
    snackbar.success("Board deleted successfully!");
    showDeleteDialog.value = false;
    await loadData();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to delete board");
  } finally {
    modalLoading.value = false;
  }
};
</script>

<template>
  <div class="boards-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-view-dashboard-outline" size="28" />
          </div>
          <div>
            <h1 class="page-title">Boards</h1>
            <p class="page-subtitle">Manage and organize your project boards</p>
          </div>
        </div>
          <div class="d-flex align-center gap-4">
          <div class="view-toggle">
            <span
              class="view-toggle-item"
              :class="{ active: viewMode === 'grid' }"
              @click="viewMode = 'grid'"
            >
              <v-icon icon="mdi-view-grid-outline" size="16" class="mr-1" />
              Grid
            </span>
            <span
              class="view-toggle-item"
              :class="{ active: viewMode === 'list' }"
              @click="viewMode = 'list'"
            >
              <v-icon icon="mdi-format-list-bulleted" size="16" class="mr-1" />
              List
            </span>
          </div>
          <div class="search-field">
            <v-text-field
              v-model="searchQuery"
              label="Search boards..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              rounded="lg"
            />
          </div>
        </div>
      </div>
      <div class="header-actions">
        <v-select
          v-model="categoryFilter"
          :items="[
            { title: 'All Departments', value: '' },
            ...departments.map((d) => ({ title: d.name, value: d.departmentId })),
          ]"
          label="Department"
          variant="outlined"
          density="compact"
          hide-details
          class="department-filter"
          clearable
        />
        <v-btn
          class="add-board-btn"
          prepend-icon="mdi-plus"
          rounded="lg"
          size="default"
          elevation="0"
          @click="openCreateModal"
        >Add New</v-btn>
      </div>
    </div>

    <!-- Loading -->
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <!-- Empty State -->
    <v-card
      v-if="!loading && filteredProjects.length === 0"
      class="pa-8 text-center"
      rounded="xl"
    >
      <v-icon
        icon="mdi-view-grid-outline"
        size="64"
        color="grey-lighten-1"
        class="mb-4"
      />
      <h3 class="text-h6 mb-2">No Boards Found</h3>
      <p class="text-grey mb-4">Get started by creating your first board</p>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateModal"
        >Create Board</v-btn
      >
    </v-card>

    <!-- Boards Grid -->
    <v-row v-else-if="viewMode === 'grid'">
      <v-col
        v-for="(project, index) in filteredProjects"
        :key="project.projectId"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card class="pa-4 board-card" rounded="xl">
          <!-- Header -->
          <div class="d-flex align-center justify-space-between mb-3">
            <h3 class="text-body-1 font-weight-medium board-title">
              {{ project.name }}
            </h3>
            <v-menu>
              <template #activator="{ props }">
                <v-btn icon variant="text" size="x-small" v-bind="props">
                  <v-icon icon="mdi-dots-horizontal" size="18" />
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item
                  title="Edit"
                  prepend-icon="mdi-pencil"
                  @click="openEditModal(project)"
                />
                <v-list-item
                  title="Delete"
                  prepend-icon="mdi-delete"
                  class="text-error"
                  @click="openDeleteDialog(project)"
                />
              </v-list>
            </v-menu>
          </div>

          <!-- Department -->
          <v-chip
            size="small"
            class="mb-3"
            :style="{
              backgroundColor: getColor(index) + '20',
              color: getColor(index),
            }"
          >
            {{ getDepartmentName(project.departmentId) }}
          </v-chip>

          <!-- Description -->
          <p
            v-if="project.description"
            class="text-body-2 text-grey mb-3 text-truncate"
          >
            {{ project.description }}
          </p>

          <!-- Stats -->
          <div class="text-body-2 mb-3">
            <span class="text-grey">Total tasks</span>
            <span class="font-weight-medium ml-1">{{
              project.taskCount || 0
            }}</span>
          </div>

          <!-- Progress Bar -->
          <div class="progress-bar mb-4">
            <div
              class="progress-bar-fill"
              :style="{
                width: project.taskCount
                  ? ((project.completedTaskCount || 0) / project.taskCount) *
                      100 +
                    '%'
                  : '0%',
                backgroundColor: getProgressColor(project.status),
              }"
            ></div>
          </div>

          <!-- Actions -->
          <div class="d-flex align-center justify-end">
            <v-btn
              variant="text"
              color="primary"
              size="small"
              @click="openEditModal(project)"
              >View Board</v-btn
            >
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Boards List View -->
    <div v-else class="list-view">
      <div class="list-card">
        <!-- List Header -->
        <div class="list-header">
          <div class="list-header-left">
            <div class="list-icon">
              <v-icon icon="mdi-view-dashboard-outline" size="16" color="white" />
            </div>
            <span class="list-title">All Boards</span>
            <span class="list-count">{{ filteredProjects.length }} boards</span>
          </div>
        </div>

        <!-- Column Headers -->
        <div class="list-column-headers">
          <div class="col-name">BOARD NAME</div>
          <div class="col-department">DEPARTMENT</div>
          <div class="col-tasks">TASKS</div>
          <div class="col-progress">PROGRESS</div>
          <div class="col-status">STATUS</div>
          <div class="col-actions"></div>
        </div>

        <!-- List Items -->
        <div class="list-items">
          <div
            v-for="(project, index) in filteredProjects"
            :key="project.projectId"
            class="list-row"
            @click="openEditModal(project)"
          >
            <div class="col-name">
              <div class="board-name-wrapper">
                <div class="board-icon" :style="{ backgroundColor: getColor(index) + '20' }">
                  <v-icon icon="mdi-folder-outline" size="16" :color="getColor(index)" />
                </div>
                <span class="board-name-text">{{ project.name }}</span>
              </div>
            </div>
            <div class="col-department">
              <v-chip
                size="small"
                :style="{
                  backgroundColor: getColor(index) + '15',
                  color: getColor(index),
                }"
              >
                {{ getDepartmentName(project.departmentId) }}
              </v-chip>
            </div>
            <div class="col-tasks">
              <span class="task-count">{{ project.taskCount || 0 }}</span>
              <span class="task-label">tasks</span>
            </div>
            <div class="col-progress">
              <div class="progress-wrapper">
                <div class="progress-bar-mini">
                  <div
                    class="progress-bar-fill-mini"
                    :style="{
                      width: project.taskCount
                        ? ((project.completedTaskCount || 0) / project.taskCount) * 100 + '%'
                        : '0%',
                      backgroundColor: getProgressColor(project.status),
                    }"
                  ></div>
                </div>
                <span class="progress-text">
                  {{ project.taskCount ? Math.round(((project.completedTaskCount || 0) / project.taskCount) * 100) : 0 }}%
                </span>
              </div>
            </div>
            <div class="col-status">
              <v-chip
                size="small"
                :style="{
                  backgroundColor: getProgressColor(project.status) + '15',
                  color: getProgressColor(project.status),
                }"
              >
                {{ project.status ? project.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Active' }}
              </v-chip>
            </div>
            <div class="col-actions">
              <v-menu>
                <template #activator="{ props }">
                  <v-btn
                    icon
                    variant="text"
                    size="x-small"
                    v-bind="props"
                    @click.stop
                  >
                    <v-icon icon="mdi-dots-vertical" size="18" />
                  </v-btn>
                </template>
                <v-list density="compact">
                  <v-list-item
                    title="Edit"
                    prepend-icon="mdi-pencil"
                    @click="openEditModal(project)"
                  />
                  <v-list-item
                    title="Delete"
                    prepend-icon="mdi-delete"
                    class="text-error"
                    @click="openDeleteDialog(project)"
                  />
                </v-list>
              </v-menu>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <ProjectModal
      v-model="showProjectModal"
      :project="selectedProject"
      :loading="modalLoading"
      @save="handleSaveProject"
    />
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Delete Board"
      :message="`Are you sure you want to delete '${selectedProject?.name}'? This will also delete all tasks in this board.`"
      :loading="modalLoading"
      @confirm="handleDeleteProject"
    />
  </div>
</template>

<style scoped>
/* Page Layout */
.boards-page {
  padding: 0;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 24px;
  flex-wrap: wrap;
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
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.4);
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.department-filter {
  width: 180px;
}

.department-filter :deep(.v-field) {
  border-radius: 10px;
}

.search-field {
  width: 250px;
}

.search-field :deep(.v-field) {
  border-radius: 10px;
}

.add-board-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  text-transform: none;
  padding: 0 20px;
  height: 42px;
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.4);
  transition: all 0.3s ease;
}

.add-board-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(241, 24, 76, 0.5);
}

/* View Toggle Tabs - Enhanced */
.view-toggle {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
}

.view-toggle-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-toggle-item:hover {
  color: #475569;
  background: #f8fafc;
}

.view-toggle-item.active {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(241, 24, 76, 0.3);
}

/* Board Card */
.board-card {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.board-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12) !important;
  border-color: rgba(241, 24, 76, 0.15);
}

.board-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 48px;
}

/* Progress Bar */
.progress-bar {
  height: 6px;
  border-radius: 4px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 100%);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
}

/* View Board Button */
.board-card :deep(.v-btn--variant-text) {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
}

.board-card :deep(.v-btn--variant-text:hover) {
  background: rgba(241, 24, 76, 0.08);
}

/* List View Styles */
.list-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.list-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.list-header {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.list-icon {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-title {
  font-size: 15px;
  font-weight: 600;
  color: white;
}

.list-count {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 12px;
}

.list-column-headers {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  background: #f8fafc;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.list-items {
  padding: 0;
}

.list-row {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.list-row:last-child {
  border-bottom: none;
}

.list-row:hover {
  background: linear-gradient(90deg, rgba(241, 24, 76, 0.04) 0%, rgba(241, 24, 76, 0.02) 100%);
}

/* Column widths */
.col-name { flex: 1.5; min-width: 200px; }
.col-department { width: 150px; flex-shrink: 0; }
.col-tasks { width: 100px; flex-shrink: 0; }
.col-progress { width: 140px; flex-shrink: 0; }
.col-status { width: 120px; flex-shrink: 0; }
.col-actions { width: 50px; flex-shrink: 0; text-align: right; }

/* Board name in list */
.board-name-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.board-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.board-name-text {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Task count */
.task-count {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-right: 4px;
}

.task-label {
  font-size: 12px;
  color: #94a3b8;
}

/* Progress in list */
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar-mini {
  flex: 1;
  height: 6px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 100%);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.progress-bar-fill-mini {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  min-width: 35px;
}
</style>
