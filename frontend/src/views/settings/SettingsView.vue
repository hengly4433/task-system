<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { userService, type User } from "@/services/user.service";
import { roleService, type Role } from "@/services/role.service";
import {
  permissionService,
  type Permission,
  type RolePermission,
  type PermissionsByCategory,
} from "@/services/permission.service";
import { useSnackbar } from "@/composables/useSnackbar";

const authStore = useAuthStore();
const snackbar = useSnackbar();

const activeTab = ref("Tasks");
const tabs = [
  "Boards",
  "Tasks",
  "Meetings",
  "Timesheets",
  "Chat",
  "Calendar",
  "Users",
  "Workspace",
  "Reports",
];

// Map tab names to permission categories
const tabToCategoryMap: Record<string, string> = {
  Boards: "boards",
  Tasks: "tasks",
  Meetings: "meetings",
  Timesheets: "timesheets",
  Chat: "chat",
  Calendar: "calendar",
  Users: "users",
  Workspace: "workspace",
  Reports: "reports",
};

// Permissions state
const allPermissions = ref<PermissionsByCategory[]>([]);
const roles = ref<Role[]>([]);
const rolePermissionsMap = ref<Record<string, Record<string, boolean>>>({});
const loadingPermissions = ref(false);
const savingPermissions = ref(false);
const hasPermissionChanges = ref(false);

// Users tab state
const users = ref<User[]>([]);
const loadingUsers = ref(false);
const roleDialog = ref(false);
const selectedUser = ref<User | null>(null);
const selectedRoleIds = ref<string[]>([]);
const savingRoles = ref(false);

// Computed - check if current user is admin or super admin
// Handles different role name formats: 'Super Admin', 'SUPER_ADMIN', 'Admin', 'ADMIN'
const isSuperAdmin = computed(() => {
  const roles = authStore.user?.roles;
  if (!roles || roles.length === 0) return false;
  
  const adminRoles = ['Super Admin', 'SUPER_ADMIN', 'Admin', 'ADMIN', 'super admin', 'admin'];
  return roles.some((role: string) => adminRoles.includes(role));
});

const currentCategoryPermissions = computed(() => {
  const category = tabToCategoryMap[activeTab.value];
  if (activeTab.value === "Users") return []; // Users tab shows user list instead
  const found = allPermissions.value.find((p) => p.category === category);
  return found?.permissions || [];
});

// Load data on mount
onMounted(async () => {
  await Promise.all([loadPermissions(), loadRoles()]);
});

// Watch for tab changes to load users when Users tab is active
watch(activeTab, async (newTab) => {
  if (newTab === "Users" && users.value.length === 0) {
    await loadUsers();
  }
});

async function loadPermissions() {
  loadingPermissions.value = true;
  try {
    allPermissions.value = await permissionService.getAllGrouped();
  } catch (error: any) {
    console.error("Failed to load permissions:", error);
    // If permissions don't exist yet, they may need to be seeded
    if (error.response?.status === 404 || allPermissions.value.length === 0) {
      // Try to seed permissions
      try {
        await permissionService.seedPermissions();
        allPermissions.value = await permissionService.getAllGrouped();
        snackbar.success("Permissions initialized successfully");
      } catch (seedError) {
        console.error("Failed to seed permissions:", seedError);
      }
    }
  } finally {
    loadingPermissions.value = false;
  }
}

async function loadRoles() {
  try {
    roles.value = await roleService.getAll();
    // Load permissions for each role
    for (const role of roles.value) {
      const rolePerms = await permissionService.getRolePermissions(role.roleId);
      if (!rolePermissionsMap.value[role.roleId]) {
        rolePermissionsMap.value[role.roleId] = {};
      }
      for (const rp of rolePerms) {
        const roleMap = rolePermissionsMap.value[role.roleId];
        if (roleMap) {
          roleMap[rp.permissionId] = rp.granted;
        }
      }
    }
  } catch (error) {
    console.error("Failed to load roles:", error);
  }
}

