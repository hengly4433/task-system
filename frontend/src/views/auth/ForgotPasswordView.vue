<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import { useSnackbar } from "@/composables/useSnackbar";

const router = useRouter();
const authStore = useAuthStore();
const snackbar = useSnackbar();

const formValid = ref(false);
const email = ref("");
const emailSent = ref(false);

const loading = computed(() => authStore.loading);
const error = computed(() => authStore.error);

const rules = {
  required: (v: string) => !!v || "This field is required",
  email: (v: string) => /.+@.+\..+/.test(v) || "Enter a valid email",
};

const handleForgotPassword = async () => {
  if (!formValid.value) return;

  try {
    await authStore.forgotPassword(email.value);
    emailSent.value = true;
    snackbar.success("Reset email sent! Check your inbox.");
  } catch (err: any) {
    // Don't show error for security reasons - always show success message
    emailSent.value = true;
    snackbar.success("If an account exists, a reset email has been sent.");
  }
};
</script>

<template>
  <div class="forgot-wrapper">
    <div class="forgot-container">
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

        <!-- Title -->
        <div class="welcome-section">
          <h1 class="welcome-title">Forgot Password?</h1>
          <p class="welcome-subtitle">No worries, we'll send you reset instructions</p>
        </div>

        <!-- Error Alert -->
        <v-alert
          v-if="error && !emailSent"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4"
          closable
        >
          {{ error }}
        </v-alert>

        <!-- Success State -->
        <div v-if="emailSent" class="success-state">
          <div class="success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="#32a4a7" stroke-width="2" fill="rgba(50, 164, 167, 0.1)"/>
              <path d="M7 12L10 15L17 8" stroke="#32a4a7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2 class="success-title">Check your email</h2>
          <p class="success-text">
            We sent a password reset link to<br>
            <strong>{{ email }}</strong>
          </p>
          <v-btn
            class="sign-in-btn"
            size="large"
            block
            rounded="lg"
            @click="router.push('/login')"
          >
            Back to Sign In
          </v-btn>
          <p class="resend-text">
            Didn't receive the email?
            <a href="#" @click.prevent="emailSent = false; handleForgotPassword()">Click to resend</a>
          </p>
        </div>

        <!-- Form -->
        <v-form
          v-else
          v-model="formValid"
          @submit.prevent="handleForgotPassword"
          class="forgot-form"
        >
          <div class="form-group">
            <label class="form-label">Email</label>
            <v-text-field
              v-model="email"
              placeholder="Enter your email"
              :rules="[rules.required, rules.email]"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="custom-input"
            />
          </div>

          <v-btn
            type="submit"
            class="sign-in-btn"
            size="large"
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
      </div>

      <!-- Right Panel - Illustration -->
      <div class="illustration-panel">
        <div class="illustration-content">
          <!-- Decorative elements -->
          <div class="floating-icon icon-1">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#1a1a2e"/>
              <path d="M12 7V13L16 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="floating-icon icon-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#f1184c"/>
              <path d="M12 8V12M12 16H12.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>

          <!-- Main illustration card -->
          <div class="illustration-card">
            <div class="card-inner">
              <svg class="lock-illustration" viewBox="0 0 200 180" fill="none">
                <!-- Lock body -->
                <rect x="60" y="80" width="80" height="70" rx="8" fill="#32a4a7"/>
                <!-- Lock shackle -->
                <path d="M80 80V60C80 48.954 88.954 40 100 40C111.046 40 120 48.954 120 60V80" 
                      stroke="#1a1a2e" stroke-width="8" stroke-linecap="round" fill="none"/>
                <!-- Keyhole -->
                <circle cx="100" cy="110" r="10" fill="#1a1a2e"/>
                <rect x="96" y="115" width="8" height="15" rx="2" fill="#1a1a2e"/>
                <!-- Stars -->
                <circle cx="50" cy="60" r="3" fill="#f1184c"/>
                <circle cx="150" cy="50" r="4" fill="#f1184c"/>
                <circle cx="160" cy="100" r="2" fill="#32a4a7"/>
              </svg>
            </div>
          </div>

          <!-- Tagline -->
          <p class="tagline">
            Enter your email and we'll send you instructions to reset your password
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
.forgot-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  width: 100%;
  background-color: #f4f4f4;
  min-height: 100vh;
}

.forgot-container {
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

.forgot-form {
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 20px;
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
.success-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.success-icon {
  margin-bottom: 20px;
}

.success-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 10px 0;
}

.success-text {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px 0;
  line-height: 1.6;
}

.resend-text {
  margin-top: 16px;
  font-size: 13px;
  color: #6b7280;
}

.resend-text a {
  color: #f1184c;
  text-decoration: underline;
  font-weight: 500;
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

.lock-illustration {
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
  .forgot-container {
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
