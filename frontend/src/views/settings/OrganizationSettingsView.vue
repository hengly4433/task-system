<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from "vue";
import { tenantService } from "@/services/tenant.service";
import { useSnackbar } from "@/composables/useSnackbar";
import { useTenantStore } from "@/stores/tenant.store";
import { useRouter } from "vue-router";
import { countries } from "@/data/countries";

const snackbar = useSnackbar();
const tenantStore = useTenantStore();
const router = useRouter();

const loading = ref(false);
const saving = ref(false);

// Form data
const form = ref({
  name: "",
  slug: "",
  domain: "",
  logoUrl: "",
  // Company Info
  description: "",
  industry: "",
  companySize: "",
  foundedYear: null as number | null,
  taxId: "",
  // Contact
  phone: "",
  email: "",
  website: "",
  // Address
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
});

// Logo upload
const logoFile = ref<File | null>(null);
const uploadingLogo = ref(false);
const logoPreview = ref<string | null>(null);

// Check if user is owner of current tenant
const isOwner = computed(() => tenantStore.isOwner);
const currentTenant = computed(() => tenantStore.currentTenant);

// Options
const industrySuggestions = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Construction",
  "Real Estate",
  "Consulting",
  "Marketing",
  "Media",
  "Transportation",
  "Hospitality",
  "Other",
];

const companySizeOptions = [
  { title: "1-10 employees", value: "1-10" },
  { title: "11-50 employees", value: "11-50" },
  { title: "51-200 employees", value: "51-200" },
  { title: "201-500 employees", value: "201-500" },
  { title: "501-1000 employees", value: "501-1000" },
  { title: "1000+ employees", value: "1000+" },
];

onMounted(async () => {
  // Wait for tenant store to initialize if not already
  if (!tenantStore.initialized) {
    await tenantStore.fetchUserTenants();
  }
  
  if (!isOwner.value) {
    snackbar.error("You don't have permission to access this page");
    router.push("/");
    return;
  }
  await loadTenantDetails();
});

async function loadTenantDetails() {
  if (!currentTenant.value) {
    snackbar.error("No organization selected");
    return;
  }

  loading.value = true;
  try {
    const tenant = currentTenant.value;
    form.value = {
      name: tenant.name || "",
      slug: tenant.slug || "",
      domain: tenant.domain || "",
      logoUrl: tenant.logoUrl || "",
      description: tenant.description || "",
      industry: tenant.industry || "",
      companySize: tenant.companySize || "",
      foundedYear: tenant.foundedYear || null,
      taxId: tenant.taxId || "",
      phone: tenant.phone || "",
      email: tenant.email || "",
      website: tenant.website || "",
      address: tenant.address || "",
      city: tenant.city || "",
      state: tenant.state || "",
      country: tenant.country || "",
      postalCode: tenant.postalCode || "",
    };
    logoPreview.value = tenant.logoUrl || null;
  } finally {
    loading.value = false;
  }
}

function regenerateSlug() {
  if (!form.value.name.trim()) {
    form.value.slug = "";
    return;
  }
  // Generate URL-friendly slug from name
  form.value.slug = form.value.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function onLogoChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      logoPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Upload immediately
    if (!currentTenant.value) return;
    
    uploadingLogo.value = true;
    try {
      const result = await tenantService.uploadTenantLogo(
        currentTenant.value.tenantId,
        file
      );
      form.value.logoUrl = result.logoUrl;
      logoPreview.value = result.logoUrl;
      snackbar.success("Logo uploaded successfully");
      tenantStore.initialized = false;
      await tenantStore.fetchUserTenants();
    } catch (error) {
      snackbar.error("Failed to upload logo");
      logoPreview.value = form.value.logoUrl || null;
    } finally {
      uploadingLogo.value = false;
      input.value = ''; // Reset input for re-upload
    }
  }
}

