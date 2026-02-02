<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { userService } from "@/services/user.service";
import { useSnackbar } from "@/composables/useSnackbar";

const authStore = useAuthStore();
const snackbar = useSnackbar();

const loading = ref(false);
const saving = ref(false);
const uploadingAvatar = ref(false);
const changingPassword = ref(false);

// Password visibility
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

// Profile form data
const form = ref({
  fullName: "",
  email: "",
  username: "",
  nickname: "",
  position: "",
});

// Password form
const passwordForm = ref({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});

// Avatar
const avatarUrl = ref<string | null>(null);
const avatarFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// Computed user info
const user = computed(() => authStore.user);
const userRoles = computed(() => authStore.user?.roles?.join(", ") || "User");
const hasPassword = computed(() => (authStore.user as any)?.hasPassword);
const settingInitialPassword = ref(false);

onMounted(async () => {
  if (user.value) {
    form.value = {
      fullName: user.value.fullName || "",
      email: user.value.email || "",
      username: user.value.username || "",
      nickname: user.value.fullName?.split(" ")[0] || "",
      position: user.value.position || "",
    };
    avatarUrl.value = user.value.profileImageUrl || null;
  }
});

const triggerFileUpload = () => {
  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // Preview
  avatarFile.value = file;
  avatarUrl.value = URL.createObjectURL(file);

  // Upload
  if (user.value?.userId) {
    uploadingAvatar.value = true;
    try {
      const result = await userService.uploadAvatar(user.value.userId, file);
      avatarUrl.value = result.profileImageUrl;
      await authStore.fetchProfile(); // Refresh profile
      snackbar.success("Profile picture updated successfully!");
    } catch (error: any) {
      snackbar.error(
        error.response?.data?.message || "Failed to upload profile picture"
      );
    } finally {
      uploadingAvatar.value = false;
    }
  }
};

const removeAvatar = async () => {
  if (!user.value?.userId) return;

  saving.value = true;
  try {
    await userService.update(user.value.userId, { profileImageUrl: "" });
    avatarUrl.value = null;
    await authStore.fetchProfile();
    snackbar.success("Profile picture removed!");
  } catch (error: any) {
    snackbar.error(
      error.response?.data?.message || "Failed to remove profile picture"
    );
  } finally {
    saving.value = false;
  }
};

const saveProfile = async () => {
  if (!user.value?.userId) return;

  saving.value = true;
  try {
    await userService.update(user.value.userId, {
      fullName: form.value.fullName,
    });
    await authStore.fetchProfile();
    snackbar.success("Profile updated successfully!");
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to update profile");
  } finally {
    saving.value = false;
  }
};

const changePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    snackbar.error("New passwords do not match");
    return;
  }

  if (!user.value?.userId) return;

  changingPassword.value = true;
  try {
    if (hasPassword.value) {
      await userService.changePassword(
        user.value.userId,
        passwordForm.value.oldPassword,
        passwordForm.value.newPassword
      );
    } else {
      // For users who don't have a password yet (Google login)
      // We'll use the logout and forgot password flow or a direct update if allowed
      // But better to use the setup-password flow.
      // For now, let's implement a simple "Forgot Password" trigger or direct set if authenticated.
      // Actually, if they are logged in, we can add a 'setPassword' method to userService.
      await userService.update(user.value.userId, { password: passwordForm.value.newPassword });
    }
    passwordForm.value = { oldPassword: "", newPassword: "", confirmPassword: "" };
    await authStore.fetchProfile(); // Refresh to update hasPassword
    snackbar.success(hasPassword.value ? "Password changed successfully!" : "Password set successfully!");
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to update password");
  } finally {
    changingPassword.value = false;
  }
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
</script>

