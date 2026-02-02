<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  roleService,
  type Role,
  type CreateRoleDto,
} from "@/services/role.service";
import { subscriptionService, type PlanFeatures } from "@/services/subscription.service";
import DataTableCard from "@/components/DataTableCard.vue";
import { useSnackbar } from "@/composables/useSnackbar";
import { useRouter } from "vue-router";

const router = useRouter();
const snackbar = useSnackbar();
const roles = ref<Role[]>([]);
const loading = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const upgradeDialog = ref(false);
const editMode = ref(false);
const selectedRole = ref<Role | null>(null);
const saving = ref(false);
const features = ref<PlanFeatures | null>(null);

const form = ref<CreateRoleDto>({
  roleName: "",
  description: "",
  color: "#f1184c",
});

const colorPresets = [
  "#f1184c",
  "#ff6b8a",
  "#EC4899",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#06B6D4",
  "#f1184c",
];

const headers = [
  { title: "No", key: "index", sortable: false, width: "70px" },
  { title: "Role", key: "roleName", sortable: true },
  { title: "Description", key: "description", sortable: false },
  { title: "Color", key: "color", sortable: false, width: "120px" },
  { title: "Created", key: "createdAt", sortable: true, width: "140px" },
  { title: "Actions", key: "actions", sortable: false, align: "end" as const, width: "120px" },
];

onMounted(async () => {
  await Promise.all([loadRoles(), loadFeatures()]);
});

async function loadFeatures() {
  try {
    features.value = await subscriptionService.getFeatures();
  } catch (error) {
    console.error("Failed to load features:", error);
  }
}

