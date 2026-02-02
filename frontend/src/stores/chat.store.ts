import { defineStore } from "pinia";
import { ref } from "vue";
import { chatService, type ChatThread } from "@/services/chat.service";

export const useChatStore = defineStore("chat", () => {
  const unreadCount = ref(0);
  const recentThreads = ref<ChatThread[]>([]);

  const fetchUnreadCount = async () => {
    try {
      unreadCount.value = await chatService.getUnreadCount();
    } catch (error) {
      console.error("Failed to fetch unread count", error);
    }
  };

  const fetchRecentThreads = async () => {
    try {
      const response = await chatService.listThreads({ page: 1, pageSize: 5 });
      recentThreads.value = response.data;
    } catch (error) {
      console.error("Failed to fetch recent threads", error);
    }
  };
  
  const refreshNotifications = async () => {
    await Promise.all([fetchUnreadCount(), fetchRecentThreads()]);
  };

  const decrementUnreadCount = (amount: number = 1) => {
      unreadCount.value = Math.max(0, unreadCount.value - amount);
  }

  return {
    unreadCount,
    recentThreads,
    fetchUnreadCount,
    fetchRecentThreads,
    refreshNotifications,
    decrementUnreadCount
  };
});
