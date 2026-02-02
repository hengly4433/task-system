<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Department } from "@/services/department.service";
import DatePickerField from "@/components/DatePickerField.vue";

defineOptions({
  name: "AdvancedFilterDrawer",
});

const props = defineProps<{
  modelValue: boolean;
  departments: Department[];
  projects: { projectId: string; name: string }[];
  sprints: { sprintId: string; name: string }[];
  users: { userId: string; fullName: string; profileImageUrl?: string }[];
  statusOptions: { title: string; value: string; color?: string }[];
  // Current filter values
  filters: {
    departmentId: string | null;
    status: string[];
    priority: string[];
    projectId: string | null;
    sprintId: string | null;
    assigneeId: string | null;
    dateFrom: string | null;
    dateTo: string | null;
  };
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "apply", filters: typeof props.filters): void;
  (e: "reset"): void;
}>();

// Local filter state
const localFilters = ref({
  departmentId: null as string | null,
  status: [] as string[],
  priority: [] as string[],
  projectId: null as string | null,
  sprintId: null as string | null,
  assigneeId: null as string | null,
  dateFrom: null as string | null,
  dateTo: null as string | null,
});

// Sync local filters with props
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      localFilters.value = { ...props.filters };
    }
  },
  { immediate: true }
);

const priorityOptions = [
  { title: "Urgent", value: "URGENT", color: "#ef4444", icon: "mdi-alert-circle" },
  { title: "High", value: "HIGH", color: "#f97316", icon: "mdi-arrow-up" },
  { title: "Medium", value: "MEDIUM", color: "#eab308", icon: "mdi-minus" },
  { title: "Low", value: "LOW", color: "#22c55e", icon: "mdi-arrow-down" },
];

// Count active filters
const activeFilterCount = computed(() => {
  let count = 0;
  if (localFilters.value.departmentId) count++;
  if (localFilters.value.status.length > 0) count++;
  if (localFilters.value.priority.length > 0) count++;
  if (localFilters.value.projectId) count++;
  if (localFilters.value.sprintId) count++;
  if (localFilters.value.assigneeId) count++;
  if (localFilters.value.dateFrom) count++;
  if (localFilters.value.dateTo) count++;
  return count;
});

const close = () => {
  emit("update:modelValue", false);
};

const applyFilters = () => {
  emit("apply", { ...localFilters.value });
  close();
};

const resetFilters = () => {
  localFilters.value = {
    departmentId: null,
    status: [],
    priority: [],
    projectId: null,
    sprintId: null,
    assigneeId: null,
    dateFrom: null,
    dateTo: null,
  };
  emit("reset");
};
</script>

