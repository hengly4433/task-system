<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { projectService } from "@/services/project.service";
import { sprintService } from "@/services/sprint.service";
import { departmentService } from "@/services/department.service";
import SprintModal from "@/components/modals/SprintModal.vue";
import ConfirmDialog from "@/components/modals/ConfirmDialog.vue";
import DataTableCard from "@/components/DataTableCard.vue";
import { useSnackbar } from "@/composables/useSnackbar";

const snackbar = useSnackbar();

const projects = ref<any[]>([]);
const departments = ref<any[]>([]);
const sprints = ref<any[]>([]);
const loading = ref(false);
const selectedProjectForSprint = ref<string | null>(null);
const selectedDepartmentId = ref<string | null>(null);

// Modals
const showSprintModal = ref(false);
const showDeleteSprintDialog = ref(false);
const editingSprint = ref<any>(null);
const itemToDelete = ref<any>(null);

const headersSprints = [
  { title: "No", key: "index", sortable: false, width: "70px" },
  { title: "Name", key: "name" },
  { title: "Status", key: "status", width: "120px" },
  { title: "Start Date", key: "startDate", width: "140px" },
  { title: "End Date", key: "endDate", width: "140px" },
  { title: "Actions", key: "actions", sortable: false, align: "end" as const, width: "120px" },
];

// Filter projects by selected department
const filteredProjects = computed(() => {
  if (!selectedDepartmentId.value) return projects.value;
  return projects.value.filter(p => p.departmentId === selectedDepartmentId.value);
});

// Get current project's department info
const currentProjectDepartment = computed(() => {
  if (!selectedProjectForSprint.value) return null;
  const project = projects.value.find(p => p.projectId === selectedProjectForSprint.value);
  if (!project?.departmentId) return null;
  return departments.value.find(d => d.departmentId === project.departmentId);
});

onMounted(async () => {
  await Promise.all([loadDepartments(), loadProjects()]);
});

const loadDepartments = async () => {
  try {
    const data = await departmentService.getAll();
    departments.value = data.data || data;
  } catch (e) {
    console.error("Failed to load departments", e);
  }
};

const loadProjects = async () => {
  try {
    const data = await projectService.getAll();
    projects.value = data;
    if (data && data.length > 0 && !selectedProjectForSprint.value) {
      selectedProjectForSprint.value = data[0]?.projectId || null;
      await loadSprints();
    }
  } catch (e) {
    console.error("Failed to load projects", e);
    snackbar.error("Failed to load projects");
  }
};

const loadSprints = async () => {
  if (!selectedProjectForSprint.value) return;
  loading.value = true;
  try {
    const data = await sprintService.getByProject(
      selectedProjectForSprint.value
    );
    sprints.value = data.map((s: any) => ({
      ...s,
      name: s.name || s.sprintName || `Sprint ${s.sprintId}`,
    }));
  } catch (e) {
    console.error("Failed to load sprints", e);
    sprints.value = [];
  } finally {
    loading.value = false;
  }
};

const onDepartmentChange = () => {
  // Reset project selection when department changes
  const filtered = filteredProjects.value;
  if (filtered.length > 0) {
    selectedProjectForSprint.value = filtered[0].projectId;
    loadSprints();
  } else {
    selectedProjectForSprint.value = null;
    sprints.value = [];
  }
};

const openCreateSprint = () => {
  if (!selectedProjectForSprint.value) {
    snackbar.warning("Please select a project first");
    return;
  }
  editingSprint.value = null;
  showSprintModal.value = true;
};

const openEditSprint = (sprint: any) => {
  editingSprint.value = sprint;
  showSprintModal.value = true;
};

const deleteSprint = (sprint: any) => {
  itemToDelete.value = sprint;
  showDeleteSprintDialog.value = true;
};

const handleSaveSprint = async (data: any) => {
  try {
    if (data.sprintId) {
      // Extract only the fields allowed by UpdateSprintDto
      const { sprintId, projectId, ...updateData } = data;
      await sprintService.update(sprintId, updateData);
      snackbar.success("Sprint updated successfully");
    } else {
      await sprintService.create(data);
      snackbar.success("Sprint created successfully");
    }
    await loadSprints();
    showSprintModal.value = false;
  } catch (e) {
    console.error("Failed to save sprint", e);
    snackbar.error("Failed to save sprint");
  }
};

const confirmDeleteSprint = async () => {
  if (!itemToDelete.value) return;
  try {
    await sprintService.delete(itemToDelete.value.sprintId);
    snackbar.success("Sprint deleted successfully");
    await loadSprints();
    showDeleteSprintDialog.value = false;
    itemToDelete.value = null;
  } catch (e) {
    console.error("Failed to delete sprint", e);
    snackbar.error("Failed to delete sprint");
  }
};
</script>

