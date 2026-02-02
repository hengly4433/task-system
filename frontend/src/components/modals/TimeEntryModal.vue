<script setup lang="ts">
import { ref, watch, computed } from "vue";
import DatePickerField from "@/components/DatePickerField.vue";

defineOptions({
  name: "TimeEntryModal",
});

interface Task {
  taskId: string;
  title: string;
  projectName?: string;
}

const props = defineProps<{
  modelValue: boolean;
  tasks: Task[];
  selectedDate?: string;
  selectedTaskId?: string;
  existingHours?: number;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", data: { taskId: string; date: string; hours: number; description?: string }): void;
}>();

const formValid = ref(false);

const form = ref({
  taskId: "",
  date: "",
  hours: 1,
  description: "",
});

const rules = {
  required: (v: string | number) => !!v || "This field is required",
  minHours: (v: number) => v >= 0.25 || "Minimum 15 minutes (0.25h)",
  maxHours: (v: number) => v <= 24 || "Maximum 24 hours per day",
};

// Task options for dropdown
const taskOptions = computed(() =>
  props.tasks.map((t) => ({
    title: t.projectName ? `${t.title} (${t.projectName})` : t.title,
    value: t.taskId,
  }))
);

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      const today = new Date().toISOString().split("T")[0] as string;
      form.value = {
        taskId: props.selectedTaskId || "",
        date: props.selectedDate || today,
        hours: props.existingHours || 1,
        description: "",
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
    emit("save", {
      taskId: form.value.taskId,
      date: form.value.date,
      hours: form.value.hours,
      description: form.value.description || undefined,
    });
  }
};

// Quick hour buttons
const quickHours = [0.5, 1, 2, 4, 8];
const setQuickHours = (h: number) => {
  form.value.hours = h;
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500"
    persistent
  >
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-clock-plus-outline" color="primary" class="mr-2" />
          <span class="text-h6">Log Time</span>
        </div>
        <v-btn icon variant="text" size="small" @click="close">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form v-model="formValid" @submit.prevent="save">
          <v-autocomplete
            v-model="form.taskId"
            :items="taskOptions"
            label="Task *"
            :rules="[rules.required]"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-clipboard-text-outline"
            class="mb-4"
            :readonly="!!selectedTaskId"
          />

          <DatePickerField
            v-model="form.date"
            label="Date *"
            placeholder="Select date"
            :disabled="!!selectedDate"
          />

          <div class="mb-2">
            <label class="text-caption text-grey d-block mb-2">Quick Select</label>
            <div class="d-flex ga-2 mb-4">
              <v-btn
                v-for="h in quickHours"
                :key="h"
                size="small"
                :variant="form.hours === h ? 'flat' : 'outlined'"
                :color="form.hours === h ? 'primary' : undefined"
                @click="setQuickHours(h)"
              >
                {{ h }}h
              </v-btn>
            </div>
          </div>

          <v-text-field
            v-model.number="form.hours"
            label="Hours *"
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            :rules="[rules.required, rules.minHours, rules.maxHours]"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-timer-outline"
            class="mb-4"
          />

          <v-textarea
            v-model="form.description"
            label="Description (optional)"
            variant="outlined"
            density="compact"
            rows="2"
            prepend-inner-icon="mdi-text"
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="outlined"
          @click="close"
          :disabled="loading"
          class="text-capitalize px-6"
          >Cancel</v-btn
        >
        <v-btn
          color="primary"
          variant="flat"
          @click="save"
          :loading="loading"
          :disabled="!formValid"
          class="text-capitalize px-6"
        >
          Log Time
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
