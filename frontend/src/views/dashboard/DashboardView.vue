<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { Line, Doughnut } from "vue-chartjs";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from "chart.js";
import { useAuthStore } from "@/stores/auth.store";
import { useTaskStore } from "@/stores/task.store";
import { meetingService } from "@/services/meeting.service";
import { userService } from "@/services/user.service";
import { useSnackbar } from "@/composables/useSnackbar";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

const authStore = useAuthStore();
const taskStore = useTaskStore();
const snackbar = useSnackbar();

const chartKey = ref(0);
const loading = ref(true);
const upcomingMeetings = ref<any[]>([]);
const teamMembers = ref<any[]>([]);

onMounted(async () => {
  await authStore.fetchProfile();
  await loadDashboardData();
  setTimeout(() => {
    chartKey.value++;
  }, 100);
});

const loadDashboardData = async () => {
  loading.value = true;
  try {
    await taskStore.fetchTasks();
    try {
      const meetings = await meetingService.getUpcoming();
      upcomingMeetings.value = (meetings || []).slice(0, 3);
    } catch {
      upcomingMeetings.value = [];
    }
    try {
      const usersRes = await userService.getAll({ pageSize: 4 });
      teamMembers.value = (usersRes.data || usersRes || []).slice(0, 4);
    } catch {
      teamMembers.value = [];
    }
  } catch (error) {
    snackbar.error("Failed to load dashboard data");
  } finally {
    loading.value = false;
  }
};

const userName = computed(
  () => authStore.user?.fullName || authStore.user?.username || "User"
);
const todayDate = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const totalTasks = computed(() => taskStore.tasks.length);
const completedTasks = computed(
  () => taskStore.tasks.filter((t) => t.status === "DONE").length
);
const completionRate = computed(() =>
  totalTasks.value
    ? Math.round((completedTasks.value / totalTasks.value) * 100)
    : 0
);

const tasksByPriority = computed(() => taskStore.tasksByPriority);

const tasksByStatus = computed(() => ({
  inProgress: taskStore.tasks.filter((t) => t.status === "IN_PROGRESS").length,
  notStarted: taskStore.tasks.filter((t) => t.status === "TODO").length,
  inReview: taskStore.tasks.filter((t) => t.status === "IN_REVIEW").length,
  cancelled: taskStore.tasks.filter((t) => t.status === "CANCELLED").length,
  completed: completedTasks.value,
}));

const activityData = ref({
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      label: "Tasks",
      data: [2, 3, 2, 4, 3, 5, 6],
      borderColor: "#f1184c",
      backgroundColor: "rgba(241, 24, 76, 0.1)",
      fill: true,
      tension: 0.4,
      pointBackgroundColor: "#f1184c",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      pointRadius: 5,
    },
  ],
});

const activityOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: "#F1F5F9" }, beginAtZero: true, max: 8 },
  },
};

