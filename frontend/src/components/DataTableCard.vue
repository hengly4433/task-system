<script setup lang="ts">
import { ref, computed } from "vue";

// Props
const props = defineProps<{
  title: string;
  icon: string;
  headers: any[];
  items: any[];
  loading?: boolean;
  itemValue?: string;
  height?: string | number;
  itemsPerPageOptions?: number[];
}>();

// Emit events
const emit = defineEmits<{
  (e: "click:row", item: any): void;
}>();

// Pagination state
const page = ref(1);
const itemsPerPage = ref(10);

// Computed
const totalItems = computed(() => props.items?.length || 0);

// Get row number based on pagination
const getRowNumber = (index: number) => {
  return (page.value - 1) * itemsPerPage.value + index + 1;
};

// Row click handler
const handleRowClick = (_event: Event, { item }: { item: any }) => {
  emit("click:row", item);
};

// Expose for parent access if needed
defineExpose({
  page,
  itemsPerPage,
  getRowNumber,
});
</script>

<template>
  <v-card class="rounded-xl data-table-card" elevation="0">
    <!-- Table Header Bar -->
    <div class="table-header-bar">
      <div class="table-header-left">
        <div class="table-header-icon">
          <v-icon :icon="icon" size="16" color="white" />
        </div>
        <span class="table-header-title">{{ title }}</span>
        <span class="table-header-count">{{ totalItems }} items</span>
      </div>
      <slot name="header-actions"></slot>
    </div>

    <!-- Data Table -->
    <v-data-table
      v-model:page="page"
      v-model:items-per-page="itemsPerPage"
      :headers="headers"
      :items="items"
      :loading="loading"
      :item-value="itemValue || 'id'"
      :items-per-page-options="itemsPerPageOptions || [10, 25, 50, 100]"
      class="data-table"
      fixed-header
      :height="height || 400"
      hover
      @click:row="handleRowClick"
    >
      <!-- Pass through index slot with row number -->
      <template #item.index="{ index }">
        <span class="font-weight-medium text-grey-darken-2">{{ getRowNumber(index) }}</span>
      </template>

      <!-- Explicit slot pass-throughs for common columns -->
      <template v-if="$slots['item.name']" #item.name="slotProps">
        <slot name="item.name" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.status']" #item.status="slotProps">
        <slot name="item.status" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.startDate']" #item.startDate="slotProps">
        <slot name="item.startDate" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.endDate']" #item.endDate="slotProps">
        <slot name="item.endDate" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.actions']" #item.actions="slotProps">
        <slot name="item.actions" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.roleName']" #item.roleName="slotProps">
        <slot name="item.roleName" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.description']" #item.description="slotProps">
        <slot name="item.description" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.color']" #item.color="slotProps">
        <slot name="item.color" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.createdAt']" #item.createdAt="slotProps">
        <slot name="item.createdAt" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.positionName']" #item.positionName="slotProps">
        <slot name="item.positionName" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.teamName']" #item.teamName="slotProps">
        <slot name="item.teamName" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.user']" #item.user="slotProps">
        <slot name="item.user" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.email']" #item.email="slotProps">
        <slot name="item.email" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.role']" #item.role="slotProps">
        <slot name="item.role" v-bind="slotProps"></slot>
      </template>

      <template v-if="$slots['item.position']" #item.position="slotProps">
        <slot name="item.position" v-bind="slotProps"></slot>
      </template>

      <!-- No data state -->
      <template #no-data>
        <slot name="no-data">
          <div class="text-center py-10">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">{{ icon }}</v-icon>
            <p class="text-h6 text-grey-darken-1 mb-2">No data found</p>
            <p class="text-body-2 text-grey">No items to display</p>
          </div>
        </slot>
      </template>

      <!-- Loading state -->
      <template #loading>
        <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
      </template>
    </v-data-table>
  </v-card>
</template>

<style scoped>
.data-table-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.table-header-bar {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
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

.data-table {
  background: transparent;
}

.data-table :deep(thead) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.data-table :deep(th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.75rem !important;
  letter-spacing: 0.05em;
  color: #64748b !important;
  border-bottom: 2px solid #e2e8f0 !important;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

.data-table :deep(td) {
  border-bottom: 1px solid #f1f5f9 !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.data-table :deep(tr:hover) {
  background: rgba(var(--v-theme-primary), 0.04) !important;
}

.data-table :deep(.v-data-table-footer) {
  border-top: 1px solid #e2e8f0;
  background: #fafbfc;
}
</style>
