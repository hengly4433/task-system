<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { Doughnut, Line, Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { reportService } from "@/services/report.service";
import { meetingService, type Meeting } from "@/services/meeting.service";
import { userService, type User } from "@/services/user.service";
import { timesheetService } from "@/services/timesheet.service";
import { teamService, type Team } from "@/services/team.service";

ChartJS.register(
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

// Loading states
const loading = ref({
  dashboard: false,
  spentTime: false,
  tasksCompleted: false,
  timesheets: false,
  meetings: false,
  users: false,
});
const error = ref<string | null>(null);

// Date range filters
const dateRange = ref<"week" | "month">("week");
const selectedTeam = ref<string>("all");
const teams = ref<Team[]>([]);

// Chart key for re-rendering
const chartKey = ref(0);

// Dashboard summary
const dashboardSummary = ref({
  totalTasks: 0,
  completedTasks: 0,
  inProgressTasks: 0,
  overdueTasksCount: 0,
  upcomingMeetings: 0,
  totalTimeLogged: 0,
  tasksByPriority: { high: 0, medium: 0, low: 0 },
  tasksByStatus: {
    notStarted: 0,
    inProgress: 0,
    inReview: 0,
    completed: 0,
    cancelled: 0,
  },
});

// Chart data refs - will be populated from API
const spentTimeLabels = ref<string[]>([]);
const spentTimeValues = ref<number[]>([]);
const spentTimeColors = ref<string[]>([]);

const tasksCompletedLabels = ref<string[]>([]);
const tasksCompletedValues = ref<number[]>([]);

const timesheetLabels = ref<string[]>([]);
const timesheetLogged = ref<number[]>([]);
const timesheetNotLogged = ref<number[]>([]);

const newUsers = ref<User[]>([]);
const meetings = ref<Meeting[]>([]);

// Computed chart data
const spentTimeData = computed(() => ({
  labels: spentTimeLabels.value,
  datasets: [
    {
      data: spentTimeValues.value,
      backgroundColor:
        spentTimeColors.value.length > 0
          ? spentTimeColors.value
          : defaultColors,
      borderWidth: 0,
      hoverOffset: 8,
    },
  ],
}));

const spentTimeOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      padding: 12,
      titleFont: { size: 14, weight: "bold" as const },
      bodyFont: { size: 13 },
      cornerRadius: 8,
    },
  },
  cutout: "65%",
  animation: {
    animateRotate: true,
    animateScale: true,
  },
};

const tasksCompletedData = computed(() => ({
  labels: tasksCompletedLabels.value,
  datasets: [
    {
      label: "Tasks",
      data: tasksCompletedValues.value,
      borderColor: "#10B981",
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      fill: true,
      tension: 0.4,
      pointBackgroundColor: "#10B981",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
    },
  ],
}));

const tasksCompletedOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#64748b" },
    },
    y: {
      grid: { color: "#F1F5F9" },
      beginAtZero: true,
      ticks: { color: "#64748b" },
    },
  },
  interaction: {
    intersect: false,
    mode: "index" as const,
  },
};

const timesheetsData = computed(() => ({
  labels: timesheetLabels.value,
  datasets: [
    {
      label: "Logged Time",
      data: timesheetLogged.value,
      backgroundColor: "#ff6b8a",
      borderRadius: 6,
      borderSkipped: false,
    },
    {
      label: "Not Logged Time",
      data: timesheetNotLogged.value,
      backgroundColor: "#E2E8F0",
      borderRadius: 6,
      borderSkipped: false,
    },
  ],
}));

const timesheetsOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      align: "end" as const,
      labels: {
        usePointStyle: true,
        pointStyle: "circle",
        padding: 20,
      },
    },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      stacked: true,
      ticks: { color: "#64748b" },
    },
    y: {
      grid: { color: "#F1F5F9" },
      stacked: true,
      ticks: { color: "#64748b" },
    },
  },
};

