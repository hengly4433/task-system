<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useUserStore } from "@/stores/user.store";
import { userService, type CreateUserDto } from "@/services/user.service";
import { useSnackbar } from "@/composables/useSnackbar";
import UserModal from "@/components/modals/UserModal.vue";
import ConfirmDialog from "@/components/modals/ConfirmDialog.vue";

const userStore = useUserStore();
const snackbar = useSnackbar();

const viewMode = ref<"list" | "grid">("list");
const filterShow = ref("All");
const searchQuery = ref("");
const showUserModal = ref(false);
const showDeleteDialog = ref(false);
const selectedUser = ref<any>(null);
const modalLoading = ref(false);

// Pagination for list view
const page = ref(1);
const itemsPerPage = ref(10);

// Get row number based on pagination
const getRowNumber = (index: number) => {
  return (page.value - 1) * itemsPerPage.value + index + 1;
};

const headers = [
  { title: "No", key: "index", sortable: false, width: "70px" },
  { title: "User", key: "user", sortable: true },
  { title: "Email", key: "email", sortable: true },
  { title: "Position", key: "position", sortable: true },
  { title: "Created", key: "createdAt", sortable: true, width: "140px" },
  { title: "Actions", key: "actions", sortable: false, align: "end" as const, width: "120px" },
];

onMounted(async () => {
  await loadData();
});

const loadData = async () => {
  await userStore.fetchUsers();
};

const users = computed(() => {
  let result = userStore.users;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q)
    );
  }
  return result;
});

const loading = computed(() => userStore.loading);

const openCreateModal = () => {
  selectedUser.value = null;
  showUserModal.value = true;
};

const openEditModal = (user: any) => {
  selectedUser.value = { ...user };
  showUserModal.value = true;
};

const openDeleteDialog = (user: any) => {
  selectedUser.value = user;
  showDeleteDialog.value = true;
};

const handleSaveUser = async (data: any) => {
  modalLoading.value = true;
  try {
    if (data.userId) {
      await userStore.updateUser(data.userId, {
        fullName: data.fullName,
        email: data.email,
        positionId: data.positionId,
        roleIds: data.roleIds,
        departmentId: data.departmentId,
      });
      snackbar.success("User updated successfully!");
      await loadData(); // Reload to get fresh data with all relations
    } else {
      await userService.create(data as CreateUserDto);
      snackbar.success("User added successfully!");
      await loadData();
    }
    showUserModal.value = false;
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to save user");
  } finally {
    modalLoading.value = false;
  }
};

const handleDeleteUser = async () => {
  if (!selectedUser.value) return;
  modalLoading.value = true;
  try {
    await userStore.deleteUser(selectedUser.value.userId);
    snackbar.success("User deleted successfully!");
    showDeleteDialog.value = false;
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to delete user");
  } finally {
    modalLoading.value = false;
  }
};

const getProgressColor = (index: number) => {
  const colors = ["#10B981", "#FBBF24", "#f1184c", "#EC4899", "#F97316"];
  return colors[index % colors.length];
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
};
</script>

