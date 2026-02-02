import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token and tenant ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add tenant ID header for multi-tenancy
    const tenantId = localStorage.getItem('tenantId')
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login on 401 if NOT on auth pages and NOT during login/register
    const isAuthEndpoint = error.config?.url?.includes('/auth/')
    const isAuthPage = window.location.pathname.startsWith('/auth/') || 
                       window.location.pathname === '/login' || 
                       window.location.pathname === '/register'
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Check if we're not already on an auth page to prevent redirect loop
      if (!isAuthPage) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