// Default colors for charts
const defaultColors = [
  "#f1184c",
  "#FBBF24",
  "#EC4899",
  "#10B981",
  "#F97316",
  "#ff6b8a",
  "#06B6D4",
  "#8B5CF6",
];

// Workspace colors for users
const workspaceColors: Record<string, string> = {
  Operations: "#10B981",
  Marketing: "#FBBF24",
  Finance: "#EC4899",
  Development: "#f1184c",
  HR: "#06B6D4",
  Sales: "#F97316",
};

// Meeting status stats computed from real data
const meetingStats = computed(() => {
  const now = new Date();
  const upcoming = meetings.value.filter(
    (m) => m.status === "SCHEDULED" && new Date(m.startTime) > now,
  ).length;
  const inProgress = meetings.value.filter(
    (m) => m.status === "IN_PROGRESS",
  ).length;
  const cancelled = meetings.value.filter(
    (m) => m.status === "CANCELLED",
  ).length;
  const completed = meetings.value.filter(
    (m) => m.status === "COMPLETED",
  ).length;
  const overdue = meetings.value.filter(
    (m) => m.status === "SCHEDULED" && new Date(m.endTime) < now,
  ).length;

  return [
    { label: "Upcoming", value: upcoming, color: "#f1184c" },
    { label: "In Progress", value: inProgress, color: "#ff6b8a" },
    { label: "Cancelled", value: cancelled, color: "#EF4444" },
    { label: "Overdue", value: overdue, color: "#F97316" },
    { label: "Completed", value: completed, color: "#10B981" },
  ];
});

const tasksByPriority = computed(() => [
  {
    label: "High",
    value: dashboardSummary.value.tasksByPriority.high,
    color: "#EF4444",
  },
  {
    label: "Medium",
    value: dashboardSummary.value.tasksByPriority.medium,
    color: "#ff6b8a",
  },
  {
    label: "Low",
    value: dashboardSummary.value.tasksByPriority.low,
    color: "#10B981",
  },
]);

const departments = computed(() =>
  spentTimeLabels.value.map((name, idx) => ({
    name,
    color:
      spentTimeColors.value[idx] || defaultColors[idx % defaultColors.length],
    percent:
      spentTimeValues.value.length > 0
        ? `${Math.round((spentTimeValues.value[idx]! / spentTimeValues.value.reduce((a, b) => a + b, 0)) * 100)}%`
        : "0%",
  })),
);

// Total spent time for doughnut center
const totalSpentTime = computed(() =>
  spentTimeValues.value.reduce((a, b) => a + b, 0),
);

// Get date range for API calls
const getDateRange = () => {
  const now = new Date();
  let startDate: Date;
  let endDate = now;

  if (dateRange.value === "week") {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
  } else {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 1);
  }

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  } as { startDate: string; endDate: string };
};

// Fetch all data
const fetchDashboardData = async () => {
  loading.value.dashboard = true;
  try {
    const data = await reportService.getDashboardSummary();
    dashboardSummary.value = {
      ...dashboardSummary.value,
      ...data,
    };
  } catch (err) {
    console.error("Failed to fetch dashboard summary:", err);
  } finally {
    loading.value.dashboard = false;
  }
};

const fetchSpentTimeData = async () => {
  loading.value.spentTime = true;
  try {
    const { startDate, endDate } = getDateRange();
    const data = await reportService.getSpentTimeByDepartment(
      startDate,
      endDate,
    );
    spentTimeLabels.value = data.labels || [];
    spentTimeValues.value = data.data || [];
    spentTimeColors.value = data.colors || defaultColors;
    chartKey.value++;
  } catch (err) {
    console.error("Failed to fetch spent time data:", err);
    // Use fallback sample data
    spentTimeLabels.value = [
      "Development",
      "Marketing",
      "Design",
      "Sales",
      "Support",
    ];
    spentTimeValues.value = [35, 20, 18, 15, 12];
    spentTimeColors.value = defaultColors;
  } finally {
    loading.value.spentTime = false;
  }
};