async function uploadLogo() {
  if (!logoFile.value || !currentTenant.value) return;

  uploadingLogo.value = true;
  try {
    const result = await tenantService.uploadTenantLogo(
      currentTenant.value.tenantId,
      logoFile.value
    );
    form.value.logoUrl = result.logoUrl;
    logoPreview.value = result.logoUrl;
    logoFile.value = null;
    snackbar.success("Logo uploaded successfully");
    tenantStore.initialized = false;
    await tenantStore.fetchUserTenants();
  } catch (error) {
    snackbar.error("Failed to upload logo");
  } finally {
    uploadingLogo.value = false;
  }
}

async function saveChanges() {
  if (!currentTenant.value) return;
  if (!form.value.name.trim()) {
    snackbar.error("Organization name is required");
    return;
  }

  saving.value = true;
  try {
    await tenantService.updateTenant(currentTenant.value.tenantId, {
      name: form.value.name,
      slug: form.value.slug,
      domain: form.value.domain || undefined,
      description: form.value.description || undefined,
      industry: form.value.industry || undefined,
      companySize: form.value.companySize || undefined,
      foundedYear: form.value.foundedYear || undefined,
      taxId: form.value.taxId || undefined,
      phone: form.value.phone || undefined,
      email: form.value.email || undefined,
      website: form.value.website || undefined,
      address: form.value.address || undefined,
      city: form.value.city || undefined,
      state: form.value.state || undefined,
      country: form.value.country || undefined,
      postalCode: form.value.postalCode || undefined,
    });
    snackbar.success("Organization updated successfully");
    tenantStore.initialized = false;
    await tenantStore.fetchUserTenants();
    await nextTick();
    loadTenantDetails();
  } catch (error: any) {
    snackbar.error(
      error.response?.data?.message || "Failed to update organization"
    );
  } finally {
    saving.value = false;
  }
}

function getPlanColor(plan: string) {
  switch (plan) {
    case "ENTERPRISE":
      return "primary";
    case "PRO":
      return "info";
    case "STARTER":
      return "secondary";
    default:
      return "grey";
  }
}
</script>

