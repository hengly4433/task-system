<script setup lang="ts">
import { ref, watch, computed } from "vue";
import DatePickerField from "@/components/DatePickerField.vue";

defineOptions({
  name: "MeetingModal",
});

interface User {
  userId: string;
  fullName: string;
  username?: string;
  profileImageUrl?: string;
}

interface Meeting {
  meetingId?: string;
  title?: string;
  description?: string | null;
  agenda?: string | null;
  startTime?: string;
  endTime?: string;
  location?: string | null;
  meetingUrl?: string | null;
  status?: string;
  attendeeIds?: string[];
}

const props = defineProps<{
  modelValue: boolean;
  meeting?: Meeting | null;
  users: User[];
  loading?: boolean;
  initialDate?: string;
  allowDelete?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", data: any): void;
  (e: "delete"): void;
}>();

const isEdit = ref(false);
const formValid = ref(false);
const files = ref<File[]>([]);

const form = ref({
  title: "",
  description: "",
  agenda: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  location: "",
  meetingUrl: "",
  status: "SCHEDULED",
  attendeeIds: [] as string[],
});

const statusOptions = [
  { title: "Scheduled", value: "SCHEDULED" },
  { title: "In Progress", value: "IN_PROGRESS" },
  { title: "Completed", value: "COMPLETED" },
  { title: "Cancelled", value: "CANCELLED" },
];

const rules = {
  required: (v: string) => !!v || "This field is required",
  title: (v: string) =>
    (v && v.length >= 3) || "Title must be at least 3 characters",
};

// Format datetime-local value to separate date and time
const parseDateTime = (isoString: string | undefined) => {
  if (!isoString) return { date: "", time: "" };
  const dt = new Date(isoString);
  const date = dt.toISOString().split("T")[0];
  const time = dt.toTimeString().slice(0, 5);
  return { date, time };
};

// Combine date and time into ISO string
const combineDateTime = (date: string, time: string): string => {
  if (!date || !time) return "";
  return new Date(`${date}T${time}`).toISOString();
};

// Map users to chips format
const userOptions = computed(() =>
  props.users.map((u) => ({
    title: u.fullName || u.username || `User ${u.userId}`,
    value: u.userId,
  }))
);

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && props.meeting) {
      isEdit.value = !!props.meeting.meetingId;
      const start = parseDateTime(props.meeting.startTime);
      const end = parseDateTime(props.meeting.endTime);
      form.value = {
        title: props.meeting.title || "",
        description: props.meeting.description || "",
        agenda: props.meeting.agenda || "",
        startDate: start.date || "",
        startTime: start.time,
        endDate: end.date || "",
        endTime: end.time,
        location: props.meeting.location || "",
        meetingUrl: props.meeting.meetingUrl || "",
        status: props.meeting.status || "SCHEDULED",
        attendeeIds: props.meeting.attendeeIds || [],
      };
    } else if (newVal) {
      isEdit.value = false;
      // Set default start time to next hour
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const endTime = new Date(now);
      endTime.setHours(endTime.getHours() + 1);

      // Allow pre-selecting date when launched from calendar
      const baseDate = (props.initialDate ?? now.toISOString().split("T")[0]) as string;
      
      form.value = {
        title: "",
        description: "",
        agenda: "",
        startDate: baseDate,
        startTime: now.toTimeString().slice(0, 5),
        endDate: baseDate,
        endTime: endTime.toTimeString().slice(0, 5),
        location: "",
        meetingUrl: "",
        status: "SCHEDULED",
        attendeeIds: [],
      };
    }
  },
  { immediate: true }
);

const close = () => {
  emit("update:modelValue", false);
};

