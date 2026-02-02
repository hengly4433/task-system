<script setup lang="ts">
import { computed } from "vue";
import { VueDatePicker } from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";

const props = withDefaults(
  defineProps<{
    modelValue: Date | string | null;
    label?: string;
    placeholder?: string;
    clearable?: boolean;
    disabled?: boolean;
    inline?: boolean;
    format?: string;
    enableTimePicker?: boolean;
    autoApply?: boolean;
    teleport?: boolean | string;
  }>(),
  {
    label: "",
    placeholder: "Select date",
    clearable: true,
    disabled: false,
    inline: false,
    format: "dd/MM/yyyy",
    enableTimePicker: false,
    autoApply: true,
    teleport: "body",
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: Date | null): void;
}>();

const dateValue = computed({
  get: () => {
    if (!props.modelValue) return null;
    if (props.modelValue instanceof Date) return props.modelValue;
    return new Date(props.modelValue);
  },
  set: (val: Date | null) => {
    emit("update:modelValue", val);
  },
});
</script>

<template>
  <div class="date-picker-field">
    <label v-if="label" class="date-picker-label">{{ label }}</label>
    <VueDatePicker
      v-model="dateValue"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      :inline="inline"
      :format="format"
      :enable-time-picker="enableTimePicker"
      :auto-apply="autoApply"
      :teleport="teleport"
      :dark="false"
      :month-change-on-scroll="false"
      position="left"
      class="custom-date-picker"
    >
      <template #dp-input="{ value, onInput, onEnter, onTab, onClear }">
        <div class="date-input-wrapper" :class="{ disabled, 'has-value': value }">
          <v-icon icon="mdi-calendar-outline" size="18" class="calendar-icon" />
          <input
            type="text"
            :value="value"
            :placeholder="placeholder"
            :disabled="disabled"
            readonly
            class="date-input"
            @input="onInput"
            @keydown.enter="onEnter"
            @keydown.tab="onTab"
          />
          <v-icon
            v-if="clearable && value"
            icon="mdi-close-circle"
            size="16"
            class="clear-icon"
            @click.stop="onClear"
          />
        </div>
      </template>
    </VueDatePicker>
  </div>
</template>

<style scoped>
.date-picker-field {
  width: 100%;
}

.date-picker-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.date-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-input-wrapper:hover:not(.disabled) {
  border-color: #f1184c;
  background: white;
  box-shadow: 0 0 0 3px rgba(241, 24, 76, 0.08);
}

.date-input-wrapper:focus-within {
  border-color: #f1184c;
  background: white;
  box-shadow: 0 0 0 4px rgba(241, 24, 76, 0.12);
}

.date-input-wrapper.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.date-input-wrapper.has-value {
  background: white;
}

.calendar-icon {
  color: #f1184c;
  flex-shrink: 0;
}

.date-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  outline: none;
  cursor: pointer;
}

.date-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.date-input:disabled {
  cursor: not-allowed;
}

.clear-icon {
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.clear-icon:hover {
  color: #f1184c;
}

/* Date picker dropdown customization */
:deep(.dp__theme_light) {
  --dp-background-color: #ffffff;
  --dp-text-color: #1e293b;
  --dp-hover-color: rgba(241, 24, 76, 0.08);
  --dp-hover-text-color: #1e293b;
  --dp-hover-icon-color: #f1184c;
  --dp-primary-color: #f1184c;
  --dp-primary-disabled-color: #fda4af;
  --dp-primary-text-color: #ffffff;
  --dp-secondary-color: #64748b;
  --dp-border-color: #e2e8f0;
  --dp-menu-border-color: transparent;
  --dp-border-color-hover: #f1184c;
  --dp-disabled-color: #f1f5f9;
  --dp-scroll-bar-background: #f1f5f9;
  --dp-scroll-bar-color: #cbd5e1;
  --dp-success-color: #22c55e;
  --dp-success-color-disabled: #86efac;
  --dp-icon-color: #64748b;
  --dp-danger-color: #ef4444;
  --dp-marker-color: #f1184c;
  --dp-tooltip-color: #1e293b;
  --dp-disabled-color-text: #94a3b8;
  --dp-highlight-color: rgba(241, 24, 76, 0.1);
  --dp-range-between-dates-background-color: rgba(241, 24, 76, 0.08);
  --dp-range-between-dates-text-color: #1e293b;
  --dp-range-between-border-color: transparent;
}

:deep(.dp__menu) {
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15),
    0 8px 25px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  overflow: hidden;
}

:deep(.dp__calendar_header) {
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #94a3b8;
}

:deep(.dp__calendar_header_item) {
  padding: 8px 0;
}

:deep(.dp__cell_inner) {
  border-radius: 10px;
  font-weight: 500;
  transition: all 0.2s ease;
}

:deep(.dp__cell_inner:hover) {
  transform: scale(1.05);
}

:deep(.dp__active_date) {
  background: linear-gradient(135deg, #f1184c, #ff6b8a) !important;
  box-shadow: 0 4px 12px rgba(241, 24, 76, 0.35);
  transform: scale(1.08);
}

:deep(.dp__today) {
  border: 2px solid #f1184c !important;
}

:deep(.dp__month_year_select) {
  font-weight: 600;
  color: #1e293b;
}

:deep(.dp__arrow_top),
:deep(.dp__arrow_bottom) {
  display: none;
}

:deep(.dp__action_row) {
  padding: 12px 16px;
  border-top: 1px solid #f1f5f9;
}

:deep(.dp__action_button) {
  border-radius: 10px;
  font-weight: 600;
  text-transform: none;
}

:deep(.dp__action_select) {
  background: linear-gradient(135deg, #f1184c, #ff6b8a) !important;
  box-shadow: 0 4px 12px rgba(241, 24, 76, 0.25);
}

:deep(.dp__action_cancel) {
  color: #64748b;
}

:deep(.dp__action_cancel:hover) {
  color: #f1184c;
  background: rgba(241, 24, 76, 0.08);
}

/* Month/Year picker */
:deep(.dp__overlay_cell) {
  border-radius: 12px;
  font-weight: 500;
}

:deep(.dp__overlay_cell_active) {
  background: linear-gradient(135deg, #f1184c, #ff6b8a) !important;
}

:deep(.dp__btn) {
  border-radius: 8px;
}

:deep(.dp__btn:hover) {
  background: rgba(241, 24, 76, 0.08);
  color: #f1184c;
}
</style>
