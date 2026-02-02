import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { useTenantStore } from './tenant.store'

interface User {
  userId: string
  username: string
  email: string
  fullName: string | null
  position: string | null
  profileImageUrl?: string | null
  roles?: string[]
  presenceStatus?: string | null
  lastSeenAt?: string | null
  primaryDepartmentId?: string | null
  primaryDepartmentName?: string | null
}

interface LoginCredentials {
  usernameOrEmail: string
  password: string
  rememberMe?: boolean
}

interface RegisterData {
  username: string
  email: string
  password: string
  fullName?: string
  organizationName?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => {
    const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'Admin', 'Super Admin', 'admin', 'super admin']
    return user.value?.roles?.some(role => adminRoles.includes(role)) || false
  })

  // Initialize auth state on app startup
  async function initAuth() {
    if (initialized.value) return
    initialized.value = true
    
    if (token.value && !user.value) {
      await fetchProfile()
      // Fetch user's tenants after auth init
      const tenantStore = useTenantStore()
      await tenantStore.fetchUserTenants()
    }
  }

  async function login(credentials: LoginCredentials) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/auth/login', credentials)
      const data = response.data
      
      // Store the token
      token.value = data.accessToken
      localStorage.setItem('token', data.accessToken)
      
      // Backend returns user data in flat structure
      user.value = {
        userId: data.userId,
        username: data.username,
        email: data.email,
        fullName: data.fullName || null,
        position: data.position || null,
        profileImageUrl: data.profileImageUrl || null,
        roles: data.roles || [],
        presenceStatus: data.presenceStatus || 'active',
        lastSeenAt: data.lastSeenAt || null,
      }
      
      // Fetch user's tenants after successful login
      const tenantStore = useTenantStore()
      await tenantStore.fetchUserTenants()
      
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(data: RegisterData) {
    loading.value = true
    error.value = null
    try {
      await api.post('/auth/register', data)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function forgotPassword(email: string) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/auth/forgot-password', { email })
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to send reset email'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function resetPassword(token: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/auth/reset-password', { token, password })
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to reset password'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    if (!token.value) return
    try {
      const response = await api.get('/auth/profile')
      const data = response.data
      
      // Ensure user data is properly structured with roles
      user.value = {
        userId: data.userId,
        username: data.username,
        email: data.email,
        fullName: data.fullName || null,
        position: data.position || null,
        profileImageUrl: data.profileImageUrl || null,
        roles: data.roles || [],
        primaryDepartmentId: data.primaryDepartmentId || null,
        primaryDepartmentName: data.primaryDepartmentName || null,
      }
    } catch (err) {
      console.warn('Failed to fetch profile', err)
      // If profile fetch fails (e.g., token expired), logout
      if ((err as any)?.response?.status === 401) {
        logout()
      }
    }
  }

  function logout() {
    user.value = null
    token.value = null
    initialized.value = false
    localStorage.removeItem('token')
    // Clear tenant state on logout
    const tenantStore = useTenantStore()
    tenantStore.clear()
  }

  return {
    user,
    token,
    loading,
    error,
    initialized,
    isAuthenticated,
    isAdmin,
    initAuth,
    login,
    register,
    forgotPassword,
    resetPassword,
    fetchProfile,
    logout,
  }
})
