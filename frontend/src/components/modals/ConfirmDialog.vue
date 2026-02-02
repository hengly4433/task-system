<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  title?: string;
  message?: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "confirm"): void;
}>();

const close = () => emit("update:modelValue", false);
const confirm = () => emit("confirm");
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="400"
    persistent
  >
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center pa-4">
        <v-icon icon="mdi-alert-circle" color="error" class="mr-2" />
        <span class="text-h6">{{ title || "Confirm Delete" }}</span>
      </v-card-title>

      <v-card-text class="pa-4">
        {{
          message ||
          "Are you sure you want to delete this item? This action cannot be undone."
        }}
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="close" :disabled="loading"
          >Cancel</v-btn
        >
        <v-btn color="error" @click="confirm" :loading="loading">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
