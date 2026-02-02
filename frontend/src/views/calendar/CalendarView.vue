<script setup lang="ts">
import { ref, onMounted } from "vue";
import dayjs from "dayjs";
import { meetingService, type Meeting, type MeetingFilters } from "@/services/meeting.service";
import { userService } from "@/services/user.service";
import { useSnackbar } from "@/composables/useSnackbar";
import MeetingCalendar from "@/views/meetings/MeetingCalendar.vue";
import MeetingModal from "@/components/modals/MeetingModal.vue";
import ConfirmDialog from "@/components/modals/ConfirmDialog.vue";

const snackbar = useSnackbar();

const meetings = ref<Meeting[]>([]);
const loading = ref(false);
const modalLoading = ref(false);
const users = ref<any[]>([]);
const monthCache = ref<Record<string, Meeting[]>>({});

const showMeetingModal = ref(false);
const showDeleteDialog = ref(false);
const selectedMeeting = ref<Meeting | null>(null);
const initialDate = ref<string | undefined>(undefined);

// Track current month for fetching date-bounded meetings
const currentMonth = ref(dayjs());

const loadUsers = async () => {
  try {
    const response = await userService.getAll();
    users.value = response.data || response;
  } catch (e) {
    users.value = [];
  }
};

const fetchMeetingsPaged = async (filters: MeetingFilters) => {
  const pageSize = 100;
  let page = 1;
  const collected: Meeting[] = [];
  let total = Number.POSITIVE_INFINITY;
  const safetyLimit = 1000; // guard against unbounded fetch

  while (collected.length < total && collected.length < safetyLimit) {
    const response = await meetingService.getAll({ ...filters, page, pageSize });
    const pageData = (response as any)?.data ?? [];
    const pageTotal = (response as any)?.total ?? pageData.length ?? 0;

    collected.push(...pageData);
    total = pageTotal;

    if (pageData.length < pageSize) break;
    page += 1;
  }

  return collected;
};

const fetchMeetings = async (targetDate?: dayjs.Dayjs, forceReload = false) => {
  loading.value = true;
  try {
    const monthRef = targetDate || currentMonth.value;
    currentMonth.value = monthRef;

    // Align fetch window with the calendar grid (42 days covering spillover)
    const monthStart = monthRef.startOf("month");
    const start = monthStart.subtract(monthStart.day(), "day");
    const end = start.add(41, "day");

    const filters: MeetingFilters = {
      startDate: start.format("YYYY-MM-DD"),
      endDate: end.format("YYYY-MM-DD"),
      pageSize: 200,
    };

    const cacheKey = `${filters.startDate}:${filters.endDate}`;
    if (!forceReload && monthCache.value[cacheKey]) {
      meetings.value = monthCache.value[cacheKey];
      return;
    }

    const fetched = await fetchMeetingsPaged(filters);
    meetings.value = fetched;
    monthCache.value[cacheKey] = fetched;
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to load meetings");
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await Promise.all([fetchMeetings(), loadUsers()]);
});

const handleDateClick = async (dateStr: string) => {
  await loadUsers();
  initialDate.value = dateStr;
  selectedMeeting.value = null;
  showMeetingModal.value = true;
};

const handleEventClick = async (meeting: Meeting) => {
  await loadUsers();
  selectedMeeting.value = {
    ...meeting,
    attendeeIds: meeting.attendees.map((a) => a.userId),
  } as any;
  initialDate.value = undefined;
  showMeetingModal.value = true;
};

const handleSaveMeeting = async (data: any) => {
  modalLoading.value = true;
  try {
    if (data.meetingId) {
      await meetingService.update(data.meetingId, data);
      snackbar.success("Meeting updated successfully!");
    } else {
      await meetingService.create(data);
      snackbar.success("Meeting scheduled successfully!");
    }
    showMeetingModal.value = false;
    await fetchMeetings(undefined, true);
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to save meeting");
  } finally {
    modalLoading.value = false;
  }
};

const openDeleteDialog = () => {
  showDeleteDialog.value = true;
};

const handleDeleteMeeting = async () => {
  if (!selectedMeeting.value) return;
  modalLoading.value = true;
  try {
    await meetingService.delete(selectedMeeting.value.meetingId);
    snackbar.success("Meeting deleted successfully!");
    showDeleteDialog.value = false;
    showMeetingModal.value = false;
    selectedMeeting.value = null;
    await fetchMeetings(undefined, true);
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to delete meeting");
  } finally {
    modalLoading.value = false;
  }
};

const handleMonthChange = (dateStr: string) => {
  const target = dayjs(dateStr);
  fetchMeetings(target);
};
</script>

<template>
  <div class="calendar-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-calendar-month" size="28" />
          </div>
          <div>
            <h1 class="page-title">Calendar</h1>
            <p class="page-subtitle">View meetings by month and schedule new events directly from the calendar</p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <v-btn 
          class="schedule-btn" 
          prepend-icon="mdi-plus" 
          rounded="lg" 
          size="default"
          elevation="0"
          @click="handleDateClick(currentMonth.format('YYYY-MM-DD'))"
        >
          Schedule Meeting
        </v-btn>
      </div>
    </div>

    <!-- Loading -->
    <v-progress-linear 
      v-if="loading" 
      indeterminate 
      color="primary" 
      class="mb-6"
      height="3"
      rounded
    />

    <!-- Calendar -->
    <MeetingCalendar
      :meetings="meetings"
      @date-click="handleDateClick"
      @event-click="handleEventClick"
      @change-month="handleMonthChange"
    />

    <!-- Meeting Modal -->
    <MeetingModal
      v-model="showMeetingModal"
      :meeting="selectedMeeting"
      :users="users"
      :loading="modalLoading"
      :initial-date="initialDate"
      :allow-delete="!!selectedMeeting"
      @save="handleSaveMeeting"
      @delete="openDeleteDialog"
    />

    <!-- Delete Confirmation -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Delete Meeting"
      message="Are you sure you want to delete this meeting? All attendees will be notified."
      confirm-text="Delete"
      confirm-color="error"
      :loading="modalLoading"
      @confirm="handleDeleteMeeting"
    />
  </div>
</template>

<style scoped>
/* Page Layout */
.calendar-page {
  padding: 0;
  min-height: 100%;
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
  gap: 12px;
}

.schedule-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  text-transform: none;
  padding: 0 20px;
  height: 42px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.schedule-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: flex-end;
  }
}
</style>

