<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  tenantService,
  type Tenant,
  type TenantMember,
  type CreateTenantDto,
  type UpdateTenantDto,
} from "@/services/tenant.service";
import { userService, type User } from "@/services/user.service";
import { useSnackbar } from "@/composables/useSnackbar";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";

const snackbar = useSnackbar();
const authStore = useAuthStore();
const tenantStore = useTenantStore();
const tenants = ref<Tenant[]>([]);
const users = ref<User[]>([]);
const loading = ref(false);
const search = ref("");

// Create/Edit Dialog
const dialog = ref(false);
const saving = ref(false);
const isEditing = ref(false);
const editingTenant = ref<Tenant | null>(null);

const form = ref<CreateTenantDto & { tenantId?: string }>({
  name: "",
  slug: "",
  domain: "",
  plan: "FREE",
});

// Members Dialog
const membersDialog = ref(false);
const selectedTenant = ref<{ tenant: Tenant; members: TenantMember[] } | null>(null);
const loadingMembers = ref(false);
const addMemberUserId = ref<string | null>(null);
const addingMember = ref(false);

// Delete Dialog
const deleteDialog = ref(false);
const deletingTenant = ref<Tenant | null>(null);
const deleting = ref(false);

// Pagination
const page = ref(1);
const itemsPerPage = ref(10);

const getRowNumber = (index: number) => {
  return (page.value - 1) * itemsPerPage.value + index + 1;
};

const headers = [
  { title: "No", key: "index", sortable: false, width: "70px" },
  { title: "Organization", key: "name", sortable: true },
  { title: "Slug", key: "slug", sortable: true },
  { title: "Status", key: "status", sortable: true, width: "120px" },
  { title: "Plan", key: "plan", sortable: true, width: "100px" },
  { title: "Users", key: "userCount", sortable: true, width: "80px", align: "center" as const },
  { title: "Actions", key: "actions", sortable: false, width: "140px", align: "center" as const },
];

const filteredTenants = computed(() => {
  if (!search.value) return tenants.value;
  const term = search.value.toLowerCase();
  return tenants.value.filter(
    (t) =>
      t.name.toLowerCase().includes(term) ||
      t.slug.toLowerCase().includes(term)
  );
});

onMounted(async () => {
  await Promise.all([loadTenants(), loadUsers()]);
});

