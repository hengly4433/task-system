<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  subscriptionService,
  type SubscriptionInfo,
  type UsageAlert,
  type BillingHistoryItem,
  type GracePeriodStatus,
  type DowngradeImpact,
} from "@/services/subscription.service";
import { paymentService, type BillingType } from "@/services/payment.service";
import { useTenantStore } from "@/stores/tenant.store";
import { useSnackbar } from "@/composables/useSnackbar";
import { useRouter, useRoute } from "vue-router";
import { isCambodia } from "@/data/countries";

const router = useRouter();
const route = useRoute();
const tenantStore = useTenantStore();
const snackbar = useSnackbar();

const loading = ref(true);
const stripeLoading = ref(false);
const paypalLoading = ref(false);
const abaPayWayLoading = ref(false);
const subscription = ref<SubscriptionInfo | null>(null);

// Check if tenant is from Cambodia (for ABA PayWay)
const isCambodianTenant = computed(() => {
  return isCambodia(tenantStore.currentTenant?.country);
});

// Payment dialog state
const showPaymentDialog = ref(false);
const selectedPlan = ref("");
const billingType = ref<BillingType>("monthly");

// ABA PayWay QR code dialog state
const showAbaQrDialog = ref(false);
const abaQrImage = ref("");
const abaTransactionId = ref("");
const abaAmount = ref("");
const abaCurrency = ref("");

// Usage alerts and billing history
const usageAlerts = ref<UsageAlert[]>([]);
const billingHistory = ref<BillingHistoryItem[]>([]);
const activeTab = ref("overview");
const trialLoading = ref(false);

// Grace period state
const gracePeriodStatus = ref<GracePeriodStatus | null>(null);

// Downgrade dialog state
const showDowngradeDialog = ref(false);
const downgradeTarget = ref("");
const downgradeImpact = ref<DowngradeImpact | null>(null);
const downgradeLoading = ref(false);

// Plan limits - should match the plan features defined in planFeatures
const FREE_LIMITS = {
  maxUsers: 5,
  maxProjects: 3,
  maxTasks: 100,
  maxStorage: 524288000,
}; // 500 MB

const planLimits: Record<
  string,
  {
    maxUsers: number;
    maxProjects: number;
    maxTasks: number;
    maxStorage: number;
  }
> = {
  FREE: FREE_LIMITS,
  STARTER: {
    maxUsers: 15,
    maxProjects: 20,
    maxTasks: 1000,
    maxStorage: 5368709120,
  }, // 5 GB
  PRO: {
    maxUsers: 50,
    maxProjects: 100,
    maxTasks: 10000,
    maxStorage: 26843545600,
  }, // 25 GB
  ENTERPRISE: {
    maxUsers: 99999,
    maxProjects: 99999,
    maxTasks: 99999,
    maxStorage: 107374182400,
  }, // 100 GB
};

// Helper function to get limits for a plan (always returns valid limits)
const getLimitsForPlan = (
  plan: string,
): {
  maxUsers: number;
  maxProjects: number;
  maxTasks: number;
  maxStorage: number;
} => {
  return planLimits[plan] ?? FREE_LIMITS;
};

const userUsagePercentage = computed(() => {
  if (!subscription.value) return 0;
  const limits = getLimitsForPlan(subscription.value.plan || "FREE");
  return Math.round((subscription.value.usage.users / limits.maxUsers) * 100);
});

const projectUsagePercentage = computed(() => {
  if (!subscription.value) return 0;
  const limits = getLimitsForPlan(subscription.value.plan || "FREE");
  return Math.round(
    (subscription.value.usage.projects / limits.maxProjects) * 100,
  );
});

const storageUsagePercentage = computed(() => {
  if (!subscription.value) return 0;
  const usedStorage = Number(subscription.value.usage.storage);
  const limits = getLimitsForPlan(subscription.value.plan || "FREE");
  const maxStorage = limits.maxStorage;
  if (maxStorage === 0) return 0;
  return Math.round((usedStorage / maxStorage) * 100);
});

const taskUsagePercentage = computed(() => {
  if (!subscription.value) return 0;
  const limits = getLimitsForPlan(subscription.value.plan || "FREE");
  return Math.round((subscription.value.usage.tasks / limits.maxTasks) * 100);
});