async function loadUsers() {
  loadingUsers.value = true;
  try {
    const result = await userService.getAll();
    users.value = result.data;
  } catch (error) {
    console.error("Failed to load users:", error);
    snackbar.error("Failed to load users");
  } finally {
    loadingUsers.value = false;
  }
}

// Get permission status for a role
function getPermissionStatus(
  roleId: string,
  permissionId: string
): boolean | null {
  const rolePerms = rolePermissionsMap.value[roleId];
  if (!rolePerms || rolePerms[permissionId] === undefined) {
    return null; // Not set
  }
  return rolePerms[permissionId];
}

// Toggle permission for a role
function togglePermission(roleId: string, permissionId: string) {
  if (!isSuperAdmin.value) return;

  if (!rolePermissionsMap.value[roleId]) {
    rolePermissionsMap.value[roleId] = {};
  }

  const current = rolePermissionsMap.value[roleId][permissionId];
  if (current === undefined || current === null) {
    rolePermissionsMap.value[roleId][permissionId] = true;
  } else {
    rolePermissionsMap.value[roleId][permissionId] = !current;
  }
  hasPermissionChanges.value = true;
}

// Save permission changes
async function savePermissionChanges() {
  if (!isSuperAdmin.value) return;

  savingPermissions.value = true;
  try {
    // Save permissions for each role
    for (const role of roles.value) {
      const rolePerms = rolePermissionsMap.value[role.roleId];
      if (!rolePerms) continue;

      const permissions = Object.entries(rolePerms).map(
        ([permissionId, granted]) => ({
          permissionId,
          granted,
        })
      );

      if (permissions.length > 0) {
        await permissionService.updateRolePermissions(role.roleId, {
          permissions,
        });
      }
    }

    snackbar.success("Permissions saved successfully");
    hasPermissionChanges.value = false;
  } catch (error) {
    console.error("Failed to save permissions:", error);
    snackbar.error("Failed to save permissions");
  } finally {
    savingPermissions.value = false;
  }
}

// Open role assignment dialog for a user
function openRoleDialog(user: User) {
  if (!isSuperAdmin.value) return;
  selectedUser.value = user;
  selectedRoleIds.value = user.roles?.map((r) => r.roleId) || [];
  roleDialog.value = true;
}

