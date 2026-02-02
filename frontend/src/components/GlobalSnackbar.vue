<script setup lang="ts">
import { useSnackbar } from "@/composables/useSnackbar";

const snackbar = useSnackbar();
</script>

<template>
  <v-snackbar
    v-model="snackbar.visible.value"
    :color="snackbar.color.value"
    :timeout="snackbar.timeout.value"
    location="top right"
    rounded="lg"
  >
    <div class="d-flex align-center">
      <v-icon
        :icon="
          snackbar.color.value === 'success'
            ? 'mdi-check-circle'
            : snackbar.color.value === 'error'
            ? 'mdi-alert-circle'
            : snackbar.color.value === 'warning'
            ? 'mdi-alert'
            : 'mdi-information'
        "
        class="mr-2"
      />
      {{ snackbar.message.value }}
    </div>
    <template #actions>
      <v-btn
        variant="text"
        icon="mdi-close"
        size="small"
        @click="snackbar.hide()"
      />
    </template>
  </v-snackbar>
</template>
