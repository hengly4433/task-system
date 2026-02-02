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
  usernameOrEmail: "",
  password: "",
  rememberMe: false,
});

const showPassword = ref(false);

const loading = computed(() => authStore.loading);
const error = computed(() => authStore.error);

const rules = {
  required: (v: string) => !!v || "This field is required",
  minLength: (min: number) => (v: string) =>
    (v && v.length >= min) || `Must be at least ${min} characters`,
};

const handleLogin = async () => {
  if (!formValid.value) return;

  try {
    const success = await authStore.login(form.value);
    if (success) {
      snackbar.success("Login successful! Welcome back.");
      router.push("/");
    }
  } catch (err: any) {
    snackbar.error(
      err.response?.data?.message || "Invalid credentials. Please try again."
    );
  }
};
</script>

<template>
  <div class="login-wrapper">
    <div class="login-container">
      <!-- Left Panel - Form -->
      <div class="form-panel">
        <!-- Logo -->
        <div class="logo-section">
          <div class="logo-bars">
            <div
              class="logo-bar"
              style="height: 28px; background: #f1184c"
            ></div>
            <div
              class="logo-bar"
              style="height: 22px; background: #ec4899"
            ></div>
            <div
              class="logo-bar"
              style="height: 16px; background: #06b6d4"
            ></div>
          </div>
          <div class="logo-text-container">
            <div class="logo-title">BiTi</div>
            <div class="logo-subtitle">Task Management</div>
          </div>
        </div>

        <!-- Welcome Text -->
        <div class="welcome-section">
          <h1 class="welcome-title">Welcome Back!</h1>
          <p class="welcome-subtitle">Please enter login details below</p>
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
          @submit.prevent="handleLogin"
          class="login-form"
        >
          <div class="form-group">
            <label class="form-label">Email</label>
            <v-text-field
              v-model="form.usernameOrEmail"
              placeholder="Enter the email"
              :rules="[rules.required]"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="custom-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <v-text-field
              v-model="form.password"
              placeholder="Enter the Password"
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

          <div class="options-row">
            <v-checkbox
              v-model="form.rememberMe"
              label="Remember me"
              density="compact"
              hide-details
              class="remember-checkbox"
            />
            <router-link to="/forgot-password" class="forgot-link">Forgot password?</router-link>
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
            Sign in
          </v-btn>

          <div class="divider">
            <span class="divider-line"></span>
            <span class="divider-text">Or continue</span>
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
            <span class="google-text">Log in with Google</span>
          </v-btn>

          <div class="signup-link">
            <span>Don't have an account?</span>
            <router-link to="/register" class="signup-text"
              >Sign Up</router-link
            >
          </div>
        </v-form>
      </div>

      <!-- Right Panel - Illustration -->
      <div class="illustration-panel">
        <div class="illustration-content">
          <!-- Decorative checkmarks -->
          <div class="floating-check check-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#1a1a2e" />
              <path
                d="M7 12L10 15L17 8"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="floating-check check-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#1a1a2e" />
              <path
                d="M7 12L10 15L17 8"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          <!-- Main illustration card -->
          <div class="illustration-card">
            <div class="card-inner">
              <!-- Stick figure with list -->
              <div class="stick-figure-section">
                <svg class="stick-figure" viewBox="0 0 200 180" fill="none">
                  <!-- Head -->
                  <circle
                    cx="100"
                    cy="30"
                    r="20"
                    stroke="#1a1a2e"
                    stroke-width="3"
                    fill="none"
                  />
                  <circle cx="94" cy="28" r="2" fill="#1a1a2e" />
                  <circle cx="106" cy="28" r="2" fill="#1a1a2e" />
                  <path
                    d="M96 36 Q100 40 104 36"
                    stroke="#1a1a2e"
                    stroke-width="2"
                    fill="none"
                  />
                  <!-- Body -->
                  <line
                    x1="100"
                    y1="50"
                    x2="100"
                    y2="100"
                    stroke="#1a1a2e"
                    stroke-width="3"
                  />
                  <!-- Arms -->
                  <line
                    x1="100"
                    y1="65"
                    x2="65"
                    y2="90"
                    stroke="#1a1a2e"
                    stroke-width="3"
                  />
                  <line
                    x1="100"
                    y1="65"
                    x2="135"
                    y2="55"
                    stroke="#1a1a2e"
                    stroke-width="3"
                  />
                  <!-- Legs -->
                  <line
                    x1="100"
                    y1="100"
                    x2="75"
                    y2="150"
                    stroke="#1a1a2e"
                    stroke-width="3"
                  />
                  <line
                    x1="100"
                    y1="100"
                    x2="125"
                    y2="150"
                    stroke="#1a1a2e"
                    stroke-width="3"
                  />
                  <!-- List board -->
                  <rect
                    x="140"
                    y="20"
                    width="50"
                    height="80"
                    rx="4"
                    stroke="#1a1a2e"
                    stroke-width="2"
                    fill="white"
                  />
                  <text
                    x="150"
                    y="40"
                    font-size="10"
                    fill="#1a1a2e"
                    font-family="monospace"
                  >
                    TODO
                  </text>
                  <text
                    x="150"
                    y="55"
                    font-size="10"
                    fill="#1a1a2e"
                    font-family="monospace"
                  >
                    LIST
                  </text>
                  <line
                    x1="148"
                    y1="65"
                    x2="182"
                    y2="65"
                    stroke="#1a1a2e"
                    stroke-width="1"
                  />
                  <line
                    x1="148"
                    y1="75"
                    x2="182"
                    y2="75"
                    stroke="#1a1a2e"
                    stroke-width="1"
                  />
                  <line
                    x1="148"
                    y1="85"
                    x2="182"
                    y2="85"
                    stroke="#1a1a2e"
                    stroke-width="1"
                  />
                </svg>
              </div>
            </div>
          </div>

          <!-- Task card below -->
          <div class="task-preview-card">
            <div class="task-card-content">
              <div class="task-header-bar"></div>
              <div class="task-lines">
                <div class="task-line">
                  <div class="task-checkbox checked">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12L10 17L19 8"
                        stroke="#32a4a7"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                  <div class="task-text-line"></div>
                </div>
                <div class="task-line">
                  <div class="task-checkbox checked">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12L10 17L19 8"
                        stroke="#32a4a7"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                  <div class="task-text-line"></div>
                </div>
                <div class="task-line">
                  <div class="task-checkbox checked">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12L10 17L19 8"
                        stroke="#32a4a7"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                  <div class="task-text-line"></div>
                </div>
                <div class="task-line">
                  <div class="task-checkbox checked">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12L10 17L19 8"
                        stroke="#32a4a7"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                  <div class="task-text-line short"></div>
                </div>
              </div>
            </div>
            <!-- Person illustration -->
            <div class="person-illustration">
              <svg viewBox="0 0 80 120" fill="none" class="person-svg">
                <!-- Hair -->
                <ellipse cx="40" cy="18" rx="16" ry="14" fill="#1a1a2e" />
                <!-- Face -->
                <ellipse cx="40" cy="22" rx="12" ry="11" fill="#fdbf8f" />
                <!-- Body -->
                <path
                  d="M28 40 L28 80 L52 80 L52 40 Q40 35 28 40"
                  fill="#f59e0b"
                />
                <!-- Arms -->
                <path
                  d="M28 45 L18 65"
                  stroke="#fdbf8f"
                  stroke-width="6"
                  stroke-linecap="round"
                />
                <path
                  d="M52 45 L62 55"
                  stroke="#fdbf8f"
                  stroke-width="6"
                  stroke-linecap="round"
                />
                <!-- Pants -->
                <rect
                  x="28"
                  y="75"
                  width="11"
                  height="35"
                  rx="3"
                  fill="#155e75"
                />
                <rect
                  x="41"
                  y="75"
                  width="11"
                  height="35"
                  rx="3"
                  fill="#155e75"
                />
                <!-- Shoes -->
                <ellipse cx="33" cy="112" rx="7" ry="4" fill="#1a1a2e" />
                <ellipse cx="47" cy="112" rx="7" ry="4" fill="#1a1a2e" />
              </svg>
            </div>
          </div>

          <!-- Tagline -->
          <p class="tagline">
            Manage your task in a easy and more efficient way with BiTi Task
            Management...
          </p>

          <!-- Pagination dots -->
          <div class="pagination-dots">
            <span class="dot active"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  width: 100%;
  background-color: #f4f4f4;
  min-height: 100vh;
}