const fetchTasksCompletedData = async () => {
  loading.value.tasksCompleted = true;
  try {
    const { startDate, endDate } = getDateRange();
    const data = await reportService.getTasksCompletedChart(startDate, endDate);
    tasksCompletedLabels.value = data.labels || [];
    tasksCompletedValues.value = data.data || [];
    chartKey.value++;
  } catch (err) {
    console.error("Failed to fetch tasks completed data:", err);
    // Use fallback sample data
    const days = dateRange.value === "week" ? 7 : 30;
    const labels: string[] = [];
    const values: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(
        date.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      );
      values.push(Math.floor(Math.random() * 20) + 5);
    }
    tasksCompletedLabels.value = labels;
    tasksCompletedValues.value = values;
  } finally {
    loading.value.tasksCompleted = false;
  }
};

const fetchTimesheetData = async () => {
  loading.value.timesheets = true;
  try {
    const { startDate, endDate } = getDateRange();
    const data = await reportService.getTimesheetSummary(startDate, endDate);
    if (data && data.labels) {
      timesheetLabels.value = data.labels;
      timesheetLogged.value = data.logged || [];
      timesheetNotLogged.value = data.notLogged || [];
    } else {
      throw new Error("Invalid data format");
    }
    chartKey.value++;
  } catch (err) {
    console.error("Failed to fetch timesheet data:", err);
    // Use fallback sample data
    const days = dateRange.value === "week" ? 7 : 14;
    const labels: string[] = [];
    const logged: number[] = [];
    const notLogged: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(
        date.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      );
      logged.push(Math.floor(Math.random() * 6) + 2);
      notLogged.push(Math.floor(Math.random() * 4));
    }
    timesheetLabels.value = labels;
    timesheetLogged.value = logged;
    timesheetNotLogged.value = notLogged;
  } finally {
    loading.value.timesheets = false;
  }
};

const fetchMeetings = async () => {
  loading.value.meetings = true;
  try {
    const response = await meetingService.getAll({ pageSize: 100 });
    meetings.value = response.data || [];
  } catch (err) {
    console.error("Failed to fetch meetings:", err);
    meetings.value = [];
  } finally {
    loading.value.meetings = false;
  }
};

const fetchUsers = async () => {
  loading.value.users = true;
  try {
    const response = await userService.getAll({ pageSize: 10 });
    const users = response.data || [];
    // Sort by createdAt descending to get newest users
    newUsers.value = users
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 6);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    newUsers.value = [];
  } finally {
    loading.value.users = false;
  }
};

const fetchTeams = async () => {
  try {
    teams.value = await teamService.getAll();
  } catch (err) {
    console.error("Failed to fetch teams:", err);
    teams.value = [];
  }
};

const refreshAllData = async () => {
  await Promise.all([
    fetchDashboardData(),
    fetchSpentTimeData(),
    fetchTasksCompletedData(),
    fetchTimesheetData(),
    fetchMeetings(),
    fetchUsers(),
  ]);
};

// Watch for date range changes
watch(dateRange, () => {
  refreshAllData();
});

watch(selectedTeam, () => {
  refreshAllData();
});

onMounted(async () => {
  await fetchTeams();
  await refreshAllData();
});

// Helper to get user color based on position
const getUserColor = (user: User) => {
  const position = user.position?.positionName?.toLowerCase() || "";
  if (position.includes("marketing")) return workspaceColors.Marketing;
  if (position.includes("finance")) return workspaceColors.Finance;
  if (position.includes("develop") || position.includes("engineer"))
    return workspaceColors.Development;
  if (position.includes("hr") || position.includes("human"))
    return workspaceColors.HR;
  if (position.includes("sales")) return workspaceColors.Sales;
  return workspaceColors.Operations;
};

// Truncate email for display
const truncateEmail = (email: string, maxLength = 25) => {
  if (email.length <= maxLength) return email;
  return email.substring(0, maxLength) + "...";
};
</script>

