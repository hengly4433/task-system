<script setup lang="ts">
import { ref, watch } from "vue";
import { positionService, type Position } from "@/services/position.service";
import { roleService, type Role } from "@/services/role.service";
import { departmentService, type Department } from "@/services/department.service";

const props = defineProps<{
  modelValue: boolean;
  user?: {
    userId?: string;
    username?: string;
    email?: string;
    fullName?: string;
    positionId?: string;
    position?: { positionId: string; positionName: string } | null;
    roles?: Array<{ roleId: string; roleName: string }>;
    departments?: Array<{ departmentId: string; name: string; isPrimary?: boolean }>;
  } | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", data: any): void;
}>();

const isEdit = ref(false);
const formValid = ref(false);

// API-loaded options
const positions = ref<Position[]>([]);
const roles = ref<Role[]>([]);
const departments = ref<Department[]>([]);
const loadingOptions = ref(false);

const form = ref({
  username: "",
  email: "",
  fullName: "",
  positionId: null as string | null,
  roleIds: [] as string[],
  departmentId: null as string | null,
});

const rules = {
  required: (v: string) => !!v || "This field is required",
  email: (v: string) => /.+@.+\..+/.test(v) || "Please enter a valid email",
  minLength: (min: number) => (v: string) =>
    (v && v.length >= min) || `Must be at least ${min} characters`,
};

// Load positions, roles, and departments when dialog opens
const loadOptions = async () => {
  loadingOptions.value = true;
  try {
    const [positionsData, rolesData, deptResult] = await Promise.all([
      positionService.getAll(),
      roleService.getAll(),
      departmentService.getAll({ isActive: true }),
    ]);
    positions.value = positionsData;
    roles.value = rolesData;
    departments.value = deptResult.data;
  } catch (error) {
    console.error("Failed to load options:", error);
  } finally {
    loadingOptions.value = false;
  }
};

watch(
  () => props.modelValue,
  async (newVal) => {
    if (newVal) {
      // Load options when dialog opens
      await loadOptions();
      
      if (props.user) {
        isEdit.value = !!props.user.userId;
        form.value = {
          username: props.user.username || "",
          email: props.user.email || "",
          fullName: props.user.fullName || "",
          positionId:
            props.user.positionId || props.user.position?.positionId || null,
          roleIds: props.user.roles?.map((r) => r.roleId) || [],
          departmentId: props.user.departments?.find(d => d.isPrimary)?.departmentId || props.user.departments?.[0]?.departmentId || null,
        };
      } else {
        isEdit.value = false;
        form.value = {
          username: "",
          email: "",
          fullName: "",
          positionId: null,
          roleIds: [],
          departmentId: null,
        };
      }
    }
  },
  { immediate: true }
);

const close = () => {
  emit("update:modelValue", false);
};

