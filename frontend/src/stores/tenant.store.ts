import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

interface Tenant {
  tenantId: string
  name: string
  slug: string
  domain?: string | null
  logoUrl?: string | null
  primaryColor?: string
  status: string
  plan: string
  // Company Info
  description?: string | null
  industry?: string | null
  companySize?: string | null
  foundedYear?: number | null
  taxId?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  postalCode?: string | null
  // Membership
  role: string // User's role in this tenant: OWNER, ADMIN, MEMBER
}

export const useTenantStore = defineStore('tenant', () => {
  const currentTenant = ref<Tenant | null>(null)
  const availableTenants = ref<Tenant[]>([])
  const loading = ref(false)
  const initialized = ref(false)

  const tenantId = computed(() => currentTenant.value?.tenantId || null)
  const tenantName = computed(() => currentTenant.value?.name || '')
  const isOwner = computed(() => currentTenant.value?.role === 'OWNER')
  const isAdmin = computed(() => 
    currentTenant.value?.role === 'OWNER' || currentTenant.value?.role === 'ADMIN'
  )

  async function fetchUserTenants() {
    if (initialized.value) return
    loading.value = true
    try {
      const response = await api.get('/tenants/my-tenants')
      availableTenants.value = response.data
      
      // Set default tenant (user's default or first available)
      const defaultTenant = availableTenants.value.find(t => t.role === 'OWNER') 
        || availableTenants.value[0]
      
      if (defaultTenant && !currentTenant.value) {
        setCurrentTenant(defaultTenant)
      }
      
      initialized.value = true
    } catch (err) {
      console.warn('Failed to fetch user tenants', err)
    } finally {
      loading.value = false
    }
  }

  function setCurrentTenant(tenant: Tenant) {
    currentTenant.value = tenant
    localStorage.setItem('tenantId', tenant.tenantId)
  }

  async function switchTenant(tenantId: string) {
    const tenant = availableTenants.value.find(t => t.tenantId === tenantId)
    if (tenant) {
      setCurrentTenant(tenant)
      // Reload current page to refresh data with new tenant context
      window.location.reload()
    }
  }

  function clear() {
    currentTenant.value = null
    availableTenants.value = []
    initialized.value = false
    localStorage.removeItem('tenantId')
  }

  // Initialize from localStorage if available
  function initFromStorage() {
    const storedTenantId = localStorage.getItem('tenantId')
    if (storedTenantId && !currentTenant.value) {
      // Will be properly set after fetchUserTenants is called
      return storedTenantId
    }
    return null
  }

  return {
    currentTenant,
    availableTenants,
    loading,
    initialized,
    tenantId,
    tenantName,
    isOwner,
    isAdmin,
    fetchUserTenants,
    setCurrentTenant,
    switchTenant,
    clear,
    initFromStorage,
  }
})