<template>
  <div class="organization-settings">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-office-building-cog-outline" size="28" />
          </div>
          <div>
            <h1 class="page-title">Organization Settings</h1>
            <p class="page-subtitle">
              Manage your company profile and branding
            </p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          @click="saveChanges"
          class="save-btn"
          rounded="lg"
          elevation="2"
          size="large"
        >
          <v-icon size="20" class="mr-2">mdi-content-save</v-icon>
          Save All Changes
        </v-btn>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-10">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Settings Content -->
    <div v-else class="settings-content">
      <v-row>
        <!-- Left Column -->
        <v-col cols="12" lg="8">
          <!-- Basic Info Card -->
          <v-card class="settings-card mb-5" elevation="0">
            <div class="card-header">
              <div class="header-icon-wrapper">
                <v-icon icon="mdi-domain" size="20" />
              </div>
              <div>
                <div class="header-title">Basic Information</div>
                <div class="header-subtitle">
                  Your organization's identity
                </div>
              </div>
            </div>
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" md="6">
                  <label class="form-label">
                    Organization Name <span class="text-error">*</span>
                  </label>
                  <v-text-field
                    v-model="form.name"
                    placeholder="e.g., Acme Corporation"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                    @input="regenerateSlug"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <label class="form-label">
                    Slug <span class="text-caption text-grey">(URL identifier)</span>
                  </label>
                  <v-text-field
                    v-model="form.slug"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    disabled
                    class="mt-2"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <label class="form-label">Industry</label>
                  <v-autocomplete
                    v-model="form.industry"
                    :items="industrySuggestions"
                    placeholder="Select industry"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                    clearable
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <label class="form-label">Company Size</label>
                  <v-select
                    v-model="form.companySize"
                    :items="companySizeOptions"
                    item-title="title"
                    item-value="value"
                    placeholder="Select size"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                    clearable
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <label class="form-label">Founded Year</label>
                  <v-text-field
                    v-model.number="form.foundedYear"
                    type="number"
                    placeholder="e.g., 2020"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                    :min="1900"
                    :max="new Date().getFullYear()"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <label class="form-label">Tax ID / VAT</label>
                  <v-text-field
                    v-model="form.taxId"
                    placeholder="e.g., 12-3456789"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                  />
                </v-col>
                <v-col cols="12">
                  <label class="form-label">Description</label>
                  <v-textarea
                    v-model="form.description"
                    placeholder="Tell us about your organization..."
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                    rows="3"
                    auto-grow
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Contact Info Card -->
          <v-card class="settings-card mb-5" elevation="0">
            <div class="card-header">
              <div class="header-icon-wrapper contact">
                <v-icon icon="mdi-phone-outline" size="20" />
              </div>
              <div>
                <div class="header-title">Contact Information</div>
                <div class="header-subtitle">How customers can reach you</div>
              </div>
            </div>
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" md="6">
                  <label class="form-label">Phone Number</label>
                  <v-text-field
                    v-model="form.phone"
                    placeholder="e.g., +1 (555) 123-4567"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                    prepend-inner-icon="mdi-phone"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <label class="form-label">Email Address</label>
                  <v-text-field
                    v-model="form.email"
                    placeholder="e.g., contact@company.com"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                    prepend-inner-icon="mdi-email-outline"
                    type="email"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <label class="form-label">Website</label>
                  <v-text-field
                    v-model="form.website"
                    placeholder="e.g., https://www.company.com"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                    prepend-inner-icon="mdi-web"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <label class="form-label">Custom Domain</label>
                  <v-text-field
                    v-model="form.domain"
                    placeholder="e.g., app.company.com"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                    prepend-inner-icon="mdi-link-variant"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Address Card -->
          <v-card class="settings-card" elevation="0">
            <div class="card-header">
              <div class="header-icon-wrapper address">
                <v-icon icon="mdi-map-marker-outline" size="20" />
              </div>
              <div>
                <div class="header-title">Business Address</div>
                <div class="header-subtitle">Your company's location</div>
              </div>
            </div>
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12">
                  <label class="form-label">Street Address</label>
                  <v-text-field
                    v-model="form.address"
                    placeholder="e.g., 123 Main Street, Suite 100"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <label class="form-label">City</label>
                  <v-text-field
                    v-model="form.city"
                    placeholder="e.g., San Francisco"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <label class="form-label">State / Province</label>
                  <v-text-field
                    v-model="form.state"
                    placeholder="e.g., California"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <label class="form-label">Country</label>
                  <v-autocomplete
                    v-model="form.country"
                    :items="countries"
                    item-title="name"
                    item-value="name"
                    placeholder="Search country..."
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                    clearable
                    auto-select-first
                  >
                    <template #item="{ item, props }">
                      <v-list-item v-bind="props">
                        <template #prepend>
                          <span class="text-caption text-grey mr-2">{{ item.raw.code }}</span>
                        </template>
                      </v-list-item>
                    </template>
                  </v-autocomplete>
                </v-col>
                <v-col cols="12" md="6">
                  <label class="form-label">Postal / ZIP Code</label>
                  <v-text-field
                    v-model="form.postalCode"
                    placeholder="e.g., 94105"
                    variant="outlined"
                    density="comfortable"
                    rounded="lg"
                    hide-details
                    class="mt-2"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right Column -->
        <v-col cols="12" lg="4">
          <!-- Logo Card -->
          <v-card class="settings-card mb-5" elevation="0">
            <div class="card-header">
              <div class="header-icon-wrapper branding">
                <v-icon icon="mdi-image" size="20" />
              </div>
              <div>
                <div class="header-title">Company Logo</div>
                <div class="header-subtitle">Your brand identity</div>
              </div>
            </div>
            <v-card-text class="pa-6 text-center">
              <div class="logo-container">
                <v-avatar size="140" color="grey-lighten-3" class="logo-avatar">
                  <v-img v-if="logoPreview" :src="logoPreview" cover />
                  <v-icon v-else size="56" color="grey-lighten-1"
                    >mdi-domain</v-icon
                  >
                </v-avatar>
                <div class="logo-overlay" @click="($refs.logoInput as HTMLInputElement)?.click()">
                  <v-icon size="24" color="white">mdi-camera</v-icon>
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                @change="onLogoChange"
                class="d-none"
                ref="logoInput"
              />

              <div class="mt-4">
                <v-btn
                  variant="outlined"
                  color="primary"
                  @click="($refs.logoInput as HTMLInputElement)?.click()"
                  rounded="lg"
                  class="text-none"
                  :loading="uploadingLogo"
                  :disabled="uploadingLogo"
                >
                  <v-icon size="18" class="mr-1">mdi-cloud-upload</v-icon>
                  {{ uploadingLogo ? 'Uploading...' : 'Upload Logo' }}
                </v-btn>
              </div>

              <p class="text-caption text-grey mt-3">
                Recommended: 256×256px, PNG or JPG
              </p>
            </v-card-text>
          </v-card>

          <!-- Plan Card -->
          <v-card class="settings-card" elevation="0">
            <div class="card-header">
              <div class="header-icon-wrapper plan">
                <v-icon icon="mdi-crown-outline" size="20" />
              </div>
              <div>
                <div class="header-title">Current Plan</div>
                <div class="header-subtitle">Your subscription</div>
              </div>
            </div>
            <v-card-text class="pa-6 text-center">
              <v-chip
                :color="getPlanColor(currentTenant?.plan || 'FREE')"
                size="x-large"
                variant="flat"
                class="plan-chip mb-4"
              >
                <v-icon start size="20">mdi-star</v-icon>
                {{ currentTenant?.plan || "FREE" }}
              </v-chip>
              <p class="text-body-2 text-grey mb-4">
                Upgrade to unlock more features and higher limits
              </p>
              <v-btn
                variant="elevated"
                color="primary"
                to="/subscription"
                rounded="lg"
                class="text-none upgrade-btn"
                block
                size="large"
              >
                <v-icon size="20" class="mr-1"
                  >mdi-arrow-up-bold-circle-outline</v-icon
                >
                Manage Subscription
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<style scoped>
.organization-settings {
  padding: 4px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 24px rgba(241, 24, 76, 0.35);
}

