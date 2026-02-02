<script setup lang="ts">
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import type { Meeting } from '@/services/meeting.service'

const props = defineProps<{
  meetings: Meeting[]
}>()

const emit = defineEmits<{
  (e: 'date-click', date: string): void
  (e: 'event-click', meeting: Meeting): void
  (e: 'change-month', date: string): void
}>()

const currentManager = ref(dayjs())

// Navigation
const prevMonth = () => {
  currentManager.value = currentManager.value.subtract(1, 'month')
  emit('change-month', currentManager.value.format('YYYY-MM-DD'))
}

const nextMonth = () => {
  currentManager.value = currentManager.value.add(1, 'month')
  emit('change-month', currentManager.value.format('YYYY-MM-DD'))
}

const resetToday = () => {
  currentManager.value = dayjs()
  emit('change-month', currentManager.value.format('YYYY-MM-DD'))
}

const currentMonthLabel = computed(() => {
  return currentManager.value.format('MMMM YYYY')
})

// Calendar Grid Generation
const calendarDays = computed(() => {
  const startOfMonth = currentManager.value.startOf('month')
  const endOfMonth = currentManager.value.endOf('month')
  
  const startDayOfWeek = startOfMonth.day() // 0 (Sunday) - 6 (Saturday)
  
  // Calculate start date of the grid (previous month days)
  const startDate = startOfMonth.subtract(startDayOfWeek, 'day')
  
  // Grid usually needs 6 weeks to cover all possibilities (42 days)
  const days = []
  let currentDate = startDate
  
  for (let i = 0; i < 42; i++) {
    days.push({
      date: currentDate,
      isCurrentMonth: currentDate.month() === currentManager.value.month(),
      isToday: currentDate.isSame(dayjs(), 'day'),
      dateStr: currentDate.format('YYYY-MM-DD')
    })
    currentDate = currentDate.add(1, 'day')
  }
  
  return days
})

// Helper to get meetings for a specific day
const getMeetingsForDay = (dateStr: string) => {
  return props.meetings.filter(m => {
    // Simple check: is the meeting on this day?
    // Note: This assumes simple single-day meetings or checking start time.
    // For multi-day meetings, improved logic works be needed.
    return dayjs(m.startTime).format('YYYY-MM-DD') === dateStr
  }).sort((a, b) => dayjs(a.startTime).diff(dayjs(b.startTime)))
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Helpers for styling
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    SCHEDULED: 'primary',
    IN_PROGRESS: 'secondary',
    COMPLETED: 'success',
    CANCELLED: 'error',
  }
  return colors[status] || 'grey'
}

const formatTime = (isoString: string) => {
  return dayjs(isoString).format('h:mm A')
}

// Get CSS class for status
const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  }
  return classes[status] || 'scheduled'
}
</script>

<template>
  <div class="calendar-container">
    <!-- Toolbar -->
    <div class="calendar-toolbar">
      <div class="toolbar-left">
        <h2 class="month-label">{{ currentMonthLabel }}</h2>
        <div class="nav-controls">
          <v-btn 
            icon 
            size="small" 
            variant="text"
            class="nav-btn"
            @click="prevMonth"
          >
            <v-icon icon="mdi-chevron-left" size="20" />
            <v-tooltip activator="parent" location="top">Previous month</v-tooltip>
          </v-btn>
          <v-btn 
            size="small" 
            variant="flat"
            class="today-btn"
            @click="resetToday"
          >
            <v-icon icon="mdi-calendar-today" size="16" class="mr-1" />
            Today
          </v-btn>
          <v-btn 
            icon 
            size="small" 
            variant="text"
            class="nav-btn"
            @click="nextMonth"
          >
            <v-icon icon="mdi-chevron-right" size="20" />
            <v-tooltip activator="parent" location="top">Next month</v-tooltip>
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="calendar-grid">
      <!-- Weekday Headers -->
      <div 
        v-for="day in weekDays" 
        :key="day" 
        class="weekday-header"
      >
        {{ day }}
      </div>

      <!-- Days -->
      <div 
        v-for="dayObj in calendarDays" 
        :key="dayObj.dateStr"
        class="calendar-day"
        :class="{ 
          'other-month': !dayObj.isCurrentMonth,
          'is-today': dayObj.isToday
        }"
        @click="$emit('date-click', dayObj.dateStr)"
      >
        <div class="day-header">
          <span class="day-number" :class="{ 'today-number': dayObj.isToday }">
            {{ dayObj.date.format('D') }}
          </span>
        </div>
        
        <div class="day-events">
          <div 
            v-for="meeting in getMeetingsForDay(dayObj.dateStr).slice(0, 3)" 
            :key="meeting.meetingId"
            class="event-pill"
            :class="`event-${getStatusClass(meeting.status)}`"
            @click.stop="$emit('event-click', meeting)"
          >
            <div class="event-content">
              <span class="event-dot"></span>
              <span class="event-time">{{ formatTime(meeting.startTime) }}</span>
              <span class="event-title">{{ meeting.title }}</span>
            </div>
            <v-tooltip activator="parent" location="top">
              <div class="event-tooltip">
                <strong>{{ meeting.title }}</strong>
                <div>{{ formatTime(meeting.startTime) }} - {{ formatTime(meeting.endTime) }}</div>
                <div v-if="meeting.location">📍 {{ meeting.location }}</div>
              </div>
            </v-tooltip>
          </div>
          <div 
            v-if="getMeetingsForDay(dayObj.dateStr).length > 3" 
            class="more-events"
          >
            +{{ getMeetingsForDay(dayObj.dateStr).length - 3 }} more
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-container {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
}