.login-container {
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

.login-form {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 14px;
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

.options-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.remember-checkbox {
  margin: 0;
}

.remember-checkbox :deep(.v-label) {
  font-size: 13px;
  color: #374151;
}

.remember-checkbox :deep(.v-selection-control__input > .v-icon) {
  color: #f1184c;
}

.forgot-link {
  font-size: 13px;
  color: #374151;
  text-decoration: none;
  font-weight: 500;
}

.forgot-link:hover {
  color: #f1184c;
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

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.divider-text {
  font-size: 14px;
  color: #9ca3af;
  white-space: nowrap;
}

.google-btn {
  border-color: #e5e7eb !important;
  color: #374151 !important;
  text-transform: none;
  font-weight: 500;
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

.signup-link {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: #6b7280;
}

.signup-text {
  color: #f1184c;
  text-decoration: underline;
  font-weight: 600;
  margin-left: 4px;
}

.signup-text:hover {
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
  max-width: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Floating checkmarks */
.floating-check {
  position: absolute;
  animation: float 3s ease-in-out infinite;
}

.check-1 {
  top: 0;
  left: 20px;
  animation-delay: 0s;
}

.check-2 {
  top: 60px;
  right: 10px;
  animation-delay: 1.5s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
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

.stick-figure-section {
  display: flex;
  justify-content: center;
}

.stick-figure {
  width: 200px;
  height: 180px;
}

/* Task preview card */
.task-preview-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  width: 100%;
  display: flex;
  gap: 15px;
  align-items: flex-end;
  position: relative;
}

.task-card-content {
  flex: 1;
}

.task-header-bar {
  height: 6px;
  background: linear-gradient(90deg, #32a4a7, #5ac4c6);
  border-radius: 3px;
  margin-bottom: 16px;
  width: 60%;
}

.task-lines {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-checkbox {
  width: 22px;
  height: 22px;
  border: 2px solid #32a4a7;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(50, 164, 167, 0.1);
}

.task-text-line {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  flex: 1;
}

.task-text-line.short {
  width: 60%;
  flex: none;
}

.person-illustration {
  position: absolute;
  right: -10px;
  bottom: -10px;
  width: 80px;
  height: 120px;
}

.person-svg {
  width: 100%;
  height: 100%;
}

/* Tagline */
.tagline {
  text-align: center;
  color: white;
  font-size: 14px;
  margin: 24px 0 20px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  line-height: 1.5;
}

/* Pagination dots */
.pagination-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
}

.dot.active {
  background: white;
  width: 24px;
  border-radius: 5px;
}

/* Responsive */
@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
    max-width: 480px;
  }

  .form-panel {
    padding: 32px;
  }

  .illustration-panel {
    display: none;
  }

  .welcome-title {
    font-size: 28px;
  }
}
</style>