.page-title {
  font-size: 30px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 4px 0 0 0;
}

.save-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  font-weight: 600;
  text-transform: none;
  padding: 0 28px;
  height: 48px;
  box-shadow: 0 8px 24px rgba(241, 24, 76, 0.35);
}

.settings-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px !important;
  overflow: hidden;
  transition: all 0.3s ease;
}

.settings-card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.card-header {
  background: white;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  position: relative;
}

.card-header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  border-radius: 0 4px 4px 0;
}

.header-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f1184c;
  border: 1px solid rgba(241, 24, 76, 0.1);
}

.header-icon-wrapper.contact {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.header-icon-wrapper.address {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.1);
}

.header-icon-wrapper.branding {
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.1);
}

.header-icon-wrapper.plan {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.1);
}

.header-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.3px;
}

.header-subtitle {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0;
}

.logo-container {
  position: relative;
  display: inline-block;
}

.logo-avatar {
  border: 4px solid #e2e8f0;
  transition: all 0.3s ease;
}

.logo-overlay {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(241, 24, 76, 0.35);
  transition: all 0.2s ease;
}

.logo-overlay:hover {
  transform: scale(1.1);
}

.plan-chip {
  font-weight: 700;
  font-size: 18px;
  padding: 0 28px;
  height: 44px;
}

.upgrade-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  font-weight: 600;
  box-shadow: 0 6px 20px rgba(241, 24, 76, 0.3);
}
</style>