/* Toolbar */
.calendar-toolbar {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.month-label {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 4px;
  backdrop-filter: blur(8px);
}

.nav-btn {
  color: white !important;
  width: 32px;
  height: 32px;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.today-btn {
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  font-weight: 600;
  font-size: 13px;
  text-transform: none;
  padding: 0 12px;
  height: 32px;
  border-radius: 8px;
}

.today-btn:hover {
  background: rgba(255, 255, 255, 0.3) !important;
}

/* Calendar Grid */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  width: 100%;
}

.weekday-header {
  padding: 14px 12px;
  text-align: center;
  font-weight: 600;
  font-size: 13px;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.calendar-day {
  min-height: 120px;
  padding: 8px;
  border-bottom: 1px solid #f1f5f9;
  border-right: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  background: white;
}

.calendar-day:nth-child(7n + 14) {
  border-right: none;
}

.calendar-day:nth-last-child(-n+7) {
  border-bottom: none;
}

.calendar-day:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
}

.calendar-day.other-month {
  background: #fcfcfc;
}

.calendar-day.other-month .day-number {
  color: #cbd5e1;
}

.calendar-day.is-today {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
}

.day-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 6px;
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.today-number {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

/* Event Pills */
.event-pill {
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.event-pill:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.event-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
}

.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.event-time {
  font-size: 10px;
  opacity: 0.7;
  flex-shrink: 0;
}

.event-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Event Status Colors */
.event-scheduled {
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.1) 0%, rgba(241, 24, 76, 0.15) 100%);
  color: #f1184c;
  border-left: 3px solid #f1184c;
}

.event-scheduled .event-dot {
  background: #f1184c;
}

.event-in-progress {
  background: linear-gradient(135deg, rgba(255, 107, 138, 0.1) 0%, rgba(255, 107, 138, 0.15) 100%);
  color: #ff6b8a;
  border-left: 3px solid #ff6b8a;
}

.event-in-progress .event-dot {
  background: #ff6b8a;
}

.event-completed {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.15) 100%);
  color: #10b981;
  border-left: 3px solid #10b981;
}

.event-completed .event-dot {
  background: #10b981;
}

.event-cancelled {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.15) 100%);
  color: #ef4444;
  border-left: 3px solid #ef4444;
}

.event-cancelled .event-dot {
  background: #ef4444;
}

.more-events {
  font-size: 11px;
  color: #64748b;
  padding: 2px 8px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.more-events:hover {
  background: #f1f5f9;
  color: #475569;
}

.event-tooltip {
  text-align: left;
  line-height: 1.5;
}

/* Responsive */
@media (max-width: 768px) {
  .calendar-day {
    min-height: 80px;
    padding: 4px;
  }
  
  .event-time {
    display: none;
  }
  
  .weekday-header {
    padding: 10px 4px;
    font-size: 11px;
  }
  
  .month-label {
    font-size: 18px;
  }
}
</style>

