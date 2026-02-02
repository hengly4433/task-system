<script setup lang="ts">
import { computed } from 'vue'
import { useTenantStore } from '@/stores/tenant.store'

const tenantStore = useTenantStore()

const currentTenant = computed(() => tenantStore.currentTenant)
const availableTenants = computed(() => tenantStore.availableTenants)
const hasMultipleTenants = computed(() => availableTenants.value.length > 1)

function handleSwitch(tenantId: string) {
  if (tenantId !== currentTenant.value?.tenantId) {
    tenantStore.switchTenant(tenantId)
  }
}
</script>

<template>
  <div class="tenant-switcher" v-if="currentTenant">
    <v-menu location="bottom" :disabled="!hasMultipleTenants">
      <template #activator="{ props }">
        <div 
          v-bind="props" 
          class="tenant-button" 
          :class="{ 'has-multiple': hasMultipleTenants }"
        >
          <div class="tenant-avatar-wrapper">
            <v-avatar size="40" class="tenant-avatar">
              <v-img v-if="currentTenant.logoUrl" :src="currentTenant.logoUrl" cover />
              <span v-else class="avatar-letter">{{ currentTenant.name.charAt(0) }}</span>
            </v-avatar>
          </div>
          <div class="tenant-info">
            <div class="tenant-name">{{ currentTenant.name }}</div>
            <div class="tenant-role-badge">
              <span class="role-dot"></span>
              {{ currentTenant.role }}
            </div>
          </div>
          <v-icon v-if="hasMultipleTenants" icon="mdi-unfold-more-horizontal" size="18" class="chevron" />
        </div>
      </template>

      <v-list density="compact" class="tenant-list">
        <v-list-subheader class="text-uppercase list-header">Switch Organization</v-list-subheader>
        <v-list-item
          v-for="tenant in availableTenants"
          :key="tenant.tenantId"
          :active="tenant.tenantId === currentTenant?.tenantId"
          @click="handleSwitch(tenant.tenantId)"
          class="tenant-list-item"
        >
          <template #prepend>
            <v-avatar size="32" class="mr-3 list-avatar">
              <v-img v-if="tenant.logoUrl" :src="tenant.logoUrl" cover />
              <span v-else class="avatar-letter-sm">{{ tenant.name.charAt(0) }}</span>
            </v-avatar>
          </template>
          <v-list-item-title class="list-item-title">{{ tenant.name }}</v-list-item-title>
          <v-list-item-subtitle class="list-item-subtitle">{{ tenant.role }}</v-list-item-subtitle>
          <template #append>
            <v-icon v-if="tenant.tenantId === currentTenant?.tenantId" icon="mdi-check-circle" size="20" color="primary" />
          </template>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<style scoped>
.tenant-switcher {
  padding: 8px 12px 16px 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.tenant-button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.tenant-button.has-multiple {
  cursor: pointer;
}

.tenant-button.has-multiple:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.tenant-avatar-wrapper {
  flex-shrink: 0;
}

.tenant-avatar {
  background: white;
  border: 2px solid #e2e8f0;
}

.avatar-letter {
  font-size: 16px;
  font-weight: 700;
  color: #f1184c;
  text-transform: uppercase;
}

.avatar-letter-sm {
  font-size: 13px;
  font-weight: 600;
  color: #f1184c;
  text-transform: uppercase;
}

.list-avatar {
  background: white;
  border: 2px solid #e2e8f0;
}

.tenant-info {
  flex: 1;
  min-width: 0;
}

.tenant-name {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.tenant-role-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  font-size: 9px;
  font-weight: 700;
  color: #f1184c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
}

.chevron {
  color: #94a3b8;
  flex-shrink: 0;
}

.tenant-list {
  min-width: 260px;
  padding: 8px;
  border-radius: 16px !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12) !important;
}

.list-header {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #94a3b8;
  padding-bottom: 8px;
}

.tenant-list-item {
  border-radius: 10px !important;
  margin: 2px 0;
}

.list-item-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.list-item-subtitle {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
</style>
