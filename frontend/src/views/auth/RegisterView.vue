<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import { useSnackbar } from "@/composables/useSnackbar";

const router = useRouter();
const authStore = useAuthStore();
const snackbar = useSnackbar();

const formValid = ref(false);
const form = ref({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  organizationName: "",
});

const showPassword = ref(false);
const showConfirmPassword = ref(false);

const loading = computed(() => authStore.loading);
const error = computed(() => authStore.error);

const rules = {
  required: (v: string) => !!v || "This field is required",
  email: (v: string) => /.+@.+\..+/.test(v) || "Enter a valid email",
  minLength: (min: number) => (v: string) =>
    (v && v.length >= min) || `Must be at least ${min} characters`,
  passwordMatch: (v: string) =>
    v === form.value.password || "Passwords do not match",
};

const handleRegister = async () => {
  if (!formValid.value) return;

  try {
    await authStore.register({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
      fullName: form.value.fullName,
      organizationName: form.value.organizationName,
    });
    snackbar.success("Account created successfully! Please sign in.");
    router.push("/login");
  } catch (err: any) {
    snackbar.error(
      err.response?.data?.message || "Registration failed. Please try again."
    );
  }
};
</script>

<template>
  <div class="register-wrapper">
    <div class="register-container">
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

        <!-- Welcome Text -->
        <div class="welcome-section">
          <h1 class="welcome-title">Create Account</h1>
          <p class="welcome-subtitle">Sign up to get started with BiTi</p>
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

        <!-- Form -->
        <v-form
          v-model="formValid"
          @submit.prevent="handleRegister"
          class="register-form"
        >
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <v-text-field
                v-model="form.fullName"
                placeholder="Enter your name"
                :rules="[rules.required]"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                class="custom-input"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Username</label>
              <v-text-field
                v-model="form.username"
                placeholder="Choose a username"
                :rules="[rules.required, rules.minLength(3)]"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                class="custom-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Email</label>
            <v-text-field
              v-model="form.email"
              placeholder="Enter your email"
              :rules="[rules.required, rules.email]"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="custom-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Organization Name</label>
            <v-text-field
              v-model="form.organizationName"
              placeholder="e.g. My Company"
              :rules="[rules.required]"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="custom-input"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Password</label>
              <v-text-field
                v-model="form.password"
                placeholder="Create password"
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
                placeholder="Confirm password"
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
          </div>

          <v-btn
            type="submit"
            class="sign-up-btn"
            size="x-large"
            block
            rounded="lg"
            :loading="loading"
            :disabled="!formValid"
          >
            Create Account
          </v-btn>

          <div class="divider">
            <span class="divider-line"></span>
            <span class="divider-text">Or continue with</span>
            <span class="divider-line"></span>
          </div>

          <v-btn
            variant="outlined"
            size="large"
            block
            rounded="lg"
            class="google-btn"
            href="http://localhost:3000/api/auth/google"
          >
            <svg class="google-icon" width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span class="google-text">Sign up with Google</span>
          </v-btn>

          <div class="login-link">
            <span>Already have an account?</span>
            <router-link to="/login" class="login-text">Sign In</router-link>
          </div>
        </v-form>
      </div>

      <!-- Right Panel - Illustration -->
      <div class="illustration-panel">
        <div class="illustration-content">
          <!-- Decorative elements -->
          <div class="floating-icon icon-1">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#1a1a2e" />
              <path d="M12 6v6l4 2" stroke="white" stroke-width="2" stroke-linecap="round" />
            </svg>
          </div>
          <div class="floating-icon icon-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#f1184c" />
              <path d="M7 12L10 15L17 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>

          <!-- Main illustration card -->
          <div class="illustration-card">
            <div class="card-inner">
              <svg class="team-illustration" viewBox="0 0 200 180" fill="none">
                <!-- Person 1 -->
                <circle cx="60" cy="50" r="18" fill="#fdbf8f" />
                <ellipse cx="60" cy="38" rx="16" ry="12" fill="#1a1a2e" />
                <rect x="45" y="68" width="30" height="40" rx="6" fill="#f1184c" />
                <rect x="45" y="108" width="13" height="30" rx="3" fill="#155e75" />
                <rect x="62" y="108" width="13" height="30" rx="3" fill="#155e75" />
                
                <!-- Person 2 -->
                <circle cx="100" cy="40" r="20" fill="#fdbf8f" />
                <ellipse cx="100" cy="26" rx="18" ry="14" fill="#32a4a7" />
                <rect x="82" y="60" width="36" height="50" rx="8" fill="#06b6d4" />
                <rect x="82" y="110" width="16" height="35" rx="4" fill="#155e75" />
                <rect x="102" y="110" width="16" height="35" rx="4" fill="#155e75" />
                
                <!-- Person 3 -->
                <circle cx="140" cy="50" r="18" fill="#fdbf8f" />
                <ellipse cx="140" cy="38" rx="16" ry="12" fill="#ec4899" />
                <rect x="125" y="68" width="30" height="40" rx="6" fill="#f59e0b" />
                <rect x="125" y="108" width="13" height="30" rx="3" fill="#155e75" />
                <rect x="142" y="108" width="13" height="30" rx="3" fill="#155e75" />

                <!-- Connecting line -->
                <path d="M60 90 Q100 70 140 90" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="4" fill="none" />
              </svg>
            </div>
          </div>

          <!-- Stats card -->
          <div class="stats-card">
            <div class="stat-item">
              <div class="stat-icon" style="background: rgba(241, 24, 76, 0.1); color: #f1184c;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <div>
                <div class="stat-value">10k+</div>
                <div class="stat-label">Active Users</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon" style="background: rgba(50, 164, 167, 0.1); color: #32a4a7;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              <div>
                <div class="stat-value">50k+</div>
                <div class="stat-label">Tasks Done</div>
              </div>
            </div>
          </div>

          <!-- Tagline -->
          <p class="tagline">
            Join thousands of teams managing their tasks efficiently with BiTi
          </p>

          <!-- Pagination dots -->
          <div class="pagination-dots">
            <span class="dot"></span>
            <span class="dot active"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  width: 100%;
  background-color: #f4f4f4;
  min-height: 100vh;
}