<template>
  <div class="profile-page">
    <!-- Modern Header Section -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <v-icon icon="mdi-account-circle" size="32" />
        </div>
        <div>
          <h1 class="page-title">My Profile</h1>
          <p class="page-subtitle">Manage your personal information and account settings</p>
        </div>
      </div>
    </div>

    <v-row class="mt-6">
      <!-- Left Column - Account Management -->
      <v-col cols="12" md="4">
        <div class="profile-card account-card">
          <div class="card-header">
            <v-icon icon="mdi-account-cog" size="22" class="header-icon-small" />
            <h3>Account Management</h3>
          </div>

          <!-- Avatar Section -->
          <div class="avatar-section">
            <div class="avatar-wrapper" @click="triggerFileUpload">
              <div class="avatar-glow"></div>
              <v-avatar size="140" class="profile-avatar">
                <v-img v-if="avatarUrl" :src="avatarUrl" cover />
                <span v-else class="avatar-initials">{{
                  getInitials(user?.fullName || user?.username)
                }}</span>
              </v-avatar>

              <!-- Hover overlay -->
              <div class="avatar-overlay">
                <v-icon icon="mdi-camera" size="28" />
                <span class="overlay-text">Change Photo</span>
              </div>

              <!-- Remove button -->
              <v-btn
                v-if="avatarUrl"
                icon
                size="x-small"
                class="remove-avatar-btn"
                @click.stop="removeAvatar"
              >
                <v-icon icon="mdi-close" size="14" />
              </v-btn>

              <!-- Loading overlay -->
              <div v-if="uploadingAvatar" class="avatar-loading">
                <v-progress-circular indeterminate color="white" size="32" />
              </div>
            </div>

            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="d-none"
              @change="handleFileChange"
            />

            <button
              class="upload-btn"
              :disabled="uploadingAvatar"
              @click="triggerFileUpload"
            >
              <v-icon icon="mdi-cloud-upload" size="18" class="mr-2" />
              {{ uploadingAvatar ? 'Uploading...' : 'Upload New Photo' }}
            </button>
            
            <p class="upload-hint">JPG, PNG or GIF. Max size 5MB</p>
          </div>

          <div class="section-divider">
            <span>Security</span>
          </div>

          <!-- Password Change Section -->
          <div class="password-section">
            <div class="password-header">
              <v-icon icon="mdi-shield-lock" size="20" class="password-icon" />
              <h4>Change Password</h4>
            </div>

            <div v-if="hasPassword" class="modern-input-group">
              <label class="modern-label">
                <v-icon icon="mdi-lock" size="16" />
                Current Password
              </label>
              <div class="input-wrapper">
                <input
                  v-model="passwordForm.oldPassword"
                  :type="showOldPassword ? 'text' : 'password'"
                  class="modern-input"
                  placeholder="Enter current password"
                />
                <button class="toggle-password" @click="showOldPassword = !showOldPassword">
                  <v-icon :icon="showOldPassword ? 'mdi-eye-off' : 'mdi-eye'" size="18" />
                </button>
              </div>
            </div>
            
            <div v-else class="alert-info pa-3 mb-4 rounded-lg" style="background: rgba(241, 24, 76, 0.05); border: 1px solid rgba(241, 24, 76, 0.2)">
              <div class="d-flex align-center gap-2 mb-1">
                <v-icon icon="mdi-information-outline" color="primary" size="20" />
                <span class="text-subtitle-2 font-weight-bold color-primary">Set Your Password</span>
              </div>
              <p class="text-caption mb-0">You logged in with Google. Set a password to enable traditional login.</p>
            </div>

            <div class="modern-input-group">
              <label class="modern-label">
                <v-icon icon="mdi-lock-plus" size="16" />
                New Password
              </label>
              <div class="input-wrapper">
                <input
                  v-model="passwordForm.newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  class="modern-input"
                  placeholder="Enter new password"
                />
                <button class="toggle-password" @click="showNewPassword = !showNewPassword">
                  <v-icon :icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'" size="18" />
                </button>
              </div>
            </div>

            <div class="modern-input-group">
              <label class="modern-label">
                <v-icon icon="mdi-lock-check" size="16" />
                Confirm Password
              </label>
              <div class="input-wrapper">
                <input
                  v-model="passwordForm.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  class="modern-input"
                  placeholder="Confirm new password"
                />
                <button class="toggle-password" @click="showConfirmPassword = !showConfirmPassword">
                  <v-icon :icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'" size="18" />
                </button>
              </div>
            </div>

            <button
              class="change-password-btn"
              :disabled="
                (hasPassword && !passwordForm.oldPassword) ||
                !passwordForm.newPassword ||
                !passwordForm.confirmPassword ||
                changingPassword
              "
              @click="changePassword"
            >
              <v-icon icon="mdi-lock-reset" size="18" class="mr-2" />
              {{ changingPassword ? 'Updating...' : (hasPassword ? 'Update Password' : 'Set Password') }}
            </button>
          </div>
        </div>
      </v-col>

      <!-- Right Column - Profile Information -->
      <v-col cols="12" md="8">
        <div class="profile-card info-card">
          <div class="card-header">
            <v-icon icon="mdi-card-account-details" size="22" class="header-icon-small" />
            <h3>Profile Information</h3>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">
                <v-icon icon="mdi-account" size="16" />
                Username
              </label>
              <div class="readonly-field">
                <span>{{ form.username }}</span>
                <v-icon icon="mdi-lock" size="14" class="lock-icon" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <v-icon icon="mdi-badge-account" size="16" />
                Full Name
              </label>
              <input
                v-model="form.fullName"
                type="text"
                class="form-input"
                placeholder="Enter your full name"
              />
            </div>

            <div class="form-group">
              <label class="form-label">
                <v-icon icon="mdi-emoticon-happy" size="16" />
                Nickname
              </label>
              <input
                v-model="form.nickname"
                type="text"
                class="form-input"
                placeholder="Enter nickname"
              />
            </div>

            <div class="form-group">
              <label class="form-label">
                <v-icon icon="mdi-shield-account" size="16" />
                Role
              </label>
              <div class="role-badge">
                <v-icon icon="mdi-star" size="14" class="role-icon" />
                {{ userRoles }}
              </div>
            </div>
          </div>

          <div class="section-divider">
            <span>Contact Information</span>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">
                <v-icon icon="mdi-email" size="16" />
                Email Address
                <span class="required-badge">Required</span>
              </label>
              <div class="readonly-field">
                <span>{{ form.email }}</span>
                <v-icon icon="mdi-check-circle" size="14" class="verified-icon" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <v-icon icon="mdi-briefcase" size="16" />
                Position
              </label>
              <div class="readonly-field">
                <span>{{ form.position || 'Not specified' }}</span>
                <v-icon icon="mdi-lock" size="14" class="lock-icon" />
              </div>
            </div>
          </div>

          <div class="card-actions">
            <button class="save-btn" :disabled="saving" @click="saveProfile">
              <v-icon icon="mdi-content-save" size="18" class="mr-2" />
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 40px;
}