<template>
  <v-navigation-drawer
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    location="right"
    temporary
    persistent
    width="500"
    class="filter-drawer"
  >
    <!-- Header -->
    <div class="drawer-header">
      <div class="header-content">
        <div class="header-icon">
          <v-icon icon="mdi-filter-variant" size="24" />
        </div>
        <div class="header-text">
          <h2 class="header-title">Advanced Filters</h2>
          <p class="header-subtitle">Narrow down your task list</p>
        </div>
      </div>
      <v-btn icon variant="text" size="small" @click="close" class="close-btn">
        <v-icon icon="mdi-close" />
      </v-btn>
    </div>

    <!-- Filter Content -->
    <div class="drawer-body">
      <!-- Two Column Grid -->
      <div class="filter-grid">
        <!-- Department -->
        <div class="filter-section">
        <label class="filter-label">
          <v-icon size="16">mdi-domain</v-icon>
          Department
        </label>
        <v-select
          v-model="localFilters.departmentId"
          :items="[{ title: 'All Departments', value: null }, ...departments.map(d => ({ title: d.name, value: d.departmentId }))]"
          placeholder="Select department"
          variant="outlined"
          density="compact"
          rounded="lg"
          hide-details
          clearable
        />
      </div>

      <!-- Project -->
      <div class="filter-section">
        <label class="filter-label">
          <v-icon size="16">mdi-folder-outline</v-icon>
          Project
        </label>
        <v-select
          v-model="localFilters.projectId"
          :items="[{ title: 'All Projects', value: null }, ...projects.map(p => ({ title: p.name, value: p.projectId }))]"
          placeholder="Select project"
          variant="outlined"
          density="compact"
          rounded="lg"
          hide-details
          clearable
        />
      </div>

      <!-- Sprint -->
      <div class="filter-section">
        <label class="filter-label">
          <v-icon size="16">mdi-run</v-icon>
          Sprint
        </label>
        <v-select
          v-model="localFilters.sprintId"
          :items="[{ title: 'All Sprints', value: null }, ...sprints.map(s => ({ title: s.name, value: s.sprintId }))]"
          placeholder="Select sprint"
          variant="outlined"
          density="compact"
          rounded="lg"
          hide-details
          clearable
        />
        </div>
      </div>

      <v-divider class="my-4" />

      <!-- Two Column Grid for Status/Priority -->
      <div class="filter-grid">
        <!-- Status -->
        <div class="filter-section">
        <label class="filter-label">
          <v-icon size="16">mdi-checkbox-marked-circle-outline</v-icon>
          Status
          <v-chip v-if="localFilters.status.length > 0" size="x-small" class="ml-2">
            {{ localFilters.status.length }}
          </v-chip>
        </label>
        <v-select
          v-model="localFilters.status"
          :items="statusOptions"
          placeholder="Select status(es)"
          variant="outlined"
          density="compact"
          rounded="lg"
          hide-details
          clearable
          multiple
          chips
          closable-chips
        >
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps">
              <template #prepend v-if="item.raw.color">
                <div class="status-dot" :style="{ backgroundColor: item.raw.color }" />
              </template>
            </v-list-item>
          </template>
        </v-select>
      </div>

      <!-- Priority -->
      <div class="filter-section">
        <label class="filter-label">
          <v-icon size="16">mdi-flag-outline</v-icon>
          Priority
          <v-chip v-if="localFilters.priority.length > 0" size="x-small" class="ml-2">
            {{ localFilters.priority.length }}
          </v-chip>
        </label>
        <v-select
          v-model="localFilters.priority"
          :items="priorityOptions"
          placeholder="Select priority(ies)"
          variant="outlined"
          density="compact"
          rounded="lg"
          hide-details
          clearable
          multiple
          chips
          closable-chips
        >
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps">
              <template #prepend>
                <v-icon :icon="item.raw.icon" :color="item.raw.color" size="18" />
              </template>
            </v-list-item>
          </template>
        </v-select>
        </div>
      </div>

      <v-divider class="my-4" />

      <!-- Assignee -->
      <div class="filter-section">
        <label class="filter-label">
          <v-icon size="16">mdi-account-outline</v-icon>
          Assignee
        </label>
        <v-select
          v-model="localFilters.assigneeId"
          :items="[{ title: 'All Assignees', value: null }, ...users.map(u => ({ title: u.fullName, value: u.userId }))]"
          placeholder="Select assignee"
          variant="outlined"
          density="compact"
          rounded="lg"
          hide-details
          clearable
        />
      </div>

      <!-- Date Range -->
      <div class="filter-section">
        <label class="filter-label">
          <v-icon size="16">mdi-calendar-range</v-icon>
          Due Date Range
        </label>
        <div class="date-range-row">
          <DatePickerField
            v-model="localFilters.dateFrom"
            placeholder="From"
          />
          <DatePickerField
            v-model="localFilters.dateTo"
            placeholder="To"
          />
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="drawer-footer">
      <v-btn 
        variant="text" 
        @click="resetFilters" 
        class="reset-btn"
        prepend-icon="mdi-refresh"
      >
        Reset All
      </v-btn>
      <v-btn
        class="apply-btn"
        @click="applyFilters"
        prepend-icon="mdi-check"
        rounded="lg"
      >
        Apply Filters
        <v-badge 
          v-if="activeFilterCount > 0" 
          :content="activeFilterCount" 
          inline 
          class="ml-2"
        />
      </v-btn>
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
.filter-drawer {
  border-radius: 20px 0 0 20px !important;
  overflow: hidden;
}

.filter-drawer :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Header */
.drawer-header {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  padding: 20px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.header-text {
  color: white;
}

.header-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.header-subtitle {
  font-size: 0.8rem;
  opacity: 0.85;
  margin: 4px 0 0 0;
}

.close-btn {
  color: white;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Body */
.drawer-body {
  padding: 20px 16px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.filter-section {
  margin-bottom: 18px;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.filter-grid .filter-section {
  margin-bottom: 0;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.filter-section :deep(.v-field) {
  border-radius: 10px !important;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}

.date-range-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

/* Footer */
.drawer-footer {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
  margin-top: auto;
  flex-shrink: 0;
}

.reset-btn {
  color: #64748b;
  text-transform: none;
  font-weight: 500;
}

.reset-btn:hover {
  color: #f1184c;
  background: rgba(241, 24, 76, 0.08);
}

.apply-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%) !important;
  color: white;
  font-weight: 600;
  text-transform: none;
  padding: 0 24px;
  box-shadow: 0 4px 12px rgba(241, 24, 76, 0.3);
}

.apply-btn:hover {
  box-shadow: 0 6px 16px rgba(241, 24, 76, 0.4);
}
</style>
