<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import { useSnackbar } from "@/composables/useSnackbar";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const snackbar = useSnackbar();

const formValid = ref(false);
const form = ref({
  password: "",
  confirmPassword: "",
});
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const resetSuccess = ref(false);
const tokenError = ref(false);

const loading = computed(() => authStore.loading);
const error = computed(() => authStore.error);

const token = computed(() => route.query.token as string);

const rules = {
  required: (v: string) => !!v || "This field is required",
  minLength: (min: number) => (v: string) =>
    (v && v.length >= min) || `Must be at least ${min} characters`,
  passwordMatch: (v: string) =>
    v === form.value.password || "Passwords do not match",
};

onMounted(() => {
  if (!token.value) {
    tokenError.value = true;
  }
});

const handleResetPassword = async () => {
  if (!formValid.value || !token.value) return;

  try {
    await authStore.resetPassword(token.value, form.value.password);
    resetSuccess.value = true;
    snackbar.success("Password reset successfully!");
  } catch (err: any) {
    snackbar.error(
      err.response?.data?.message || "Failed to reset password. Please try again."
    );
  }
};
</script>

<template>
  <div class="reset-wrapper">
    <div class="reset-container">
      <!-- Left Panel - Form -->
      <div class="form-panel">
        <!-- Logo -->
        <div class="logo-section">
          <div class="logo-bars">
            <div class="logo-bar" style="height: 28px; background: #f1184c"></div>
            <div class="logo-bar" style="height: 22px; background: #ec4899"></div>
            <div class="logo-bar" style="height: 16px; background: #06b6d4"></div>
          </div>
          <div class="logo-text-container">
            <div class="logo-title">BiTi</div>
            <div class="logo-subtitle">Task Management</div>
          </div>
        </div>

        <!-- Token Error State -->
        <div v-if="tokenError" class="error-state">
          <div class="error-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="#f1184c" stroke-width="2" fill="rgba(241, 24, 76, 0.1)"/>
              <path d="M15 9L9 15M9 9L15 15" stroke="#f1184c" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h2 class="error-title">Invalid Reset Link</h2>
          <p class="error-text">
            This password reset link is invalid or has expired.<br>
            Please request a new one.
          </p>
          <v-btn
            class="sign-in-btn"
            size="large"
            block
            rounded="lg"
            @click="router.push('/forgot-password')"
          >
            Request New Link
          </v-btn>
        </div>

        <!-- Success State -->
        <div v-else-if="resetSuccess" class="success-state">
          <div class="success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="#32a4a7" stroke-width="2" fill="rgba(50, 164, 167, 0.1)"/>
              <path d="M7 12L10 15L17 8" stroke="#32a4a7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2 class="success-title">Password Reset!</h2>
          <p class="success-text">
            Your password has been reset successfully.<br>
            You can now sign in with your new password.
          </p>
          <v-btn
            class="sign-in-btn"
            size="large"
            block
            rounded="lg"
            @click="router.push('/login')"
          >
            Sign In
          </v-btn>
        </div>

        <!-- Form -->
        <template v-else>
          <!-- Title -->
          <div class="welcome-section">
            <h1 class="welcome-title">Set New Password</h1>
            <p class="welcome-subtitle">Your new password must be different from previous passwords</p>
          </div>

          <!-- Error Alert -->
          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
            closable
          >
            {{ error }}
          </v-alert>

          <v-form
            v-model="formValid"
            @submit.prevent="handleResetPassword"
            class="reset-form"
          >
            <div class="form-group">
              <label class="form-label">New Password</label>
              <v-text-field
                v-model="form.password"
                placeholder="Enter new password"
                :rules="[rules.required, rules.minLength(6)]"
                :type="showPassword ? 'text' : 'password'"
                variant="outlined"
                density="comfortable"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                hide-details="auto"
                class="custom-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Confirm Password</label>
              <v-text-field
                v-model="form.confirmPassword"
                placeholder="Confirm new password"
                :rules="[rules.required, rules.passwordMatch]"
                :type="showConfirmPassword ? 'text' : 'password'"
                variant="outlined"
                density="comfortable"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
                hide-details="auto"
                class="custom-input"
              />
            </div>

            <v-btn
              type="submit"
              class="sign-in-btn"
              size="x-large"
              block
              rounded="lg"
              :loading="loading"
              :disabled="!formValid"
            >
              Reset Password
            </v-btn>

            <div class="back-link">
              <router-link to="/login" class="back-text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
                Back to Sign In
              </router-link>
            </div>
          </v-form>
        </template>
      </div>

      <!-- Right Panel - Illustration -->
      <div class="illustration-panel">
        <div class="illustration-content">
          <!-- Decorative elements -->
          <div class="floating-icon icon-1">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#1a1a2e"/>
              <path d="M8 12L11 15L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="floating-icon icon-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#32a4a7"/>
              <path d="M12 7V13L15 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>

          <!-- Main illustration card -->
          <div class="illustration-card">
            <div class="card-inner">
              <svg class="key-illustration" viewBox="0 0 200 180" fill="none">
                <!-- Key handle -->
                <circle cx="70" cy="90" r="35" stroke="#f1184c" stroke-width="6" fill="none"/>
                <circle cx="70" cy="90" r="15" fill="#f1184c"/>
                <!-- Key shaft -->
                <rect x="100" y="84" width="60" height="12" rx="2" fill="#1a1a2e"/>
                <!-- Key teeth -->
                <rect x="140" y="96" width="8" height="12" rx="1" fill="#1a1a2e"/>
                <rect x="152" y="96" width="8" height="8" rx="1" fill="#1a1a2e"/>
                <!-- Sparkles -->
                <circle cx="45" cy="50" r="4" fill="#32a4a7"/>
                <circle cx="150" cy="60" r="3" fill="#f1184c"/>
                <circle cx="170" cy="120" r="2" fill="#32a4a7"/>
              </svg>
            </div>
          </div>

          <!-- Tagline -->
          <p class="tagline">
            Create a strong password to keep your account secure
          </p>

          <!-- Pagination dots -->
          <div class="pagination-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot active"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reset-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  width: 100%;
  background-color: #f4f4f4;
  min-height: 100vh;
}

