<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store"; // Import chat store
import { socketService } from "@/services/socket.service";
import { chatSocketService } from "@/services/chat-socket.service";
import { type ChatMessage } from "@/services/chat.service";
import {
  notificationService,
  type Notification,
} from "@/services/notification.service";
import { useSnackbar } from "@/composables/useSnackbar";
import TenantSwitcher from "@/components/TenantSwitcher.vue";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore(); // Use chat store
const snackbar = useSnackbar();

import { useTenantStore } from "@/stores/tenant.store";
const tenantStore = useTenantStore();

const notifications = ref<Notification[]>([]);
const unreadCount = ref(0);
const notificationMenu = ref(false);

// Message notifications state
const messageMenu = ref(false);

// Initialize auth state on mount to ensure roles are loaded after page refresh
onMounted(async () => {
  await authStore.initAuth();

  // Connect socket if authenticated
  if (authStore.token) {
    socketService.connect(authStore.token);

    // Listen for notifications
    socketService.on("notification", (notification: Notification) => {
      notifications.value.unshift(notification);
      unreadCount.value++;
      snackbar.info(`New notification: ${notification.notificationText}`);
    });
  }

  // Load initial notifications
  try {
    const [notifsData, unreadData] = await Promise.all([
      notificationService.getAll({ page: 1, pageSize: 10 }),
      notificationService.getUnreadCount(),
    ]);
    notifications.value = notifsData.data;
    unreadCount.value = unreadData;
  } catch (error) {
    console.error("Failed to load notifications", error);
  }

  // Load chat unread count and connect chat socket
  try {
    await chatStore.refreshNotifications(); // Use store action
  } catch (error) {
    console.error("Failed to load chat data", error);
  }

  // Connect chat socket for real-time message notifications
  if (authStore.token) {
    chatSocketService.connect(authStore.token);
    chatSocketService.on("chat:message", handleChatMessage);
  }
});

onUnmounted(() => {
  socketService.disconnect();
  chatSocketService.off("chat:message", handleChatMessage);
  chatSocketService.disconnect();
});

// Handle incoming chat messages
const handleChatMessage = async (payload: {
  threadId: string;
  message: ChatMessage;
}) => {
  // Only show notification if message is from another user
  if (payload.message.sender.userId !== authStore.user?.userId) {
    // Show snackbar notification
    snackbar.info(
      `New message from ${payload.message.sender.fullName || payload.message.sender.username}`,
    );

    // Refresh the actual unread count from backend via store
    await chatStore.refreshNotifications();
  }
};

// Watch route changes to refresh unread count when navigating
watch(
  () => route.path,
  async (newPath, oldPath) => {
    // When entering the chat page, refresh after a delay to let messages be marked as read
    if (newPath === "/chat") {
      setTimeout(async () => {
        await chatStore.refreshNotifications();
      }, 1000);
    }
    // When leaving the chat page, refresh the unread count
    if (oldPath === "/chat" && newPath !== "/chat") {
      await chatStore.refreshNotifications();
    }
  },
);

// Watch message menu to refresh when opened
watch(messageMenu, async (isOpen) => {
  if (isOpen) {
    await chatStore.refreshNotifications();
  }
});

// Navigate to chat
const goToChat = (threadId?: string) => {
  messageMenu.value = false;
  if (threadId) {
    router.push(`/chat?threadId=${threadId}`);
  } else {
    router.push("/chat");
  }
};

// Get display name for thread
const getThreadDisplayName = (thread: any) => {
  // Changed ChatThread to any as it's not imported directly anymore
  if (thread.isGroup) return thread.title || "Group chat";
  const otherParticipant = thread.participants.find(
    (p: any) => p.user.userId !== authStore.user?.userId,
  );
  return (
    otherParticipant?.user.fullName || otherParticipant?.user.username || "Chat"
  );
};

// Get avatar for thread
// Get avatar for thread
const getThreadAvatar = (thread: any) => {
  const otherParticipant = thread.participants.find(
    (p: any) => p.user.userId !== authStore.user?.userId,
  );
  return otherParticipant?.user.profileImageUrl || "";
};