/* Page Header */
.page-header {
  background: #f1184c;
  border-radius: 20px;
  padding: 28px 32px;
  margin-bottom: 8px;
  box-shadow: 0 10px 40px rgba(241, 24, 76, 0.3);
  position: relative;
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 300px;
  height: 100%;
  background: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='40' fill='rgba(255,255,255,0.1)'/%3E%3C/svg%3E") repeat;
  opacity: 0.5;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.header-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin-bottom: 4px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.page-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

/* Profile Cards */
.profile-card {
  background: white;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.profile-card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.account-card {
  position: sticky;
  top: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.card-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.header-icon-small {
  width: 40px;
  height: 40px;
  background: #f1184c;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  padding: 8px;
}

/* Avatar Section */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
  margin-bottom: 16px;
}

.avatar-glow {
  position: absolute;
  inset: -8px;
  background: #f1184c;
  border-radius: 50%;
  opacity: 0.3;
  filter: blur(15px);
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.05); }
}

.profile-avatar {
  background: #f1184c;
  border: 4px solid white;
  box-shadow: 0 8px 32px rgba(241, 24, 76, 0.3);
  position: relative;
  z-index: 1;
}

.avatar-initials {
  font-size: 48px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(241, 24, 76, 0.85);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
  z-index: 2;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.overlay-text {
  font-size: 12px;
  font-weight: 500;
}

.remove-avatar-btn {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 3;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  border: 2px solid white;
}

.avatar-loading {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  background: #f1184c;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(241, 24, 76, 0.3);
  width: 100%;
}

.upload-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(241, 24, 76, 0.4);
}

.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 8px;
  text-align: center;
}

/* Section Divider */
.section-divider {
  display: flex;
  align-items: center;
  margin: 28px 0;
  gap: 16px;
}

.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
}

.section-divider span {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Password Section */
.password-section {
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.password-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.password-header h4 {
  font-size: 15px;
  font-weight: 600;
  color: #334155;
  margin: 0;
}

.password-icon {
  color: #f1184c;
}

.modern-input-group {
  margin-bottom: 16px;
}

.modern-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.modern-input {
  width: 100%;
  padding: 12px 44px 12px 14px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  transition: all 0.2s ease;
}

.modern-input:focus {
  outline: none;
  border-color: #f1184c;
  box-shadow: 0 0 0 4px rgba(241, 24, 76, 0.1);
}

.modern-input::placeholder {
  color: #94a3b8;
}

.toggle-password {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.toggle-password:hover {
  color: #f1184c;
  background: rgba(241, 24, 76, 0.1);
}

.change-password-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 20px;
  background: linear-gradient(135deg, #475569 0%, #334155 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 8px;
}

.change-password-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(51, 65, 85, 0.3);
}

.change-password-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Form Grid */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 8px;
}

.required-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border-radius: 20px;
  font-weight: 600;
}

.form-input {
  padding: 14px 16px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  color: #1e293b;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #f1184c;
  box-shadow: 0 0 0 4px rgba(241, 24, 76, 0.1);
}

.form-input::placeholder {
  color: #94a3b8;
}

.readonly-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  color: #475569;
}

.lock-icon {
  color: #94a3b8;
}

.verified-icon {
  color: #22c55e;
}

.role-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: #f1184c;
  color: white;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(241, 24, 76, 0.3);
}

.role-icon {
  color: #fbbf24;
}

/* Card Actions */
.card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid #f1f5f9;
}

.save-btn {
  display: flex;
  align-items: center;
  padding: 14px 32px;
  background: #f1184c;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 24px rgba(241, 24, 76, 0.35);
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(241, 24, 76, 0.45);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}


</style>
