<script setup lang="ts"></script>

<template>
  <v-main class="auth-layout">
    <slot />
  </v-main>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