// Format bytes to human readable string (e.g., 500 MB, 1.5 GB)
const formatBytes = (bytes: number | string, decimals = 2): string => {
  const numBytes = typeof bytes === "string" ? Number(bytes) : bytes;
  if (numBytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  return parseFloat((numBytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const planColors: Record<string, string> = {
  FREE: "#64748b",
  STARTER: "#0891b2",
  PRO: "#f1184c",
  ENTERPRISE: "#7c3aed",
};

// Get limits based on plan (use plan-defined limits for consistency)
const currentPlanLimits = computed(() => {
  const plan = subscription.value?.plan || "FREE";
  return getLimitsForPlan(plan);
});

const planPricing = computed(() => {
  const bt = billingType.value;
  return {
    STARTER: bt === "yearly" ? "$10.99/mo" : "$12.99/mo",
    PRO:
      bt === "biannual"
        ? "$22.74/mo"
        : bt === "yearly"
          ? "$27.99/mo"
          : "$34.99/mo",
    ENTERPRISE: "Contact Sales",
  };
});

// Get savings percentage for a plan based on current billing type
const getSavingsForPlan = (plan: string): string | null => {
  const bt = billingType.value;
  if (bt === "monthly") return null;

  if (plan === "STARTER" && bt === "yearly") return "15%";
  if (plan === "PRO") {
    if (bt === "biannual") return "35%";
    if (bt === "yearly") return "20%";
  }
  return null;
};

const planColor = computed(
  () => planColors[subscription.value?.plan || "FREE"] || planColors.FREE,
);

const planFeatures: Record<string, { name: string; description: string }[]> = {
  FREE: [
    { name: "Basic task management", description: "Create and manage tasks" },
    { name: "5 team members", description: "Invite up to 5 users" },
    { name: "3 projects", description: "Create up to 3 projects" },
    { name: "100 tasks", description: "Up to 100 tasks total" },
    { name: "500 MB storage", description: "File attachments up to 10MB each" },
  ],
  STARTER: [
    { name: "Everything in Free", description: "All free features included" },
    { name: "15 team members", description: "Invite up to 15 users" },
    { name: "20 projects", description: "Create up to 20 projects" },
    { name: "1,000 tasks", description: "Up to 1,000 tasks total" },
    { name: "5 GB storage", description: "File attachments up to 25MB each" },
    { name: "Custom roles", description: "Create custom permission roles" },
    { name: "Time tracking", description: "Track time spent on tasks" },
  ],
  PRO: [
    {
      name: "Everything in Starter",
      description: "All starter features included",
    },
    { name: "50 team members", description: "Invite up to 50 users" },
    { name: "100 projects", description: "Create up to 100 projects" },
    { name: "10,000 tasks", description: "Up to 10,000 tasks total" },
    { name: "25 GB storage", description: "File attachments up to 50MB each" },
    { name: "Advanced reports", description: "Detailed analytics" },
    { name: "API access", description: "Build integrations" },
    { name: "Custom branding", description: "Your logo and colors" },
  ],
  ENTERPRISE: [
    { name: "Everything in Pro", description: "All pro features included" },
    { name: "Unlimited users", description: "No user limit" },
    { name: "Unlimited projects", description: "No project limit" },
    { name: "Unlimited tasks", description: "No task limit" },
    {
      name: "100 GB storage",
      description: "File attachments up to 100MB each",
    },
    { name: "Priority support", description: "24/7 dedicated support" },
    { name: "365-day audit logs", description: "Extended activity retention" },
  ],
};

// Handle URL query params for payment success/cancel
const handlePaymentCallback = async () => {
  const query = route.query;

  // Stripe success callback
  if (query.success === "true" && query.session_id) {
    try {
      stripeLoading.value = true;
      const result = await paymentService.verifyStripeSession(
        query.session_id as string,
      );
      if (result.success) {
        snackbar.success(`Successfully upgraded to ${result.plan}!`);
        // Reload subscription info
        subscription.value = await subscriptionService.getSubscriptionInfo();
      }
    } catch (err: any) {
      snackbar.error(err.response?.data?.message || "Failed to verify payment");
    } finally {
      stripeLoading.value = false;
      // Clean up URL
      router.replace({ path: "/subscription" });
    }
  }

  // PayPal success callback
  if (query.paypal_success === "true" && query.token) {
    try {
      paypalLoading.value = true;
      const result = await paymentService.capturePayPalOrder(
        query.token as string,
      );
      if (result.success) {
        snackbar.success(`Successfully upgraded to ${result.plan}!`);
        subscription.value = await subscriptionService.getSubscriptionInfo();
      }
    } catch (err: any) {
      snackbar.error(
        err.response?.data?.message || "Failed to complete PayPal payment",
      );
    } finally {
      paypalLoading.value = false;
      router.replace({ path: "/subscription" });
    }
  }

  // ABA PayWay success callback
  if (query.aba_success === "true" && query.tran_id && query.plan) {
    try {
      abaPayWayLoading.value = true;
      const result = await paymentService.verifyABAPayWayTransaction(
        query.tran_id as string,
        query.plan as string,
      );
      if (result.success) {
        snackbar.success(`Successfully upgraded to ${result.plan}!`);
        subscription.value = await subscriptionService.getSubscriptionInfo();
      }
    } catch (err: any) {
      snackbar.error(
        err.response?.data?.message || "Failed to complete ABA PayWay payment",
      );
    } finally {
      abaPayWayLoading.value = false;
      router.replace({ path: "/subscription" });
    }
  }

  // Cancelled callback
  if (query.cancelled === "true") {
    snackbar.info("Payment cancelled");
    router.replace({ path: "/subscription" });
  }
};

onMounted(async () => {
  // Wait for tenant store to be initialized if not already
  if (!tenantStore.initialized) {
    await tenantStore.fetchUserTenants();
  }

  // Check if user is owner (after tenant data is loaded)
  if (!tenantStore.isOwner) {
    snackbar.error("Only tenant owners can access subscription settings");
    router.push("/");
    return;
  }

  try {
    subscription.value = await subscriptionService.getSubscriptionInfo();
    usageAlerts.value = await subscriptionService.getUsageAlerts();
    billingHistory.value = await subscriptionService.getBillingHistory();
    gracePeriodStatus.value = await subscriptionService.getGracePeriodStatus();
    // Handle payment callbacks after loading subscription
    await handlePaymentCallback();
  } catch (err: any) {
    snackbar.error(
      err.response?.data?.message || "Failed to load subscription info",
    );
    router.push("/");
  } finally {
    loading.value = false;
  }
});

const handleUpgrade = (plan: string) => {
  selectedPlan.value = plan;
  showPaymentDialog.value = true;
};

// Start trial for a paid plan
const handleStartTrial = async (plan: string) => {
  try {
    trialLoading.value = true;
    const result = await subscriptionService.startTrial(plan);
    snackbar.success(`Started 7-day trial for ${result.plan}!`);
    subscription.value = await subscriptionService.getSubscriptionInfo();
    usageAlerts.value = await subscriptionService.getUsageAlerts();
  } catch (err: any) {
    snackbar.error(err.response?.data?.message || "Failed to start trial");
  } finally {
    trialLoading.value = false;
  }
};

// Preview downgrade impact
const handleDowngradePreview = async (plan: string) => {
  try {
    downgradeLoading.value = true;
    downgradeTarget.value = plan;
    downgradeImpact.value = await subscriptionService.getDowngradeImpact(plan);
    showDowngradeDialog.value = true;
  } catch (err: any) {
    snackbar.error(
      err.response?.data?.message || "Failed to check downgrade impact",
    );
  } finally {
    downgradeLoading.value = false;
  }
};

// Apply downgrade
const handleApplyDowngrade = async () => {
  try {
    downgradeLoading.value = true;
    const result = await subscriptionService.applyDowngrade(
      downgradeTarget.value,
    );
    if (result.success) {
      snackbar.success(result.message);
      subscription.value = await subscriptionService.getSubscriptionInfo();
      usageAlerts.value = await subscriptionService.getUsageAlerts();
      showDowngradeDialog.value = false;
    } else {
      snackbar.error(result.message);
    }
  } catch (err: any) {
    snackbar.error(err.response?.data?.message || "Failed to apply downgrade");
  } finally {
    downgradeLoading.value = false;
  }
};

// Format currency
const formatCurrency = (cents: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
};

// Get alert color
const getAlertColor = (level: string) => {
  switch (level) {
    case "warning":
      return "warning";
    case "critical":
      return "error";
    case "exceeded":
      return "error";
    default:
      return "info";
  }
};

// Get alert icon
const getAlertIcon = (level: string) => {
  switch (level) {
    case "warning":
      return "mdi-alert";
    case "critical":
      return "mdi-alert-circle";
    case "exceeded":
      return "mdi-close-circle";
    default:
      return "mdi-information";
  }
};

const handleStripePayment = async () => {
  try {
    stripeLoading.value = true;
    const result = await paymentService.createStripeCheckout(
      selectedPlan.value,
      billingType.value,
    );
    // Redirect to Stripe Checkout
    window.location.href = result.url;
  } catch (err: any) {
    snackbar.error(
      err.response?.data?.message || "Failed to create checkout session",
    );
    stripeLoading.value = false;
  }
};

const handlePayPalPayment = async () => {
  try {
    paypalLoading.value = true;
    const result = await paymentService.createPayPalOrder(
      selectedPlan.value,
      billingType.value,
    );
    // Redirect to PayPal
    window.location.href = result.approvalUrl;
  } catch (err: any) {
    snackbar.error(
      err.response?.data?.message || "Failed to create PayPal order",
    );
    paypalLoading.value = false;
  }
};

const handleABAPayWayPayment = async () => {
  try {
    abaPayWayLoading.value = true;
    const result = await paymentService.createABAPayWayOrder(
      selectedPlan.value,
      billingType.value,
    );

    // Show QR code dialog for user to scan with ABA mobile app
    abaQrImage.value = result.qrImage;
    abaTransactionId.value = result.transactionId;
    abaAmount.value = result.amount;
    abaCurrency.value = result.currency;
    showPaymentDialog.value = false;
    showAbaQrDialog.value = true;
    abaPayWayLoading.value = false;
  } catch (err: any) {
    snackbar.error(
      err.response?.data?.message || "Failed to create ABA PayWay order",
    );
    abaPayWayLoading.value = false;
  }
};
</script>

<template>
  <div class="subscription-page">
    <v-container
      v-if="loading"
      class="d-flex justify-center align-center"
      style="min-height: 400px"
    >
      <v-progress-circular indeterminate color="primary" />
    </v-container>

    <v-container v-else-if="subscription" class="py-6">
      <!-- Header -->
      <div class="page-header mb-6">
        <div class="header-left">
          <div class="title-section">
            <div class="title-icon">
              <v-icon icon="mdi-credit-card-outline" size="28" />
            </div>
            <div>
              <h1 class="page-title">Subscription & Billing</h1>
              <p class="page-subtitle">
                Manage your organization's subscription plan
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Grace Period Warning Banner -->
      <v-alert
        v-if="gracePeriodStatus?.isInGracePeriod"
        type="warning"
        variant="tonal"
        class="mb-6"
        prominent
        border="start"
      >
        <template v-slot:prepend>
          <v-icon icon="mdi-alert-clock" size="32" />
        </template>
        <div class="d-flex align-center justify-space-between">
          <div>
            <div class="text-h6 font-weight-bold">Subscription Expired</div>
            <div class="text-body-2">
              Your
              {{
                gracePeriodStatus.reason === "trial_expired"
                  ? "trial"
                  : "subscription"
              }}
              has expired. You are in a grace period with
              <strong>{{ gracePeriodStatus.daysRemaining }} day(s)</strong>
              remaining. During this time, you can view your data but cannot
              create or modify content.
            </div>
          </div>
          <v-btn
            color="warning"
            variant="elevated"
            class="ml-4"
            @click="handleUpgrade('PRO')"
          >
            Upgrade Now
          </v-btn>
        </div>
      </v-alert>

      <!-- Current Plan Card -->
      <v-card class="current-plan-card mb-6" rounded="xl" elevation="0">
        <div class="plan-header">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-overline text-white-50">Current Plan</div>
              <h2 class="text-h3 font-weight-bold text-white">
                {{ subscription.plan }}
              </h2>
            </div>
            <v-chip
              v-if="subscription.status === 'ACTIVE'"
              color="white"
              variant="flat"
              size="small"
            >
              <v-icon icon="mdi-check-circle" size="small" start />
              Active
            </v-chip>
            <v-chip
              v-else-if="subscription.status === 'TRIAL'"
              color="warning"
              variant="flat"
              size="small"
            >
              Trial
            </v-chip>
            <v-chip
              v-else-if="subscription.status === 'GRACE_PERIOD'"
              color="error"
              variant="flat"
              size="small"
            >
              <v-icon icon="mdi-alert" size="small" start />
              Grace Period
            </v-chip>
          </div>
          <div
            v-if="subscription.trialEndsAt"
            class="text-caption text-white-50 mt-2"
          >
            Trial ends:
            {{ new Date(subscription.trialEndsAt).toLocaleDateString() }}
          </div>
        </div>

        <v-card-text class="pa-6">
          <!-- Usage Stats -->
          <div class="usage-section">
            <h3 class="text-h6 font-weight-bold mb-4">Usage</h3>

            <div class="usage-item mb-4">
              <div class="d-flex justify-space-between align-center mb-2">
                <span class="text-body-2 font-weight-medium">Team Members</span>
                <span class="text-body-2">
                  <strong>{{ subscription.usage.users }}</strong> /
                  {{
                    currentPlanLimits.maxUsers >= 99999
                      ? "∞"
                      : currentPlanLimits.maxUsers
                  }}
                </span>
              </div>
              <v-progress-linear
                :model-value="userUsagePercentage"
                :color="userUsagePercentage > 80 ? 'error' : 'primary'"
                height="8"
                rounded
              />
            </div>

            <div class="usage-item mb-4">
              <div class="d-flex justify-space-between align-center mb-2">
                <span class="text-body-2 font-weight-medium">Projects</span>
                <span class="text-body-2">
                  <strong>{{ subscription.usage.projects }}</strong> /
                  {{
                    currentPlanLimits.maxProjects >= 99999
                      ? "∞"
                      : currentPlanLimits.maxProjects
                  }}
                </span>
              </div>
              <v-progress-linear
                :model-value="projectUsagePercentage"
                :color="projectUsagePercentage > 80 ? 'error' : 'primary'"
                height="8"
                rounded
              />
            </div>

            <div class="usage-item mb-4">
              <div class="d-flex justify-space-between align-center mb-2">
                <span class="text-body-2 font-weight-medium">Storage</span>
                <span class="text-body-2">
                  <strong>{{ formatBytes(subscription.usage.storage) }}</strong>
                  / {{ formatBytes(currentPlanLimits.maxStorage) }}
                </span>
              </div>
              <v-progress-linear
                :model-value="storageUsagePercentage"
                :color="storageUsagePercentage > 80 ? 'error' : 'primary'"
                height="8"
                rounded
              />
            </div>

            <div class="usage-item">
              <div class="d-flex justify-space-between align-center mb-2">
                <span class="text-body-2 font-weight-medium">Tasks</span>
                <span class="text-body-2">
                  <strong>{{ subscription.usage.tasks }}</strong> /
                  {{
                    currentPlanLimits.maxTasks >= 99999
                      ? "∞"
                      : currentPlanLimits.maxTasks
                  }}
                </span>
              </div>
              <v-progress-linear
                :model-value="
                  currentPlanLimits.maxTasks >= 99999 ? 0 : taskUsagePercentage
                "
                :color="taskUsagePercentage > 80 ? 'error' : 'primary'"
                height="8"
                rounded
              />
            </div>
          </div>

          <!-- Usage Alerts -->
          <div v-if="usageAlerts.length > 0" class="mt-6">
            <h3 class="text-h6 font-weight-bold mb-3">
              <v-icon icon="mdi-alert-circle" color="warning" class="mr-2" />
              Usage Alerts
            </h3>
            <v-alert
              v-for="alert in usageAlerts"
              :key="alert.type"
              :type="getAlertColor(alert.level)"
              variant="tonal"
              class="mb-2"
              density="compact"
            >
              <template v-slot:prepend>
                <v-icon :icon="getAlertIcon(alert.level)" />
              </template>
              <strong class="text-capitalize">{{ alert.type }}</strong
              >: {{ alert.current.toLocaleString() }} /
              {{ alert.limit.toLocaleString() }} ({{ alert.percentage }}%)
              <span v-if="alert.level === 'exceeded'" class="text-error">
                - Limit exceeded!</span
              >
              <span v-else-if="alert.level === 'critical'" class="text-warning">
                - Almost at limit</span
              >
            </v-alert>
          </div>

          <!-- Features -->
          <v-divider class="my-6" />

          <h3 class="text-h6 font-weight-bold mb-4">Features Included</h3>
          <div class="features-grid">
            <div
              v-for="feature in planFeatures[subscription.plan] ||
              planFeatures.FREE"
              :key="feature.name"
              class="feature-item"
            >
              <v-icon
                icon="mdi-check-circle"
                color="success"
                size="20"
                class="mr-2"
              />
              <div>
                <div class="text-body-2 font-weight-medium">
                  {{ feature.name }}
                </div>
                <div class="text-caption text-grey">
                  {{ feature.description }}
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Upgrade Options -->
      <div
        class="d-flex align-center justify-space-between mb-5 flex-wrap ga-3"
      >
        <h2 class="text-h5 font-weight-bold">Available Plans</h2>

        <!-- Billing Toggle -->
        <div class="billing-toggle d-flex align-center ga-3">
          <v-btn-toggle
            v-model="billingType"
            mandatory
            rounded="pill"
            color="primary"
            density="comfortable"
            class="billing-btn-toggle"
          >
            <v-btn value="monthly" class="px-5">Monthly</v-btn>
            <v-btn value="yearly" class="px-5">Yearly</v-btn>
            <v-btn value="biannual" class="px-5">2-Year</v-btn>
          </v-btn-toggle>
          <v-chip
            v-if="billingType === 'yearly'"
            color="success"
            size="small"
            variant="flat"
            class="font-weight-bold"
          >
            Save up to 20%
          </v-chip>
          <v-chip
            v-if="billingType === 'biannual'"
            color="success"
            size="small"
            variant="flat"
            class="font-weight-bold"
          >
            Pro: Save 35%
          </v-chip>
        </div>
      </div>

      <v-row>
        <v-col
          v-for="plan in ['FREE', 'STARTER', 'PRO']"
          :key="plan"
          cols="12"
          sm="6"
          lg="4"
        >
          <v-card
            class="plan-card h-100"
            rounded="xl"
            elevation="0"
            :class="{ 'current-badge': plan === subscription.plan }"
          >
            <v-card-text class="pa-5">
              <div class="d-flex align-center justify-space-between mb-3">
                <h3 class="text-h6 font-weight-bold">{{ plan }}</h3>
                <v-chip
                  v-if="plan === subscription.plan"
                  size="x-small"
                  color="primary"
                  variant="flat"
                >
                  Current
                </v-chip>
              </div>

              <!-- Pricing with savings badge -->
              <div class="d-flex align-center ga-2 mb-3">
                <span
                  class="text-h5 font-weight-bold"
                  :style="{ color: planColors[plan] }"
                >
                  {{
                    plan === "FREE"
                      ? "Free"
                      : planPricing[plan as keyof typeof planPricing]
                  }}
                </span>
                <v-chip
                  v-if="billingType !== 'monthly' && getSavingsForPlan(plan)"
                  color="success"
                  size="x-small"
                  variant="tonal"
                >
                  -{{ getSavingsForPlan(plan) }}
                </v-chip>
              </div>

              <ul class="features-list pl-0">
                <li
                  v-for="feature in (planFeatures[plan] || []).slice(0, 4)"
                  :key="feature.name"
                  class="d-flex align-center mb-2"
                >
                  <v-icon
                    icon="mdi-check"
                    color="success"
                    size="16"
                    class="mr-2"
                  />
                  <span class="text-body-2">{{ feature.name }}</span>
                </li>
              </ul>

              <!-- Action Buttons -->
              <div v-if="plan !== subscription.plan" class="mt-4">
                <!-- Start Trial Button (only for FREE plan users) -->
                <v-btn
                  v-if="
                    subscription.plan === 'FREE' &&
                    subscription.status !== 'TRIAL'
                  "
                  color="success"
                  variant="flat"
                  block
                  class="mb-2"
                  :loading="trialLoading"
                  @click="handleStartTrial(plan)"
                >
                  <v-icon icon="mdi-clock-outline" class="mr-1" />
                  Start 7-Day Free Trial
                </v-btn>

                <!-- Upgrade Button -->
                <v-btn
                  color="primary"
                  :variant="
                    subscription.plan === 'FREE' &&
                    subscription.status !== 'TRIAL'
                      ? 'outlined'
                      : 'flat'
                  "
                  block
                  @click="handleUpgrade(plan)"
                >
                  Upgrade to {{ plan }}
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Enterprise Plan Section -->
      <v-card class="enterprise-card mt-6" rounded="xl" elevation="0">
        <v-card-text class="pa-6">
          <v-row align="center">
            <v-col cols="12" md="5">
              <div class="d-flex align-center justify-space-between mb-3">
                <h3 class="text-h5 font-weight-bold">ENTERPRISE</h3>
                <v-chip
                  v-if="subscription.plan === 'ENTERPRISE'"
                  size="small"
                  color="purple"
                  variant="flat"
                >
                  Current
                </v-chip>
              </div>
              <p class="text-body-2 text-grey mb-4">For large organizations</p>
              <div class="text-h4 font-weight-bold mb-4" style="color: #7c3aed">
                Contact Sales
              </div>
              <v-btn
                v-if="subscription.plan !== 'ENTERPRISE'"
                color="purple"
                variant="flat"
                size="large"
                href="mailto:sales@taskmanagement.com"
                class="px-6"
              >
                <v-icon icon="mdi-email-outline" class="mr-2" />
                Contact Sales
              </v-btn>
            </v-col>
            <v-col cols="12" md="7">
              <ul class="enterprise-features-list pl-0">
                <li
                  v-for="feature in planFeatures['ENTERPRISE']"
                  :key="feature.name"
                  class="d-flex align-center mb-2"
                >
                  <v-icon
                    icon="mdi-check"
                    color="purple"
                    size="18"
                    class="mr-3"
                  />
                  <span class="text-body-2">{{ feature.name }}</span>
                </li>
              </ul>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- Payment Method Dialog -->
    <v-dialog v-model="showPaymentDialog" max-width="480" persistent>
      <v-card rounded="xl" class="payment-dialog">
        <div class="payment-dialog-header pa-5">
          <div class="d-flex align-center">
            <div class="header-icon mr-3">
              <v-icon icon="mdi-credit-card-outline" size="24" />
            </div>
            <div>
              <h2 class="text-h6 font-weight-bold text-white">
                Upgrade to {{ selectedPlan }}
              </h2>
              <p class="text-caption text-white-50 mb-0">
                Select your preferred payment method
              </p>
            </div>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            @click="showPaymentDialog = false"
            class="close-btn"
          >
            <v-icon icon="mdi-close" color="white" />
          </v-btn>
        </div>

        <v-card-text class="pa-5">
          <div class="plan-summary mb-5 pa-4 rounded-lg">
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="text-body-1 font-weight-bold">
                  {{ selectedPlan }} Plan
                </div>
                <div class="text-caption text-grey">
                  {{
                    billingType === "yearly"
                      ? "Annual subscription"
                      : "Monthly subscription"
                  }}
                </div>
              </div>
              <div class="text-h5 font-weight-bold" style="color: #f1184c">
                {{ planPricing[selectedPlan as keyof typeof planPricing] }}
              </div>
            </div>
          </div>

          <div class="text-caption text-grey mb-3">Choose payment method:</div>

          <v-btn
            color="#635BFF"
            variant="flat"
            block
            size="large"
            class="mb-3 payment-btn"
            :loading="stripeLoading"
            :disabled="stripeLoading || paypalLoading || abaPayWayLoading"
            @click="handleStripePayment"
          >
            <v-icon icon="mdi-credit-card" class="mr-2" />
            Pay with Card (Stripe)
          </v-btn>

          <v-btn
            color="#0070BA"
            variant="flat"
            block
            size="large"
            class="mb-3 payment-btn"
            :loading="paypalLoading"
            :disabled="stripeLoading || paypalLoading || abaPayWayLoading"
            @click="handlePayPalPayment"
          >
            <v-icon icon="mdi-credit-card-outline" class="mr-2" />
            Pay with PayPal
          </v-btn>

          <!-- ABA PayWay - Cambodia Only -->
          <v-btn
            v-if="isCambodianTenant"
            color="#005A9B"
            variant="flat"
            block
            size="large"
            class="payment-btn"
            :loading="abaPayWayLoading"
            :disabled="stripeLoading || paypalLoading || abaPayWayLoading"
            @click="handleABAPayWayPayment"
          >
            <v-icon icon="mdi-bank" class="mr-2" />
            Pay with ABA PayWay
          </v-btn>

          <div class="text-caption text-grey text-center mt-4">
            <v-icon icon="mdi-lock" size="12" class="mr-1" />
            Secure payment powered by Stripe, PayPal{{
              isCambodianTenant ? ", and ABA PayWay" : ""
            }}
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- ABA PayWay QR Code Dialog -->
    <v-dialog v-model="showAbaQrDialog" max-width="400" persistent>
      <v-card rounded="xl" class="payment-dialog">
        <div class="dialog-header pa-4">
          <div class="d-flex align-center">
            <v-icon
              icon="mdi-qrcode-scan"
              size="24"
              color="white"
              class="mr-3"
            />
            <div>
              <div class="text-h6 font-weight-bold text-white">Scan to Pay</div>
              <div class="text-caption text-white-50">
                Use ABA Mobile App to scan
              </div>
            </div>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            @click="showAbaQrDialog = false"
            class="close-btn"
          >
            <v-icon icon="mdi-close" color="white" />
          </v-btn>
        </div>

        <v-card-text class="pa-5 text-center">
          <div class="mb-4">
            <div class="text-h4 font-weight-bold" style="color: #005a9b">
              {{ abaCurrency }} {{ abaAmount }}
            </div>
            <div class="text-caption text-grey">{{ selectedPlan }} Plan</div>
          </div>

          <!-- QR Code Image -->
          <div class="qr-container mb-4">
            <img
              v-if="abaQrImage"
              :src="abaQrImage"
              alt="ABA PayWay QR Code"
              class="qr-image"
            />
            <v-progress-circular v-else indeterminate color="primary" />
          </div>

          <div class="text-body-2 text-grey mb-3">
            Open your <strong>ABA Mobile</strong> app and scan this QR code to
            complete the payment
          </div>

          <v-divider class="my-3" />

          <div class="text-caption text-grey">
            Transaction ID: {{ abaTransactionId }}
          </div>

          <v-btn
            color="grey"
            variant="text"
            block
            class="mt-4"
            @click="showAbaQrDialog = false"
          >
            Cancel
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Plan Downgrade Dialog -->
    <v-dialog v-model="showDowngradeDialog" max-width="520" persistent>
      <v-card rounded="xl" class="downgrade-dialog">
        <div class="downgrade-dialog-header pa-5">
          <div class="d-flex align-center">
            <v-icon
              icon="mdi-arrow-down-circle"
              size="28"
              color="white"
              class="mr-3"
            />
            <div>
              <h2 class="text-h6 font-weight-bold text-white">
                Downgrade to {{ downgradeTarget }}
              </h2>
              <p class="text-caption text-white-50 mb-0">
                Review the impact before confirming
              </p>
            </div>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            @click="showDowngradeDialog = false"
            class="close-btn"
          >
            <v-icon icon="mdi-close" color="white" />
          </v-btn>
        </div>

        <v-card-text class="pa-5">
          <v-progress-linear
            v-if="downgradeLoading && !downgradeImpact"
            indeterminate
            color="primary"
            class="mb-4"
          />

          <template v-if="downgradeImpact">
            <!-- Can Downgrade Status -->
            <v-alert
              :type="downgradeImpact.canDowngrade ? 'success' : 'error'"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              <template v-if="downgradeImpact.canDowngrade">
                <v-icon icon="mdi-check-circle" class="mr-1" />
                You can downgrade to {{ downgradeTarget }}
              </template>
              <template v-else>
                <v-icon icon="mdi-close-circle" class="mr-1" />
                Cannot downgrade - resolve issues below first
              </template>
            </v-alert>

            <!-- Issues -->
            <div v-if="downgradeImpact.issues.length > 0" class="mb-4">
              <div class="text-subtitle-2 font-weight-bold mb-2">
                <v-icon
                  icon="mdi-alert"
                  color="error"
                  size="small"
                  class="mr-1"
                />
                Limit Issues
              </div>
              <v-alert
                v-for="issue in downgradeImpact.issues"
                :key="issue.type"
                type="error"
                variant="tonal"
                density="compact"
                class="mb-2"
              >
                <div class="text-body-2">{{ issue.message }}</div>
              </v-alert>
            </div>

            <!-- Warnings -->
            <div v-if="downgradeImpact.warnings.length > 0" class="mb-4">
              <div class="text-subtitle-2 font-weight-bold mb-2">
                <v-icon
                  icon="mdi-information"
                  color="warning"
                  size="small"
                  class="mr-1"
                />
                Feature Changes
              </div>
              <v-alert
                v-for="(warning, index) in downgradeImpact.warnings"
                :key="index"
                type="warning"
                variant="tonal"
                density="compact"
                class="mb-2"
              >
                <div class="text-body-2">{{ warning }}</div>
              </v-alert>
            </div>

            <!-- No Issues -->
            <div
              v-if="
                downgradeImpact.issues.length === 0 &&
                downgradeImpact.warnings.length === 0
              "
              class="text-center py-4"
            >
              <v-icon
                icon="mdi-check-all"
                color="success"
                size="48"
                class="mb-2"
              />
              <div class="text-body-1">
                No issues found. You can safely downgrade.
              </div>
            </div>
          </template>

          <v-divider class="my-4" />

          <div class="d-flex gap-3">
            <v-btn
              variant="outlined"
              color="grey"
              block
              @click="showDowngradeDialog = false"
            >
              Cancel
            </v-btn>
            <v-btn
              v-if="downgradeImpact?.canDowngrade"
              color="error"
              variant="flat"
              block
              :loading="downgradeLoading"
              @click="handleApplyDowngrade"
            >
              Confirm Downgrade
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.subscription-page {
  min-height: 100%;
  padding: 4px;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.4);
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

.current-plan-card {
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.plan-header {
  padding: 24px;
  background: linear-gradient(135deg, #f1184c 0%, #e91e63 100%);
}

.text-white-50 {
  color: rgba(255, 255, 255, 0.7);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
}

.plan-card {
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.plan-card:hover {
  border-color: #f1184c;
  box-shadow: 0 4px 20px rgba(241, 24, 76, 0.1);
}

.plan-card.current-badge {
  border-color: #f1184c;
}

.features-list {
  list-style: none;
}

/* Billing Toggle */
.billing-toggle {
  background: #f8fafc;
  padding: 8px 16px;
  border-radius: 50px;
  border: 1px solid #e2e8f0;
}

.billing-btn-toggle {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  gap: 8px;
}

.billing-btn-toggle :deep(.v-btn) {
  text-transform: none;
  font-weight: 500;
  font-size: 0.875rem;
  letter-spacing: 0;
  min-width: 80px;
  border-radius: 50px !important;
}

.billing-btn-toggle :deep(.v-btn.v-btn--active) {
  background: #f1184c !important;
  color: white !important;
}

/* Enterprise Card */
.enterprise-card {
  border: 1px solid rgba(124, 58, 237, 0.3);
  background: linear-gradient(
    135deg,
    rgba(124, 58, 237, 0.05) 0%,
    #ffffff 100%
  );
}

.enterprise-card:hover {
  border-color: rgba(124, 58, 237, 0.5);
  box-shadow: 0 4px 20px rgba(124, 58, 237, 0.1);
}

.enterprise-features-list {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 16px;
}

@media (max-width: 600px) {
  .enterprise-features-list {
    grid-template-columns: 1fr;
  }
}

.cursor-pointer {
  cursor: pointer;
}

/* Payment Dialog */
.payment-dialog {
  overflow: hidden;
}

.payment-dialog-header {
  background: linear-gradient(135deg, #f1184c 0%, #e91e63 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.payment-dialog-header .header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.plan-summary {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.payment-btn {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0;
}

.qr-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
}

.qr-image {
  max-width: 200px;
  height: auto;
  border-radius: 8px;
}

/* Billing History */
.billing-history-card {
  border: 1px solid #e2e8f0;
}

.billing-history-card .v-table {
  background: transparent;
}

.billing-history-card th {
  font-weight: 600;
  color: #64748b;
  font-size: 12px;
  text-transform: uppercase;
}

.billing-history-card td {
  padding: 12px 16px;
}

/* Downgrade Dialog */
.downgrade-dialog {
  overflow: hidden;
}

.downgrade-dialog-header {
  background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