const handleNotificationClick = async (notification: Notification) => {
  if (!notification.isRead) {
    try {
      await notificationService.markAsRead(notification.notificationId);
      notification.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch (e) {
      // ignore
    }
  }

  // Navigate if related to task
  if (notification.entityType === "TASK" && notification.entityId) {
    router.push(`/tasks/${notification.entityId}`);
    notificationMenu.value = false;
  }
};

const markAllRead = async () => {
  try {
    await notificationService.markAllAsRead();
    notifications.value.forEach((n) => (n.isRead = true));
    unreadCount.value = 0;
  } catch (e) {
    snackbar.error("Failed to mark all as read");
  }
};

const userMenu = ref(false);
const searchQuery = ref("");

// Role check helpers
const userRoles = computed(() => authStore.user?.roles || []);

const isSuperAdminOrSystemAdmin = computed(() =>
  userRoles.value.some((role) =>
    ["SUPER_ADMIN", "SYSTEM_ADMIN", "Super Admin", "System Admin"].includes(
      role,
    ),
  ),
);

const isAdmin = computed(() =>
  userRoles.value.some((role) =>
    [
      "ADMIN",
      "Admin",
      "SUPER_ADMIN",
      "SYSTEM_ADMIN",
      "Super Admin",
      "System Admin",
    ].includes(role),
  ),
);

// Navigation items with role requirements
interface NavItem {
  title: string;
  icon: string;
  route: string;
  requiredRole?: "superAdmin" | "admin" | "owner";
}

const allNavigationItems: NavItem[] = [
  { title: "Dashboard", icon: "mdi-view-dashboard-outline", route: "/" },
  {
    title: "Users",
    icon: "mdi-account-outline",
    route: "/users",
    requiredRole: "owner",
  },
  {
    title: "Teams",
    icon: "mdi-account-multiple-outline",
    route: "/teams",
  },
  {
    title: "Positions",
    icon: "mdi-briefcase-account-outline",
    route: "/positions",
    requiredRole: "owner",
  },
  {
    title: "Roles",
    icon: "mdi-shield-account-outline",
    route: "/roles",
    requiredRole: "owner",
  },
  { title: "Projects", icon: "mdi-view-grid-outline", route: "/boards" },
  {
    title: "Sprints",
    icon: "mdi-run",
    route: "/sprints",
    requiredRole: "admin",
  },
  { title: "Tasks", icon: "mdi-checkbox-marked-outline", route: "/tasks" },
  {
    title: "Statuses",
    icon: "mdi-tag-multiple-outline",
    route: "/statuses",
    requiredRole: "admin",
  },
  {
    title: "Departments",
    icon: "mdi-domain",
    route: "/departments",
    requiredRole: "owner",
  },
  { title: "Meetings", icon: "mdi-account-group-outline", route: "/meetings" },
  { title: "Calendar", icon: "mdi-calendar-outline", route: "/calendar" },
  { title: "Timesheets", icon: "mdi-clock-outline", route: "/timesheets" },
  { title: "Chat", icon: "mdi-chat-outline", route: "/chat" },
  { title: "Reports", icon: "mdi-chart-bar", route: "/reports" },
  {
    title: "Organization",
    icon: "mdi-office-building-cog-outline",
    route: "/organization",
    requiredRole: "owner",
  },
  { title: "Settings", icon: "mdi-cog-outline", route: "/settings" },
  {
    title: "Organizations",
    icon: "mdi-domain",
    route: "/organizations",
    requiredRole: "superAdmin",
  },
  {
    title: "Billing History",
    icon: "mdi-history",
    route: "/billing-history",
    requiredRole: "owner",
  },
  {
    title: "Subscription",
    icon: "mdi-card-account-details-outline",
    route: "/subscription",
    requiredRole: "owner",
  },
];

// Filter navigation items based on user roles
const navigationItems = computed(() => {
  return allNavigationItems.filter((item) => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === "superAdmin")
      return isSuperAdminOrSystemAdmin.value;
    if (item.requiredRole === "admin") return isAdmin.value;
    // Allow tenant owners AND super admins to access owner routes
    if (item.requiredRole === "owner")
      return tenantStore.isOwner || isSuperAdminOrSystemAdmin.value;
    return true;
  });
});

const isActive = (itemRoute: string) => {
  return route.path === itemRoute;
};

const handleLogout = () => {
  authStore.logout();
  router.push("/login");
};

const userName = computed(
  () => authStore.user?.fullName || authStore.user?.username || "User",
);

const userRole = computed(() => {
  const roles = authStore.user?.roles || [];
  if (roles.length === 0) return "User";
  return roles[0]; // Show first role
});
</script>

