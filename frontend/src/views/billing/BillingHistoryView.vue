<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { subscriptionService, type BillingHistoryItem } from '@/services/subscription.service'
import { useTenantStore } from '@/stores/tenant.store'
import { useSnackbar } from '@/composables/useSnackbar'
import { useRouter } from 'vue-router'

const router = useRouter()
const tenantStore = useTenantStore()
const snackbar = useSnackbar()

const loading = ref(true)
const billingHistory = ref<BillingHistoryItem[]>([])

// Pagination
const page = ref(1)
const itemsPerPage = ref(10)

const planColors: Record<string, string> = {
  FREE: '#64748b',
  STARTER: '#0891b2',
  PRO: '#f1184c',
  ENTERPRISE: '#7c3aed',
}

const headers = [
  { title: 'No', key: 'index', sortable: false, width: '70px' },
  { title: 'Date', key: 'createdAt', sortable: true },
  { title: 'Plan', key: 'plan', sortable: true },
  { title: 'Amount', key: 'amount', sortable: true },
  { title: 'Provider', key: 'paymentProvider', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
]

// Get row number based on pagination
const getRowNumber = (index: number) => {
  return (page.value - 1) * itemsPerPage.value + index + 1
}

// Format currency
const formatCurrency = (cents: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString()
}

onMounted(async () => {
  // Wait for tenant store to be initialized if not already
  if (!tenantStore.initialized) {
    await tenantStore.fetchUserTenants()
  }

  // Check if user is owner (after tenant data is loaded)
  if (!tenantStore.isOwner) {
    snackbar.error('Only tenant owners can access billing history')
    router.push('/')
    return
  }

  try {
    billingHistory.value = await subscriptionService.getBillingHistory()
  } catch (err: any) {
    snackbar.error(err.response?.data?.message || 'Failed to load billing history')
    router.push('/')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="billing-history-view">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-history" size="28" />
          </div>
          <div>
            <h1 class="page-title">Billing History</h1>
            <p class="page-subtitle">View your payment and invoice history</p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-credit-card-outline"
          rounded="lg"
          to="/subscription"
        >
          Manage Subscription
        </v-btn>
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
      v-if="!loading && billingHistory.length === 0"
      class="pa-10 text-center rounded-xl"
      elevation="0"
      style="border: 1px solid rgba(0, 0, 0, 0.08)"
    >
      <v-icon
        size="64"
        color="grey-lighten-1"
        class="mb-4"
      >mdi-receipt-text-outline</v-icon>
      <h3 class="text-h6 text-grey-darken-1 mb-2">No Billing History</h3>
      <p class="text-body-2 text-grey mb-4">You haven't made any payments yet</p>
      <v-btn color="primary" prepend-icon="mdi-credit-card-outline" to="/subscription">
        View Subscription Plans
      </v-btn>
    </v-card>

    <!-- List View (Table) -->
    <v-card v-else-if="!loading" class="rounded-xl table-card" elevation="0">
      <!-- Table Header Bar -->
      <div class="table-header-bar">
        <div class="table-header-left">
          <div class="table-header-icon">
            <v-icon icon="mdi-history" size="16" color="white" />
          </div>
          <span class="table-header-title">Payment History</span>
          <span class="table-header-count">{{ billingHistory.length }} payments</span>
        </div>
      </div>
      <v-data-table
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="billingHistory"
        :loading="loading"
        item-value="paymentId"
        class="billing-table"
        fixed-header
        height="400"
        hover
      >
        <template #item.index="{ index }">
          <span class="font-weight-medium text-grey-darken-2">{{ getRowNumber(index) }}</span>
        </template>

        <template #item.createdAt="{ item }">
          <div class="d-flex align-center text-body-2">
            <v-icon size="small" color="grey" class="mr-2">mdi-calendar</v-icon>
            {{ formatDate(item.createdAt) }}
          </div>
        </template>

        <template #item.plan="{ item }">
          <v-chip size="small" :color="planColors[item.plan]" variant="flat">
            {{ item.plan }}
          </v-chip>
        </template>

        <template #item.amount="{ item }">
          <span class="font-weight-bold">{{ formatCurrency(item.amount, item.currency) }}</span>
        </template>

        <template #item.paymentProvider="{ item }">
          <div class="d-flex align-center text-body-2">
            <v-icon size="small" color="grey" class="mr-2">mdi-credit-card-outline</v-icon>
            <span class="text-capitalize">{{ item.paymentProvider.replace('_', ' ') }}</span>
          </div>
        </template>

        <template #item.status="{ item }">
          <v-chip 
            size="small" 
            :color="item.status === 'succeeded' ? 'success' : 'warning'"
            variant="tonal"
          >
            {{ item.status }}
          </v-chip>
        </template>

        <template #no-data>
          <div class="text-center py-10">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-receipt-text-outline</v-icon>
            <p class="text-h6 text-grey-darken-1 mb-2">No billing history</p>
            <p class="text-body-2 text-grey mb-4">Your payment history will appear here</p>
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<style scoped>
.billing-history-view {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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

.billing-table {
  background: transparent;
}

.billing-table :deep(thead) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.billing-table :deep(th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.75rem !important;
  letter-spacing: 0.05em;
  color: #64748b !important;
  border-bottom: 2px solid #e2e8f0 !important;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

.billing-table :deep(td) {
  border-bottom: 1px solid #f1f5f9 !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.billing-table :deep(tr:hover) {
  background: rgba(var(--v-theme-primary), 0.04) !important;
}

.billing-table :deep(.v-data-table-footer) {
  border-top: 1px solid #e2e8f0;
  background: #fafbfc;
}
</style>