const statusItems = computed(() => [
  {
    label: "In Progress",
    progress: totalTasks.value
      ? (tasksByStatus.value.inProgress / totalTasks.value) * 100
      : 0,
    color: "#10B981",
  },
  {
    label: "Not Started",
    progress: totalTasks.value
      ? (tasksByStatus.value.notStarted / totalTasks.value) * 100
      : 0,
    color: "#64748B",
  },
  {
    label: "In Review",
    progress: totalTasks.value
      ? (tasksByStatus.value.inReview / totalTasks.value) * 100
      : 0,
    color: "#FBBF24",
  },
  {
    label: "Cancelled",
    progress: totalTasks.value
      ? (tasksByStatus.value.cancelled / totalTasks.value) * 100
      : 0,
    color: "#EF4444",
  },
  { label: "Completed", progress: completionRate.value, color: "#10B981" },
]);
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-view-dashboard-outline" size="28" />
          </div>
          <div>
            <h1 class="page-title">Dashboard</h1>
            <p class="page-subtitle">{{ todayDate }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <v-row>
      <!-- Welcome Card -->
      <v-col cols="12" md="7">
        <v-card class="pa-5" rounded="xl">
          <div class="d-flex align-center">
            <img
              src="https://illustrations.popsy.co/violet/home-office.svg"
              alt="Welcome"
              style="width: 140px; height: 120px; object-fit: contain"
            />
            <div class="ml-4">
              <h2 class="text-h5 font-weight-bold mb-2">
                Welcome Back, {{ userName }}!
              </h2>
              <p class="text-body-2 text-grey mb-0">
                You have
                <span class="text-primary font-weight-medium"
                  >{{ totalTasks }} tasks</span
                >
                total. You have completed
                <span class="text-primary font-weight-medium"
                  >{{ completionRate }}%</span
                >
                of tasks. <br />Your progress is
                <span class="text-success font-weight-medium">{{
                  completionRate >= 70
                    ? "excellent"
                    : completionRate >= 40
                    ? "good"
                    : "getting started"
                }}</span
                >.
              </p>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Upcoming Meetings -->
      <v-col cols="12" md="5">
        <v-card class="pa-5" rounded="xl" style="height: 100%">
          <div class="d-flex align-center justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">Upcoming meetings</h3>
          </div>
          <div
            v-if="upcomingMeetings.length === 0"
            class="text-center text-grey py-4"
          >
            <v-icon icon="mdi-calendar-blank" size="32" class="mb-2" />
            <div>No upcoming meetings</div>
          </div>
          <div
            v-else
            v-for="meeting in upcomingMeetings"
            :key="meeting.meetingId"
            class="d-flex align-center justify-space-between mb-3"
          >
            <div class="d-flex align-center">
              <div
                style="
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  background: #f1184c;
                "
                class="mr-3"
              />
              <span class="text-body-2">{{ meeting.title }}</span>
            </div>
            <span class="text-caption text-grey">{{
              new Date(meeting.startTime).toLocaleDateString()
            }}</span>
          </div>
        </v-card>
      </v-col>

      <!-- Activity Chart -->
      <v-col cols="12" md="8">
        <v-card class="pa-5" rounded="xl">
          <div class="d-flex align-center justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">Activity</h3>
          </div>
          <div style="height: 200px">
            <Line
              :key="chartKey"
              :data="activityData"
              :options="activityOptions"
            />
          </div>
        </v-card>
      </v-col>

      <!-- Tasks Summary -->
      <v-col cols="12" md="4">
        <v-card class="pa-5" rounded="xl" style="height: 100%">
          <div class="d-flex align-center justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">Tasks</h3>
          </div>

          <!-- Tasks by Priority -->
          <div class="text-caption text-grey mb-2">Tasks by: priority</div>
          <div class="d-flex ga-3 mb-4">
            <div class="text-center">
              <div
                class="priority-circle"
                style="background: #ef444420; border-color: #ef4444"
              >
                <span
                  class="text-body-1 font-weight-bold"
                  style="color: #ef4444"
                  >{{ tasksByPriority.high }}</span
                >
              </div>
              <div class="text-caption text-grey mt-1">High</div>
            </div>
            <div class="text-center">
              <div
                class="priority-circle"
                style="background: #f1184c20; border-color: #f1184c"
              >
                <span
                  class="text-body-1 font-weight-bold"
                  style="color: #f1184c"
                  >{{ tasksByPriority.medium }}</span
                >
              </div>
              <div class="text-caption text-grey mt-1">Medium</div>
            </div>
            <div class="text-center">
              <div
                class="priority-circle"
                style="background: #10b98120; border-color: #10b981"
              >
                <span
                  class="text-body-1 font-weight-bold"
                  style="color: #10b981"
                  >{{ tasksByPriority.low }}</span
                >
              </div>
              <div class="text-caption text-grey mt-1">Low</div>
            </div>
            <div class="text-center">
              <div
                class="priority-circle"
                style="background: #f1f5f9; border-color: #64748b"
              >
                <span
                  class="text-body-1 font-weight-bold"
                  style="color: #64748b"
                  >{{ totalTasks }}</span
                >
              </div>
              <div class="text-caption text-grey mt-1">Total</div>
            </div>
          </div>

          <!-- Tasks by Completion -->
          <div class="text-caption text-grey mb-2">Tasks by: completion</div>
          <div class="d-flex flex-column ga-2">
            <div
              v-for="item in statusItems"
              :key="item.label"
              class="d-flex align-center justify-space-between"
            >
              <span class="text-caption" style="width: 80px">{{
                item.label
              }}</span>
              <div class="flex-grow-1 mx-2">
                <div class="completion-bar">
                  <div
                    class="completion-bar-fill"
                    :style="{
                      width: item.progress + '%',
                      backgroundColor: item.color,
                    }"
                  ></div>
                </div>
              </div>
              <span class="text-caption text-grey" style="width: 30px"
                >{{ Math.round(item.progress) }}%</span
              >
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Progress Card -->
      <v-col cols="12" md="3">
        <v-card class="pa-5 progress-card" rounded="xl">
          <h3 class="text-subtitle-1 font-weight-bold text-white mb-4">
            Progress
          </h3>
          <div class="d-flex justify-center ga-4 mb-4">
            <div class="text-center">
              <div class="progress-ring">
                <span class="text-h5 font-weight-bold text-white"
                  >{{ completionRate }}%</span
                >
              </div>
              <div class="text-caption text-white mt-2">Completed</div>
            </div>
          </div>
          <div class="d-flex justify-space-around text-white">
            <div class="text-center">
              <div class="text-h5 font-weight-bold">{{ totalTasks }}</div>
              <div class="text-caption">Tasks</div>
            </div>
            <div class="text-center">
              <div class="text-h5 font-weight-bold">{{ completedTasks }}</div>
              <div class="text-caption">Done</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- My Team -->
      <v-col cols="12" md="5">
        <v-card class="pa-5" rounded="xl">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">My Team</h3>
          <v-row v-if="teamMembers.length > 0">
            <v-col v-for="member in teamMembers" :key="member.userId" cols="6">
              <div
                class="d-flex align-center pa-2 rounded-lg"
                style="background: #f8fafc"
              >
                <v-avatar size="36" class="mr-2">
                  <v-img
                    v-if="member.profileImageUrl"
                    :src="member.profileImageUrl"
                  />
                  <span v-else>{{ member.fullName?.charAt(0) || "?" }}</span>
                </v-avatar>
                <div>
                  <div class="text-body-2 font-weight-medium">
                    {{ member.fullName || member.username }}
                  </div>
                  <div class="text-caption text-grey">
                    {{ member.position || "Team Member" }}
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
          <div v-else class="text-center text-grey py-4">
            No team members yet
          </div>
        </v-card>
      </v-col>

      <!-- Need Help -->
      <v-col cols="12" md="4">
        <v-card class="pa-5" rounded="xl">
          <div class="d-flex align-center">
            <img
              src="https://illustrations.popsy.co/violet/customer-support.svg"
              alt="Support"
              style="width: 100px; height: 80px; object-fit: contain"
            />
            <div class="ml-3">
              <h3 class="text-subtitle-1 font-weight-bold mb-1">Need help?</h3>
              <p class="text-caption text-grey mb-3">
                Having problem while using platform? Start a live chat with an
                agent now
              </p>
              <v-btn color="primary" size="small" rounded="lg" to="/chat"
                >Start Chat</v-btn
              >
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
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

.text-success {
  color: #10b981 !important;
}
.priority-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
}
.completion-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}
.completion-bar-fill {
  height: 100%;
  border-radius: 3px;
}
.progress-card {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
}
.progress-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