const save = () => {
  if (formValid.value) {
    const data = { ...form.value, userId: props.user?.userId };
    emit("save", data);
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="540"
    persistent
  >
    <v-card class="user-modal rounded-xl overflow-hidden" elevation="8">
      <!-- Header -->
      <div class="modal-header pa-5">
        <div class="d-flex align-center">
          <div class="header-icon mr-3">
            <v-icon :icon="isEdit ? 'mdi-account-edit' : 'mdi-account-plus'" size="24" color="white" />
          </div>
          <div>
            <h2 class="text-h6 font-weight-bold text-white">
              {{ isEdit ? "Edit User" : "Add User" }}
            </h2>
            <p class="text-caption text-white mt-1" style="opacity: 0.85;">
              {{ isEdit ? "Update user details" : "Create new or invite existing user by email" }}
            </p>
          </div>
        </div>
        <v-btn icon variant="text" size="small" @click="close" class="close-btn">
          <v-icon icon="mdi-close" color="white" />
        </v-btn>
      </div>

      <!-- Form Content -->
      <v-card-text class="pa-5">
        <v-form v-model="formValid" @submit.prevent="save">
          <!-- Full Name -->
          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-account-outline</v-icon>
              Full Name <span class="text-error">*</span>
            </label>
            <v-text-field
              v-model="form.fullName"
              placeholder="Enter full name"
              :rules="[rules.required]"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details="auto"
              class="mt-2"
            />
          </div>

          <!-- Username & Email Row -->
          <v-row class="mb-2">
            <v-col cols="12" sm="6">
              <div class="form-section">
                <label class="form-label">
                  <v-icon size="16" class="mr-1">mdi-at</v-icon>
                  Username <span class="text-error">*</span>
                </label>
                <v-text-field
                  v-model="form.username"
                  placeholder="e.g. johndoe"
                  :rules="[rules.required, rules.minLength(3)]"
                  variant="outlined"
                  density="comfortable"
                  rounded="lg"
                  :disabled="isEdit"
                  hide-details="auto"
                  class="mt-2"
                />
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="form-section">
                <label class="form-label">
                  <v-icon size="16" class="mr-1">mdi-email-outline</v-icon>
                  Email <span class="text-error">*</span>
                </label>
                <v-text-field
                  v-model="form.email"
                  placeholder="user@example.com"
                  :rules="[rules.required, rules.email]"
                  variant="outlined"
                  density="comfortable"
                  rounded="lg"
                  type="email"
                  :hint="!isEdit ? 'Existing users will be added to this organization' : ''"
                  :persistent-hint="!isEdit"
                  class="mt-2"
                />
              </div>
            </v-col>
          </v-row>

          <!-- Position -->
          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-briefcase-outline</v-icon>
              Position
            </label>
            <v-select
              v-model="form.positionId"
              :items="positions"
              item-title="positionName"
              item-value="positionId"
              placeholder="Select position"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              clearable
              :loading="loadingOptions"
              hide-details
              class="mt-2"
            />
          </div>

          <!-- Department (Primary) -->
          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-domain</v-icon>
              Department <span class="text-caption text-grey">(Primary)</span>
            </label>
            <v-select
              v-model="form.departmentId"
              :items="departments"
              item-title="name"
              item-value="departmentId"
              placeholder="Select department"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              clearable
              :loading="loadingOptions"
              hide-details
              class="mt-2"
            >
              <template #item="{ item, props: itemProps }">
                <v-list-item v-bind="itemProps">
                  <template #prepend>
                    <v-avatar size="28" color="primary" variant="tonal" class="mr-2">
                      <span class="text-caption font-weight-bold">{{ item.title?.charAt(0) }}</span>
                    </v-avatar>
                  </template>
                  <template #subtitle>
                    <span class="text-caption text-grey">{{ item.raw.code }}</span>
                  </template>
                </v-list-item>
              </template>
              <template #selection="{ item }">
                <div class="d-flex align-center gap-2">
                  <v-avatar size="20" color="primary" variant="tonal">
                    <span style="font-size: 10px; font-weight: 600;">{{ item.title?.charAt(0) }}</span>
                  </v-avatar>
                  <span>{{ item.title }}</span>
                </div>
              </template>
            </v-select>
          </div>

          <!-- Roles -->
          <div class="form-section">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-shield-account-outline</v-icon>
              Roles
            </label>
            <v-select
              v-model="form.roleIds"
              :items="roles"
              item-title="roleName"
              item-value="roleId"
              placeholder="Select roles"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              multiple
              chips
              closable-chips
              :loading="loadingOptions"
              hide-details
              class="mt-2"
            >
              <template #chip="{ props: chipProps, item }">
                <v-chip
                  v-bind="chipProps"
                  :color="item.raw.color || '#f1184c'"
                  size="small"
                >
                  {{ item.title }}
                </v-chip>
              </template>
            </v-select>
          </div>
        </v-form>
      </v-card-text>

      <!-- Footer Actions -->
      <v-divider />
      <v-card-actions class="pa-5 bg-grey-lighten-5">
        <v-spacer />
        <v-btn variant="outlined" @click="close" :disabled="loading" class="text-none px-5" rounded="lg">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="save"
          :loading="loading"
          :disabled="!formValid"
          class="text-none px-6 ml-3"
          rounded="lg"
          elevation="2"
        >
          <v-icon size="18" class="mr-1">{{ isEdit ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
          {{ isEdit ? "Save Changes" : "Create User" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.user-modal {
  border: none;
}

.modal-header {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.form-label {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  letter-spacing: 0.01em;
}

.form-section :deep(.v-field) {
  border-radius: 10px !important;
}

.form-section :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(241, 24, 76, 0.15);
}
</style>

