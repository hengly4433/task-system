<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import api from "@/services/api";
import { useSnackbar } from "@/composables/useSnackbar";

const router = useRouter();
const route = useRoute();
const snackbar = useSnackbar();

const token = computed(() => route.query.token as string);
const formValid = ref(false);
const loading = ref(false);
const validating = ref(true);
const tokenValid = ref(false);
const tokenError = ref<string | null>(null);
const userEmail = ref("");
const userFullName = ref("");

const form = ref({
  password: "",
  confirmPassword: "",
});

const showPassword = ref(false);
const showConfirmPassword = ref(false);

const rules = {
  required: (v: string) => !!v || "This field is required",
  minLength: (min: number) => (v: string) =>
    (v && v.length >= min) || `Must be at least ${min} characters`,
  passwordMatch: (v: string) =>
    v === form.value.password || "Passwords do not match",
};

onMounted(async () => {
  if (!token.value) {
    tokenError.value =
      "No token provided. Please use the link from your email.";
    validating.value = false;
    return;
  }

  try {
    const response = await api.get(`/auth/validate-token/${token.value}`);
    if (response.data.valid) {
      tokenValid.value = true;
      userEmail.value = response.data.email || "";
      userFullName.value = response.data.fullName || "";
    } else {
      tokenError.value = response.data.message || "Invalid or expired token";
    }
  } catch (err: any) {
    tokenError.value =
      err.response?.data?.message || "Failed to validate token";
  } finally {
    validating.value = false;
  }
});

const handleSetupPassword = async () => {
  if (!formValid.value || !token.value) return;

  loading.value = true;
  try {
    const response = await api.post("/auth/setup-password", {
      token: token.value,
      password: form.value.password,
    });

    if (response.data.success) {
      snackbar.success("Password set successfully! You can now log in.");
      router.push("/login");
    }
  } catch (err: any) {
    snackbar.error(err.response?.data?.message || "Failed to set password");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="setup-password-container">
    <v-card class="setup-card pa-8" rounded="xl" elevation="8">
      <!-- Logo -->
      <div class="d-flex align-center justify-center mb-6">
        <div class="logo-bars d-flex ga-1 mr-2">
          <div class="logo-bar" style="height: 28px; background: #f1184c"></div>
          <div class="logo-bar" style="height: 22px; background: #ec4899"></div>
          <div class="logo-bar" style="height: 16px; background: #06b6d4"></div>
        </div>
        <div>
          <span class="text-h4 font-weight-bold" style="color: #1e293b"
            >BiTi</span
          >
          <div class="text-caption" style="color: #64748b">
            Tasks Management
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="validating" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="48" />
        <p class="text-body-2 text-grey mt-4">Validating your link...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="tokenError" class="text-center">
        <v-icon size="64" color="error" class="mb-4"
          >mdi-alert-circle-outline</v-icon
        >
        <h2 class="text-h5 font-weight-bold mb-2">Invalid Link</h2>
        <p class="text-body-2 text-grey mb-6">{{ tokenError }}</p>
        <v-btn color="primary" variant="tonal" :to="{ name: 'Login' }">
          Back to Login
        </v-btn>
      </div>

      <!-- Setup Password Form -->
      <template v-else-if="tokenValid">
        <div class="text-center mb-6">
          <h1 class="text-h5 font-weight-bold mb-1">Set Up Your Password</h1>
          <p class="text-body-2 text-grey">
            Welcome{{ userFullName ? ` ${userFullName}` : "" }}! Create a
            password for your account.
          </p>
          <p v-if="userEmail" class="text-body-2 text-primary mt-1">
            {{ userEmail }}
          </p>
        </div>

        <v-form v-model="formValid" @submit.prevent="handleSetupPassword">
          <v-text-field
            v-model="form.password"
            label="New Password"
            :rules="[rules.required, rules.minLength(6)]"
            :type="showPassword ? 'text' : 'password'"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-lock-outline"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
            class="mb-3"
          />

          <v-text-field
            v-model="form.confirmPassword"
            label="Confirm Password"
            :rules="[rules.required, rules.passwordMatch]"
            :type="showConfirmPassword ? 'text' : 'password'"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-lock-check-outline"
            :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showConfirmPassword = !showConfirmPassword"
            class="mb-4"
          />

          <v-btn
            type="submit"
            color="primary"
            size="large"
            block
            rounded="lg"
            :loading="loading"
            :disabled="!formValid"
          >
            Set Password
          </v-btn>
        </v-form>

        <div class="text-center mt-6">
          <span class="text-grey">Already have a password?</span>
          <router-link
            to="/login"
            class="text-primary text-decoration-none ml-1 font-weight-medium"
          >
            Sign In
          </router-link>
        </div>
      </template>
    </v-card>
  </div>
</template>

<style scoped>
.setup-password-container {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 20px;
}

.setup-card {
  background: white;
}

.logo-bars {
  display: flex;
  align-items: flex-end;
}

.logo-bar {
  width: 6px;
  border-radius: 3px;
}
</style>