// Save user role assignment
async function saveUserRoles() {
  if (!selectedUser.value || !isSuperAdmin.value) return;

  savingRoles.value = true;
  try {
    await userService.update(selectedUser.value.userId, {
      roleIds: selectedRoleIds.value,
    });
    snackbar.success("User roles updated successfully");
    roleDialog.value = false;
    // Reload users to get fresh data
    await loadUsers();
  } catch (error) {
    console.error("Failed to update user roles:", error);
    snackbar.error("Failed to update user roles");
  } finally {
    savingRoles.value = false;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

// User table headers
const userHeaders = [
  { title: "No", key: "index", sortable: false, width: "70px" },
  { title: "User", key: "user", sortable: true },
  { title: "Email", key: "email", sortable: true },
  { title: "Roles", key: "roles", sortable: false },
  {
    title: "Actions",
    key: "actions",
    sortable: false,
    align: "end" as const,
    width: "120px",
  },
];
</script>

<template>
  <div class="settings-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-cog-outline" size="28" />
          </div>
          <div>
            <h1 class="page-title">System Settings</h1>
            <p class="page-subtitle">
              Configure system-wide permissions and preferences
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <v-card class="tabs-card mb-6" rounded="xl">
      <div class="tabs-container">
        <div
          v-for="tab in tabs"
          :key="tab"
          class="tab-item"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          <v-icon
            :icon="
              tab === 'Boards'
                ? 'mdi-view-grid-outline'
                : tab === 'Tasks'
                ? 'mdi-checkbox-marked-outline'
                : tab === 'Meetings'
                ? 'mdi-account-group-outline'
                : tab === 'Timesheets'
                ? 'mdi-clock-outline'
                : tab === 'Chat'
                ? 'mdi-chat-outline'
                : tab === 'Calendar'
                ? 'mdi-calendar-outline'
                : tab === 'Users'
                ? 'mdi-account-outline'
                : tab === 'Workspace'
                ? 'mdi-folder-multiple-outline'
                : 'mdi-chart-bar'
            "
            size="18"
            class="mr-2"
          />
          {{ tab }}
        </div>
      </div>
    </v-card>

    <!-- Users Tab Content -->
    <v-card
      v-if="activeTab === 'Users'"
      rounded="xl"
      class="users-card"
      elevation="0"
    >
      <div class="table-header-bar">
        <div class="table-header-left">
          <div class="table-header-icon">
            <v-icon icon="mdi-shield-account-outline" size="16" color="white" />
          </div>
          <span class="table-header-title">User Role Assignment</span>
          <span class="table-header-count">{{ users.length }} users</span>
        </div>
        <div class="table-header-right" v-if="isSuperAdmin">
          <v-chip size="small" color="white" variant="flat" class="super-admin-badge">
            <v-icon size="14" class="mr-1">mdi-shield-crown</v-icon>
            Super Admin Mode
          </v-chip>
        </div>
      </div>

      <v-data-table
        :headers="userHeaders"
        :items="users"
        :loading="loadingUsers"
        item-value="userId"
        class="users-table"
        fixed-header
        height="320"
        hover
        density="comfortable"
      >
        <template #item.index="{ index }">
          <span class="row-number">{{ index + 1 }}</span>
        </template>

        <template #item.user="{ item }">
          <div class="user-cell">
            <v-avatar size="40" class="user-avatar mr-3">
              <v-img v-if="item.profileImageUrl" :src="item.profileImageUrl" />
              <span v-else class="avatar-initial">{{
                item.fullName?.charAt(0)?.toUpperCase() || item.username?.charAt(0)?.toUpperCase() || "?"
              }}</span>
            </v-avatar>
            <div class="user-info">
              <div class="user-name">{{ item.fullName || item.username }}</div>
              <div class="user-handle">@{{ item.username }}</div>
            </div>
          </div>
        </template>

        <template #item.email="{ item }">
          <div class="email-cell">
            <v-icon size="16" color="grey-darken-1" class="mr-2">mdi-email-outline</v-icon>
            <span class="email-text">{{ item.email }}</span>
          </div>
        </template>

        <template #item.roles="{ item }">
          <div class="roles-cell">
            <template v-if="item.roles && item.roles.length > 0">
              <v-chip
                v-for="role in item.roles"
                :key="role.roleId"
                :color="roles.find((r) => r.roleId === role.roleId)?.color || '#f1184c'"
                size="small"
                variant="flat"
                class="role-chip mr-1"
              >
                <v-icon size="12" class="mr-1">mdi-shield-account</v-icon>
                {{ role.roleName }}
              </v-chip>
            </template>
            <span v-else class="no-roles">
              <v-icon size="14" class="mr-1">mdi-alert-circle-outline</v-icon>
              No roles assigned
            </span>
          </div>
        </template>

        <template #item.actions="{ item }">
          <div class="actions-cell">
            <v-btn
              v-if="isSuperAdmin"
              icon
              variant="tonal"
              color="primary"
              size="small"
              @click="openRoleDialog(item)"
              class="action-btn"
            >
              <v-icon size="18">mdi-pencil-outline</v-icon>
              <v-tooltip activator="parent" location="top">Assign Roles</v-tooltip>
            </v-btn>
            <span v-else class="text-grey-lighten-1">—</span>
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
        </template>

        <template #no-data>
          <div class="empty-state">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-group-outline</v-icon>
            <p class="text-h6 text-grey-darken-1 mb-2">No users found</p>
            <p class="text-body-2 text-grey">Users will appear here once they are added to the system.</p>
          </div>
        </template>
      </v-data-table>

      <!-- Compact help text for super admin -->
      <div v-if="isSuperAdmin" class="help-text pa-2 px-4">
        <v-icon size="14" color="primary" class="mr-1">mdi-information-outline</v-icon>
        <span class="text-caption">Click the edit icon to assign roles</span>
      </div>
    </v-card>

    <!-- Permissions Table (for non-Users tabs) -->
    <v-card
      v-else
      rounded="xl"
      class="permissions-card"
    >
      <v-card-title class="d-flex align-center pa-4">
        <v-icon
          icon="mdi-shield-account-outline"
          class="mr-2"
          color="primary"
        />
        <span class="text-subtitle-1 font-weight-bold">Role Permissions</span>
        <v-spacer />
        <v-btn
          v-if="isSuperAdmin && hasPermissionChanges"
          variant="outlined"
          color="primary"
          size="small"
          prepend-icon="mdi-content-save"
          :loading="savingPermissions"
          @click="savePermissionChanges"
        >
          Save Changes
        </v-btn>
      </v-card-title>

      <v-divider />

      <!-- Loading state -->
      <div v-if="loadingPermissions" class="pa-8 text-center">
        <v-progress-circular indeterminate color="primary" />
        <p class="mt-4 text-grey">Loading permissions...</p>
      </div>

      <!-- Empty state when no permissions for this category -->
      <div
        v-else-if="currentCategoryPermissions.length === 0"
        class="pa-8 text-center"
      >
        <v-icon size="64" color="grey-lighten-1" class="mb-4"
          >mdi-shield-off-outline</v-icon
        >
        <p class="text-h6 text-grey-darken-1 mb-2">No permissions configured</p>
        <p class="text-body-2 text-grey">
          No permissions have been set up for this category yet.
        </p>
      </div>

      <!-- Permission matrix table -->
      <v-table v-else class="permissions-table">
        <thead>
          <tr class="table-header">
            <th class="action-column">
              <span class="d-flex align-center">
                <v-icon icon="mdi-format-list-bulleted" size="18" class="mr-2" />
                Actions
              </span>
            </th>
            <th v-for="role in roles" :key="role.roleId" class="role-column">
              <div class="role-header">
                <v-avatar size="28" class="mb-1" :color="role.color || '#9E9E9E'">
                  <v-icon
                    :icon="
                      role.roleName === 'SUPER_ADMIN' || role.roleName === 'Admin'
                        ? 'mdi-shield-crown-outline'
                        : 'mdi-account-outline'
                    "
                    size="16"
                  />
                </v-avatar>
                <span>{{ role.roleName }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="permission in currentCategoryPermissions"
            :key="permission.permissionId"
            class="permission-row"
          >
            <td class="action-cell">
              <span class="action-text">{{ permission.name }}</span>
            </td>
            <td
              v-for="role in roles"
              :key="role.roleId"
              class="toggle-cell"
            >
              <v-btn
                :color="
                  getPermissionStatus(role.roleId, permission.permissionId) === true
                    ? 'success'
                    : getPermissionStatus(role.roleId, permission.permissionId) === false
                    ? 'error'
                    : 'grey'
                "
                variant="tonal"
                size="small"
                icon
                :disabled="!isSuperAdmin"
                @click="togglePermission(role.roleId, permission.permissionId)"
              >
                <v-icon
                  :icon="
                    getPermissionStatus(role.roleId, permission.permissionId) === true
                      ? 'mdi-check'
                      : getPermissionStatus(role.roleId, permission.permissionId) === false
                      ? 'mdi-close'
                      : 'mdi-minus'
                  "
                  size="18"
                />
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Role Assignment Dialog -->
    <v-dialog v-model="roleDialog" max-width="520" persistent>
      <v-card class="role-dialog rounded-xl overflow-hidden" elevation="8">
        <!-- Header -->
        <div class="dialog-header pa-5">
          <div class="d-flex align-center">
            <div class="header-icon mr-3">
              <v-icon icon="mdi-shield-account" size="24" color="white" />
            </div>
            <div>
              <h2 class="text-h6 font-weight-bold text-white">Assign Roles</h2>
              <p class="text-caption text-white mt-1" style="opacity: 0.85">
                Manage role assignment for this user
              </p>
            </div>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            @click="roleDialog = false"
            class="close-btn"
          >
            <v-icon icon="mdi-close" color="white" />
          </v-btn>
        </div>

        <!-- Content -->
        <v-card-text class="pa-5">
          <!-- User Info Card -->
          <div class="user-info-card mb-5">
            <v-avatar size="48" class="user-avatar mr-3">
              <v-img v-if="selectedUser?.profileImageUrl" :src="selectedUser.profileImageUrl" />
              <span v-else class="avatar-initial">{{
                selectedUser?.fullName?.charAt(0)?.toUpperCase() || selectedUser?.username?.charAt(0)?.toUpperCase() || "?"
              }}</span>
            </v-avatar>
            <div>
              <div class="user-info-name">{{ selectedUser?.fullName || selectedUser?.username }}</div>
              <div class="user-info-email">{{ selectedUser?.email }}</div>
            </div>
          </div>

          <!-- Current Roles -->
          <div v-if="selectedUser?.roles && selectedUser.roles.length > 0" class="current-roles mb-4">
            <label class="form-label mb-2">
              <v-icon size="14" class="mr-1">mdi-tag-multiple</v-icon>
              Current Roles
            </label>
            <div class="d-flex flex-wrap gap-1">
              <v-chip
                v-for="role in selectedUser.roles"
                :key="role.roleId"
                :color="roles.find((r) => r.roleId === role.roleId)?.color || '#f1184c'"
                size="small"
                variant="flat"
              >
                {{ role.roleName }}
              </v-chip>
            </div>
          </div>

          <v-divider class="mb-4" />

          <!-- Role Selection -->
          <div class="form-section">
            <label class="form-label mb-3">
              <v-icon size="16" class="mr-1">mdi-shield-account-outline</v-icon>
              Select Roles to Assign
            </label>
            <v-select
              v-model="selectedRoleIds"
              :items="roles"
              item-title="roleName"
              item-value="roleId"
              placeholder="Click to select roles..."
              variant="outlined"
              density="comfortable"
              rounded="lg"
              multiple
              chips
              closable-chips
              hide-details
            >
              <template #chip="{ props: chipProps, item }">
                <v-chip
                  v-bind="chipProps"
                  :color="item.raw.color || '#f1184c'"
                  size="small"
                  variant="flat"
                >
                  <v-icon size="12" class="mr-1">mdi-shield-account</v-icon>
                  {{ item.title }}
                </v-chip>
              </template>
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :title="item.raw.roleName">
                  <template #prepend>
                    <v-avatar size="28" :color="item.raw.color || '#f1184c'" class="mr-2">
                      <v-icon size="14" color="white">mdi-shield-account</v-icon>
                    </v-avatar>
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <!-- Help text -->
            <p class="text-caption text-grey mt-2">
              <v-icon size="12" class="mr-1">mdi-information-outline</v-icon>
              Select one or more roles. Changes will be saved when you click "Save Roles".
            </p>
          </div>
        </v-card-text>

        <!-- Footer -->
        <v-divider />
        <v-card-actions class="pa-5 bg-grey-lighten-5">
          <v-spacer />
          <v-btn
            variant="outlined"
            @click="roleDialog = false"
            class="text-none px-5"
            rounded="lg"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="savingRoles"
            @click="saveUserRoles"
            class="text-none px-6 ml-3 save-btn"
            rounded="lg"
            elevation="2"
          >
            <v-icon size="18" class="mr-1">mdi-content-save</v-icon>
            Save Roles
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 1000px;
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

.tabs-card {
  overflow-x: auto;
}

.tabs-container {
  display: flex;
  gap: 4px;
  padding: 8px;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-item:hover {
  background: rgba(241, 24, 76, 0.08);
  color: #f1184c;
}

.tab-item.active {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(241, 24, 76, 0.3);
}

.tab-item.active .v-icon {
  color: white !important;
}

.permissions-card,
.users-card {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.permissions-table {
  width: 100%;
}

.table-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.table-header th {
  padding: 16px !important;
  font-weight: 600;
  color: #475569;
  border-bottom: 2px solid #e2e8f0;
}

.action-column {
  width: 50%;
}

.role-column {
  width: 25%;
  text-align: center !important;
}

.role-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.role-header span {
  font-size: 13px;
}

.permission-row {
  transition: background-color 0.15s ease;
}

.permission-row:hover {
  background-color: #f8fafc;
}

.action-cell {
  padding: 14px 16px !important;
}

.action-text {
  font-size: 14px;
  color: #334155;
}

.toggle-cell {
  text-align: center !important;
  padding: 10px !important;
}

.permission-row:not(:last-child) td {
  border-bottom: 1px solid #f1f5f9;
}

/* Users table styles */
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

.users-table {
  background: transparent;
}

.users-table :deep(thead) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.users-table :deep(th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.75rem !important;
  letter-spacing: 0.05em;
  color: #64748b !important;
  border-bottom: 2px solid #e2e8f0 !important;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

.users-table :deep(td) {
  border-bottom: 1px solid #f1f5f9 !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.users-table :deep(tr:hover) {
  background: rgba(var(--v-theme-primary), 0.04) !important;
}

/* Dialog styles */
.dialog-header {
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

.gap-1 {
  gap: 4px;
}

/* Enhanced Users Table Styles */
.table-header-right {
  display: flex;
  align-items: center;
}

.super-admin-badge {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.05em;
}

.row-number {
  font-weight: 600;
  color: #94a3b8;
  font-size: 13px;
}

.user-cell {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.user-avatar {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
}

.avatar-initial {
  font-size: 14px;
  font-weight: 700;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
  line-height: 1.3;
}

.user-handle {
  font-size: 12px;
  color: #94a3b8;
}

.email-cell {
  display: flex;
  align-items: center;
}

.email-text {
  font-size: 13px;
  color: #64748b;
}

.roles-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.role-chip {
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.no-roles {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
}

.actions-cell {
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(241, 24, 76, 0.3);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.help-text {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.05) 0%, rgba(255, 107, 138, 0.05) 100%);
  border-top: 1px solid rgba(241, 24, 76, 0.1);
  font-size: 13px;
  color: #64748b;
}

.help-text strong {
  color: #f1184c;
}

/* Enhanced table row hover */
.users-table :deep(tbody tr) {
  transition: all 0.15s ease;
}

.users-table :deep(tbody tr:hover) {
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.04) 0%, rgba(255, 107, 138, 0.02) 100%) !important;
}

.users-table :deep(tbody tr:hover .action-btn) {
  background: rgba(241, 24, 76, 0.15);
}

/* Enhanced Dialog Styles */
.user-info-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.user-info-name {
  font-weight: 600;
  font-size: 16px;
  color: #1e293b;
}

.user-info-email {
  font-size: 13px;
  color: #64748b;
}

.current-roles {
  padding: 12px 16px;
  background: rgba(241, 24, 76, 0.04);
  border-radius: 10px;
  border: 1px dashed rgba(241, 24, 76, 0.2);
}

.save-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%) !important;
  font-weight: 600;
}

.save-btn:hover {
  box-shadow: 0 6px 20px rgba(241, 24, 76, 0.4);
  transform: translateY(-1px);
}
</style>