.register-container {
  display: flex;
  width: 100%;
  max-width: 950px;
  min-height: 600px;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* Form Panel */
.form-panel {
  flex: 0 0 50%;
  padding: 32px 36px;
  display: flex;
  flex-direction: column;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
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
  margin-bottom: 16px;
}

.welcome-title {
  font-size: 24px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0 0 4px 0;
  letter-spacing: -0.5px;
}

.welcome-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.register-form {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  margin-bottom: 12px;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.custom-input :deep(.v-field) {
  border-radius: 10px;
}

.custom-input :deep(.v-field__outline__start) {
  border-radius: 10px 0 0 10px;
}

.custom-input :deep(.v-field__outline__end) {
  border-radius: 0 10px 10px 0;
}

.custom-input :deep(input) {
  font-size: 13px;
}

.sign-up-btn {
  background: linear-gradient(135deg, #f1184c, #d90b3f) !important;
  color: white !important;
  font-weight: 600;
  font-size: 14px;
  text-transform: none;
  letter-spacing: 0;
  box-shadow: 0 4px 14px rgba(241, 24, 76, 0.4);
  transition: all 0.3s ease;
  height: 44px !important;
  margin-top: 4px;
}

.sign-up-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(241, 24, 76, 0.5);
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 14px 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.divider-text {
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
}

.google-btn {
  border-color: #e5e7eb !important;
  color: #374151 !important;
  text-transform: none;
  font-weight: 500;
  height: 42px;
}

.google-btn:hover {
  background: #f9fafb !important;
}

.google-icon {
  margin-right: 8px;
}

.google-text {
  font-size: 13px;
}

.login-link {
  text-align: center;
  margin-top: 14px;
  font-size: 13px;
  color: #6b7280;
}

.login-text {
  color: #f1184c;
  text-decoration: underline;
  font-weight: 600;
  margin-left: 4px;
}

.login-text:hover {
  color: #d90b3f;
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
  padding: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
  width: 100%;
}

.team-illustration {
  width: 100%;
  height: 160px;
}

/* Stats card */
.stats-card {
  background: white;
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  width: 100%;
  display: flex;
  gap: 24px;
  justify-content: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
}

.stat-label {
  font-size: 11px;
  color: #6b7280;
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
  .register-container {
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

  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