.reset-container {
  display: flex;
  width: 100%;
  max-width: 900px;
  min-height: 520px;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* Form Panel */
.form-panel {
  flex: 0 0 45%;
  padding: 32px 36px;
  display: flex;
  flex-direction: column;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}

.logo-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
}

.logo-bar {
  width: 5px;
  border-radius: 2px;
}

.logo-text-container {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-size: 22px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.1;
}

.logo-subtitle {
  font-size: 12px;
  font-weight: 500;
  color: #32a4a7;
  letter-spacing: 0.5px;
}

.welcome-section {
  margin-bottom: 20px;
}

.welcome-title {
  font-size: 26px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0 0 6px 0;
  letter-spacing: -0.5px;
}

.welcome-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.reset-form {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.custom-input :deep(.v-field) {
  border-radius: 12px;
}

.custom-input :deep(.v-field__outline__start) {
  border-radius: 12px 0 0 12px;
}

.custom-input :deep(.v-field__outline__end) {
  border-radius: 0 12px 12px 0;
}

.sign-in-btn {
  background: linear-gradient(135deg, #f1184c, #d90b3f) !important;
  color: white !important;
  font-weight: 600;
  font-size: 14px;
  text-transform: none;
  letter-spacing: 0;
  box-shadow: 0 4px 14px rgba(241, 24, 76, 0.4);
  transition: all 0.3s ease;
  height: 44px !important;
  margin-top: 8px;
}

.sign-in-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(241, 24, 76, 0.5);
}

.back-link {
  text-align: center;
  margin-top: 20px;
}

.back-text {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  color: #6b7280;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.back-text:hover {
  color: #f1184c;
}

/* Success State */
.success-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.success-icon,
.error-icon {
  margin-bottom: 20px;
}

.success-title,
.error-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 10px 0;
}

.success-text,
.error-text {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px 0;
  line-height: 1.6;
}

/* Illustration Panel */
.illustration-panel {
  flex: 1;
  background: linear-gradient(180deg, #a7c4e6 0%, #8db4dc 50%, #6a9bcf 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  position: relative;
  overflow: hidden;
}

.illustration-content {
  position: relative;
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Floating icons */
.floating-icon {
  position: absolute;
  animation: float 3s ease-in-out infinite;
}

.icon-1 {
  top: -10px;
  left: 10px;
  animation-delay: 0s;
}

.icon-2 {
  top: 40px;
  right: 0;
  animation-delay: 1.5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Main illustration card */
.illustration-card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  width: 100%;
}

.key-illustration {
  width: 100%;
  height: 160px;
}

.tagline {
  font-size: 13px;
  color: #1a1a2e;
  text-align: center;
  margin: 16px 0;
  line-height: 1.5;
  opacity: 0.9;
}

.pagination-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(26, 26, 46, 0.3);
  transition: all 0.3s ease;
}

.dot.active {
  width: 24px;
  border-radius: 4px;
  background: #1a1a2e;
}

/* Responsive */
@media (max-width: 768px) {
  .reset-container {
    flex-direction: column;
    max-width: 480px;
  }

  .form-panel {
    flex: none;
    padding: 24px;
  }

  .illustration-panel {
    display: none;
  }
}
</style>