<template>
  <div class="users-view">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-account-group-outline" size="28" />
          </div>
          <div>
            <h1 class="page-title">Users</h1>
            <p class="page-subtitle">Manage system users and their profiles</p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <div class="view-toggle">
          <span
            class="view-toggle-item"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            <v-icon size="16" class="mr-1">mdi-format-list-bulleted</v-icon>
            List
          </span>
          <span
            class="view-toggle-item"
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
          >
            <v-icon size="16" class="mr-1">mdi-view-grid</v-icon>
            Grid
          </span>
        </div>
        <v-text-field
          v-model="searchQuery"
          placeholder="Search users..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          class="search-field"
          rounded="lg"
        />
        <v-btn
          class="action-btn"
          prepend-icon="mdi-plus"
          rounded="lg"
          @click="openCreateModal"
          elevation="0"
          >Add User</v-btn
        >
      </div>
    </div>

    <!-- Loading -->
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <!-- Empty State -->
    <v-card
      v-if="!loading && users.length === 0"
      class="pa-10 text-center rounded-xl"
      elevation="0"
      style="border: 1px solid rgba(0, 0, 0, 0.08)"
    >
      <v-icon
        size="64"
        color="grey-lighten-1"
        class="mb-4"
      >mdi-account-group-outline</v-icon>
      <h3 class="text-h6 text-grey-darken-1 mb-2">No Users Found</h3>
      <p class="text-body-2 text-grey mb-4">Get started by adding your first user</p>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateModal"
        >Add User</v-btn
      >
    </v-card>

    <!-- List View (Table) -->
    <v-card v-else-if="viewMode === 'list'" class="rounded-xl table-card" elevation="0">
      <!-- Table Header Bar -->
      <div class="table-header-bar">
        <div class="table-header-left">
          <div class="table-header-icon">
            <v-icon icon="mdi-account-group-outline" size="16" color="white" />
          </div>
          <span class="table-header-title">User List</span>
          <span class="table-header-count">{{ users.length }} users</span>
        </div>
      </div>
      <v-data-table
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="users"
        :loading="loading"
        item-value="userId"
        class="users-table"
        fixed-header
        height="400"
        hover
      >
        <template #item.index="{ index }">
          <span class="font-weight-medium text-grey-darken-2">{{ getRowNumber(index) }}</span>
        </template>

        <template #item.user="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar size="36" class="mr-3">
              <v-img v-if="item.profileImageUrl" :src="item.profileImageUrl" />
              <span v-else class="text-body-2">{{ item.fullName?.charAt(0) || item.username?.charAt(0) || "?" }}</span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.fullName || item.username }}</div>
              <div class="text-caption text-grey">@{{ item.username }}</div>
            </div>
          </div>
        </template>

        <template #item.email="{ item }">
          <div class="d-flex align-center text-body-2">
            <v-icon size="small" color="grey" class="mr-2">mdi-email-outline</v-icon>
            {{ item.email }}
          </div>
        </template>

        <template #item.position="{ item }">
          <v-chip v-if="item.position?.positionName" size="small" variant="tonal" color="primary">
            {{ item.position.positionName }}
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
              @click="openEditModal(item)"
            >
              <v-icon size="small">mdi-pencil-outline</v-icon>
              <v-tooltip activator="parent" location="top">Edit User</v-tooltip>
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              color="error"
              @click="openDeleteDialog(item)"
            >
              <v-icon size="small">mdi-delete-outline</v-icon>
              <v-tooltip activator="parent" location="top">Delete User</v-tooltip>
            </v-btn>
          </div>
        </template>

        <template #no-data>
          <div class="text-center py-10">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-group-outline</v-icon>
            <p class="text-h6 text-grey-darken-1 mb-2">No users found</p>
            <p class="text-body-2 text-grey mb-4">Create your first user to get started</p>
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="openCreateModal"
            >
              Add First User
            </v-btn>
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
        </template>
      </v-data-table>
    </v-card>

    <!-- Grid View (Cards) -->
    <v-row v-else>
      <v-col
        v-for="(user, index) in users"
        :key="user.userId"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card class="pa-4 user-card rounded-xl" elevation="0">
          <!-- Header -->
          <div class="d-flex align-start justify-space-between mb-3">
            <div class="d-flex align-center">
              <v-avatar size="48" class="mr-3">
                <v-img
                  v-if="user.profileImageUrl"
                  :src="user.profileImageUrl"
                />
                <span v-else class="text-h6">{{
                  user.fullName?.charAt(0) || user.username?.charAt(0) || "?"
                }}</span>
              </v-avatar>
              <div>
                <div class="text-body-2 font-weight-medium">
                  {{ user.fullName || user.username }}
                </div>
                <div
                  class="text-caption text-grey text-truncate"
                  style="max-width: 140px"
                >
                  {{ user.email }}
                </div>
              </div>
            </div>
            <v-menu>
              <template #activator="{ props }">
                <v-btn icon variant="text" size="x-small" v-bind="props">
                  <v-icon icon="mdi-dots-horizontal" size="18" />
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item
                  title="Edit"
                  prepend-icon="mdi-pencil"
                  @click="openEditModal(user)"
                />
                <v-list-item
                  title="Delete"
                  prepend-icon="mdi-delete"
                  class="text-error"
                  @click="openDeleteDialog(user)"
                />
              </v-list>
            </v-menu>
          </div>

          <!-- Position -->
          <div class="mb-3">
            <div class="text-caption text-grey mb-1">Position</div>
            <div class="d-flex align-center ga-2">
              <div class="text-body-2">{{ user.position?.positionName || "Not set" }}</div>
              <div class="d-flex ga-1">
                <v-btn icon variant="text" size="x-small"
                  ><v-icon icon="mdi-phone-outline" size="14"
                /></v-btn>
                <v-btn icon variant="text" size="x-small"
                  ><v-icon icon="mdi-email-outline" size="14"
                /></v-btn>
              </div>
            </div>
          </div>

          <!-- Task Progress (mock) -->
          <div class="mb-3">
            <div class="text-caption text-grey mb-2">Tasks</div>
            <div class="progress-bar">
              <div
                class="progress-bar-fill"
                :style="{
                  width: ((40 + index * 10) % 100) + '%',
                  backgroundColor: getProgressColor(index),
                }"
              ></div>
            </div>
          </div>

          <!-- Actions -->
          <div class="d-flex align-center justify-space-between">
            <v-btn
              variant="text"
              color="primary"
              size="small"
              @click="openEditModal(user)"
              >View Profile</v-btn
            >
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Modals -->
    <UserModal
      v-model="showUserModal"
      :user="selectedUser"
      :loading="modalLoading"
      @save="handleSaveUser"
    />
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Delete User"
      :message="`Are you sure you want to delete '${
        selectedUser?.fullName || selectedUser?.username
      }'?`"
      :loading="modalLoading"
      @confirm="handleDeleteUser"
    />
  </div>
</template>

<style scoped>
.users-view {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-field {
  width: 220px;
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

.users-table :deep(.v-data-table-footer) {
  border-top: 1px solid #e2e8f0;
  background: #fafbfc;
}

.user-card {
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.user-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1) !important;
}

.progress-bar {
  height: 4px;
  border-radius: 2px;
  background: #e2e8f0;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.view-toggle {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 8px;
}

.view-toggle-item {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle-item.active {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
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
</style>

