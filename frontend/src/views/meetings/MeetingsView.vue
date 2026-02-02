<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { meetingService, type Meeting, type MeetingFilters, type MeetingAttachment } from "@/services/meeting.service";
import { userService } from "@/services/user.service";
import { useSnackbar } from "@/composables/useSnackbar";
import { useAuthStore } from "@/stores/auth.store";
import MeetingModal from "@/components/modals/MeetingModal.vue";
import ConfirmDialog from "@/components/modals/ConfirmDialog.vue";
import MeetingCalendar from "./MeetingCalendar.vue";

const snackbar = useSnackbar();
const authStore = useAuthStore();

const viewMode = ref<"list" | "grid" | "calendar">("grid");
const meetings = ref<Meeting[]>([]);
const loading = ref(false);
const totalMeetings = ref(0);

// Filters
const statusFilter = ref("");
const dateRange = ref<string[]>([]);

// Modal state
const showMeetingModal = ref(false);
const showDeleteDialog = ref(false);
const selectedMeeting = ref<Meeting | null>(null);
const users = ref<any[]>([]);
const modalLoading = ref(false);

// Meeting Detail Dialog state
const showDetailDialog = ref(false);
const detailMeeting = ref<Meeting | null>(null);
const attachments = ref<MeetingAttachment[]>([]);
const attachmentsLoading = ref(false);

// Image Preview Lightbox state
const previewDialog = ref(false);
const previewImage = ref("");
const previewIndex = ref(0);

// Current user ID for checking if user is organizer
const currentUserId = computed(() => authStore.user?.userId?.toString() || "");

// Computed: filter image attachments
const imageAttachments = computed(() => 
  attachments.value.filter(a => isImage(a.mimeType))
);

// Computed: filter non-image attachments
const fileAttachments = computed(() => 
  attachments.value.filter(a => !isImage(a.mimeType))
);

onMounted(async () => {
  await loadData();
});

const loadData = async () => {
  loading.value = true;
  try {
    const filters: MeetingFilters = {};
    if (statusFilter.value) filters.status = statusFilter.value;
    if (dateRange.value.length === 2) {
      filters.startDate = dateRange.value[0];
      filters.endDate = dateRange.value[1];
    }
    
    const response = await meetingService.getAll(filters);
    meetings.value = response.data;
    totalMeetings.value = response.total;
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to load meetings");
  } finally {
    loading.value = false;
  }
};

const loadUsers = async () => {
  try {
    const response = await userService.getAll();
    users.value = response.data || response;
  } catch (e) {
    users.value = [];
  }
};

// Load attachments for a meeting
const loadAttachments = async (meetingId: string) => {
  attachmentsLoading.value = true;
  try {
    attachments.value = await meetingService.getAttachments(meetingId);
  } catch (error: any) {
    console.error("Failed to load attachments:", error);
    attachments.value = [];
  } finally {
    attachmentsLoading.value = false;
  }
};

// Open meeting detail dialog
const openMeetingDetail = async (meeting: Meeting) => {
  detailMeeting.value = meeting;
  showDetailDialog.value = true;
  await loadAttachments(meeting.meetingId);
};

// Close meeting detail dialog
const closeDetailDialog = () => {
  showDetailDialog.value = false;
  detailMeeting.value = null;
  attachments.value = [];
};

// Edit meeting from detail dialog
const editFromDetail = async () => {
  const meeting = detailMeeting.value;
  if (meeting) {
    showDetailDialog.value = false;
    detailMeeting.value = null;
    attachments.value = [];
    await openEditModal(meeting);
  }
};

// Image preview functions
const openPreview = (url: string, index: number) => {
  previewImage.value = url;
  previewIndex.value = index;
  previewDialog.value = true;
};

const navigatePreview = (direction: number) => {
  const newIndex = previewIndex.value + direction;
  if (newIndex >= 0 && newIndex < imageAttachments.value.length) {
    previewIndex.value = newIndex;
    const img = imageAttachments.value[newIndex];
    if (img) {
      previewImage.value = img.publicUrl || img.filePath;
    }
  }
};

