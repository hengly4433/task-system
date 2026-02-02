<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { timesheetService, type WeeklyTimeEntry, type WeeklyTimesheetResponse } from "@/services/timesheet.service";
import { taskService } from "@/services/task.service";
import { useSnackbar } from "@/composables/useSnackbar";
import TimeEntryModal from "@/components/modals/TimeEntryModal.vue";

const snackbar = useSnackbar();

const currentWeekStart = ref(getMonday(new Date()));
const viewMode = ref<"list" | "calendar">("list");
const loading = ref(false);

const weeklyData = ref<WeeklyTimesheetResponse | null>(null);
const tasks = ref<any[]>([]);

// Modal state
const showTimeEntryModal = ref(false);
const selectedTaskId = ref<string | undefined>(undefined);
const selectedDate = ref<string | undefined>(undefined);
const selectedHours = ref<number | undefined>(undefined);
const modalLoading = ref(false);

// Editable cell state
const editingCell = ref<{ taskId: string; dayIndex: number } | null>(null);
const editingValue = ref(0);

onMounted(async () => {
  await loadData();
  await loadTasks();
});

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const loadData = async () => {
  loading.value = true;
  try {
    const startDate = currentWeekStart.value.toISOString().split("T")[0] as string;
    weeklyData.value = await timesheetService.getWeekly(startDate);
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to load timesheet");
  } finally {
    loading.value = false;
  }
};

const loadTasks = async () => {
  try {
    // Fetch all tasks for the task picker
    const response = await taskService.getAll({ pageSize: 100 });
    const taskList = response.data || response;
    tasks.value = taskList.map((t: any) => ({
      taskId: t.taskId,
      title: t.title,
      projectName: t.projectName || t.project?.name,
    }));
  } catch (e) {
    tasks.value = [];
  }
};

// Week navigation
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const weekDates = computed(() => {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart.value);
    d.setDate(d.getDate() + i);
    dates.push(d.getDate().toString());
  }
  return dates;
});

const currentWeekRange = computed(() => {
  const start = currentWeekStart.value;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", { ...options, year: "numeric" });
  return `${startStr} - ${endStr}`;
});

const prevWeek = () => {
  const newDate = new Date(currentWeekStart.value);
  newDate.setDate(newDate.getDate() - 7);
  currentWeekStart.value = newDate;
  loadData();
};

const nextWeek = () => {
  const newDate = new Date(currentWeekStart.value);
  newDate.setDate(newDate.getDate() + 7);
  currentWeekStart.value = newDate;
  loadData();
};

// Stats
const totalHours = computed(() => weeklyData.value?.totalHours || 0);
const averageDaily = computed(() => (totalHours.value / 5).toFixed(1));
const tasksLogged = computed(() => weeklyData.value?.tasksLogged || 0);
const dailyTotals = computed(() => weeklyData.value?.dailyTotals || [0, 0, 0, 0, 0, 0, 0]);

// Time entries
const timeEntries = computed(() => weeklyData.value?.entries || []);

const getRowTotal = (entry: WeeklyTimeEntry) => entry.totalHours;

// Open modal to add new entry
const openAddEntry = () => {
  selectedTaskId.value = undefined;
  selectedDate.value = undefined;
  selectedHours.value = undefined;
  showTimeEntryModal.value = true;
};

// Click on cell to edit
const startEditing = (entry: WeeklyTimeEntry, dayIndex: number) => {
  editingCell.value = { taskId: entry.taskId, dayIndex };
  editingValue.value = entry.days[dayIndex] ?? 0;
};

const saveEditing = async (entry: WeeklyTimeEntry) => {
  if (!editingCell.value) return;
  
  const dayIndex = editingCell.value.dayIndex;
  const date = new Date(currentWeekStart.value);
  date.setDate(date.getDate() + dayIndex);
  const dateStr = date.toISOString().split("T")[0];
  
  try {
    const entryId = entry.entryIds[dayIndex];
    
    if (editingValue.value > 0) {
      // Create or update
      await timesheetService.create({
        taskId: entry.taskId,
        date: dateStr as string,
        hours: editingValue.value,
      });
      snackbar.success("Time updated");
    } else if (entryId) {
      // Delete if hours set to 0
      await timesheetService.delete(entryId);
      snackbar.success("Entry removed");
    }
    
    editingCell.value = null;
    await loadData();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to update time");
  }
};

const cancelEditing = () => {
  editingCell.value = null;
};

const handleSaveEntry = async (data: { taskId: string; date: string; hours: number; description?: string }) => {
  modalLoading.value = true;
  try {
    await timesheetService.create(data);
    snackbar.success("Time logged successfully!");
    showTimeEntryModal.value = false;
    await loadData();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to log time");
  } finally {
    modalLoading.value = false;
  }
};