const save = () => {
  if (formValid.value) {
    const startTimeISO = combineDateTime(form.value.startDate, form.value.startTime);
    const endTimeISO = combineDateTime(form.value.endDate, form.value.endTime);
    
    const data: any = {
      title: form.value.title,
      description: form.value.description || undefined,
      agenda: form.value.agenda || undefined,
      startTime: startTimeISO,
      endTime: endTimeISO,
      location: form.value.location || undefined,
      meetingUrl: form.value.meetingUrl || undefined,
      attendeeIds: form.value.attendeeIds.length > 0 ? form.value.attendeeIds : undefined,
    };

    if (isEdit.value) {
      data.meetingId = props.meeting?.meetingId;
      data.status = form.value.status;
    }

    // Include files if any are selected
    if (files.value.length > 0) {
      data.files = files.value;
    }

    emit("save", data);
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="880"
    persistent
    class="meeting-modal"
    scrollable
  >
    <v-card class="modal-card" rounded="xl">
      <!-- Gradient Header -->
      <div class="modal-header">
        <div class="header-content">
          <div class="header-icon">
            <v-icon :icon="isEdit ? 'mdi-calendar-edit' : 'mdi-calendar-plus'" size="24" />
          </div>
          <div class="header-text">
            <h2 class="header-title">{{ isEdit ? "Edit Meeting" : "Schedule Meeting" }}</h2>
            <p class="header-subtitle">{{ isEdit ? "Update meeting details and attendees" : "Create a new meeting and invite participants" }}</p>
          </div>
        </div>
        <v-btn icon variant="text" size="small" class="close-btn" @click="close">
          <v-icon icon="mdi-close" />
        </v-btn>
      </div>

      <v-card-text class="modal-body">
        <v-form v-model="formValid" @submit.prevent="save">
          <v-row>
            <!-- Left Column: Main Content -->
            <v-col cols="12" md="7">
              <!-- Meeting Title -->
              <div class="form-section">
                <v-text-field
                  v-model="form.title"
                  label="Meeting Title"
                  placeholder="Enter meeting title..."
                  :rules="[rules.required, rules.title]"
                  variant="outlined"
                  density="comfortable"
                  rounded="lg"
                  class="styled-input"
                >
                  <template #prepend-inner>
                    <v-icon icon="mdi-format-title" class="input-icon" />
                  </template>
                </v-text-field>
              </div>

              <!-- Description -->
              <div class="form-section">
                <v-textarea
                  v-model="form.description"
                  label="Description"
                  placeholder="Add meeting description..."
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                  rounded="lg"
                  class="styled-input"
                >
                  <template #prepend-inner>
                    <v-icon icon="mdi-text" class="input-icon" style="margin-top: 12px;" />
                  </template>
                </v-textarea>
              </div>

              <!-- Agenda -->
              <div class="form-section">
                <v-textarea
                  v-model="form.agenda"
                  label="Agenda"
                  placeholder="List topics to be discussed..."
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                  rounded="lg"
                  class="styled-input"
                >
                  <template #prepend-inner>
                    <v-icon icon="mdi-format-list-bulleted" class="input-icon" style="margin-top: 12px;" />
                  </template>
                </v-textarea>
              </div>

              <!-- Date & Time Section -->
              <div class="datetime-section">
                <div class="section-header">
                  <div class="section-icon">
                    <v-icon icon="mdi-clock-time-four-outline" size="18" />
                  </div>
                  <span class="section-title">Date & Time</span>
                </div>
                <div class="datetime-grid">
                  <div class="datetime-row">
                    <div class="datetime-field">
                      <label class="field-label">Start Date</label>
                      <DatePickerField
                        v-model="form.startDate"
                        placeholder="Select date"
                      />
                    </div>
                    <div class="datetime-field">
                      <label class="field-label">Start Time</label>
                      <v-text-field
                        v-model="form.startTime"
                        type="time"
                        :rules="[rules.required]"
                        variant="outlined"
                        density="comfortable"
                        rounded="lg"
                        hide-details
                        class="datetime-input"
                      />
                    </div>
                  </div>
                  <div class="datetime-row">
                    <div class="datetime-field">
                      <label class="field-label">End Date</label>
                      <DatePickerField
                        v-model="form.endDate"
                        placeholder="Select date"
                      />
                    </div>
                    <div class="datetime-field">
                      <label class="field-label">End Time</label>
                      <v-text-field
                        v-model="form.endTime"
                        type="time"
                        :rules="[rules.required]"
                        variant="outlined"
                        density="comfortable"
                        rounded="lg"
                        hide-details
                        class="datetime-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </v-col>

            <!-- Right Column: Meta Info -->
            <v-col cols="12" md="5">
              <div class="meta-section">
                <div class="section-header">
                  <div class="section-icon purple">
                    <v-icon icon="mdi-information-outline" size="18" />
                  </div>
                  <span class="section-title">Meeting Details</span>
                </div>

                <div class="meta-content">
                  <v-text-field
                    v-model="form.location"
                    label="Location"
                    placeholder="e.g., Conference Room A"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    class="styled-input meta-input"
                  >
                    <template #prepend-inner>
                      <v-icon icon="mdi-map-marker-outline" class="input-icon" />
                    </template>
                  </v-text-field>

                  <v-text-field
                    v-model="form.meetingUrl"
                    label="Meeting URL"
                    placeholder="e.g., https://meet.google.com/..."
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    class="styled-input meta-input"
                  >
                    <template #prepend-inner>
                      <v-icon icon="mdi-link-variant" class="input-icon" />
                    </template>
                  </v-text-field>

                  <v-select
                    v-if="isEdit"
                    v-model="form.status"
                    :items="statusOptions"
                    label="Status"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    class="styled-input meta-input"
                  >
                    <template #prepend-inner>
                      <v-icon icon="mdi-flag-outline" class="input-icon" />
                    </template>
                  </v-select>

                  <v-autocomplete
                    v-model="form.attendeeIds"
                    :items="userOptions"
                    label="Invite Attendees"
                    placeholder="Search and select attendees..."
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    multiple
                    chips
                    closable-chips
                    class="styled-input meta-input attendee-select"
                    :menu-props="{ maxHeight: 250 }"
                  >
                    <template #prepend-inner>
                      <v-icon icon="mdi-account-group-outline" class="input-icon" />
                    </template>
                    <template #chip="{ props: chipProps, item }">
                      <v-chip
                        v-bind="chipProps"
                        size="small"
                        class="attendee-chip"
                      >
                        <v-icon icon="mdi-account" size="14" class="mr-1" />
                        {{ item.title }}
                      </v-chip>
                    </template>
                  </v-autocomplete>

                  <!-- File/Image Upload -->
                  <div class="attachments-section">
                    <div class="attachments-header">
                      <v-icon icon="mdi-paperclip" size="16" class="mr-2" />
                      <span>Attachments</span>
                    </div>
                    <v-file-input
                      v-model="files"
                      label="Add files or images"
                      placeholder="Click to upload files..."
                      variant="outlined"
                      density="comfortable"
                      rounded="lg"
                      multiple
                      chips
                      show-size
                      prepend-icon=""
                      prepend-inner-icon="mdi-cloud-upload-outline"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                      class="file-upload-input"
                    >
                      <template #selection="{ fileNames }">
                        <div class="file-chips">
                          <v-chip
                            v-for="fileName in fileNames.slice(0, 3)"
                            :key="fileName"
                            size="small"
                            class="file-chip"
                          >
                            <v-icon
                              :icon="fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'mdi-image' : 'mdi-file-document-outline'"
                              size="14"
                              class="mr-1"
                            />
                            {{ fileName.length > 18 ? fileName.slice(0, 15) + '...' : fileName }}
                          </v-chip>
                          <v-chip v-if="fileNames.length > 3" size="small" class="file-chip">
                            +{{ fileNames.length - 3 }} more
                          </v-chip>
                        </div>
                      </template>
                    </v-file-input>
                    <div class="upload-hint">
                      <v-icon icon="mdi-information-outline" size="12" class="mr-1" />
                      <span>Supports images, PDFs, and document formats</span>
                    </div>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <!-- Footer Actions -->
      <div class="modal-footer">
        <v-btn
          v-if="isEdit && allowDelete"
          class="delete-btn"
          variant="text"
          @click="$emit('delete')"
          :disabled="loading"
        >
          <v-icon icon="mdi-delete-outline" size="18" class="mr-1" />
          Delete
        </v-btn>
        <v-spacer />
        <v-btn
          class="cancel-btn"
          variant="outlined"
          rounded="lg"
          @click="close"
          :disabled="loading"
        >
          Cancel
        </v-btn>
        <v-btn
          class="save-btn"
          rounded="lg"
          @click="save"
          :loading="loading"
          :disabled="!formValid"
        >
          <v-icon :icon="isEdit ? 'mdi-check' : 'mdi-calendar-check'" size="18" class="mr-1" />
          {{ isEdit ? "Update" : "Schedule" }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.meeting-modal :deep(.v-overlay__content) {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-height: 95vh !important;
}

.modal-card {
  overflow: visible;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  max-height: 95vh;
}

/* Header */
.modal-header {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  padding: 20px 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
}

.header-subtitle {
  font-size: 13px;
  opacity: 0.85;
  margin: 0;
}

.close-btn {
  color: white !important;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

/* Body */
.modal-body {
  padding: 24px;
  background: #fafbfc;
  overflow-y: auto;
  flex: 1;
  max-height: calc(95vh - 160px);
}

.form-section {
  margin-bottom: 16px;
}

.styled-input :deep(.v-field) {
  background: white;
  border-radius: 12px !important;
}

.styled-input :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.input-icon {
  color: #94a3b8;
  margin-right: 4px;
}

/* DateTime Section */
.datetime-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.section-icon.purple {
  background: linear-gradient(135deg, #ff6b8a 0%, #A855F7 100%);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.datetime-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.datetime-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.datetime-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.datetime-input :deep(.v-field) {
  background: #f8fafc;
  border-radius: 10px !important;
}

.datetime-input :deep(.v-field--focused) {
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

/* Meta Section */
.meta-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.meta-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-input :deep(.v-field) {
  background: #f8fafc;
}

.attendee-chip {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  color: #f1184c;
  font-weight: 500;
}

/* Attachments Section */
.attachments-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.attachments-header {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
}

.file-upload-input :deep(.v-field) {
  background: #f8fafc;
  border-radius: 12px !important;
  border: 2px dashed #cbd5e1 !important;
  transition: all 0.2s ease;
}

.file-upload-input :deep(.v-field:hover) {
  border-color: #f1184c !important;
  background: rgba(241, 24, 76, 0.02);
}

.file-upload-input :deep(.v-field--focused) {
  border-color: #f1184c !important;
  background: white;
}

.file-upload-input :deep(.v-field__prepend-inner .v-icon) {
  color: #94a3b8;
}

.file-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.file-chip {
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.1) 0%, rgba(255, 107, 138, 0.1) 100%);
  color: #f1184c;
  font-weight: 500;
  font-size: 11px;
}

.upload-hint {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 8px;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #f1f5f9;
  gap: 12px;
}

.delete-btn {
  color: #ef4444 !important;
  font-weight: 500;
  text-transform: none;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

.cancel-btn {
  color: #64748b;
  border-color: #e2e8f0;
  font-weight: 500;
  text-transform: none;
  padding: 0 20px;
}

.cancel-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.save-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  text-transform: none;
  padding: 0 24px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.save-btn:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  box-shadow: none;
}

/* Responsive */
@media (max-width: 960px) {
  .modal-body {
    padding: 16px;
  }
  
  .datetime-section,
  .meta-section {
    padding: 16px;
  }
}
</style>