<template>
  <div class="reports-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-chart-bar" size="28" />
          </div>
          <div>
            <h1 class="page-title">Reports</h1>
            <p class="page-subtitle">
              View comprehensive analytics and insights
            </p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <div class="view-toggle">
          <span
            class="view-toggle-item"
            :class="{ active: dateRange === 'week' }"
            @click="dateRange = 'week'"
          >
            <v-icon icon="mdi-calendar-week" size="16" class="mr-1" />
            This Week
          </span>
          <span
            class="view-toggle-item"
            :class="{ active: dateRange === 'month' }"
            @click="dateRange = 'month'"
          >
            <v-icon icon="mdi-calendar-month" size="16" class="mr-1" />
            This Month
          </span>
        </div>
        <v-btn
          class="action-btn"
          prepend-icon="mdi-refresh"
          rounded="lg"
          size="small"
          elevation="0"
          @click="refreshAllData"
          :loading="Object.values(loading).some((l) => l)"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <v-row>
      <!-- Spent Time Chart -->
      <v-col cols="12" md="5">
        <v-card class="report-card pa-5" rounded="xl">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon spent-time">
                <v-icon icon="mdi-clock-outline" size="20" />
              </div>
              <h3 class="card-title">Spent Time</h3>
            </div>
            <v-select
              v-model="selectedTeam"
              :items="[
                { title: 'All Teams', value: 'all' },
                ...teams.map((t) => ({ title: t.teamName, value: t.teamId })),
              ]"
              variant="outlined"
              density="compact"
              hide-details
              class="team-select"
              rounded="lg"
            />
          </div>
          <div class="chart-row">
            <div class="doughnut-container">
              <div class="doughnut-wrapper">
                <Doughnut
                  v-if="spentTimeValues.length > 0"
                  :key="chartKey"
                  :data="spentTimeData"
                  :options="spentTimeOptions"
                />
                <div class="doughnut-center">
                  <span class="center-value">{{ totalSpentTime }}</span>
                  <span class="center-label">hours</span>
                </div>
              </div>
              <v-progress-circular
                v-if="loading.spentTime"
                indeterminate
                color="primary"
                class="chart-loader"
              />
            </div>
            <div class="chart-legend">
              <div
                v-for="dept in departments"
                :key="dept.name"
                class="legend-item"
              >
                <div
                  class="legend-dot"
                  :style="{ backgroundColor: dept.color }"
                />
                <span class="legend-label">{{ dept.name }}</span>
                <span class="legend-value">{{ dept.percent }}</span>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Tasks Completed Chart -->
      <v-col cols="12" md="7">
        <v-card class="report-card pa-5" rounded="xl">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon tasks">
                <v-icon icon="mdi-check-circle-outline" size="20" />
              </div>
              <h3 class="card-title">Tasks Completed</h3>
            </div>
            <v-btn icon variant="text" size="small">
              <v-icon icon="mdi-dots-horizontal" />
            </v-btn>
          </div>
          <div class="line-chart-container">
            <Line
              v-if="tasksCompletedValues.length > 0"
              :key="chartKey"
              :data="tasksCompletedData"
              :options="tasksCompletedOptions"
            />
            <v-progress-circular
              v-if="loading.tasksCompleted"
              indeterminate
              color="primary"
              class="chart-loader"
            />
          </div>
        </v-card>
      </v-col>

      <!-- New Users -->
      <v-col cols="12" md="5">
        <v-card class="report-card pa-5" rounded="xl">
          <div class="card-header mb-4">
            <div class="card-title-group">
              <div class="card-icon users">
                <v-icon icon="mdi-account-group-outline" size="20" />
              </div>
              <h3 class="card-title">New Users</h3>
            </div>
            <v-btn icon variant="text" size="small">
              <v-icon icon="mdi-dots-horizontal" />
            </v-btn>
          </div>
          <v-table density="compact" class="users-table">
            <thead>
              <tr>
                <th class="text-left">Name</th>
                <th class="text-left">Position</th>
                <th class="text-left">Email</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in newUsers" :key="user.userId" class="user-row">
                <td>
                  <div class="user-cell">
                    <v-avatar size="28" class="mr-2">
                      <v-img
                        v-if="user.profileImageUrl"
                        :src="user.profileImageUrl"
                      />
                      <v-icon v-else icon="mdi-account" size="18" />
                    </v-avatar>
                    <span class="user-name">{{
                      user.fullName || user.username
                    }}</span>
                  </div>
                </td>
                <td>
                  <span
                    class="position-badge"
                    :style="{ color: getUserColor(user) }"
                  >
                    {{ user.position || "Member" }}
                  </span>
                </td>
                <td class="text-grey email-cell">
                  {{ truncateEmail(user.email) }}
                </td>
              </tr>
              <tr v-if="newUsers.length === 0 && !loading.users">
                <td colspan="3" class="text-center text-grey pa-4">
                  No users found
                </td>
              </tr>
            </tbody>
          </v-table>
          <div v-if="loading.users" class="text-center py-4">
            <v-progress-circular indeterminate color="primary" size="24" />
          </div>
        </v-card>
      </v-col>

      <!-- Meetings Stats -->
      <v-col cols="12" md="3">
        <v-card class="report-card pa-5" rounded="xl">
          <div class="card-header mb-4">
            <div class="card-title-group">
              <div class="card-icon meetings">
                <v-icon icon="mdi-calendar-clock" size="20" />
              </div>
              <h3 class="card-title">Meetings</h3>
            </div>
            <v-btn icon variant="text" size="small">
              <v-icon icon="mdi-dots-horizontal" />
            </v-btn>
          </div>
          <div class="meetings-stats">
            <div
              v-for="stat in meetingStats"
              :key="stat.label"
              class="stat-item"
            >
              <div class="stat-value" :style="{ color: stat.color }">
                {{ stat.value }}
              </div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
          <v-progress-linear
            v-if="loading.meetings"
            indeterminate
            color="primary"
            class="mt-4"
          />
        </v-card>
      </v-col>

      <!-- Timesheets Chart -->
      <v-col cols="12" md="4">
        <v-card class="report-card pa-5" rounded="xl">
          <div class="card-header mb-4">
            <div class="card-title-group">
              <div class="card-icon timesheets">
                <v-icon icon="mdi-table-clock" size="20" />
              </div>
              <h3 class="card-title">Timesheets</h3>
            </div>
            <v-btn icon variant="text" size="small">
              <v-icon icon="mdi-dots-horizontal" />
            </v-btn>
          </div>
          <div class="bar-chart-container">
            <Bar
              v-if="timesheetLogged.length > 0"
              :key="chartKey"
              :data="timesheetsData"
              :options="timesheetsOptions"
            />
            <v-progress-circular
              v-if="loading.timesheets"
              indeterminate
              color="primary"
              class="chart-loader"
            />
          </div>
        </v-card>
      </v-col>

      <!-- Tasks By Priority -->
      <v-col cols="12" md="5">
        <v-card class="report-card pa-5" rounded="xl">
          <div class="card-header mb-4">
            <div class="card-title-group">
              <div class="card-icon priority">
                <v-icon icon="mdi-flag-outline" size="20" />
              </div>
              <h3 class="card-title">Tasks By Priority</h3>
            </div>
            <v-btn icon variant="text" size="small">
              <v-icon icon="mdi-dots-horizontal" />
            </v-btn>
          </div>
          <div class="priority-stats">
            <div
              v-for="task in tasksByPriority"
              :key="task.label"
              class="priority-item"
            >
              <div
                class="priority-circle"
                :style="{ backgroundColor: task.color }"
              >
                <span class="priority-value">{{ task.value }}</span>
              </div>
              <span class="priority-label">{{ task.label }}</span>
            </div>
          </div>
          <v-progress-linear
            v-if="loading.dashboard"
            indeterminate
            color="primary"
            class="mt-4"
          />
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.reports-page {
  padding: 0;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
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
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 24px rgba(241, 24, 76, 0.35);
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
  gap: 16px;
  flex-wrap: wrap;
}

