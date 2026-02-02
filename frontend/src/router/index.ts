import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false, layout: 'auth' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { requiresAuth: false, layout: 'auth' },
  },
  {
    path: '/auth/setup-password',
    name: 'SetupPassword',
    component: () => import('@/views/auth/SetupPasswordView.vue'),
    meta: { requiresAuth: false, layout: 'auth' },
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('@/views/auth/AuthCallbackView.vue'),
    meta: { requiresAuth: false, layout: 'auth' },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { requiresAuth: false, layout: 'auth' },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: { requiresAuth: false, layout: 'auth' },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/dashboard/DashboardView.vue'),
    meta: { requiresAuth: true },
  },

  {
    path: '/teams',
    name: 'Teams',
    component: () => import('@/views/teams/TeamsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('@/views/users/UsersView.vue'),
    meta: { requiresAuth: true },
  },
    {
      path: '/boards',
      name: 'Boards',
      component: () => import('@/views/boards/BoardsView.vue'),
      meta: { requiresAuth: true },
    },

    {
      path: '/sprints',
      name: 'Sprints',
      component: () => import('@/views/sprints/SprintsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/tasks',
    name: 'Tasks',
    component: () => import('@/views/tasks/TasksView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks/:taskId',
    name: 'TaskDetail',
    component: () => import('@/views/tasks/TaskDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/statuses',
    name: 'Statuses',
    component: () => import('@/views/statuses/StatusesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/departments',
    name: 'Departments',
    component: () => import('@/views/departments/DepartmentsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/meetings',
    name: 'Meetings',
    component: () => import('@/views/meetings/MeetingsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('@/views/calendar/CalendarView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/timesheets',
    name: 'Timesheets',
    component: () => import('@/views/timesheets/TimesheetsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/chat/ChatView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('@/views/reports/ReportsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/settings/SettingsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/profile/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/positions',
    name: 'Positions',
    component: () => import('@/views/positions/PositionsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/roles',
    name: 'Roles',
    component: () => import('@/views/roles/RolesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/organizations',
    name: 'Organizations',
    component: () => import('@/views/organizations/OrganizationsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/organization',
    name: 'Organization',
    component: () => import('@/views/settings/OrganizationSettingsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/billing-history',
    name: 'BillingHistory',
    component: () => import('@/views/billing/BillingHistoryView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/subscription',
    name: 'Subscription',
    component: () => import('@/views/subscription/SubscriptionView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard - async to properly validate authentication
router.beforeEach(async (to, _from, next) => {
  // EARLY RETURN: Always allow access to auth paths (login, register, setup-password, etc.)
  // This check runs FIRST before any token or meta checks
  if (to.path.startsWith('/auth/') || to.path === '/login' || to.path === '/register' || to.path === '/forgot-password' || to.path === '/reset-password') {
    next()
    return
  }
  
  const token = localStorage.getItem('token')
  
  // For all other routes, check authentication
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth) {
    if (!token) {
      // No token at all - redirect to login
      next({ name: 'Login' })
      return
    }
    
    // Token exists - validate it by initializing auth store
    const authStore = useAuthStore()
    
    // Try to validate token by fetching user profile if not already initialized
    if (!authStore.initialized) {
      try {
        await authStore.initAuth()
      } catch (error) {
        // Auth initialization failed - token likely invalid/expired
        console.warn('Auth initialization failed:', error)
      }
    }
    
    // After init, check if we have a valid token (initAuth clears token on 401)
    if (!authStore.token) {
      // Token was cleared during validation (expired/invalid)
      next({ name: 'Login' })
      return
    }
    
    next()
  } else {
    next()
  }
})

export default router