// Check if cell is being edited
const isEditing = (taskId: string, dayIndex: number) => {
  return editingCell.value?.taskId === taskId && editingCell.value?.dayIndex === dayIndex;
};
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-clock-outline" size="28" />
          </div>
          <div>
            <h1 class="page-title">Timesheets</h1>
            <p class="page-subtitle">Track and manage your work hours</p>
          </div>
        </div>
        <div class="view-toggle">
          <span
            class="view-toggle-item"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            <v-icon size="16" class="mr-1">mdi-format-list-bulleted</v-icon>
            List
          </span>
          <span
            class="view-toggle-item"
            :class="{ active: viewMode === 'calendar' }"
            @click="viewMode = 'calendar'"
          >
            <v-icon size="16" class="mr-1">mdi-calendar-month</v-icon>
            Calendar
          </span>
        </div>
      </div>
      <div class="header-actions">
        <v-btn icon variant="text" size="small" @click="prevWeek">
          <v-icon icon="mdi-chevron-left" />
        </v-btn>
        <span class="text-body-2 font-weight-medium">{{ currentWeekRange }}</span>
        <v-btn icon variant="text" size="small" @click="nextWeek">
          <v-icon icon="mdi-chevron-right" />
        </v-btn>
        <v-btn
          class="action-btn ml-3"
          prepend-icon="mdi-plus"
          rounded="lg"
          size="small"
          elevation="0"
          @click="openAddEntry"
          >Add Entry</v-btn
        >
      </div>
    </div>

    <!-- Summary Cards -->
    <v-row class="mb-6">
      <v-col cols="6" sm="3">
        <v-card class="pa-4" rounded="xl">
          <div class="text-caption text-grey mb-1">Total Hours</div>
          <div class="text-h4 font-weight-bold text-primary">
            {{ totalHours }}h
          </div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-4" rounded="xl">
          <div class="text-caption text-grey mb-1">Average Daily</div>
          <div class="text-h4 font-weight-bold" style="color: #10b981">
            {{ averageDaily }}h
          </div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-4" rounded="xl">
          <div class="text-caption text-grey mb-1">Tasks Logged</div>
          <div class="text-h4 font-weight-bold" style="color: #ff6b8a">
            {{ tasksLogged }}
          </div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-4" rounded="xl">
          <div class="text-caption text-grey mb-1">Target (40h)</div>
          <div class="text-h4 font-weight-bold" style="color: #fbbf24">
            {{ Math.min(100, Math.round((totalHours / 40) * 100)) }}%
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <!-- Empty State -->
    <v-card
      v-if="!loading && timeEntries.length === 0"
      class="pa-8 text-center"
      rounded="xl"
    >
      <v-icon
        icon="mdi-clock-outline"
        size="64"
        color="grey-lighten-1"
        class="mb-4"
      />
      <h3 class="text-h6 mb-2">No Time Entries</h3>
      <p class="text-grey mb-4">Start logging your work hours for this week</p>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddEntry"
        >Add Entry</v-btn
      >
    </v-card>

    <!-- Timesheet Table -->
    <v-card v-else rounded="xl" class="overflow-hidden">
      <v-table class="timesheet-table">
        <thead class="bg-grey-lighten-4">
          <tr>
            <th style="min-width: 250px">Task / Project</th>
            <th
              v-for="(day, idx) in weekDays"
              :key="day"
              class="text-center"
              style="width: 80px"
            >
              <div class="text-caption text-grey">{{ day }}</div>
              <div class="text-body-2 font-weight-medium">
                {{ weekDates[idx] }}
              </div>
            </th>
            <th class="text-center" style="width: 80px">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in timeEntries"
            :key="entry.taskId"
            class="timesheet-row"
          >
            <td>
              <div class="text-body-2 font-weight-medium">
                {{ entry.taskName }}
              </div>
              <div class="text-caption" :style="{ color: entry.projectColor || '#64748b' }">
                {{ entry.projectName }}
              </div>
            </td>
            <td
              v-for="(hours, idx) in entry.days"
              :key="idx"
              class="text-center"
            >
              <!-- Editing mode -->
              <div v-if="isEditing(entry.taskId, idx)" class="d-flex align-center justify-center">
                <v-text-field
                  v-model.number="editingValue"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="width: 60px"
                  autofocus
                  @keyup.enter="saveEditing(entry)"
                  @keyup.escape="cancelEditing"
                  @blur="saveEditing(entry)"
                />
              </div>
              <!-- Display mode -->
              <div
                v-else
                class="time-cell"
                :class="{ 'has-hours': hours > 0 }"
                @click="startEditing(entry, idx)"
              >
                {{ hours > 0 ? hours + "h" : "-" }}
              </div>
            </td>
            <td class="text-center">
              <span class="text-body-2 font-weight-bold"
                >{{ getRowTotal(entry) }}h</span
              >
            </td>
          </tr>
        </tbody>
        <tfoot class="bg-grey-lighten-5">
          <tr>
            <td class="font-weight-bold">Daily Total</td>
            <td
              v-for="(total, idx) in dailyTotals"
              :key="idx"
              class="text-center"
            >
              <span class="text-body-2 font-weight-bold text-primary"
                >{{ total }}h</span
              >
            </td>
            <td class="text-center">
              <span class="text-body-1 font-weight-bold text-primary"
                >{{ totalHours }}h</span
              >
            </td>
          </tr>
        </tfoot>
      </v-table>
    </v-card>

    <!-- Time Entry Modal -->
    <TimeEntryModal
      v-model="showTimeEntryModal"
      :tasks="tasks"
      :selected-task-id="selectedTaskId"
      :selected-date="selectedDate"
      :existing-hours="selectedHours"
      :loading="modalLoading"
      @save="handleSaveEntry"
    />
  </div>
</template>

<style scoped>
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-toggle {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.view-toggle-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle-item:hover {
  color: #f1184c;
  background: rgba(241, 24, 76, 0.05);
}

.view-toggle-item.active {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.action-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  text-transform: none;
  padding: 0 20px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.timesheet-table th,
.timesheet-table td {
  padding: 12px 16px !important;
}

.timesheet-row:hover {
  background-color: #f8fafc;
}

.time-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 32px;
  border-radius: 6px;
  font-size: 13px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.time-cell:hover {
  background: rgba(241, 24, 76, 0.05);
  color: #f1184c;
}

.time-cell.has-hours {
  background: rgba(241, 24, 76, 0.1);
  color: #f1184c;
  font-weight: 500;
}
</style>