<template>
  <div class="sprints-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-run-fast" size="28" />
          </div>
          <div>
            <h1 class="page-title">Sprints</h1>
            <p class="page-subtitle">Manage your project sprints and iterations</p>
          </div>
        </div>
      </div>

      <v-btn
        class="action-btn"
        prepend-icon="mdi-plus"
        @click="openCreateSprint"
        :disabled="!selectedProjectForSprint"
        rounded="lg"
        elevation="0"
      >
        New Sprint
      </v-btn>
    </div>

    <!-- Filter Card -->
    <v-card class="mb-5 rounded-xl filter-card" elevation="0">
      <v-card-text class="d-flex align-center flex-wrap py-3 px-5" style="gap: 16px;">
        <!-- Department Filter -->
        <div class="d-flex align-center">
          <v-icon color="secondary" class="mr-2" size="20">mdi-domain</v-icon>
          <span class="text-body-2 font-weight-medium text-grey-darken-1 mr-2">Department:</span>
          <div style="min-width: 180px">
            <v-select
              v-model="selectedDepartmentId"
              :items="[{ name: 'All Departments', departmentId: null }, ...departments]"
              item-title="name"
              item-value="departmentId"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="onDepartmentChange"
              class="font-weight-medium"
              rounded="lg"
            />
          </div>
        </div>
        
        <v-divider vertical class="mx-2" />
        
        <!-- Project Filter -->
        <div class="d-flex align-center">
          <v-icon color="primary" class="mr-2" size="20">mdi-folder-outline</v-icon>
          <span class="text-body-2 font-weight-medium text-grey-darken-1 mr-2">Project:</span>
          <div style="min-width: 280px">
            <v-select
              v-model="selectedProjectForSprint"
              :items="filteredProjects"
              item-title="name"
              item-value="projectId"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="loadSprints"
              class="font-weight-medium project-select"
              rounded="lg"
            />
          </div>
        </div>
        
        <!-- Department Badge -->
        <v-chip
          v-if="currentProjectDepartment"
          size="small"
          color="secondary"
          variant="tonal"
          class="ml-auto"
        >
          <v-icon start size="16">mdi-domain</v-icon>
          {{ currentProjectDepartment.name }}
        </v-chip>
      </v-card-text>
    </v-card>

    <!-- Sprints Table -->
    <DataTableCard
      title="Sprint List"
      icon="mdi-run-fast"
      :headers="headersSprints"
      :items="sprints"
      :loading="loading"
      item-value="sprintId"
      :height="350"
    >
      <template #item.name="{ item }">
        <div class="d-flex align-center">
          <v-icon size="small" color="primary" class="mr-2">mdi-run-fast</v-icon>
          <span class="font-weight-medium">{{ item.name }}</span>
        </div>
      </template>
      <template #item.status="{ item }">
        <v-chip
          size="small"
          :color="item.status?.toLowerCase() === 'active' ? 'primary' : item.status?.toLowerCase() === 'completed' ? 'success' : 'grey'"
          variant="tonal"
          class="text-uppercase font-weight-bold"
        >
          <v-icon start size="x-small">
            {{ item.status?.toLowerCase() === 'active' ? 'mdi-play-circle' : item.status?.toLowerCase() === 'completed' ? 'mdi-check-circle' : 'mdi-clock-outline' }}
          </v-icon>
          {{ item.status }}
        </v-chip>
      </template>
      <template #item.startDate="{ item }">
        <div class="d-flex align-center text-body-2">
          <v-icon size="small" color="grey" class="mr-2">mdi-calendar-start</v-icon>
          {{ item.startDate ? new Date(item.startDate).toLocaleDateString() : "—" }}
        </div>
      </template>
      <template #item.endDate="{ item }">
        <div class="d-flex align-center text-body-2">
          <v-icon size="small" color="grey" class="mr-2">mdi-calendar-end</v-icon>
          {{ item.endDate ? new Date(item.endDate).toLocaleDateString() : "—" }}
        </div>
      </template>
      <template #item.actions="{ item }">
        <div class="d-flex justify-end" style="gap: 4px;">
          <v-btn
            icon
            variant="text"
            size="small"
            color="primary"
            @click.stop="openEditSprint(item)"
          >
            <v-icon size="small">mdi-pencil-outline</v-icon>
            <v-tooltip activator="parent" location="top">Edit Sprint</v-tooltip>
          </v-btn>
          <v-btn
            icon
            variant="text"
            size="small"
            color="error"
            @click.stop="deleteSprint(item)"
          >
            <v-icon size="small">mdi-delete-outline</v-icon>
            <v-tooltip activator="parent" location="top">Delete Sprint</v-tooltip>
          </v-btn>
        </div>
      </template>
      <template #no-data>
        <div class="text-center py-10">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-timer-sand</v-icon>
          <p class="text-h6 text-grey-darken-1 mb-2">No sprints found</p>
          <p class="text-body-2 text-grey">
            {{
              selectedProjectForSprint
                ? "Create your first sprint to get started"
                : "Select a project to view its sprints"
            }}
          </p>
        </div>
      </template>
    </DataTableCard>

    <!-- Modals -->
    <SprintModal
      v-model="showSprintModal"
      :project-id="selectedProjectForSprint || ''"
      :projects="projects"
      :sprint="editingSprint"
      @save="handleSaveSprint"
    />

    <ConfirmDialog
      v-model="showDeleteSprintDialog"
      title="Delete Sprint"
      message="Are you sure you want to delete this sprint? This action cannot be undone."
      @confirm="confirmDeleteSprint"
    />
  </div>
</template>

<style scoped>
.sprints-view {
  padding: 4px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 24px;
  flex-shrink: 0;
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

.filter-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.02) 0%, rgba(var(--v-theme-surface), 1) 100%);
  flex-shrink: 0;
}

.project-select :deep(.v-field) {
  border-radius: 12px;
}

/* Make DataTableCard fill remaining space */
.sprints-view :deep(.data-table-card) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.sprints-view :deep(.data-table-card .v-data-table) {
  flex: 1;
  min-height: 0;
}
</style>