async function loadRoles() {
  loading.value = true;
  try {
    roles.value = await roleService.getAll();
  } catch (error) {
    snackbar.error("Failed to load roles");
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  // Check if custom roles feature is available
  if (features.value && !features.value.customRoles) {
    upgradeDialog.value = true;
    return;
  }
  
  editMode.value = false;
  selectedRole.value = null;
  form.value = { roleName: "", description: "", color: "#f1184c" };
  dialog.value = true;
}

function goToSubscription() {
  upgradeDialog.value = false;
  router.push("/subscription");
}

function openEditDialog(role: Role) {
  editMode.value = true;
  selectedRole.value = role;
  form.value = {
    roleName: role.roleName,
    description: role.description || "",
    color: role.color || "#f1184c",
  };
  dialog.value = true;
}

function openDeleteDialog(role: Role) {
  selectedRole.value = role;
  deleteDialog.value = true;
}

async function saveRole() {
  if (!form.value.roleName.trim()) {
    snackbar.error("Role name is required");
    return;
  }

  saving.value = true;
  try {
    if (editMode.value && selectedRole.value) {
      await roleService.update(selectedRole.value.roleId, form.value);
      snackbar.success("Role updated successfully");
    } else {
      await roleService.create(form.value);
      snackbar.success("Role created successfully");
    }
    dialog.value = false;
    await loadRoles();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to save role");
  } finally {
    saving.value = false;
  }
}

async function deleteRole() {
  if (!selectedRole.value) return;

  saving.value = true;
  try {
    await roleService.delete(selectedRole.value.roleId);
    snackbar.success("Role deleted successfully");
    deleteDialog.value = false;
    await loadRoles();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to delete role");
  } finally {
    saving.value = false;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}
</script>

<template>
  <div class="roles-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-shield-account-outline" size="28" />
          </div>
          <div>
            <h1 class="page-title">Roles</h1>
            <p class="page-subtitle">Manage user roles and access levels</p>
          </div>
        </div>
      </div>
      <v-btn
        class="action-btn"
        prepend-icon="mdi-plus"
        @click="openCreateDialog"
        rounded="lg"
        elevation="0"
      >
        Add Role
      </v-btn>
    </div>

    <!-- Table Card -->
    <DataTableCard
      title="Role List"
      icon="mdi-shield-account-outline"
      :headers="headers"
      :items="roles"
      :loading="loading"
      item-value="roleId"
    >
      <template #item.roleName="{ item }">
        <div class="d-flex align-center">
          <v-chip
            v-if="item.color"
            :color="item.color"
            size="x-small"
            class="mr-2"
            label
          />
          <v-icon v-else size="small" color="primary" class="mr-2">mdi-shield-account-outline</v-icon>
          <span class="font-weight-medium">{{ item.roleName }}</span>
        </div>
      </template>

      <template #item.description="{ item }">
        <span class="text-grey-darken-1">{{ item.description || "—" }}</span>
      </template>

      <template #item.color="{ item }">
        <v-chip v-if="item.color" :color="item.color" size="small" label variant="tonal">
          {{ item.color }}
        </v-chip>
        <span v-else class="text-grey">—</span>
      </template>

      <template #item.createdAt="{ item }">
        <div class="d-flex align-center text-body-2">
          <v-icon size="small" color="grey" class="mr-2">mdi-calendar</v-icon>
          {{ formatDate(item.createdAt) }}
        </div>
      </template>

      <template #item.actions="{ item }">
        <div class="d-flex justify-end" style="gap: 4px;">
          <v-btn
            icon
            variant="text"
            size="small"
            color="primary"
            @click.stop="openEditDialog(item)"
          >
            <v-icon size="small">mdi-pencil-outline</v-icon>
            <v-tooltip activator="parent" location="top">Edit Role</v-tooltip>
          </v-btn>
          <v-btn
            icon
            variant="text"
            size="small"
            color="error"
            @click.stop="openDeleteDialog(item)"
          >
            <v-icon size="small">mdi-delete-outline</v-icon>
            <v-tooltip activator="parent" location="top">Delete Role</v-tooltip>
          </v-btn>
        </div>
      </template>

      <template #no-data>
        <div class="text-center py-10">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-shield-account-outline</v-icon>
          <p class="text-h6 text-grey-darken-1 mb-2">No roles found</p>
          <p class="text-body-2 text-grey mb-4">Create your first role to get started</p>
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-plus"
            @click="openCreateDialog"
          >
            Add First Role
          </v-btn>
        </div>
      </template>
    </DataTableCard>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="520">
      <v-card class="role-modal rounded-xl overflow-hidden" elevation="8">
        <!-- Header -->
        <div class="modal-header pa-5">
          <div class="d-flex align-center">
            <div class="header-icon mr-3">
              <v-icon :icon="editMode ? 'mdi-shield-edit' : 'mdi-shield-plus'" size="24" color="white" />
            </div>
            <div>
              <h2 class="text-h6 font-weight-bold text-white">
                {{ editMode ? "Edit Role" : "Create New Role" }}
              </h2>
              <p class="text-caption text-white mt-1" style="opacity: 0.85;">
                {{ editMode ? "Update role details" : "Add a new access role" }}
              </p>
            </div>
          </div>
          <v-btn icon variant="text" size="small" @click="dialog = false" class="close-btn">
            <v-icon icon="mdi-close" color="white" />
          </v-btn>
        </div>

        <!-- Form Content -->
        <v-card-text class="pa-5">
          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-shield-account-outline</v-icon>
              Role Name <span class="text-error">*</span>
            </label>
            <v-text-field
              v-model="form.roleName"
              placeholder="e.g., Finance Director, QA Manager"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              autofocus
              hide-details
              class="mt-2"
            />
          </div>
          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-text-box-outline</v-icon>
              Description
            </label>
            <v-textarea
              v-model="form.description"
              placeholder="Optional description of this role"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              rows="3"
              hide-details
              class="mt-2"
            />
          </div>
          <div class="form-section">
            <label class="form-label mb-3">
              <v-icon size="16" class="mr-1">mdi-palette</v-icon>
              Role Color
            </label>
            <div class="d-flex flex-wrap ga-2 mb-4">
              <v-btn
                v-for="color in colorPresets"
                :key="color"
                :color="color"
                size="small"
                icon
                :variant="form.color === color ? 'flat' : 'tonal'"
                @click="form.color = color"
              >
                <v-icon v-if="form.color === color" icon="mdi-check" />
              </v-btn>
            </div>
            <v-text-field
              v-model="form.color"
              placeholder="#FF5733"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details
            />
          </div>
        </v-card-text>

        <!-- Footer -->
        <v-divider />
        <v-card-actions class="pa-5 bg-grey-lighten-5">
          <v-spacer />
          <v-btn variant="outlined" @click="dialog = false" class="text-none px-5" rounded="lg">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="saveRole" class="text-none px-6 ml-3" rounded="lg" elevation="2">
            <v-icon size="18" class="mr-1">{{ editMode ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
            {{ editMode ? "Save Changes" : "Create Role" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card class="delete-modal rounded-xl overflow-hidden" elevation="8">
        <div class="delete-header pa-5">
          <div class="d-flex align-center">
            <div class="delete-icon mr-3">
              <v-icon icon="mdi-delete-alert" size="24" color="white" />
            </div>
            <div>
              <h2 class="text-h6 font-weight-bold text-white">Delete Role</h2>
              <p class="text-caption text-white mt-1" style="opacity: 0.85;">This action cannot be undone</p>
            </div>
          </div>
        </div>
        <v-card-text class="pa-5">
          <p class="text-body-1">
            Are you sure you want to delete the role
            <strong>{{ selectedRole?.roleName }}</strong>?
          </p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-5 bg-grey-lighten-5">
          <v-spacer />
          <v-btn variant="outlined" @click="deleteDialog = false" class="text-none px-5" rounded="lg">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="saving" @click="deleteRole" class="text-none px-6 ml-3" rounded="lg" elevation="2">
            <v-icon size="18" class="mr-1">mdi-delete</v-icon>
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Upgrade Required Dialog -->
    <v-dialog v-model="upgradeDialog" max-width="450">
      <v-card class="upgrade-modal rounded-xl overflow-hidden" elevation="8">
        <div class="upgrade-header pa-5">
          <div class="d-flex align-center">
            <div class="upgrade-icon mr-3">
              <v-icon icon="mdi-crown" size="24" color="white" />
            </div>
            <div>
              <h2 class="text-h6 font-weight-bold text-white">Upgrade Required</h2>
              <p class="text-caption text-white mt-1" style="opacity: 0.85;">Unlock custom roles feature</p>
            </div>
          </div>
        </div>
        <v-card-text class="pa-5">
          <div class="text-center mb-4">
            <v-icon icon="mdi-shield-star" size="64" color="primary" class="mb-3" />
            <p class="text-body-1 mb-2">
              <strong>Custom Roles</strong> are not available on the <strong>FREE</strong> plan.
            </p>
            <p class="text-body-2 text-grey">
              Upgrade to <strong>STARTER</strong> or higher to create custom roles with specific permissions.
            </p>
          </div>
          <v-alert type="info" variant="tonal" density="compact" class="mt-4">
            <template #text>
              <div class="d-flex align-center">
                <v-icon icon="mdi-information" size="18" class="mr-2" />
                <span>STARTER plan starts at $9.99/month</span>
              </div>
            </template>
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-5 bg-grey-lighten-5">
          <v-spacer />
          <v-btn variant="outlined" @click="upgradeDialog = false" class="text-none px-5" rounded="lg">Maybe Later</v-btn>
          <v-btn color="primary" variant="flat" @click="goToSubscription" class="text-none px-6 ml-3" rounded="lg" elevation="2">
            <v-icon size="18" class="mr-1">mdi-arrow-up-bold</v-icon>
            Upgrade Now
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.roles-view {
  padding: 4px;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 24px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 4px 0 0 0;
}

.table-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.table-header-bar {
  background: linear-gradient(135deg, #f1184c 0%, #f1184c 100%);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.table-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.table-header-icon {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-header-title {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.table-header-count {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.15);
  padding: 3px 8px;
  border-radius: 12px;
}

.roles-table {
  background: transparent;
}

.roles-table :deep(thead) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.roles-table :deep(th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.75rem !important;
  letter-spacing: 0.05em;
  color: #64748b !important;
  border-bottom: 2px solid #e2e8f0 !important;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

.roles-table :deep(td) {
  border-bottom: 1px solid #f1f5f9 !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.roles-table :deep(tr:hover) {
  background: rgba(var(--v-theme-primary), 0.04) !important;
}

.roles-table :deep(.v-data-table-footer) {
  border-top: 1px solid #e2e8f0;
  background: #fafbfc;
}

.action-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  text-transform: none;
  padding: 0 20px;
  height: 42px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

/* Modal Styles */
.modal-header {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
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
}

.form-section :deep(.v-field) {
  border-radius: 10px !important;
}

.delete-header {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  display: flex;
  align-items: center;
}

.delete-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.upgrade-header {
  background: linear-gradient(135deg, #f1184c 0%, #e91e63 100%);
  display: flex;
  align-items: center;
}

.upgrade-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