// Download file attachment
const downloadAttachment = (attachment: MeetingAttachment) => {
  const url = attachment.publicUrl || attachment.filePath;
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.fileName;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// File helpers
const isImage = (mimeType: string | null): boolean => {
  if (!mimeType) return false;
  return mimeType.startsWith("image/");
};

const isPdf = (mimeType: string | null): boolean => {
  if (!mimeType) return false;
  return mimeType === "application/pdf";
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const getFileIcon = (mimeType: string | null): string => {
  if (isPdf(mimeType)) return "mdi-file-pdf-box";
  if (mimeType?.includes("word") || mimeType?.includes("document")) return "mdi-file-word-box";
  if (mimeType?.includes("excel") || mimeType?.includes("spreadsheet")) return "mdi-file-excel-box";
  if (mimeType?.includes("powerpoint") || mimeType?.includes("presentation")) return "mdi-file-powerpoint-box";
  if (mimeType?.includes("zip") || mimeType?.includes("rar") || mimeType?.includes("archive")) return "mdi-folder-zip";
  return "mdi-file-document-outline";
};

const getFileIconColor = (mimeType: string | null): string => {
  if (isPdf(mimeType)) return "#EF4444";
  if (mimeType?.includes("word") || mimeType?.includes("document")) return "#2563EB";
  if (mimeType?.includes("excel") || mimeType?.includes("spreadsheet")) return "#22C55E";
  if (mimeType?.includes("powerpoint") || mimeType?.includes("presentation")) return "#F97316";
  return "#64748B";
};

// Stats computed from actual data
const stats = computed(() => {
  const scheduled = meetings.value.filter(m => m.status === "SCHEDULED").length;
  const inProgress = meetings.value.filter(m => m.status === "IN_PROGRESS").length;
  const completed = meetings.value.filter(m => m.status === "COMPLETED").length;
  const cancelled = meetings.value.filter(m => m.status === "CANCELLED").length;

  return [
    { label: "Scheduled", value: scheduled, color: "#f1184c" },
    { label: "In Progress", value: inProgress, color: "#ff6b8a" },
    { label: "Cancelled", value: cancelled, color: "#EF4444" },
    { label: "Completed", value: completed, color: "#10B981" },
  ];
});

// Modal actions
// Modal actions
const openCreateModal = async (dateStr?: string) => {
  await loadUsers();
  selectedMeeting.value = null;
  // If dateStr provided (from calendar click), pre-fill date
  if (dateStr) {
    // We'll need to modify the MeetingModal to accept an initial date
    // For now, we manually construct a partial meeting object or handle it in the modal
  }
  showMeetingModal.value = true;
};

const openEditModal = async (meeting: Meeting) => {
  await loadUsers();
  // Map attendees to attendeeIds for the modal
  const meetingForEdit = {
    ...meeting,
    attendeeIds: meeting.attendees.map(a => a.userId),
  };
  selectedMeeting.value = meetingForEdit as any;
  showMeetingModal.value = true;
};

const openDeleteDialog = (meeting: Meeting) => {
  selectedMeeting.value = meeting;
  showDeleteDialog.value = true;
};

const handleSaveMeeting = async (data: any) => {
  modalLoading.value = true;
  try {
    // Extract files and non-API fields from data before sending
    const { files, meetingId, attendeeIds, ...baseData } = data;
    
    let savedMeeting;
    if (meetingId) {
      // For updates, only send allowed fields (exclude meetingId as it's in URL)
      savedMeeting = await meetingService.update(meetingId, baseData);
      
      // Sync attendees - add new ones that aren't already in the meeting
      if (attendeeIds && attendeeIds.length > 0) {
        // Get current meeting to find existing attendees
        const currentMeeting = meetings.value.find(m => m.meetingId === meetingId);
        const existingAttendeeIds = currentMeeting?.attendees.map(a => a.userId) || [];
        
        // Find new attendees to add
        const newAttendeeIds = attendeeIds.filter((id: string) => !existingAttendeeIds.includes(id));
        
        // Add each new attendee
        for (const userId of newAttendeeIds) {
          try {
            await meetingService.addAttendee(meetingId, userId);
          } catch (err: any) {
            // Ignore conflict errors (user already added)
            if (err.response?.status !== 409) {
              console.error('Failed to add attendee:', err);
            }
          }
        }
      }
      
      snackbar.success("Meeting updated successfully!");
    } else {
      // For create, include attendeeIds
      const createData = attendeeIds ? { ...baseData, attendeeIds } : baseData;
      savedMeeting = await meetingService.create(createData);
      snackbar.success("Meeting scheduled successfully!");
    }
    
    // Upload attachments if any files were selected
    if (files && files.length > 0) {
      try {
        await meetingService.uploadAttachments(savedMeeting.meetingId, files);
        snackbar.success(`${files.length} file(s) uploaded successfully!`);
      } catch (uploadError: any) {
        console.error('Failed to upload attachments:', uploadError);
        snackbar.warning(`Meeting saved but some files failed to upload`);
      }
    }
    
    showMeetingModal.value = false;
    await loadData();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to save meeting");
  } finally {
    modalLoading.value = false;
  }
};

const handleDeleteMeeting = async () => {
  if (!selectedMeeting.value) return;
  modalLoading.value = true;
  try {
    await meetingService.delete(selectedMeeting.value.meetingId);
    snackbar.success("Meeting deleted successfully!");
    showDeleteDialog.value = false;
    await loadData();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to delete meeting");
  } finally {
    modalLoading.value = false;
  }
};

// RSVP actions
const handleRSVP = async (meeting: Meeting, status: "ACCEPTED" | "DECLINED" | "TENTATIVE") => {
  try {
    await meetingService.respondToMeeting(meeting.meetingId, status);
    const statusText = status === "ACCEPTED" ? "accepted" : status === "DECLINED" ? "declined" : "marked as tentative";
    snackbar.success(`Meeting ${statusText}!`);
    await loadData();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to respond to meeting");
  }
};

// Helper functions
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    SCHEDULED: "#f1184c",
    IN_PROGRESS: "#ff6b8a",
    COMPLETED: "#10B981",
    CANCELLED: "#EF4444",
  };
  return colors[status] || "#64748B";
};

const getStatusBg = (status: string) => {
  const colors: Record<string, string> = {
    SCHEDULED: "rgba(241, 24, 76, 0.1)",
    IN_PROGRESS: "rgba(255, 107, 138, 0.1)",
    COMPLETED: "rgba(16, 185, 129, 0.1)",
    CANCELLED: "rgba(239, 68, 68, 0.1)",
  };
  return colors[status] || "rgba(100, 116, 139, 0.1)";
};

const getAttendeeStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    ACCEPTED: "#10B981",
    DECLINED: "#EF4444",
    TENTATIVE: "#F59E0B",
    PENDING: "#64748B",
  };
  return colors[status] || "#64748B";
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatStatus = (status: string) => {
  return status.replace("_", " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

// Check if current user is invited (has pending status)
const getUserAttendeeStatus = (meeting: Meeting): string | null => {
  const attendee = meeting.attendees.find(a => a.userId === currentUserId.value);
  return attendee?.status || null;
};

const isOrganizer = (meeting: Meeting) => {
  return meeting.createdBy === currentUserId.value;
};

// Filter handler
const handleFilterChange = () => {
  loadData();
};

// Helper for stat icons
const getStatIcon = (index: number): string => {
  const icons = [
    'mdi-calendar-check',
    'mdi-progress-clock',
    'mdi-calendar-remove',
    'mdi-check-circle',
  ];
  return icons[index] || 'mdi-calendar';
};

// Helper for status icons
const getStatusIcon = (status: string): string => {
  const icons: Record<string, string> = {
    SCHEDULED: 'mdi-clock-outline',
    IN_PROGRESS: 'mdi-play-circle-outline',
    COMPLETED: 'mdi-check-circle-outline',
    CANCELLED: 'mdi-close-circle-outline',
    ACCEPTED: 'mdi-check',
    DECLINED: 'mdi-close',
    TENTATIVE: 'mdi-help',
    PENDING: 'mdi-clock-outline',
  };
  return icons[status] || 'mdi-circle-outline';
};

// Helper for status gradients
const getStatusGradient = (status: string): string => {
  const gradients: Record<string, string> = {
    SCHEDULED: 'linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%)',
    IN_PROGRESS: 'linear-gradient(135deg, #ff6b8a 0%, #A855F7 100%)',
    COMPLETED: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    CANCELLED: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  };
  return gradients[status] || 'linear-gradient(135deg, #64748B 0%, #475569 100%)';
};
</script>

<template>
  <div class="meetings-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-calendar-clock" size="28" />
          </div>
          <div>
            <h1 class="page-title">Meetings</h1>
            <p class="page-subtitle">Schedule and manage your team meetings</p>
          </div>
        </div>
        <div class="view-toggle">
          <span
            class="view-toggle-item"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            <v-icon icon="mdi-format-list-bulleted" size="16" class="mr-1" />
            List
          </span>
          <span
            class="view-toggle-item"
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
          >
            <v-icon icon="mdi-view-grid" size="16" class="mr-1" />
            Grid
          </span>
          <span
            class="view-toggle-item"
            :class="{ active: viewMode === 'calendar' }"
            @click="viewMode = 'calendar'"
          >
            <v-icon icon="mdi-calendar-month" size="16" class="mr-1" />
            Calendar
          </span>
        </div>
      </div>
      <div class="header-actions">
        <v-select
          v-model="statusFilter"
          :items="[
            { title: 'All Status', value: '' },
            { title: 'Scheduled', value: 'SCHEDULED' },
            { title: 'In Progress', value: 'IN_PROGRESS' },
            { title: 'Completed', value: 'COMPLETED' },
            { title: 'Cancelled', value: 'CANCELLED' },
          ]"
          label="Status"
          variant="outlined"
          density="compact"
          hide-details
          class="status-filter"
          @update:model-value="handleFilterChange"
        />
        <v-btn 
          class="schedule-btn" 
          prepend-icon="mdi-plus" 
          rounded="lg" 
          size="default"
          elevation="0"
          @click="openCreateModal"
        >
          Schedule Meeting
        </v-btn>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div 
        v-for="(stat, index) in stats" 
        :key="stat.label" 
        class="stat-card"
        :class="`stat-card-${index}`"
      >
        <div class="stat-icon-wrapper">
          <v-icon 
            :icon="getStatIcon(index)" 
            size="24" 
            class="stat-icon"
          />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
        <div class="stat-decoration"></div>
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

    <!-- Empty State -->
    <div v-if="!loading && meetings.length === 0" class="empty-state">
      <div class="empty-state-content">
        <div class="empty-icon-wrapper">
          <v-icon icon="mdi-calendar-blank-multiple" size="80" class="empty-icon" />
          <div class="empty-icon-ring"></div>
        </div>
        <h3 class="empty-title">No Meetings Found</h3>
        <p class="empty-description">
          Get started by scheduling your first meeting.<br />
          Invite team members and keep everyone in sync.
        </p>
        <v-btn 
          class="schedule-btn" 
          prepend-icon="mdi-plus" 
          size="large"
          rounded="lg"
          elevation="0"
          @click="openCreateModal"
        >
          Schedule Your First Meeting
        </v-btn>
      </div>
      <div class="empty-pattern"></div>
    </div>

    <!-- Grid View -->
    <div v-if="viewMode === 'grid' && meetings.length > 0" class="meetings-grid">
      <v-card
        v-for="meeting in meetings"
        :key="meeting.meetingId"
        class="meeting-card"
        rounded="xl"
        @click="openMeetingDetail(meeting)"
      >
        <!-- Card accent stripe -->
        <div class="card-accent" :style="{ background: getStatusGradient(meeting.status) }"></div>
        
        <div class="meeting-card-content">
          <!-- Header -->
          <div class="meeting-header">
            <v-chip
              size="small"
              class="status-chip"
              :style="{
                backgroundColor: getStatusBg(meeting.status),
                color: getStatusColor(meeting.status),
              }"
            >
              <v-icon :icon="getStatusIcon(meeting.status)" size="12" class="mr-1" />
              {{ formatStatus(meeting.status) }}
            </v-chip>
            <v-menu v-if="isOrganizer(meeting)">
              <template #activator="{ props }">
                <v-btn icon variant="text" size="x-small" class="menu-btn" v-bind="props">
                  <v-icon icon="mdi-dots-vertical" size="18" />
                </v-btn>
              </template>
              <v-list density="compact" class="action-menu">
                <v-list-item
                  title="Edit Meeting"
                  prepend-icon="mdi-pencil-outline"
                  @click="openEditModal(meeting)"
                />
                <v-list-item
                  title="Delete Meeting"
                  prepend-icon="mdi-delete-outline"
                  class="text-error"
                  @click="openDeleteDialog(meeting)"
                />
              </v-list>
            </v-menu>
          </div>

          <!-- Title -->
          <h3 class="meeting-title">{{ meeting.title }}</h3>

          <!-- Description -->
          <p v-if="meeting.description" class="meeting-description">
            {{ meeting.description }}
          </p>

          <!-- Meeting Details -->
          <div class="meeting-details">
            <div class="detail-item">
              <v-icon icon="mdi-calendar-outline" size="16" class="detail-icon" />
              <span>{{ formatDate(meeting.startTime) }}</span>
            </div>
            <div class="detail-item">
              <v-icon icon="mdi-clock-outline" size="16" class="detail-icon" />
              <span>{{ formatTime(meeting.startTime) }} - {{ formatTime(meeting.endTime) }}</span>
            </div>
            <div v-if="meeting.location" class="detail-item">
              <v-icon icon="mdi-map-marker-outline" size="16" class="detail-icon" />
              <span>{{ meeting.location }}</span>
            </div>
            <div v-if="meeting.meetingUrl" class="detail-item">
              <v-icon icon="mdi-video-outline" size="16" class="detail-icon" />
              <a :href="meeting.meetingUrl" target="_blank" class="meeting-link">Join Meeting</a>
            </div>
          </div>

          <!-- Organizer & Attendees -->
          <div class="meeting-footer">
            <div class="organizer-section">
              <v-avatar size="24" class="organizer-avatar">
                <v-img v-if="meeting.organizer.profileImageUrl" :src="meeting.organizer.profileImageUrl" />
                <span v-else class="avatar-initial">{{ (meeting.organizer.fullName || meeting.organizer.username).charAt(0) }}</span>
              </v-avatar>
              <span class="organizer-name">{{ meeting.organizer.fullName || meeting.organizer.username }}</span>
            </div>
            <div class="attendees-section">
              <div class="avatar-stack">
                <v-avatar
                  v-for="(attendee, idx) in meeting.attendees.slice(0, 3)"
                  :key="idx"
                  size="28"
                  class="attendee-avatar"
                  :style="{ borderColor: getAttendeeStatusColor(attendee.status) }"
                >
                  <v-img v-if="attendee.profileImageUrl" :src="attendee.profileImageUrl" />
                  <span v-else class="avatar-initial">{{ (attendee.fullName || attendee.username).charAt(0) }}</span>
                  <v-tooltip activator="parent" location="top">
                    {{ attendee.fullName || attendee.username }} - {{ formatStatus(attendee.status) }}
                  </v-tooltip>
                </v-avatar>
                <div v-if="meeting.attendees.length > 3" class="attendee-overflow">
                  +{{ meeting.attendees.length - 3 }}
                </div>
              </div>
            </div>
          </div>

          <!-- RSVP Actions (for non-organizers with pending status) -->
          <div v-if="!isOrganizer(meeting) && getUserAttendeeStatus(meeting) === 'PENDING'" class="rsvp-section">
            <div class="rsvp-label">Respond to invitation</div>
            <div class="rsvp-actions">
              <v-btn
                size="small"
                class="rsvp-btn rsvp-accept"
                variant="flat"
                @click="handleRSVP(meeting, 'ACCEPTED')"
              >
                <v-icon icon="mdi-check" size="16" class="mr-1" />
                Accept
              </v-btn>
              <v-btn
                size="small"
                class="rsvp-btn rsvp-maybe"
                variant="flat"
                @click="handleRSVP(meeting, 'TENTATIVE')"
              >
                <v-icon icon="mdi-help" size="16" class="mr-1" />
                Maybe
              </v-btn>
              <v-btn
                size="small"
                class="rsvp-btn rsvp-decline"
                variant="flat"
                @click="handleRSVP(meeting, 'DECLINED')"
              >
                <v-icon icon="mdi-close" size="16" class="mr-1" />
                Decline
              </v-btn>
            </div>
          </div>

          <!-- Your Response Status (if not pending) -->
          <div v-else-if="!isOrganizer(meeting) && getUserAttendeeStatus(meeting)" class="response-section">
            <v-chip
              size="small"
              class="response-chip"
              :style="{
                backgroundColor: getStatusBg(getUserAttendeeStatus(meeting) || ''),
                color: getAttendeeStatusColor(getUserAttendeeStatus(meeting) || ''),
              }"
            >
              <v-icon 
                :icon="getUserAttendeeStatus(meeting) === 'ACCEPTED' ? 'mdi-check-circle' : getUserAttendeeStatus(meeting) === 'DECLINED' ? 'mdi-close-circle' : 'mdi-help-circle'" 
                size="14" 
                class="mr-1" 
              />
              Your response: {{ formatStatus(getUserAttendeeStatus(meeting) || '') }}
            </v-chip>
          </div>
        </div>
      </v-card>
    </div>

    <!-- List View -->
    <v-card v-if="viewMode === 'list' && meetings.length > 0" rounded="xl" class="list-view-card">
      <div class="list-header">
        <v-icon icon="mdi-format-list-bulleted-square" size="20" class="mr-2" />
        All Meetings
        <v-chip size="x-small" class="ml-2" color="primary" variant="tonal">{{ meetings.length }}</v-chip>
      </div>
      <v-table class="meetings-table" hover>
        <thead>
          <tr>
            <th class="table-header">Meeting</th>
            <th class="table-header">Date & Time</th>
            <th class="table-header">Location</th>
            <th class="table-header">Organizer</th>
            <th class="table-header">Attendees</th>
            <th class="table-header">Status</th>
            <th class="table-header text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="meeting in meetings" :key="meeting.meetingId" class="table-row">
            <td class="table-cell">
              <div class="meeting-info">
                <div class="meeting-info-title">{{ meeting.title }}</div>
                <div v-if="meeting.description" class="meeting-info-desc">
                  {{ meeting.description.slice(0, 50) }}{{ meeting.description.length > 50 ? '...' : '' }}
                </div>
              </div>
            </td>
            <td class="table-cell">
              <div class="datetime-info">
                <div class="datetime-date">
                  <v-icon icon="mdi-calendar" size="14" class="mr-1" />
                  {{ formatDate(meeting.startTime) }}
                </div>
                <div class="datetime-time">{{ formatTime(meeting.startTime) }} - {{ formatTime(meeting.endTime) }}</div>
              </div>
            </td>
            <td class="table-cell">
              <div v-if="meeting.location" class="location-info">
                <v-icon icon="mdi-map-marker" size="14" class="mr-1" />
                {{ meeting.location }}
              </div>
              <a v-else-if="meeting.meetingUrl" :href="meeting.meetingUrl" target="_blank" class="meeting-link">
                <v-icon icon="mdi-video" size="14" class="mr-1" />
                Online
              </a>
              <span v-else class="text-grey-lighten-1">—</span>
            </td>
            <td class="table-cell">
              <div class="organizer-cell">
                <v-avatar size="24" class="organizer-avatar-small">
                  <v-img v-if="meeting.organizer.profileImageUrl" :src="meeting.organizer.profileImageUrl" />
                  <span v-else class="avatar-initial-small">{{ (meeting.organizer.fullName || meeting.organizer.username).charAt(0) }}</span>
                </v-avatar>
                <span class="organizer-name-small">{{ meeting.organizer.fullName || meeting.organizer.username }}</span>
              </div>
            </td>
            <td class="table-cell">
              <div class="avatar-stack-small">
                <v-avatar
                  v-for="(attendee, idx) in meeting.attendees.slice(0, 3)"
                  :key="idx"
                  size="24"
                  class="attendee-avatar-small"
                >
                  <v-img v-if="attendee.profileImageUrl" :src="attendee.profileImageUrl" />
                  <span v-else class="avatar-initial-small">{{ (attendee.fullName || attendee.username).charAt(0) }}</span>
                  <v-tooltip activator="parent">{{ attendee.fullName || attendee.username }}</v-tooltip>
                </v-avatar>
                <div v-if="meeting.attendees.length > 3" class="attendee-overflow-small">
                  +{{ meeting.attendees.length - 3 }}
                </div>
              </div>
            </td>
            <td class="table-cell">
              <v-chip
                size="small"
                class="status-chip"
                :style="{
                  backgroundColor: getStatusBg(meeting.status),
                  color: getStatusColor(meeting.status),
                }"
              >
                <v-icon :icon="getStatusIcon(meeting.status)" size="12" class="mr-1" />
                {{ formatStatus(meeting.status) }}
              </v-chip>
            </td>
            <td class="table-cell text-center">
              <div class="action-buttons">
                <!-- RSVP for pending invitations -->
                <template v-if="!isOrganizer(meeting) && getUserAttendeeStatus(meeting) === 'PENDING'">
                  <v-btn icon size="x-small" class="action-btn accept-btn" @click="handleRSVP(meeting, 'ACCEPTED')">
                    <v-icon icon="mdi-check" size="16" />
                    <v-tooltip activator="parent">Accept</v-tooltip>
                  </v-btn>
                  <v-btn icon size="x-small" class="action-btn decline-btn" @click="handleRSVP(meeting, 'DECLINED')">
                    <v-icon icon="mdi-close" size="16" />
                    <v-tooltip activator="parent">Decline</v-tooltip>
                  </v-btn>
                </template>
                <!-- Edit/Delete for organizers -->
                <template v-if="isOrganizer(meeting)">
                  <v-btn icon size="x-small" class="action-btn edit-btn" @click="openEditModal(meeting)">
                    <v-icon icon="mdi-pencil-outline" size="16" />
                    <v-tooltip activator="parent">Edit</v-tooltip>
                  </v-btn>
                  <v-btn icon size="x-small" class="action-btn delete-btn" @click="openDeleteDialog(meeting)">
                    <v-icon icon="mdi-delete-outline" size="16" />
                    <v-tooltip activator="parent">Delete</v-tooltip>
                  </v-btn>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Calendar View -->
    <div v-if="viewMode === 'calendar'" class="calendar-wrapper">
      <MeetingCalendar
        :meetings="meetings"
        @date-click="openCreateModal"
        @event-click="openEditModal"
        @change-month="(date) => { /* Optional: fetch data for new month if using pagination */ }"
      />
    </div>

    <!-- Meeting Modal -->
    <MeetingModal
      v-model="showMeetingModal"
      :meeting="selectedMeeting"
      :users="users"
      :loading="modalLoading"
      @save="handleSaveMeeting"
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

    <!-- Meeting Detail Dialog -->
    <v-dialog v-model="showDetailDialog" max-width="900" scrollable>
      <v-card v-if="detailMeeting" class="detail-dialog-card" rounded="xl">
        <!-- Header with gradient -->
        <div class="detail-header" :style="{ background: getStatusGradient(detailMeeting.status) }">
          <div class="detail-header-content">
            <div class="detail-header-icon">
              <v-icon icon="mdi-calendar-clock" size="28" />
            </div>
            <div class="detail-header-text">
              <h2 class="detail-title">{{ detailMeeting.title }}</h2>
              <div class="detail-meta">
                <v-chip
                  size="small"
                  class="status-chip-light"
                >
                  <v-icon :icon="getStatusIcon(detailMeeting.status)" size="12" class="mr-1" />
                  {{ formatStatus(detailMeeting.status) }}
                </v-chip>
              </div>
            </div>
          </div>
          <v-btn icon variant="text" class="detail-close-btn" @click="closeDetailDialog">
            <v-icon icon="mdi-close" />
          </v-btn>
        </div>

        <v-card-text class="detail-body">
          <!-- Meeting Info Grid -->
          <div class="detail-section">
            <div class="detail-section-header">
              <div class="detail-section-icon">
                <v-icon icon="mdi-information-outline" size="18" />
              </div>
              <span class="detail-section-title">Meeting Details</span>
            </div>
            <div class="detail-info-grid">
              <div class="detail-info-item">
                <v-icon icon="mdi-calendar" size="18" class="detail-info-icon" />
                <div>
                  <div class="detail-info-label">Date</div>
                  <div class="detail-info-value">{{ formatDate(detailMeeting.startTime) }}</div>
                </div>
              </div>
              <div class="detail-info-item">
                <v-icon icon="mdi-clock-outline" size="18" class="detail-info-icon" />
                <div>
                  <div class="detail-info-label">Time</div>
                  <div class="detail-info-value">{{ formatTime(detailMeeting.startTime) }} - {{ formatTime(detailMeeting.endTime) }}</div>
                </div>
              </div>
              <div v-if="detailMeeting.location" class="detail-info-item">
                <v-icon icon="mdi-map-marker" size="18" class="detail-info-icon" />
                <div>
                  <div class="detail-info-label">Location</div>
                  <div class="detail-info-value">{{ detailMeeting.location }}</div>
                </div>
              </div>
              <div v-if="detailMeeting.meetingUrl" class="detail-info-item">
                <v-icon icon="mdi-video" size="18" class="detail-info-icon" />
                <div>
                  <div class="detail-info-label">Meeting Link</div>
                  <a :href="detailMeeting.meetingUrl" target="_blank" class="detail-info-link">Join Meeting</a>
                </div>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div v-if="detailMeeting.description" class="detail-section">
            <div class="detail-section-header">
              <div class="detail-section-icon purple">
                <v-icon icon="mdi-text" size="18" />
              </div>
              <span class="detail-section-title">Description</span>
            </div>
            <p class="detail-description">{{ detailMeeting.description }}</p>
          </div>

          <!-- Agenda -->
          <div v-if="detailMeeting.agenda" class="detail-section">
            <div class="detail-section-header">
              <div class="detail-section-icon green">
                <v-icon icon="mdi-format-list-bulleted" size="18" />
              </div>
              <span class="detail-section-title">Agenda</span>
            </div>
            <p class="detail-description">{{ detailMeeting.agenda }}</p>
          </div>

          <!-- Organizer & Attendees -->
          <div class="detail-section">
            <div class="detail-section-header">
              <div class="detail-section-icon orange">
                <v-icon icon="mdi-account-group" size="18" />
              </div>
              <span class="detail-section-title">Participants</span>
            </div>
            <div class="participants-grid">
              <!-- Organizer -->
              <div class="participant-card organizer">
                <v-avatar size="40">
                  <v-img v-if="detailMeeting.organizer.profileImageUrl" :src="detailMeeting.organizer.profileImageUrl" />
                  <span v-else class="avatar-initial-lg">{{ (detailMeeting.organizer.fullName || detailMeeting.organizer.username).charAt(0) }}</span>
                </v-avatar>
                <div class="participant-info">
                  <div class="participant-name">{{ detailMeeting.organizer.fullName || detailMeeting.organizer.username }}</div>
                  <v-chip size="x-small" class="organizer-badge">Organizer</v-chip>
                </div>
              </div>
              <!-- Attendees -->
              <div
                v-for="attendee in detailMeeting.attendees"
                :key="attendee.id"
                class="participant-card"
              >
                <v-avatar size="40" :style="{ borderColor: getAttendeeStatusColor(attendee.status) }" class="attendee-avatar-detail">
                  <v-img v-if="attendee.profileImageUrl" :src="attendee.profileImageUrl" />
                  <span v-else class="avatar-initial-lg">{{ (attendee.fullName || attendee.username).charAt(0) }}</span>
                </v-avatar>
                <div class="participant-info">
                  <div class="participant-name">{{ attendee.fullName || attendee.username }}</div>
                  <v-chip
                    size="x-small"
                    :style="{ backgroundColor: getStatusBg(attendee.status), color: getAttendeeStatusColor(attendee.status) }"
                  >
                    <v-icon :icon="getStatusIcon(attendee.status)" size="10" class="mr-1" />
                    {{ formatStatus(attendee.status) }}
                  </v-chip>
                </div>
              </div>
            </div>
          </div>

          <!-- Attachments Section -->
          <div class="detail-section">
            <div class="detail-section-header">
              <div class="detail-section-icon blue">
                <v-icon icon="mdi-paperclip" size="18" />
              </div>
              <span class="detail-section-title">Attachments</span>
              <v-chip v-if="attachments.length > 0" size="x-small" class="ml-2" color="primary" variant="tonal">{{ attachments.length }}</v-chip>
            </div>

            <!-- Loading -->
            <div v-if="attachmentsLoading" class="attachments-loading">
              <v-progress-circular indeterminate size="24" color="primary" />
              <span class="ml-2 text-grey">Loading attachments...</span>
            </div>

            <!-- No Attachments -->
            <div v-else-if="attachments.length === 0" class="no-attachments">
              <v-icon icon="mdi-paperclip" size="40" color="grey-lighten-2" />
              <p>No attachments</p>
            </div>

            <template v-else>
              <!-- Image Gallery -->
              <div v-if="imageAttachments.length > 0" class="attachment-gallery">
                <div
                  v-for="(img, idx) in imageAttachments"
                  :key="img.attachmentId"
                  class="gallery-item"
                  @click.stop="openPreview(img.publicUrl || img.filePath, idx)"
                >
                  <v-img :src="img.publicUrl || img.filePath" aspect-ratio="1" cover class="gallery-thumb" />
                  <div class="gallery-overlay">
                    <v-icon icon="mdi-eye" size="20" color="white" />
                  </div>
                </div>
              </div>

              <!-- File List -->
              <div v-if="fileAttachments.length > 0" class="file-list">
                <div
                  v-for="file in fileAttachments"
                  :key="file.attachmentId"
                  class="file-item"
                >
                  <v-icon :icon="getFileIcon(file.mimeType)" :color="getFileIconColor(file.mimeType)" size="28" />
                  <div class="file-info">
                    <div class="file-name">{{ file.fileName }}</div>
                    <div class="file-meta">{{ formatFileSize(file.fileSize) }}</div>
                  </div>
                  <v-btn icon variant="text" size="small" @click.stop="downloadAttachment(file)">
                    <v-icon icon="mdi-download" size="20" />
                    <v-tooltip activator="parent">Download</v-tooltip>
                  </v-btn>
                </div>
              </div>
            </template>
          </div>
        </v-card-text>

        <v-card-actions class="detail-actions">
          <v-spacer />
          <v-btn variant="text" @click="closeDetailDialog">Close</v-btn>
          <v-btn
            v-if="isOrganizer(detailMeeting)"
            color="primary"
            variant="flat"
            @click="editFromDetail"
          >
            <v-icon icon="mdi-pencil" size="18" class="mr-1" />
            Edit Meeting
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Image Preview Lightbox -->
    <v-dialog v-model="previewDialog" max-width="1000" class="preview-dialog">
      <v-card class="preview-card" rounded="xl">
        <v-btn icon variant="text" class="preview-close" @click="previewDialog = false">
          <v-icon icon="mdi-close" />
        </v-btn>
        <v-img :src="previewImage" max-height="80vh" contain class="preview-image" />
        <v-card-actions v-if="imageAttachments.length > 1" class="preview-nav justify-center">
          <v-btn icon variant="text" :disabled="previewIndex === 0" @click="navigatePreview(-1)">
            <v-icon icon="mdi-chevron-left" size="28" />
          </v-btn>
          <span class="preview-counter">{{ previewIndex + 1 }} / {{ imageAttachments.length }}</span>
          <v-btn icon variant="text" :disabled="previewIndex === imageAttachments.length - 1" @click="navigatePreview(1)">
            <v-icon icon="mdi-chevron-right" size="28" />
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
/* Page Layout */
.meetings-page {
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

.status-filter {
  width: 160px;
}

.status-filter :deep(.v-field) {
  border-radius: 10px;
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

/* View Toggle */
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
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 960px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  position: relative;
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.stat-card-0 .stat-icon-wrapper { background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%); }
.stat-card-1 .stat-icon-wrapper { background: linear-gradient(135deg, #ff6b8a 0%, #A855F7 100%); }
.stat-card-2 .stat-icon-wrapper { background: linear-gradient(135deg, #EF4444 0%, #F97316 100%); }
.stat-card-3 .stat-icon-wrapper { background: linear-gradient(135deg, #10B981 0%, #059669 100%); }

.stat-card-0 .stat-decoration { background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); }
.stat-card-1 .stat-decoration { background: linear-gradient(135deg, rgba(255, 107, 138, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%); }
.stat-card-2 .stat-decoration { background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%); }
.stat-card-3 .stat-decoration { background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); }

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon {
  color: white;
}

.stat-content {
  flex: 1;
  z-index: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.stat-decoration {
  position: absolute;
  right: -20px;
  top: -20px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  opacity: 0.6;
}

/* Empty State */
.empty-state {
  position: relative;
  background: white;
  border-radius: 24px;
  padding: 60px 40px;
  text-align: center;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
}

.empty-state-content {
  position: relative;
  z-index: 1;
}

.empty-icon-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 24px;
}

.empty-icon {
  color: #f1184c;
  opacity: 0.8;
}

.empty-icon-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.3; }
}

.empty-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}

.empty-description {
  font-size: 15px;
  color: #64748b;
  margin-bottom: 28px;
  line-height: 1.6;
}

.empty-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.05) 0%, transparent 50%);
  pointer-events: none;
}