async function loadTenants() {
  loading.value = true;
  try {
    tenants.value = await tenantService.getAllTenants();
  } catch (error) {
    snackbar.error("Failed to load organizations");
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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function onNameChange(value: string) {
  if (!isEditing.value) {
    form.value.slug = generateSlug(value);
  }
}

function openCreateDialog() {
  isEditing.value = false;
  editingTenant.value = null;
  form.value = {
    name: "",
    slug: "",
    domain: "",
    plan: "FREE",
  };
  dialog.value = true;
}

function openEditDialog(tenant: Tenant) {
  isEditing.value = true;
  editingTenant.value = tenant;
  form.value = {
    tenantId: tenant.tenantId,
    name: tenant.name,
    slug: tenant.slug,
    domain: tenant.domain || "",
    plan: tenant.plan,
  };
  dialog.value = true;
}

async function saveTenant() {
  if (!form.value.name.trim()) {
    snackbar.error("Organization name is required");
    return;
  }
  if (!form.value.slug.trim()) {
    snackbar.error("Slug is required");
    return;
  }

  saving.value = true;
  try {
    if (isEditing.value && editingTenant.value) {
      await tenantService.updateTenant(editingTenant.value.tenantId, {
        name: form.value.name,
        slug: form.value.slug,
        domain: form.value.domain || undefined,
        plan: form.value.plan,
      });
      snackbar.success("Organization updated successfully");
    } else {
      await tenantService.createTenant({
        name: form.value.name,
        slug: form.value.slug,
        domain: form.value.domain || undefined,
        plan: form.value.plan,
      });
      snackbar.success("Organization created successfully");
    }
    dialog.value = false;
    await loadTenants();
    // Refresh the tenant store
    await tenantStore.fetchUserTenants();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to save organization");
  } finally {
    saving.value = false;
  }
}

function openDeleteDialog(tenant: Tenant) {
  deletingTenant.value = tenant;
  deleteDialog.value = true;
}

async function confirmDelete() {
  if (!deletingTenant.value) return;
  deleting.value = true;
  try {
    // Note: Delete not implemented yet, would call tenantService.deleteTenant
    snackbar.info("Delete functionality not implemented yet");
    deleteDialog.value = false;
    await loadTenants();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to delete organization");
  } finally {
    deleting.value = false;
  }
}

async function openMembersDialog(tenant: Tenant) {
  loadingMembers.value = true;
  membersDialog.value = true;
  addMemberUserId.value = null;
  try {
    const members = await tenantService.getTenantMembers(tenant.tenantId);
    selectedTenant.value = { tenant, members };
  } catch (error) {
    snackbar.error("Failed to load organization members");
  } finally {
    loadingMembers.value = false;
  }
}

const availableUsers = computed(() => {
  if (!selectedTenant.value?.members) return users.value;
  const memberIds = new Set(selectedTenant.value.members.map((m) => m.userId));
  return users.value.filter((u) => !memberIds.has(u.userId));
});

async function addMember() {
  if (!selectedTenant.value || !addMemberUserId.value) return;
  addingMember.value = true;
  try {
    await tenantService.addTenantMember(selectedTenant.value.tenant.tenantId, {
      userId: addMemberUserId.value,
      role: "MEMBER",
    });
    // Reload members
    const members = await tenantService.getTenantMembers(selectedTenant.value.tenant.tenantId);
    selectedTenant.value = { ...selectedTenant.value, members };
    addMemberUserId.value = null;
    snackbar.success("Member added successfully");
    await loadTenants();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to add member");
  } finally {
    addingMember.value = false;
  }
}

async function removeMember(member: TenantMember) {
  if (!selectedTenant.value) return;
  try {
    await tenantService.removeTenantMember(selectedTenant.value.tenant.tenantId, member.userId);
    // Reload members
    const members = await tenantService.getTenantMembers(selectedTenant.value.tenant.tenantId);
    selectedTenant.value = { ...selectedTenant.value, members };
    snackbar.success("Member removed successfully");
    await loadTenants();
  } catch (error: any) {
    snackbar.error(error.response?.data?.message || "Failed to remove member");
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "ACTIVE": return "success";
    case "SUSPENDED": return "error";
    case "TRIAL": return "warning";
    default: return "grey";
  }
}

function getPlanColor(plan: string) {
  switch (plan) {
    case "ENTERPRISE": return "primary";
    case "PRO": return "info";
    case "STARTER": return "secondary";
    default: return "grey";
  }
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case "OWNER": return "warning";
    case "ADMIN": return "info";
    default: return "grey";
  }
}
</script>

<template>
  <div class="organizations-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-domain" size="28" />
          </div>
          <div>
            <h1 class="page-title">Organizations</h1>
            <p class="page-subtitle">Manage companies and tenants</p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search organizations..."
          hide-details
          density="compact"
          variant="outlined"
          class="search-field"
          rounded="lg"
        />
        <v-btn
          class="add-btn"
          prepend-icon="mdi-plus"
          @click="openCreateDialog"
          rounded="lg"
          elevation="0"
        >
          Create Organization
        </v-btn>
      </div>
    </div>

    <!-- Table Card -->
    <v-card class="rounded-xl table-card" elevation="0">
      <div class="table-header-bar">
        <div class="table-header-left">
          <div class="table-header-icon">
            <v-icon icon="mdi-domain" size="16" color="white" />
          </div>
          <span class="table-header-title">Organization List</span>
          <span class="table-header-count">{{ tenants.length }} organizations</span>
        </div>
      </div>
      <v-data-table
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="filteredTenants"
        :loading="loading"
        item-value="tenantId"
        class="orgs-table"
        fixed-header
        height="400"
        hover
      >
        <template #item.index="{ index }">
          <span class="font-weight-medium text-grey-darken-2">{{ getRowNumber(index) }}</span>
        </template>

        <template #item.name="{ item }">
          <div class="d-flex align-center">
            <v-avatar size="32" color="primary" variant="tonal" class="mr-2">
              <v-img v-if="item.logoUrl" :src="item.logoUrl" />
              <span v-else class="text-caption font-weight-bold">{{ item.name.charAt(0) }}</span>
            </v-avatar>
            <span class="font-weight-medium">{{ item.name }}</span>
          </div>
        </template>

        <template #item.slug="{ item }">
          <code class="slug-code">{{ item.slug }}</code>
        </template>

        <template #item.status="{ item }">
          <v-chip :color="getStatusColor(item.status)" size="small" variant="flat">
            {{ item.status }}
          </v-chip>
        </template>

        <template #item.plan="{ item }">
          <v-chip :color="getPlanColor(item.plan)" size="small" variant="outlined">
            {{ item.plan }}
          </v-chip>
        </template>

        <template #item.userCount="{ item }">
          <v-chip size="small" color="primary" variant="tonal">
            {{ item._count?.members || 0 }}
          </v-chip>
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
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-domain</v-icon>
            <p class="text-h6 text-grey-darken-1 mb-2">No organizations found</p>
            <p class="text-body-2 text-grey mb-4">Create your first organization to get started</p>
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openCreateDialog">
              Create First Organization
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
      <v-card class="rounded-xl overflow-hidden" elevation="8">
        <div class="modal-header pa-5">
          <div class="d-flex align-center">
            <div class="header-icon mr-3">
              <v-icon icon="mdi-domain" size="24" color="white" />
            </div>
            <div>
              <h2 class="text-h6 font-weight-bold text-white">
                {{ isEditing ? 'Edit Organization' : 'Create New Organization' }}
              </h2>
              <p class="text-caption text-white mt-1" style="opacity: 0.85;">
                {{ isEditing ? 'Update organization details' : 'Add a new company/tenant to the system' }}
              </p>
            </div>
          </div>
          <v-btn icon variant="text" size="small" @click="dialog = false" class="close-btn">
            <v-icon icon="mdi-close" color="white" />
          </v-btn>
        </div>

        <v-card-text class="pa-5">
          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-domain</v-icon>
              Organization Name <span class="text-error">*</span>
            </label>
            <v-text-field
              v-model="form.name"
              placeholder="e.g., Acme Corporation"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              autofocus
              hide-details
              class="mt-2"
              @update:model-value="onNameChange"
            />
          </div>

          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-link-variant</v-icon>
              Slug <span class="text-error">*</span>
              <span class="text-caption text-grey ml-2">(URL-friendly identifier)</span>
            </label>
            <v-text-field
              v-model="form.slug"
              placeholder="e.g., acme-corp"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details
              class="mt-2"
            />
          </div>

          <div class="form-section mb-4">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-web</v-icon>
              Custom Domain <span class="text-caption text-grey">(optional)</span>
            </label>
            <v-text-field
              v-model="form.domain"
              placeholder="e.g., app.acme.com"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details
              class="mt-2"
            />
          </div>

          <div class="form-section">
            <label class="form-label">
              <v-icon size="16" class="mr-1">mdi-credit-card-outline</v-icon>
              Plan
            </label>
            <v-select
              v-model="form.plan"
              :items="['FREE', 'STARTER', 'PRO', 'ENTERPRISE']"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details
              class="mt-2"
            />
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-5 bg-grey-lighten-5">
          <v-spacer />
          <v-btn variant="outlined" @click="dialog = false" class="text-none px-5" rounded="lg">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="saveTenant" class="text-none px-6 ml-3" rounded="lg" elevation="2">
            <v-icon size="18" class="mr-1">{{ isEditing ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
            {{ isEditing ? 'Save Changes' : 'Create Organization' }}
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
              <h2 class="text-h6 font-weight-bold text-white">Organization Members</h2>
              <p class="text-caption text-white mt-1" style="opacity: 0.85;">
                {{ selectedTenant?.tenant.name }} - {{ selectedTenant?.members?.length || 0 }} members
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

          <!-- Members List -->
          <div class="section-label">Members</div>
          <div v-if="loadingMembers" class="text-center py-4">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <div v-else-if="!selectedTenant?.members?.length" class="empty-members">
            <v-icon size="32" color="grey-lighten-1" class="mb-2">mdi-account-multiple-outline</v-icon>
            <div>No members yet</div>
          </div>
          <div v-else class="members-list">
            <div
              v-for="member in selectedTenant.members"
              :key="member.userId"
              class="member-item"
            >
              <v-avatar size="36" color="grey-lighten-3" class="member-avatar">
                <v-img v-if="member.profileImageUrl" :src="member.profileImageUrl" />
                <span v-else class="text-caption font-weight-medium">{{ member.fullName?.charAt(0) || '?' }}</span>
              </v-avatar>
              <div class="member-info">
                <div class="member-name">{{ member.fullName || member.username }}</div>
                <div class="member-email">{{ member.email }}</div>
              </div>
              <v-chip :color="getRoleBadgeColor(member.role)" size="x-small" variant="flat" class="mr-2">
                {{ member.role }}
              </v-chip>
              <v-btn 
                v-if="member.role !== 'OWNER'" 
                icon variant="text" size="x-small" color="error" class="remove-btn" 
                @click="removeMember(member)"
              >
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
        <v-card-title class="text-h6 pa-5">Delete Organization</v-card-title>
        <v-card-text class="px-5 pb-3">
          Are you sure you want to delete <strong>{{ deletingTenant?.name }}</strong>?
          This will remove all data associated with this organization.
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
.organizations-view {
  padding: 4px;
}

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

.add-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  text-transform: none;
  padding: 0 20px;
  height: 42px;
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.3);
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

.orgs-table {
  background: transparent;
}

.orgs-table :deep(thead) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.orgs-table :deep(th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.75rem !important;
  letter-spacing: 0.05em;
  color: #64748b !important;
  border-bottom: 2px solid #e2e8f0 !important;
}

.orgs-table :deep(td) {
  border-bottom: 1px solid #f1f5f9 !important;
}

.slug-code {
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #475569;
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
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.form-label {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.add-member-section {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.member-search-field {
  flex: 1;
}

.add-member-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  font-weight: 600;
  height: 40px;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin-bottom: 12px;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 10px;
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
  font-size: 14px;
  color: #1e293b;
}

.member-email {
  font-size: 12px;
  color: #64748b;
}

.empty-members {
  text-align: center;
  padding: 24px;
  color: #94a3b8;
  font-size: 14px;
}
</style>