/* View Toggle - matching Meeting page */
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

/* Refresh Button - Polished */
.action-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  text-transform: none;
  padding: 0 24px;
  height: 40px;
  min-width: 120px;
  font-size: 14px;
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.35);
  transition: all 0.3s ease;
  border-radius: 10px !important;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(241, 24, 76, 0.45);
}

.action-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(241, 24, 76, 0.3);
}

/* Team Select - Polished */
.team-select {
  width: 140px;
}

.team-select :deep(.v-field) {
  border-radius: 10px !important;
  background: white;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.team-select :deep(.v-field:hover) {
  border-color: #f1184c;
  box-shadow: 0 2px 8px rgba(241, 24, 76, 0.1);
}

.team-select :deep(.v-field--focused) {
  border-color: #f1184c;
  box-shadow: 0 0 0 3px rgba(241, 24, 76, 0.1);
}

.team-select :deep(.v-field__input) {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.team-select :deep(.v-field__append-inner .v-icon) {
  color: #64748b;
}

/* Report Cards */
.report-card {
  background: white;
  border: 1px solid rgba(241, 24, 76, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.report-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #f1184c, #ff6b8a);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.report-card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.report-card:hover::before {
  opacity: 1;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-icon.spent-time {
  background: linear-gradient(135deg, #f1184c, #ff6b8a);
}

.card-icon.tasks {
  background: linear-gradient(135deg, #10b981, #34d399);
}

.card-icon.users {
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
}

.card-icon.meetings {
  background: linear-gradient(135deg, #f97316, #fb923c);
}

.card-icon.timesheets {
  background: linear-gradient(135deg, #06b6d4, #22d3ee);
}

.card-icon.priority {
  background: linear-gradient(135deg, #ec4899, #f472b6);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

/* Chart Containers */
.chart-row {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 16px;
}

.doughnut-container {
  position: relative;
  flex-shrink: 0;
}

.doughnut-wrapper {
  position: relative;
  width: 180px;
  height: 180px;
}

.doughnut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.center-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.center-label {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.chart-legend {
  flex: 1;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.2s;
}

.legend-item:last-child {
  border-bottom: none;
}

.legend-item:hover {
  background: #f8fafc;
  margin: 0 -12px;
  padding-left: 12px;
  padding-right: 12px;
  border-radius: 8px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  font-size: 13px;
  color: #475569;
}

.legend-value {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.line-chart-container {
  height: 220px;
  position: relative;
}

.bar-chart-container {
  height: 200px;
  position: relative;
}

.chart-loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* Users Table */
.users-table {
  background: transparent !important;
}

.users-table thead th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #94a3b8 !important;
  border-bottom: 1px solid #f1f5f9 !important;
  padding: 8px 12px !important;
}

.users-table tbody tr {
  transition: all 0.2s ease;
}

.users-table tbody tr:hover {
  background: #f8fafc !important;
}

.users-table tbody td {
  padding: 12px !important;
  border-bottom: 1px solid #f8fafc !important;
}

.user-row:last-child td {
  border-bottom: none !important;
}

.user-cell {
  display: flex;
  align-items: center;
}

.user-name {
  font-weight: 500;
  color: #1e293b;
  font-size: 13px;
}

.position-badge {
  font-weight: 500;
  font-size: 13px;
}

.email-cell {
  font-size: 12px;
}

/* Meetings Stats */
.meetings-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.stat-item {
  text-align: center;
  padding: 12px 4px;
  background: #f8fafc;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.stat-item:hover {
  background: #f1f5f9;
  transform: translateY(-2px);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 10px;
  color: #64748b;
  margin-top: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Priority Stats */
.priority-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 16px 0;
}

.priority-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.priority-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.priority-circle:hover {
  transform: scale(1.1);
}

.priority-value {
  font-size: 22px;
  font-weight: 700;
  color: white;
}

.priority-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 960px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .chart-row {
    flex-direction: column;
  }

  .meetings-stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .priority-stats {
    gap: 20px;
  }

  .priority-circle {
    width: 56px;
    height: 56px;
  }
}
</style>
