<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { type Milestone } from "@/services/milestone.service";
import DatePickerField from "@/components/DatePickerField.vue";

const props = defineProps<{
  modelValue: boolean; // Dialog visibility
  milestone?: Milestone | null; // Editing milestone
  projectId: string; // The project ID to create logic for
}>();

const emit = defineEmits(["update:modelValue", "save"]);

const dialog = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const isEditing = computed(() => !!props.milestone);
const valid = ref(false);
const loading = ref(false);

const form = ref({
  milestoneName: "",
  dueDate: null as Date | null,
});

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      if (props.milestone) {
        form.value = {
          milestoneName: props.milestone.milestoneName,
          dueDate: props.milestone.dueDate ? new Date(props.milestone.dueDate) : null,
        };
      } else {
        form.value = {
          milestoneName: "",
          dueDate: null,
        };
      }
    }
  }
);

const rules = {
  required: (v: any) => !!v || "Required",
};

const handleSave = async () => {
  if (!valid.value) return;
  loading.value = true;
  
  const payload = {
    projectId: props.projectId,
    milestoneName: form.value.milestoneName,
    dueDate: form.value.dueDate ? form.value.dueDate.toISOString() : undefined,
    // milestoneId will be handled by parent if editing
  };

  emit("save", { ...payload, milestoneId: props.milestone?.milestoneId });
  loading.value = false;
};
</script>

<template>
  <v-dialog v-model="dialog" max-width="500">
    <v-card rounded="xl">
      <v-card-title class="pa-4 bg-primary text-white d-flex align-center">
        <span class="text-h6 font-weight-bold">
          {{ isEditing ? "Edit Milestone" : "New Milestone" }}
        </span>
        <v-spacer />
        <v-btn icon variant="text" @click="dialog = false" density="compact">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-form v-model="valid" @submit.prevent="handleSave">
          <v-text-field
            v-model="form.milestoneName"
            label="Milestone Name"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            class="mb-2"
          />

          <DatePickerField
            v-model="form.dueDate"
            label="Due Date (Optional)"
            placeholder="Select due date"
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          color="grey-darken-1"
          @click="dialog = false"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!valid"
          @click="handleSave"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