<template>
  <v-layout class="h-screen">
    <!-- Side Navigation -->
    <v-navigation-drawer permanent width="240" class="sidebar">
      <!-- Fixed Logo Header using prepend slot -->
      <template #prepend>
        <div class="sidebar-logo-header">
          <div class="logo-wrapper">
            <div class="logo-bars">
              <div
                class="logo-bar"
                style="
                  height: 24px;
                  background: linear-gradient(180deg, #f1184c 0%, #d11543 100%);
                "
              ></div>
              <div
                class="logo-bar"
                style="
                  height: 20px;
                  background: linear-gradient(180deg, #f1184c 0%, #ec4899 100%);
                "
              ></div>
              <div
                class="logo-bar"
                style="
                  height: 16px;
                  background: linear-gradient(180deg, #06b6d4 0%, #0891b2 100%);
                "
              ></div>
            </div>
            <div class="logo-text">
              <div class="brand-name">TaskSystem</div>
              <div class="brand-subtitle">Tasks Management</div>
            </div>
          </div>
        </div>
      </template>

      <!-- Tenant Switcher -->
      <TenantSwitcher />

      <!-- Dashboard - Separate Section -->
      <v-list density="compact" nav class="dashboard-nav px-3">
        <v-list-item
          to="/"
          :active="isActive('/')"
          rounded="lg"
          class="nav-item dashboard-item"
          active-class="active-nav-item"
        >
          <template #prepend>
            <div class="nav-icon-wrapper dashboard-icon">
              <v-icon icon="mdi-view-dashboard" size="20" />
            </div>
          </template>
          <v-list-item-title class="nav-item-title"
            >Dashboard</v-list-item-title
          >
        </v-list-item>
      </v-list>

      <div class="menu-divider">
        <div class="divider-line"></div>
      </div>

      <!-- Scrollable Navigation Items -->
      <v-list density="compact" nav class="sidebar-nav-list px-3">
        <v-list-item
          v-for="item in navigationItems.filter((i) => i.route !== '/')"
          :key="item.route"
          :to="item.route"
          :active="isActive(item.route)"
          rounded="lg"
          class="nav-item"
          active-class="active-nav-item"
        >
          <template #prepend>
            <div class="nav-icon-wrapper">
              <v-icon :icon="item.icon" size="20" />
            </div>
          </template>
          <v-list-item-title class="nav-item-title">{{
            item.title
          }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <!-- Fixed Footer with Contact Info -->
      <template #append>
        <div class="sidebar-footer">
          <div class="contact-info">
            <div class="contact-item">
              <v-icon icon="mdi-email-outline" size="14" class="contact-icon" />
              <span>support@taskmanagement.com</span>
            </div>
            <div class="contact-item">
              <v-icon icon="mdi-phone-outline" size="14" class="contact-icon" />
              <span>+885098765432</span>
            </div>
          </div>
          <div class="powered-by">
            Power By:
            <a
              href="https://upskilldev.com"
              target="_blank"
              class="powered-link"
              >UpSkillDev.com</a
            >
          </div>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Main Content Area -->
    <v-main class="main-content">
      <!-- Top App Bar -->
      <v-app-bar flat color="transparent" class="topbar px-4" height="64">
        <v-spacer />

        <v-spacer />

        <!-- Notifications -->
        <v-menu
          v-model="notificationMenu"
          :close-on-content-click="false"
          location="bottom end"
        >
          <template #activator="{ props }">
            <v-btn v-bind="props" icon variant="text" size="small" class="mr-1">
              <v-badge
                v-if="unreadCount > 0"
                :content="unreadCount"
                color="error"
              >
                <v-icon icon="mdi-bell-outline" size="22" />
              </v-badge>
              <v-icon v-else icon="mdi-bell-outline" size="22" />
            </v-btn>
          </template>

          <v-card width="350" max-height="400" class="d-flex flex-column">
            <v-card-title
              class="d-flex align-center py-2 px-3 text-subtitle-2 font-weight-bold bg-grey-lighten-4"
            >
              Notifications
              <v-spacer />
              <v-btn
                v-if="unreadCount > 0"
                variant="text"
                size="x-small"
                color="primary"
                @click="markAllRead"
              >
                Mark all read
              </v-btn>
            </v-card-title>
            <v-divider />

            <div style="overflow-y: auto; flex: 1">
              <div
                v-if="notifications.length === 0"
                class="text-center py-4 text-caption text-grey"
              >
                No notifications
              </div>
              <v-list v-else density="compact" lines="three">
                <v-list-item
                  v-for="notification in notifications"
                  :key="notification.notificationId"
                  :active="!notification.isRead"
                  :start="true"
                  @click="handleNotificationClick(notification)"
                  class="px-3 py-2 border-b"
                  :class="{ 'bg-blue-lighten-5': !notification.isRead }"
                >
                  <v-list-item-title
                    class="text-caption font-weight-medium mb-1"
                  >
                    {{ notification.notificationText }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-grey-darken-1">
                    {{ new Date(notification.createdAt).toLocaleString() }}
                  </v-list-item-subtitle>
                  <template #append v-if="!notification.isRead">
                    <v-icon
                      icon="mdi-circle-small"
                      color="primary"
                      size="small"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </v-card>
        </v-menu>

        <!-- Messages -->
        <v-menu
          v-model="messageMenu"
          :close-on-content-click="false"
          location="bottom end"
        >
          <template #activator="{ props }">
            <v-btn v-bind="props" icon variant="text" size="small" class="mr-2">
              <v-badge
                v-if="chatStore.unreadCount > 0"
                :content="chatStore.unreadCount"
                color="primary"
              >
                <v-icon icon="mdi-email-outline" size="22" />
              </v-badge>
              <v-icon v-else icon="mdi-email-outline" size="22" />
            </v-btn>
          </template>

          <v-card width="320" max-height="360" class="d-flex flex-column">
            <v-card-title
              class="d-flex align-center py-2 px-3 text-subtitle-2 font-weight-bold bg-grey-lighten-4"
            >
              Messages
              <v-spacer />
              <v-btn
                variant="text"
                size="x-small"
                color="primary"
                @click="goToChat()"
              >
                View all
              </v-btn>
            </v-card-title>
            <v-divider />

            <div style="overflow-y: auto; flex: 1">
              <div
                v-if="chatStore.recentThreads.length === 0"
                class="text-center py-4 text-caption text-grey"
              >
                No conversations yet
              </div>
              <v-list v-else density="compact" lines="two">
                <v-list-item
                  v-for="thread in chatStore.recentThreads"
                  :key="thread.threadId"
                  @click="goToChat(thread.threadId)"
                  class="px-3 py-2"
                  :class="{ 'bg-blue-lighten-5': thread.unreadCount > 0 }"
                >
                  <template #prepend>
                    <v-avatar size="36" class="mr-2">
                      <v-img
                        v-if="getThreadAvatar(thread)"
                        :src="getThreadAvatar(thread)"
                      />
                      <span v-else class="text-body-2 text-grey">{{
                        getThreadDisplayName(thread).charAt(0).toUpperCase()
                      }}</span>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="text-caption font-weight-medium">
                    {{ getThreadDisplayName(thread) }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-grey-darken-1">
                    {{ thread.lastMessage?.content || "No messages yet" }}
                  </v-list-item-subtitle>
                  <template #append v-if="thread.unreadCount > 0">
                    <v-badge
                      :content="thread.unreadCount"
                      color="primary"
                      inline
                    />
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </v-card>
        </v-menu>

        <!-- User Menu -->
        <v-menu
          v-model="userMenu"
          :close-on-content-click="true"
          location="bottom end"
        >
          <template #activator="{ props }">
            <div v-bind="props" class="user-profile-trigger">
              <div class="user-avatar-container">
                <v-avatar size="38" class="user-avatar-enhanced">
                  <v-img
                    v-if="authStore.user?.profileImageUrl"
                    :src="authStore.user.profileImageUrl"
                    cover
                  />
                  <span v-else class="avatar-initial">{{
                    userName?.charAt(0)?.toUpperCase() || "U"
                  }}</span>
                </v-avatar>
                <span class="avatar-status-dot"></span>
              </div>
              <div class="user-info-section">
                <div class="user-name-text">{{ userName }}</div>
                <div class="user-role-badge">
                  <span class="role-text">{{ userRole }}</span>
                </div>
              </div>
              <v-icon icon="mdi-chevron-down" size="18" class="chevron-icon" />
            </div>
          </template>
          <v-card
            class="user-menu-card"
            rounded="lg"
            elevation="8"
            min-width="220"
          >
            <!-- Gradient Header -->
            <div class="user-menu-header">
              <v-avatar size="48" class="mb-2 user-menu-avatar">
                <v-img
                  v-if="authStore.user?.profileImageUrl"
                  :src="authStore.user.profileImageUrl"
                />
                <span v-else class="text-h6 text-white">{{
                  userName?.charAt(0)?.toUpperCase() || "U"
                }}</span>
              </v-avatar>
              <div class="text-body-1 font-weight-bold text-white">
                {{ userName }}
              </div>
              <div class="text-caption text-white-50">
                {{ authStore.user?.email }}
              </div>
            </div>
            <!-- Menu Items -->
            <v-list density="compact" class="pt-2 pb-2">
              <v-list-item
                title="Profile"
                prepend-icon="mdi-account-outline"
                to="/profile"
                class="menu-item"
              />
              <v-list-item
                title="Settings"
                prepend-icon="mdi-cog-outline"
                to="/settings"
                class="menu-item"
              />
              <v-divider class="my-2" />
              <v-list-item
                title="Log Out"
                prepend-icon="mdi-logout"
                class="menu-item text-error"
                @click="handleLogout"
              />
            </v-list>
          </v-card>
        </v-menu>
      </v-app-bar>

      <!-- Page Content -->
      <div class="page-content pa-6">
        <slot />
      </div>
    </v-main>
  </v-layout>
</template>

<style scoped>
/* Sidebar Base */
.sidebar {
  background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%) !important;
  border-right: 1px solid #e8e8e8 !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Fixed Logo Header */
.sidebar-logo-header {
  flex-shrink: 0;
  padding: 20px 16px 16px 16px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-bars {
  display: flex;
  gap: 3px;
  align-items: flex-end;
}

.logo-bar {
  width: 5px;
  border-radius: 3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.brand-subtitle {
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Navigation List - Scrollable Area */
.sidebar-nav-list {
  padding: 12px 0 !important;
  background: transparent !important;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Custom Scrollbar for nav list */
.sidebar-nav-list::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav-list::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.sidebar-nav-list::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Navigation Item */
.nav-item {
  margin-bottom: 4px;
  padding: 8px 12px;
  transition: all 0.2s ease;
  color: #64748b;
}

.nav-item:hover {
  background: rgba(241, 24, 76, 0.06) !important;
  color: #f1184c;
}

.nav-item:hover .v-icon {
  color: #f1184c !important;
}

/* Navigation Icon Wrapper */
.nav-icon-wrapper {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #f8fafc;
  margin-right: 4px;
  transition: all 0.2s ease;
}

.nav-item:hover .nav-icon-wrapper {
  background: rgba(241, 24, 76, 0.1);
}

/* Navigation Item Title */
.nav-item-title {
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

/* Active Navigation Item */
.active-nav-item {
  background: linear-gradient(
    135deg,
    rgba(241, 24, 76, 0.12) 0%,
    rgba(241, 24, 76, 0.06) 100%
  ) !important;
}

.active-nav-item .nav-item-title {
  color: #f1184c !important;
  font-weight: 600;
}

.active-nav-item .v-icon {
  color: #f1184c !important;
}

.active-nav-item .nav-icon-wrapper {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  box-shadow: 0 2px 8px rgba(241, 24, 76, 0.3);
}

.active-nav-item .nav-icon-wrapper .v-icon {
  color: white !important;
}

.dashboard-nav {
  padding-top: 0;
  padding-bottom: 0;
}

.dashboard-item {
  background: rgba(241, 24, 76, 0.04);
}

.dashboard-item:hover {
  background: rgba(241, 24, 76, 0.08) !important;
}

.dashboard-icon {
  background: linear-gradient(
    135deg,
    rgba(241, 24, 76, 0.1) 0%,
    rgba(255, 107, 138, 0.08) 100%
  );
}

.dashboard-icon .v-icon {
  color: #f1184c !important;
}

.menu-divider {
  padding: 10px 20px;
}

.divider-line {
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(241, 24, 76, 0.3) 20%,
    rgba(241, 24, 76, 0.4) 50%,
    rgba(241, 24, 76, 0.3) 80%,
    transparent 100%
  );
  border-radius: 2px;
}

/* Sidebar Footer */
.sidebar-footer {
  flex-shrink: 0;
  border-top: 1px solid #f0f0f0;
  background: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
  padding: 16px;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  color: #64748b;
}

.contact-icon {
  color: #f1184c !important;
  opacity: 0.8;
}

.powered-by {
  font-size: 0.68rem;
  color: #94a3b8;
  text-align: center;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
}

.powered-link {
  color: #f1184c;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s ease;
}

.powered-link:hover {
  color: #d11543;
  text-decoration: underline;
}

/* Topbar Styling */
.topbar {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.98) 0%,
    rgba(248, 250, 252, 0.95) 100%
  ) !important;
  backdrop-filter: blur(20px) saturate(200%);
  -webkit-backdrop-filter: blur(20px) saturate(200%);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 4px 8px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.06),
    0 -1px 0 rgba(255, 255, 255, 0.8) inset,
    0 1px 0 rgba(255, 255, 255, 0.9) inset;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  z-index: 100;
  position: relative;
}

.topbar::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.6) 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  pointer-events: none;
}

.topbar::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(241, 24, 76, 0.15) 20%,
    rgba(241, 24, 76, 0.25) 50%,
    rgba(241, 24, 76, 0.15) 80%,
    transparent 100%
  );
}

.topbar :deep(.v-btn) {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
}

.topbar :deep(.v-btn:hover) {
  background: linear-gradient(
    135deg,
    rgba(241, 24, 76, 0.08) 0%,
    rgba(241, 24, 76, 0.04) 100%
  );
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(241, 24, 76, 0.15);
}

.topbar :deep(.v-icon) {
  color: #475569;
  transition: all 0.25s ease;
}

.topbar :deep(.v-btn:hover .v-icon) {
  color: #f1184c;
  transform: scale(1.1);
}

/* Main Content Area */
.main-content {
  background: #f8fafc;
  height: 100vh;
  overflow: hidden;
}

.page-content {
  height: calc(100vh - 64px);
  overflow-y: auto;
  overflow-x: hidden;
}

/* User Menu Dropdown Styles */
.user-profile-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 14px 6px 8px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(248, 250, 252, 0.85) 100%
  );
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(241, 24, 76, 0.12);
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 1px 2px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.user-profile-trigger:hover {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(241, 24, 76, 0.04) 100%
  );
  border-color: rgba(241, 24, 76, 0.25);
  box-shadow:
    0 4px 16px rgba(241, 24, 76, 0.12),
    0 2px 6px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.user-avatar-container {
  position: relative;
  flex-shrink: 0;
}

.user-avatar-enhanced {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  border: 2.5px solid transparent;
  background-clip: padding-box;
  box-shadow:
    0 3px 10px rgba(241, 24, 76, 0.28),
    0 1px 3px rgba(0, 0, 0, 0.12);
  position: relative;
}

.user-avatar-enhanced::before {
  content: "";
  position: absolute;
  inset: -2.5px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 50%, #f1184c 100%);
  border-radius: 50%;
  z-index: -1;
}

.avatar-initial {
  font-size: 1rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.avatar-status-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(34, 197, 94, 0.4);
}

.user-info-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 80px;
}

.user-name-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
  letter-spacing: -0.01em;
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role-badge {
  display: inline-flex;
  align-items: center;
  margin-top: 2px;
  padding: 1px 8px;
  background: linear-gradient(
    135deg,
    rgba(241, 24, 76, 0.1) 0%,
    rgba(241, 24, 76, 0.05) 100%
  );
  border-radius: 10px;
  border: 1px solid rgba(241, 24, 76, 0.15);
}

.role-text {
  font-size: 0.65rem;
  font-weight: 600;
  color: #f1184c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chevron-icon {
  color: #94a3b8;
  transition: all 0.3s ease;
  margin-left: 2px;
}

.user-profile-trigger:hover .chevron-icon {
  color: #f1184c;
  transform: translateY(2px);
}

.user-menu-card {
  overflow: hidden;
}

.user-menu-header {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  padding: 20px;
  text-align: center;
}

.user-menu-avatar {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.text-white-50 {
  color: rgba(255, 255, 255, 0.7);
}

.menu-item {
  margin: 0 8px;
  border-radius: 8px;
}

.menu-item:hover {
  background-color: rgba(241, 24, 76, 0.08);
}

/* Hide user info on mobile */
@media (max-width: 600px) {
  .user-info-section {
    display: none;
  }

  .user-profile-trigger {
    padding: 4px;
    border-radius: 50%;
  }

  .chevron-icon {
    display: none;
  }
}
</style>
