<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  teamService,
  type Team,
  type TeamMember,
  type CreateTeamDto,
  type UpdateTeamDto,
} from "@/services/team.service";
import {
  userService,
  type User
} from "@/services/user.service";
import { departmentService, type Department } from "@/services/department.service";
import { useSnackbar } from "@/composables/useSnackbar";
import { useAuthStore } from "@/stores/auth.store";

const snackbar = useSnackbar();
const authStore = useAuthStore();
const teams = ref<Team[]>([]);
const users = ref<User[]>([]);
const departments = ref<Department[]>([]);
const loading = ref(false);
const search = ref("");

// Create/Edit Dialog
const dialog = ref(false);
const saving = ref(false);
const isEditing = ref(false);
const editingTeam = ref<Team | null>(null);

const form = ref<CreateTeamDto & { teamId?: string }>({
  teamName: "",
  ownerId: "",
  departmentId: undefined,
  memberIds: [],
});

// Members Dialog
const membersDialog = ref(false);
const selectedTeam = ref<Team | null>(null);
const loadingMembers = ref(false);
const addMemberUserId = ref<string | null>(null);
const addingMember = ref(false);

// Delete Dialog
const deleteDialog = ref(false);
const deletingTeam = ref<Team | null>(null);
const deleting = ref(false);

// Pagination
const page = ref(1);
const itemsPerPage = ref(10);

const getRowNumber = (index: number) => {
  return (page.value - 1) * itemsPerPage.value + index + 1;
};

const headers = [
  { title: "No", key: "index", sortable: false, width: "70px" },
  { title: "Team Name", key: "teamName", sortable: true },
  { title: "Department", key: "department", sortable: false },
  { title: "Owner", key: "owner", sortable: true },
  { title: "Members", key: "memberCount", sortable: true, width: "100px", align: "center" as const },
  { title: "Created", key: "createdAt", sortable: true, width: "120px" },
  { title: "Actions", key: "actions", sortable: false, width: "140px", align: "center" as const },
];

onMounted(async () => {
  await Promise.all([loadTeams(), loadUsers(), loadDepartments()]);
});

async function loadTeams() {
  loading.value = true;
  try {
    teams.value = await teamService.getAll({ search: search.value || undefined });
  } catch (error) {
    snackbar.error("Failed to load teams");
  } finally {
    loading.value = false;
  }
}

async function loadUsers() {
  try {
    const response = await userService.getAll({ pageSize: 100 });
    users.value = response.data;
  } catch (error) {
    console.error("Failed to load users", error);
  }
}

async function loadDepartments() {
  try {
    const response = await departmentService.getAll({ isActive: true });
    departments.value = response.data;
  } catch (error) {
    console.error("Failed to load departments", error);
  }
}

// Create Dialog
function openCreateDialog() {
  isEditing.value = false;
  editingTeam.value = null;
  form.value = {
    teamName: "",
    ownerId: authStore.user?.userId || "",
    departmentId: undefined,
    memberIds: [],
  };
  dialog.value = true;
}

// Edit Dialog
function openEditDialog(team: Team) {
  isEditing.value = true;
  editingTeam.value = team;
  form.value = {
    teamId: team.teamId,
    teamName: team.teamName,
    ownerId: team.ownerId,
    departmentId: team.departmentId || undefined,
    memberIds: [],
  };
  dialog.value = true;
}

async function saveTeam() {
  if (!form.value.teamName.trim()) {
    snackbar.error("Team name is required");
    return;
  }
  if (!form.value.ownerId) {
    snackbar.error("Team owner is required");
    return;
  }

  saving.value = true;
  try {
    if (isEditing.value && editingTeam.value) {
      await teamService.update(editingTeam.value.teamId, {
        teamName: form.value.teamName,
        departmentId: form.value.departmentId,
      });
      snackbar.success("Team updated successfully");
    } else {
      await teamService.create(form.value);
      snackbar.success("Team created successfully");
    }
    dialog.value = false;
    await loadTeams();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to save team");
  } finally {
    saving.value = false;
  }
}

// Delete Dialog
function openDeleteDialog(team: Team) {
  deletingTeam.value = team;
  deleteDialog.value = true;
}

async function confirmDelete() {
  if (!deletingTeam.value) return;
  deleting.value = true;
  try {
    await teamService.delete(deletingTeam.value.teamId);
    snackbar.success("Team deleted successfully");
    deleteDialog.value = false;
    await loadTeams();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to delete team");
  } finally {
    deleting.value = false;
  }
}

// Members Dialog
async function openMembersDialog(team: Team) {
  loadingMembers.value = true;
  membersDialog.value = true;
  addMemberUserId.value = null;
  try {
    selectedTeam.value = await teamService.getById(team.teamId);
  } catch (error) {
    snackbar.error("Failed to load team members");
  } finally {
    loadingMembers.value = false;
  }
}