/* Meetings Grid */
.meetings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.meeting-card {
  position: relative;
  background: white;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #f1f5f9;
}

.meeting-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

.card-accent {
  height: 4px;
  width: 100%;
}

.meeting-card-content {
  padding: 20px;
}

.meeting-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.status-chip {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-btn {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.menu-btn:hover {
  opacity: 1;
}

.action-menu {
  border-radius: 12px;
  overflow: hidden;
}

.meeting-title {
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.meeting-description {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 16px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meeting-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
}

.detail-icon {
  color: #94a3b8;
}

.meeting-link {
  color: #f1184c;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.meeting-link:hover {
  color: #ff6b8a;
  text-decoration: underline;
}

.meeting-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.organizer-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.organizer-avatar {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
}

.avatar-initial {
  font-size: 11px;
  font-weight: 600;
  color: #f1184c;
}

.organizer-name {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.attendees-section {
  display: flex;
  align-items: center;
}

.avatar-stack {
  display: flex;
  align-items: center;
}

.avatar-stack .v-avatar,
.avatar-stack .attendee-avatar {
  margin-left: -8px;
  border: 2px solid white;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
}

.avatar-stack .v-avatar:first-child,
.avatar-stack .attendee-avatar:first-child {
  margin-left: 0;
}

.attendee-avatar {
  border-width: 2px !important;
  border-style: solid !important;
  transition: transform 0.2s;
}

.attendee-avatar:hover {
  transform: scale(1.1);
  z-index: 10;
}

.attendee-overflow {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  margin-left: -8px;
  border: 2px solid white;
}

/* RSVP Section */
.rsvp-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.rsvp-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 10px;
  font-weight: 500;
}

.rsvp-actions {
  display: flex;
  gap: 8px;
}

.rsvp-btn {
  flex: 1;
  font-weight: 600;
  text-transform: none;
  font-size: 12px;
}

.rsvp-accept {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
  color: white !important;
}

.rsvp-maybe {
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%) !important;
  color: white !important;
}

.rsvp-decline {
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%) !important;
  color: white !important;
}

.response-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.response-chip {
  font-weight: 500;
}

/* List View */
.list-view-card {
  overflow: hidden;
  border: 1px solid #f1f5f9;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  font-size: 15px;
}

.meetings-table {
  background: white;
}

.table-header {
  background: #f8fafc !important;
  font-weight: 600 !important;
  font-size: 12px !important;
  color: #475569 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 14px 16px !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

.table-row {
  transition: background 0.2s;
}

.table-row:hover {
  background: #f8fafc;
}

.table-cell {
  padding: 16px !important;
  border-bottom: 1px solid #f1f5f9 !important;
  vertical-align: middle;
}

.meeting-info-title {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

.meeting-info-desc {
  font-size: 12px;
  color: #94a3b8;
}

.datetime-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.datetime-date {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

.datetime-time {
  font-size: 12px;
  color: #94a3b8;
}

.location-info {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #475569;
}

.organizer-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.organizer-avatar-small {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
}

.avatar-initial-small {
  font-size: 10px;
  font-weight: 600;
  color: #f1184c;
}

.organizer-name-small {
  font-size: 13px;
  color: #475569;
}

.avatar-stack-small {
  display: flex;
  align-items: center;
}

.avatar-stack-small .attendee-avatar-small {
  margin-left: -6px;
  border: 2px solid white;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
}

.avatar-stack-small .attendee-avatar-small:first-child {
  margin-left: 0;
}

.attendee-overflow-small {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  color: #64748b;
  margin-left: -6px;
  border: 2px solid white;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  transition: all 0.2s;
}

.edit-btn {
  color: #f1184c;
  background: rgba(102, 126, 234, 0.1);
}

.edit-btn:hover {
  background: rgba(102, 126, 234, 0.2);
}

.delete-btn {
  color: #EF4444;
  background: rgba(239, 68, 68, 0.1);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.accept-btn {
  color: #10B981;
  background: rgba(16, 185, 129, 0.1);
}

.accept-btn:hover {
  background: rgba(16, 185, 129, 0.2);
}

.decline-btn {
  color: #EF4444;
  background: rgba(239, 68, 68, 0.1);
}

.decline-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* Calendar Wrapper */
.calendar-wrapper {
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: space-between;
  }
  
  .meetings-grid {
    grid-template-columns: 1fr;
  }
}

/* ========================================
   Meeting Detail Dialog Styles
   ======================================== */

.detail-dialog-card {
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.detail-header {
  padding: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  color: white;
}

.detail-header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.detail-header-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.detail-header-text {
  flex: 1;
}

.detail-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-chip-light {
  background: rgba(255, 255, 255, 0.25) !important;
  color: white !important;
  font-weight: 600;
  backdrop-filter: blur(4px);
}

.detail-close-btn {
  color: white !important;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.detail-close-btn:hover {
  opacity: 1;
}

.detail-body {
  padding: 24px;
  background: #fafbfc;
  max-height: 60vh;
  overflow-y: auto;
}

.detail-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.detail-section-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.detail-section-icon.purple {
  background: linear-gradient(135deg, #A855F7 0%, #8B5CF6 100%);
}

.detail-section-icon.green {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
}

.detail-section-icon.orange {
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
}

.detail-section-icon.blue {
  background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
}

.detail-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 600px) {
  .detail-info-grid {
    grid-template-columns: 1fr;
  }
}

.detail-info-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detail-info-icon {
  color: #94a3b8;
  margin-top: 2px;
}

.detail-info-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #94a3b8;
  margin-bottom: 2px;
}

.detail-info-value {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.detail-info-link {
  font-size: 14px;
  font-weight: 500;
  color: #f1184c;
  text-decoration: none;
  transition: color 0.2s;
}

.detail-info-link:hover {
  color: #ff6b8a;
  text-decoration: underline;
}

.detail-description {
  font-size: 14px;
  line-height: 1.7;
  color: #475569;
  white-space: pre-wrap;
  margin: 0;
}

/* Participants Grid */
.participants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.participant-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.participant-card:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.participant-card.organizer {
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.05) 0%, rgba(255, 107, 138, 0.05) 100%);
  border-color: rgba(241, 24, 76, 0.2);
}

.avatar-initial-lg {
  font-size: 14px;
  font-weight: 600;
  color: #f1184c;
}

.attendee-avatar-detail {
  border: 2px solid;
}

.participant-info {
  flex: 1;
  min-width: 0;
}

.participant-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.organizer-badge {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%) !important;
  color: white !important;
  font-weight: 600;
}

/* Attachments */
.attachments-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.no-attachments {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #94a3b8;
  font-size: 13px;
}

.no-attachments p {
  margin: 8px 0 0 0;
}

/* Image Gallery */
.attachment-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.gallery-item {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gallery-item:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.gallery-thumb {
  border-radius: 12px;
}

.gallery-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.gallery-item:hover .gallery-overlay {
  opacity: 1;
}

/* File List */
.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.file-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

/* Detail Dialog Actions */
.detail-actions {
  border-top: 1px solid #f1f5f9;
  padding: 16px 24px;
  background: white;
}

/* Image Preview Lightbox */
.preview-card {
  background: #0f172a;
  position: relative;
}

.preview-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.1) !important;
  color: white !important;
}

.preview-close:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.preview-image {
  background: #0f172a;
}

.preview-nav {
  background: rgba(0, 0, 0, 0.5);
  padding: 12px 0;
}

.preview-nav .v-btn {
  color: white !important;
}

.preview-nav .v-btn:disabled {
  opacity: 0.4;
}

.preview-counter {
  color: white;
  font-size: 14px;
  font-weight: 500;
  padding: 0 16px;
}

/* Make meeting card clickable */
.meeting-card {
  cursor: pointer;
}
</style>

