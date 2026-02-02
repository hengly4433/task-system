import api from './api'

export interface Tenant {
  tenantId: string
  name: string
  slug: string
  domain?: string | null
  logoUrl?: string | null
  primaryColor?: string
  status: string
  plan: string
  maxUsers: number
  maxProjects: number
  createdAt: string
  _count?: {
    members: number
    projects: number
  }
}

export interface TenantMember {
  userId: string
  username: string
  email: string
  fullName?: string | null
  role: string
  status: string
  joinedAt: string
  profileImageUrl?: string | null
}

export interface CreateTenantDto {
  name: string
  slug: string
  domain?: string
  plan?: string
}

export interface UpdateTenantDto {
  name?: string
  slug?: string
  domain?: string
  logoUrl?: string
  primaryColor?: string
  status?: string
  plan?: string
  // Company Info
  description?: string
  industry?: string
  companySize?: string
  foundedYear?: number
  taxId?: string
  phone?: string
  email?: string
  website?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}

export interface AddTenantMemberDto {
  userId: string
  role?: string
}

export const tenantService = {
  // Get current user's tenants
  async getMyTenants(): Promise<Tenant[]> {
    const response = await api.get('/tenants/my-tenants')
    return response.data
  },

  // Get all tenants (super admin only)
  async getAllTenants(): Promise<Tenant[]> {
    const response = await api.get('/tenants')
    return response.data
  },

  // Get tenant by ID
  async getTenantById(tenantId: string): Promise<Tenant> {
    const response = await api.get(`/tenants/${tenantId}`)
    return response.data
  },

  // Create a new tenant (super admin only)
  async createTenant(data: CreateTenantDto): Promise<Tenant> {
    const response = await api.post('/tenants', data)
    return response.data
  },

  // Update tenant
  async updateTenant(tenantId: string, data: UpdateTenantDto): Promise<Tenant> {
    const response = await api.patch(`/tenants/${tenantId}`, data)
    return response.data
  },

  // Get tenant members
  async getTenantMembers(tenantId: string): Promise<TenantMember[]> {
    const response = await api.get(`/tenants/${tenantId}/members`)
    return response.data
  },

  // Add member to tenant
  async addTenantMember(tenantId: string, data: AddTenantMemberDto): Promise<TenantMember> {
    const response = await api.post(`/tenants/${tenantId}/members`, data)
    return response.data
  },

  // Remove member from tenant
  async removeTenantMember(tenantId: string, userId: string): Promise<void> {
    await api.delete(`/tenants/${tenantId}/members/${userId}`)
  },

  // Update member role
  async updateMemberRole(tenantId: string, userId: string, role: string): Promise<TenantMember> {
    const response = await api.patch(`/tenants/${tenantId}/members/${userId}`, { role })
    return response.data
  },

  // Set user's default tenant
  async setDefaultTenant(tenantId: string): Promise<void> {
    await api.post(`/tenants/${tenantId}/set-default`)
  },

  // Upload tenant logo
  async uploadTenantLogo(tenantId: string, file: File): Promise<{ logoUrl: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/tenants/${tenantId}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

export default tenantService