const availableUsers = computed(() => {
  if (!selectedTeam.value?.members) return users.value;
  const memberIds = new Set(selectedTeam.value.members.map(m => m.userId));
  // Also exclude owner
  memberIds.add(selectedTeam.value.ownerId);
  return users.value.filter(u => !memberIds.has(u.userId));
});

async function addMember() {
  if (!selectedTeam.value || !addMemberUserId.value) return;
  addingMember.value = true;
  try {
    selectedTeam.value = await teamService.addMember(selectedTeam.value.teamId, addMemberUserId.value);
    addMemberUserId.value = null;
    snackbar.success("Member added successfully");
    await loadTeams();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to add member");
  } finally {
    addingMember.value = false;
  }
}

async function removeMember(member: TeamMember) {
  if (!selectedTeam.value) return;
  try {
    selectedTeam.value = await teamService.removeMember(selectedTeam.value.teamId, member.userId);
    snackbar.success("Member removed successfully");
    await loadTeams();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to remove member");
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

function getOwnerName(team: Team) {
  if (team.owner) {
    return team.owner.fullName || team.owner.username;
  }
  return "Unknown";
}
</script>

<template>
  <div class="teams-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-account-multiple-outline" size="28" />
          </div>
          <div>
            <h1 class="page-title">Teams</h1>
            <p class="page-subtitle">Manage teams and their members</p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search teams..."
          hide-details
          density="compact"
          variant="outlined"
          class="search-field"
          rounded="lg"
          @update:model-value="loadTeams"
        />
        <v-btn
          class="add-btn"
          prepend-icon="mdi-plus"
          @click="openCreateDialog"
          rounded="lg"
          elevation="0"
        >
          Create Team
        </v-btn>
      </div>
    </div>

    <!-- Table Card -->
    <v-card class="rounded-xl table-card" elevation="0">
      <!-- Table Header Bar -->
      <div class="table-header-bar">
        <div class="table-header-left">
          <div class="table-header-icon">
            <v-icon icon="mdi-account-group-outline" size="16" color="white" />
          </div>
          <span class="table-header-title">Team List</span>
          <span class="table-header-count">{{ teams.length }} teams</span>
        </div>
      </div>
      <v-data-table
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="teams"
        :loading="loading"
        item-value="teamId"
        class="teams-table"
        fixed-header
        height="400"
        hover
      >
        <template #item.index="{ index }">
          <span class="font-weight-medium text-grey-darken-2">{{ getRowNumber(index) }}</span>
        </template>

        <template #item.teamName="{ item }">
          <div class="d-flex align-center">
            <v-avatar size="32" color="primary" variant="tonal" class="mr-2">
              <span class="text-caption font-weight-bold">{{ item.teamName.charAt(0) }}</span>
            </v-avatar>
            <span class="font-weight-medium">{{ item.teamName }}</span>
          </div>
        </template>

        <template #item.department="{ item }">
          <v-chip v-if="item.department" size="small" variant="outlined" color="grey-darken-1">
            {{ item.department.name }}
          </v-chip>
          <span v-else class="text-grey text-caption">Cross-department</span>
        </template>

        <template #item.owner="{ item }">
          <div class="d-flex align-center">
            <v-avatar size="28" class="mr-2">
              <v-img v-if="item.owner?.profileImageUrl" :src="item.owner.profileImageUrl" />
              <span v-else class="text-caption">{{ getOwnerName(item).charAt(0).toUpperCase() }}</span>
            </v-avatar>
            <span class="text-body-2">{{ getOwnerName(item) }}</span>
          </div>
        </template>

        <template #item.memberCount="{ item }">
          <v-chip size="small" color="primary" variant="tonal">
            {{ item.memberCount || 0 }}
          </v-chip>
        </template>

        <template #item.createdAt="{ item }">
          <div class="d-flex align-center text-body-2">
            <v-icon size="small" color="grey" class="mr-1">mdi-calendar</v-icon>
            {{ formatDate(item.createdAt) }}
          </div>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-center" style="gap: 4px;">
            <v-btn icon variant="text" size="small" color="info" @click="openMembersDialog(item)">
              <v-icon size="small">mdi-account-multiple</v-icon>
              <v-tooltip activator="parent" location="top">Members</v-tooltip>
            </v-btn>
            <v-btn icon variant="text" size="small" color="primary" @click="openEditDialog(item)">
              <v-icon size="small">mdi-pencil-outline</v-icon>
              <v-tooltip activator="parent" location="top">Edit</v-tooltip>
            </v-btn>
            <v-btn icon variant="text" size="small" color="error" @click="openDeleteDialog(item)">
              <v-icon size="small">mdi-delete-outline</v-icon>
              <v-tooltip activator="parent" location="top">Delete</v-tooltip>
            </v-btn>
          </div>
        </template>

        <template #no-data>
          <div class="text-center py-10">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-group-outline</v-icon>
            <p class="text-h6 text-grey-darken-1 mb-2">No teams found</p>
            <p class="text-body-2 text-grey mb-4">Create your first team to get started</p>
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="openCreateDialog"
            >
              Create First Team
            </v-btn>
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
        </template>
      </v-data-table>
    </v-card>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="540" persistent>
      <v-card class="team-modal rounded-xl overflow-hidden" elevation="8">
        <!-- Header -->
        <div class="modal-header pa-5">
          <div class="d-flex align-center">
            <div class="header-icon mr-3">
              <v-icon icon="mdi-account-group-outline" size="24" color="white" />
            </div>
            <div>
              <h2 class="text-h6 font-weight-bold text-white">
                {{ isEditing ? 'Edit Team' : 'Create New Team' }}
              </h2>
              <p class="text-caption text-white mt-1" style="opacity: 0.85;">
                {{ isEditing ? 'Update team details' : 'Add a new team to your organization' }}
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
              <v-icon size="16" class="mr-1">mdi-account-group-outline</v-icon>
              Team Name <span class="text-error">*</span>
            </label>
            <v-text-field
              v-model="form.teamName"
              placeholder="e.g., Frontend Team, Marketing"
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
              <v-icon size="16" class="mr-1">mdi-domain</v-icon>
              Department <span class="text-caption text-grey">(optional)</span>
            </label>
            <v-select
              v-model="form.departmentId"
              :items="departments"
              item-title="name"
              item-value="departmentId"
              placeholder="Select department (cross-department if empty)"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              clearable
              hide-details
              class="mt-2"
            />
          </div>
          
          <div class="form-section">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-account-star-outline</v-icon>
              Team Owner <span class="text-error">*</span>
            </label>
            <v-autocomplete
              v-model="form.ownerId"
              :items="users"
              item-title="fullName"
              item-value="userId"
              placeholder="Select an owner"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details
              class="mt-2"
              :disabled="isEditing"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="item.raw.email"></v-list-item>
              </template>
            </v-autocomplete>
          </div>
        </v-card-text>

        <!-- Footer -->
        <v-divider />
        <v-card-actions class="pa-5 bg-grey-lighten-5">
          <v-spacer />
          <v-btn variant="outlined" @click="dialog = false" class="text-none px-5" rounded="lg">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="saveTeam" class="text-none px-6 ml-3" rounded="lg" elevation="2">
            <v-icon size="18" class="mr-1">{{ isEditing ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
            {{ isEditing ? 'Save Changes' : 'Create Team' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Members Dialog -->
    <v-dialog v-model="membersDialog" max-width="540" persistent>
      <v-card class="rounded-xl overflow-hidden" elevation="8">
        <div class="modal-header pa-5">
          <div class="d-flex align-center">
            <div class="header-icon mr-3">
              <v-icon icon="mdi-account-multiple" size="24" color="white" />
            </div>
            <div>
              <h2 class="text-h6 font-weight-bold text-white">Team Members</h2>
              <p class="text-caption text-white mt-1" style="opacity: 0.85;">
                {{ selectedTeam?.teamName }} - {{ selectedTeam?.members?.length || 0 }} members
              </p>
            </div>
          </div>
          <v-btn icon variant="text" size="small" @click="membersDialog = false" class="close-btn">
            <v-icon icon="mdi-close" color="white" />
          </v-btn>
        </div>

        <v-card-text class="pa-5">
          <!-- Add Member -->
          <div class="add-member-section">
            <v-autocomplete
              v-model="addMemberUserId"
              :items="availableUsers"
              item-title="fullName"
              item-value="userId"
              placeholder="Select user to add..."
              variant="outlined"
              density="compact"
              rounded="lg"
              hide-details
              prepend-inner-icon="mdi-magnify"
              class="member-search-field"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="item.raw.email">
                  <template #prepend>
                    <v-avatar size="32" color="grey-lighten-3" class="mr-2">
                      <v-img v-if="item.raw.profileImageUrl" :src="item.raw.profileImageUrl" />
                      <span v-else class="text-caption font-weight-medium">{{ item.raw.fullName?.charAt(0) || '?' }}</span>
                    </v-avatar>
                  </template>
                </v-list-item>
              </template>
            </v-autocomplete>
            <v-btn
              class="add-member-btn"
              :loading="addingMember"
              :disabled="!addMemberUserId"
              @click="addMember"
              rounded="lg"
              elevation="0"
            >
              <v-icon size="18" class="mr-1">mdi-plus</v-icon>
              ADD
            </v-btn>
          </div>

          <!-- Owner -->
          <div class="section-label">Owner</div>
          <div class="owner-card">
            <v-avatar size="40" color="primary" variant="tonal" class="owner-avatar">
              <v-img v-if="selectedTeam?.owner?.profileImageUrl" :src="selectedTeam.owner.profileImageUrl" />
              <span v-else class="text-body-2 font-weight-bold">{{ selectedTeam?.owner?.fullName?.charAt(0) || '?' }}</span>
            </v-avatar>
            <div class="owner-info">
              <div class="owner-name">{{ selectedTeam?.owner?.fullName || selectedTeam?.owner?.username }}</div>
              <div class="owner-email">{{ selectedTeam?.owner?.email }}</div>
            </div>
            <v-chip size="small" color="warning" variant="flat" class="owner-badge">Owner</v-chip>
          </div>

          <!-- Members List -->
          <div class="section-label">Members</div>
          <div v-if="loadingMembers" class="text-center py-4">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <div v-else-if="!selectedTeam?.members?.length" class="empty-members">
            <v-icon size="32" color="grey-lighten-1" class="mb-2">mdi-account-multiple-outline</v-icon>
            <div>No members yet</div>
          </div>
          <div v-else class="members-list">
            <div
              v-for="member in selectedTeam.members"
              :key="member.teamMemberId"
              class="member-item"
            >
              <v-avatar size="36" color="grey-lighten-3" class="member-avatar">
                <v-img v-if="member.user?.profileImageUrl" :src="member.user.profileImageUrl" />
                <span v-else class="text-caption font-weight-medium">{{ member.user?.fullName?.charAt(0) || '?' }}</span>
              </v-avatar>
              <div class="member-info">
                <div class="member-name">{{ member.user?.fullName || member.user?.username }}</div>
                <div class="member-email">{{ member.user?.email }}</div>
              </div>
              <v-btn icon variant="text" size="x-small" color="error" class="remove-btn" @click="removeMember(member)">
                <v-icon size="18">mdi-close</v-icon>
                <v-tooltip activator="parent" location="top">Remove</v-tooltip>
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card class="rounded-xl">
        <v-card-title class="text-h6 pa-5">Delete Team</v-card-title>
        <v-card-text class="px-5 pb-3">
          Are you sure you want to delete <strong>{{ deletingTeam?.teamName }}</strong>?
          This will also remove all team members.
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.teams-view {
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
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.3);
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

.teams-table {
  background: transparent;
}

.teams-table :deep(thead) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.teams-table :deep(th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.75rem !important;
  letter-spacing: 0.05em;
  color: #64748b !important;
  border-bottom: 2px solid #e2e8f0 !important;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

.teams-table :deep(td) {
  border-bottom: 1px solid #f1f5f9 !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.teams-table :deep(tr:hover) {
  background: rgba(var(--v-theme-primary), 0.04) !important;
}

.teams-table :deep(.v-data-table-footer) {
  border-top: 1px solid #e2e8f0;
  background: #fafbfc;
}

.add-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  text-transform: none;
  padding: 0 20px;
  height: 42px;
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.3);
  transition: all 0.3s ease;
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(241, 24, 76, 0.4);
}

/* Modal Styles */
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

/* Members Dialog Styles */
.add-member-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.member-search-field {
  flex: 1;
}

.member-search-field :deep(.v-field) {
  border-radius: 10px !important;
}

.add-member-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%) !important;
  color: white !important;
  font-weight: 600;
  text-transform: none;
  padding: 0 20px;
  height: 40px;
  min-width: 90px;
  box-shadow: 0 4px 12px rgba(241, 24, 76, 0.3);
  transition: all 0.3s ease;
}

.add-member-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(241, 24, 76, 0.4);
}

.add-member-btn:disabled {
  opacity: 0.5;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.owner-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid #fcd34d;
}

.owner-avatar {
  flex-shrink: 0;
}

.owner-info {
  flex: 1;
  min-width: 0;
}

.owner-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.owner-email {
  font-size: 0.8rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.owner-badge {
  flex-shrink: 0;
}

.empty-members {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #9ca3af;
  font-size: 0.875rem;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px dashed #e5e7eb;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 4px;
}

.members-list::-webkit-scrollbar {
  width: 4px;
}

.members-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.members-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.member-item:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.member-avatar {
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-weight: 500;
  font-size: 0.9rem;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-email {
  font-size: 0.8rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-btn {
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.member-item:hover .remove-btn {
  opacity: 1;
}
</style>
