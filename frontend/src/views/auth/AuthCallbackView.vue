<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';
import { useSnackbar } from '@/composables/useSnackbar';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const tenantStore = useTenantStore();
const snackbar = useSnackbar();

onMounted(async () => {
  const token = route.query.token as string;

  if (token) {
    try {
      // Manually set token in store/localStorage since we bypassed the login method
      authStore.token = token;
      localStorage.setItem('token', token);
      
      // Initialize auth (fetches profile and roles)
      await authStore.fetchProfile();
      
      // Fetch tenants to ensure menu is properly displayed
      tenantStore.initialized = false; // Reset to force re-fetch
      await tenantStore.fetchUserTenants();
      const setupToken = route.query.setupToken as string;
      const isNewUser = route.query.isNewUser === 'true';

      if (setupToken) {
        snackbar.success(isNewUser ? 'Account created! Please set your password.' : 'Successfully logged in. Please set a password for your account.');
        router.push(`/auth/setup-password?token=${setupToken}`);
      } else {
        snackbar.success('Successfully logged in with Google!');
        router.push('/');
      }
    } catch (error) {
      console.error('Google login error:', error);
      snackbar.error('Failed to authenticate with Google.');
      router.push('/login');
    }
  } else {
    snackbar.error('No token received from Google.');
    router.push('/login');
  }
});
</script>

<template>
  <div class="callback-container">
    <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    <p class="mt-4 text-h6">Authenticating with Google...</p>
  </div>
</template>

<style scoped>
.callback-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
}
</style>
