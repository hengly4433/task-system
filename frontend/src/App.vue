<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import AuthLayout from "@/layouts/AuthLayout.vue";
import GlobalSnackbar from "@/components/GlobalSnackbar.vue";

const route = useRoute();

const layout = computed(() => {
  return route.meta.layout === "auth" ? AuthLayout : DefaultLayout;
});
</script>

<template>
  <v-app>
    <component :is="layout">
      <router-view />
    </component>
    <GlobalSnackbar />
  </v-app>
</template>
