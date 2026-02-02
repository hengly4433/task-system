<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useDebounceFn } from "@vueuse/core";
import {
  chatService,
  type ChatMessage,
  type ChatThread,
  type TypingEvent,
  type ReactionEvent,
  type MessageEditEvent,
  type MessageDeleteEvent,
} from "@/services/chat.service";
import { chatSocketService } from "@/services/chat-socket.service";
import { userService, type User } from "@/services/user.service";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { useSnackbar } from "@/composables/useSnackbar";
import EmojiPicker from 'vue3-emoji-picker';
import 'vue3-emoji-picker/css';

const statusOptions = ['active', 'inactive', 'busy', 'out_of_office'];
const emojiList = ['👍', '❤️', '😂', '😮', '😢', '😡'];

dayjs.extend(relativeTime);

type TabFilter = "All" | "Marked" | "Blocked";
type LocalMessage = ChatMessage & { isOwn?: boolean };

const authStore = useAuthStore();
const chatStore = useChatStore();
const snackbar = useSnackbar();

const activeTab = ref<TabFilter>("All");
const searchQuery = ref("");
const newMessage = ref("");
const selectedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedThreadId = ref<string | null>(null);

const threads = ref<ChatThread[]>([]);
const threadsTotal = ref(0);
const threadsPage = ref(1);
const threadsPageSize = 20;
const loadingThreads = ref(false);
const loadingMoreThreads = ref(false);

const messagesMap = ref<Record<string, LocalMessage[]>>({});
const messageCursors = ref<Record<string, string | null>>({});
const hasMoreMessages = ref<Record<string, boolean>>({});
const loadingMessages = ref(false);
const loadingOlder = ref(false);
const sendingMessage = ref(false);

const newChatDialog = ref(false);
const participants = ref<User[]>([]);
const selectedParticipantIds = ref<string[]>([]);
const newChatTitle = ref("");
const initialMessage = ref("");
const creatingChat = ref(false);

const messageContainer = ref<HTMLElement | null>(null);

// Typing indicator state
const typingUsers = ref<Map<string, { username: string; timeout: number }>>(new Map());
const isTyping = ref(false);
let typingTimeout: number | null = null;

// Emoji picker state
const showEmojiPicker = ref(false);

const onSelectEmoji = (emoji: any) => {
  newMessage.value += emoji.i;
  // showEmojiPicker.value = false; // Optional: keep open for multiple emojis
};

// Reaction menu state
const reactionMenuMsgId = ref<string | null>(null);

// Message context menu state
const contextMenuMsgId = ref<string | null>(null);
const contextMenuPosition = ref({ x: 0, y: 0 });

// Edit message state
const editingMessageId = ref<string | null>(null);
const editMessageText = ref("");

// Search in chat
const chatSearchQuery = ref("");
const chatSearchResults = ref<ChatMessage[]>([]);
const showSearchResults = ref(false);
const searchingMessages = ref(false);

const selectedThread = computed<ChatThread | null>(() => {
  return threads.value.find((t) => t.threadId === selectedThreadId.value) || null;
});


const filterParam = computed(() => {
  if (activeTab.value === "Marked") return "marked";
  if (activeTab.value === "Blocked") return "blocked";
  return "all";
});

const debouncedSearch = useDebounceFn(() => loadThreads(true), 350);

const withOwnership = (message: ChatMessage): LocalMessage => ({
  ...message,
  isOwn: message.sender.userId === authStore.user?.userId,
});

const dedupeAndSortThreads = (items: ChatThread[]): ChatThread[] => {
  const map = new Map<string, ChatThread>();
  items.forEach((thread) => {
    const existing = map.get(thread.threadId);
    map.set(thread.threadId, existing ? { ...existing, ...thread } : thread);
  });
  return Array.from(map.values()).sort(
    (a, b) => dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf()
  );
};

const matchesFilter = (thread: ChatThread) => {
  if (activeTab.value === "Marked") return thread.isMarked;
  if (activeTab.value === "Blocked") return thread.isBlocked;
  return true;
};

const getDisplayUser = (thread: ChatThread) => {
  if (thread.isGroup) return null;
  const current = authStore.user?.userId;
  return (
    thread.participants.find((p) => p.user.userId !== current)?.user ||
    thread.participants[0]?.user ||
    null
  );
};

const threadTitle = (thread: ChatThread) => {
  if (thread.isGroup) return thread.title || "Group chat";
  const user = getDisplayUser(thread);
  return user?.fullName || user?.username || "Chat";
};

const threadAvatar = (thread: ChatThread) => {
  const user = getDisplayUser(thread);
  return user?.profileImageUrl || "";
};

const threadPresenceStatus = (thread: ChatThread): string => {
  if (thread.isGroup) return "";
  const user = getDisplayUser(thread);
  return user?.presenceStatus?.toLowerCase() || "inactive";
};

const getPresenceColor = (status: string): string => {
  switch (status) {
    case 'active': return '#22c55e';
    case 'inactive': return '#eab308';
    case 'busy': return '#ef4444';
    case 'out_of_office': return '#6b7280';
    default: return '#22c55e';
  }
};

const getPresenceLabel = (status: string): string => {
  switch (status) {
    case 'active': return 'Active Now';
    case 'inactive': return 'Away';
    case 'busy': return 'Busy';
    case 'out_of_office': return 'Out of Office';
    default: return 'Active Now';
  }
};

const formatTimeLabel = (value?: string | null) => {
  if (!value) return "";
  const now = dayjs();
  const target = dayjs(value);
  const diffMinutes = now.diff(target, "minute");
  if (diffMinutes < 60) return `${Math.max(diffMinutes, 1)} min`;
  const diffHours = now.diff(target, "hour");
  if (diffHours < 24) return `${diffHours} h`;
  return target.format("MMM D");
};

const formatPreview = (thread: ChatThread) => {
  if (thread.lastMessage?.content) return thread.lastMessage.content;
  return "No messages yet";
};

const scrollToBottom = () => {
  nextTick(() => {
    setTimeout(() => {
      if (messageContainer.value) {
        messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
      }
    }, 50);
  });
};

const fetchUsers = async () => {
  try {
    const response = await userService.getAll({ page: 1, pageSize: 100 });
    const data = (response as any).data || response;
    participants.value = data.filter(
      (u: User) => u.userId !== authStore.user?.userId
    );
  } catch (error) {
    console.error("Failed to load users", error);
  }
};

const loadThreads = async (reset = false) => {
  if (loadingThreads.value || loadingMoreThreads.value) return;

  if (reset) {
    threadsPage.value = 1;
  }

  loadingThreads.value = reset;
  loadingMoreThreads.value = !reset;

  try {
    const response = await chatService.listThreads({
      filter: filterParam.value as any,
      search: searchQuery.value || undefined,
      page: threadsPage.value,
      pageSize: threadsPageSize,
    });

    threadsTotal.value = response.total;
    const combined = reset
      ? response.data
      : [...threads.value, ...response.data];
    threads.value = dedupeAndSortThreads(combined);

    // Auto-select the first (most recent) thread on initial load/reset
    if (reset && threads.value.length > 0) {
      const firstThread = threads.value[0];
      if (firstThread) {
        // Only update if different to avoid unnecessary reloads
        if (selectedThreadId.value !== firstThread.threadId) {
          selectedThreadId.value = firstThread.threadId;
          // Join the thread room for real-time updates
          chatSocketService.joinThread(firstThread.threadId);
        }
      }
    } else if (!threads.value.length) {
      selectedThreadId.value = null;
    }
  } catch (error) {
    snackbar.error("Failed to load conversations");
  } finally {
    loadingThreads.value = false;
    loadingMoreThreads.value = false;
  }
};

const loadMoreThreads = async () => {
  if (threads.value.length >= threadsTotal.value) return;
  threadsPage.value += 1;
  await loadThreads(false);
};

const updateThreadFromMessage = (
  threadId: string,
  message: LocalMessage,
  isActive: boolean
) => {
  const index = threads.value.findIndex((t) => t.threadId === threadId);
  if (index !== -1) {
    const current = threads.value[index];
    if (!current) return;
    if (!matchesFilter(current)) {
      threads.value.splice(index, 1);
      if (selectedThreadId.value === threadId) {
        const nextThread = threads.value[0];
        selectedThreadId.value = nextThread ? nextThread.threadId : null;
      }
      return;
    }
    const updated: ChatThread = {
      ...current,
      lastMessage: message,
      updatedAt: message.createdAt,
      unreadCount: isActive ? 0 : (current.unreadCount || 0) + 1,
    };
    threads.value.splice(index, 1, updated);
    threads.value = dedupeAndSortThreads(threads.value);
  } else {
    chatService
      .getThread(threadId)
      .then((thread) => {
        if (!matchesFilter(thread)) return;
        threads.value = dedupeAndSortThreads([...threads.value, thread]);
      })
      .catch(() => {
        // ignore
      });
  }
};

const loadMessages = async (threadId: string, reset = false) => {
  if (!threadId) return;

  loadingMessages.value = reset;
  loadingOlder.value = !reset;

  try {
    const cursor = reset ? undefined : messageCursors.value[threadId];
    const response = await chatService.getMessages(threadId, {
      cursor: cursor || undefined,
      pageSize: 30,
    });
    const normalized = response.data.map(withOwnership);
    const existing = messagesMap.value[threadId] || [];
    messagesMap.value[threadId] = reset
      ? normalized
      : [...normalized, ...existing];

    messageCursors.value[threadId] = response.nextCursor || null;
    hasMoreMessages.value[threadId] = response.hasMore;

    if (reset) {
      // Always scroll to bottom when loading/resetting messages
      scrollToBottom();
      
      if (response.data.length) {
        const lastMessageId =
          response.data[response.data.length - 1]?.messageId || undefined;
        await markThreadAsRead(threadId, lastMessageId);
      }
    }
  } catch (error) {
    snackbar.error("Failed to load messages");
  } finally {
    loadingMessages.value = false;
    loadingOlder.value = false;
  }
};

const loadOlderMessages = async () => {
  if (!selectedThreadId.value) return;
  if (!hasMoreMessages.value[selectedThreadId.value]) return;
  await loadMessages(selectedThreadId.value, false);
};

const markThreadAsRead = async (threadId: string, messageId?: string) => {
  try {
    const updated = await chatService.markAsRead(threadId, messageId);
    threads.value = dedupeAndSortThreads(
      threads.value.map((t) => (t.threadId === updated.threadId ? updated : t))
    );
  } catch (error) {
    console.warn("Failed to mark thread as read", error);
  } finally {
    const index = threads.value.findIndex((t) => t.threadId === threadId);
    if (index !== -1) {
      const current = threads.value[index];
      if (!current) return;
      threads.value[index] = { ...current, unreadCount: 0 };
      threads.value = dedupeAndSortThreads(threads.value);
      // Refresh global unread count
      chatStore.refreshNotifications();
    }
  }
};

const triggerFileUpload = () => {
  fileInputRef.value?.click();
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0] || null;
  }
};

const sendMessage = async () => {
  if (!selectedThreadId.value) return;
  if (!newMessage.value.trim() && !selectedFile.value) return;
  
  if (sendingMessage.value) return;
  if (selectedThread.value?.isBlocked) {
    snackbar.error("Unblock this thread to send messages");
    return;
  }

  sendingMessage.value = true;
  const content = newMessage.value.trim();

  try {
    let message: ChatMessage;
    
    if (selectedFile.value) {
      message = await chatService.sendMessageWithAttachment(
        selectedThreadId.value,
        selectedFile.value,
        content
      );
    } else {
      message = await chatService.sendMessage(
        selectedThreadId.value,
        content
      );
    }

    const local = withOwnership(message);
    const existing = messagesMap.value[selectedThreadId.value] || [];
    messagesMap.value[selectedThreadId.value] = [...existing, local];
    newMessage.value = "";
    selectedFile.value = null;
    if (fileInputRef.value) fileInputRef.value.value = '';
    
    updateThreadFromMessage(selectedThreadId.value, local, true);
    await markThreadAsRead(selectedThreadId.value, message.messageId);
    await nextTick();
    scrollToBottom();
  } catch (error) {
    console.error(error);
    snackbar.error("Failed to send message");
  } finally {
    sendingMessage.value = false;
  }
};

const toggleMarked = async () => {
  if (!selectedThread.value) return;
  try {
    const updated = await chatService.setMarked(
      selectedThread.value.threadId,
      !selectedThread.value.isMarked
    );
    threads.value = dedupeAndSortThreads(
      threads.value.map((t) => (t.threadId === updated.threadId ? updated : t))
    );
  } catch (error) {
    snackbar.error("Failed to update flag");
  }
};

const updateStatus = async (status: string) => {
  try {
    const updatedUser = await chatService.updatePresence(status);
    if (authStore.user) {
      authStore.user = { ...authStore.user, presenceStatus: updatedUser.presenceStatus };
    }
  } catch (error) {
    snackbar.error("Failed to update status");
  }
};

const toggleBlocked = async () => {
  if (!selectedThread.value) return;
  try {
    const updated = await chatService.setBlocked(
      selectedThread.value.threadId,
      !selectedThread.value.isBlocked
    );
    threads.value = dedupeAndSortThreads(
      threads.value.map((t) => (t.threadId === updated.threadId ? updated : t))
    );
  } catch (error) {
    snackbar.error("Failed to update block state");
  }
};

const createChat = async () => {
  if (!selectedParticipantIds.value.length) {
    snackbar.error("Select at least one participant");
    return;
  }
  creatingChat.value = true;
  try {
    const payload = {
      participantIds: selectedParticipantIds.value,
      title: newChatTitle.value || undefined,
      isGroup:
        selectedParticipantIds.value.length > 1 || !!newChatTitle.value || false,
      initialMessage: initialMessage.value || undefined,
    };
    const thread = await chatService.createThread(payload);
    threads.value = dedupeAndSortThreads([...threads.value, thread]);
    selectedThreadId.value = thread.threadId;
    messagesMap.value[thread.threadId] = [];
    messageCursors.value[thread.threadId] = null;
    hasMoreMessages.value[thread.threadId] = false;
    newChatDialog.value = false;
    selectedParticipantIds.value = [];
    newChatTitle.value = "";
    initialMessage.value = "";
    await loadMessages(thread.threadId, true);
  } catch (error) {
    snackbar.error("Failed to create chat");
  } finally {
    creatingChat.value = false;
  }
};

const handleThreadUpdate = async (payload: { thread: ChatThread }) => {
  if (!payload?.thread) return;
  if (!matchesFilter(payload.thread)) {
    const exists = threads.value.some(
      (t) => t.threadId === payload.thread.threadId
    );
    if (exists) {
      threads.value = threads.value.filter(
        (t) => t.threadId !== payload.thread.threadId
      );
      if (selectedThreadId.value === payload.thread.threadId) {
        selectedThreadId.value = threads.value[0]?.threadId || null;
      }
    }
    return;
  }
  threads.value = dedupeAndSortThreads([...threads.value, payload.thread]);
  if (!selectedThreadId.value) {
    selectedThreadId.value = payload.thread.threadId;
  }
};

const handleIncomingMessage = async (payload: {
  threadId: string;
  message: ChatMessage;
}) => {
  const local = withOwnership(payload.message);
  
  // Skip messages from the current user - they're already added via the API response in sendMessage
  if (payload.message.sender.userId === authStore.user?.userId) {
    // Still update thread sidebar for the sender's own messages
    updateThreadFromMessage(payload.threadId, local, selectedThreadId.value === payload.threadId);
    return;
  }
  
  if (selectedThreadId.value === payload.threadId) {
    const existing = messagesMap.value[payload.threadId] || [];
    messagesMap.value[payload.threadId] = [...existing, local];
    updateThreadFromMessage(payload.threadId, local, true);
    await markThreadAsRead(payload.threadId, local.messageId);
    await nextTick();
    scrollToBottom();
  } else {
    updateThreadFromMessage(payload.threadId, local, false);
  }
};

const selectThread = (threadId: string) => {
  // If clicking the same thread, just scroll to bottom
  if (selectedThreadId.value === threadId) {
    scrollToBottom();
    return;
  }
  // Leave old thread room
  if (selectedThreadId.value) {
    chatSocketService.leaveThread(selectedThreadId.value);
  }
  selectedThreadId.value = threadId;
  // Join new thread room
  chatSocketService.joinThread(threadId);
};

// Typing indicator handlers
const handleTyping = () => {
  if (!selectedThreadId.value || selectedThread.value?.isBlocked) return;
  
  if (!isTyping.value) {
    isTyping.value = true;
    chatSocketService.emitTyping(selectedThreadId.value, true);
  }
  
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  
  typingTimeout = setTimeout(() => {
    isTyping.value = false;
    if (selectedThreadId.value) {
      chatSocketService.emitTyping(selectedThreadId.value, false);
    }
  }, 2000) as unknown as number;
};

const handleTypingEvent = (event: TypingEvent) => {
  if (event.userId === authStore.user?.userId) return;
  
  const existing = typingUsers.value.get(event.userId);
  if (existing) {
    clearTimeout(existing.timeout);
  }
  
  if (event.isTyping) {
    const timeout = setTimeout(() => {
      typingUsers.value.delete(event.userId);
    }, 3000) as unknown as number;
    typingUsers.value.set(event.userId, { username: event.username, timeout });
  } else {
    typingUsers.value.delete(event.userId);
  }
};

const typingUsersText = computed(() => {
  const users = Array.from(typingUsers.value.values());
  if (users.length === 0) return '';
  if (users.length === 1) return `${users[0]?.username} is typing...`;
  return `${users.map(u => u.username).join(', ')} are typing...`;
});

// Emoji picker handlers
const insertEmoji = (emoji: string) => {
  newMessage.value += emoji;
  showEmojiPicker.value = false;
};

// Reaction handlers
const toggleReactionMenu = (messageId: string) => {
  reactionMenuMsgId.value = reactionMenuMsgId.value === messageId ? null : messageId;
};

const addReaction = async (messageId: string, emoji: string) => {
  reactionMenuMsgId.value = null;
  try {
    const updated = await chatService.addReaction(messageId, emoji);
    updateMessageInList(messageId, updated);
  } catch (error) {
    snackbar.error("Failed to add reaction");
  }
};

const toggleReaction = async (messageId: string, emoji: string, hasReacted: boolean) => {
  try {
    let updated: ChatMessage;
    if (hasReacted) {
      updated = await chatService.removeReaction(messageId, emoji);
    } else {
      updated = await chatService.addReaction(messageId, emoji);
    }
    updateMessageInList(messageId, updated);
  } catch (error) {
    snackbar.error("Failed to update reaction");
  }
};

const updateMessageInList = (messageId: string, updated: ChatMessage) => {
  if (!selectedThreadId.value) return;
  const messages = messagesMap.value[selectedThreadId.value] || [];
  const index = messages.findIndex(m => m.messageId === messageId);
  if (index !== -1) {
    messages[index] = { ...messages[index], ...updated };
    messagesMap.value[selectedThreadId.value] = [...messages];
  }
};

const handleReactionEvent = (event: ReactionEvent) => {
  updateMessageReaction(event.messageId, event.emoji, event.userId, event.action);
};

const handlePresenceEvent = (event: { userId: string; status: string }) => {
  // Update threads
  threads.value.forEach(thread => {
    const participant = thread.participants.find(p => p.user.userId === event.userId);
    if (participant) {
      participant.user.presenceStatus = event.status;
    }
  });
  
  // Update participants list
  const p = participants.value.find(u => u.userId === event.userId);
  if (p) {
    p.presenceStatus = event.status;
  }
};

const updateMessageReaction = (messageId: string, emoji: string, reactingUserId: string, action: 'add' | 'remove') => {
  if (!selectedThreadId.value) return;
  const messages = messagesMap.value[selectedThreadId.value] || [];
  const index = messages.findIndex(m => m.messageId === messageId);
  if (index === -1) return;
  
  const message = messages[index];
  if (!message) return;
  
  const reactions = [...(message.reactions || [])];
  const reactionIndex = reactions.findIndex(r => r.emoji === emoji);
  
  if (action === 'add') {
    if (reactionIndex === -1) {
      reactions.push({ emoji, count: 1, userIds: [reactingUserId] });
    } else {
      const existing = reactions[reactionIndex];
      if (existing && !existing.userIds.includes(reactingUserId)) {
        reactions[reactionIndex] = {
          emoji: existing.emoji,
          count: existing.count + 1,
          userIds: [...existing.userIds, reactingUserId],
        };
      }
    }
  } else {
    if (reactionIndex !== -1) {
      const existing = reactions[reactionIndex];
      if (existing) {
        const userIndex = existing.userIds.indexOf(reactingUserId);
        if (userIndex !== -1) {
          const newUserIds = [...existing.userIds];
          newUserIds.splice(userIndex, 1);
          if (newUserIds.length === 0) {
            reactions.splice(reactionIndex, 1);
          } else {
            reactions[reactionIndex] = {
              emoji: existing.emoji,
              count: existing.count - 1,
              userIds: newUserIds,
            };
          }
        }
      }
    }
  }
  
  messages[index] = { ...message, reactions };
  messagesMap.value[selectedThreadId.value] = [...messages];
};

const messagesForThread = computed(() => {
  if (!selectedThreadId.value || !selectedThread.value) return [];
  const thread = selectedThread.value;
  const currentUserId = authStore.user?.userId;

  return (messagesMap.value[selectedThreadId.value] || []).map((msg) => {
    const isOwn = msg.sender.userId === currentUserId;
    const showAvatar = !isOwn; // For now, only show avatar for others
    const senderName = msg.sender.fullName || msg.sender.username;

    // Check if seen
    const seenBy = thread.participants
      .filter(p => p.user.userId !== authStore.user?.userId && p.lastReadAt && new Date(p.lastReadAt) >= new Date(msg.createdAt))
      .map(p => p.user.fullName || p.user.username);
      
    return {
      ...msg,
      isOwn,
      showAvatar,
      senderName,
      seenBy: seenBy.length > 0 ? seenBy : undefined,
    };
  });
});

// Message Edit/Delete handlers
const handleMessageEditEvent = (event: MessageEditEvent) => {
  const messages = messagesMap.value[event.threadId];
  if (!messages) return;
  
  const index = messages.findIndex((m) => m.messageId === event.message.messageId);
  if (index !== -1) {
    messages[index] = { ...messages[index], ...event.message };
    messagesMap.value[event.threadId] = [...messages];
  }
};

const handleMessageDeleteEvent = (event: MessageDeleteEvent) => {
  const messages = messagesMap.value[event.threadId];
  if (!messages) return;
  
  const index = messages.findIndex((m) => m.messageId === event.messageId);
  if (index !== -1) {
    messages[index] = { ...messages[index], ...event.message };
    messagesMap.value[event.threadId] = [...messages];
  }
};

// Context menu handlers
const openContextMenu = (event: MouseEvent, messageId: string, isOwn: boolean) => {
  event.preventDefault();
  contextMenuMsgId.value = messageId;
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
};

const closeContextMenu = () => {
  contextMenuMsgId.value = null;
};

// Edit message functions
const startEditMessage = (message: LocalMessage) => {
  editingMessageId.value = message.messageId;
  editMessageText.value = message.content;
  closeContextMenu();
};

const cancelEdit = () => {
  editingMessageId.value = null;
  editMessageText.value = "";
};

const saveEditMessage = async (messageId: string) => {
  if (!editMessageText.value.trim()) return;
  
  try {
    const updated = await chatService.editMessage(messageId, editMessageText.value.trim());
    // Update local state
    if (selectedThreadId.value) {
      const messages = messagesMap.value[selectedThreadId.value];
      if (messages) {
        const index = messages.findIndex((m) => m.messageId === messageId);
        if (index !== -1) {
          messages[index] = { ...messages[index], ...updated };
          messagesMap.value[selectedThreadId.value] = [...messages];
        }
      }
    }
    cancelEdit();
  } catch (error) {
    snackbar.error("Failed to edit message");
  }
};

// Delete message
const deleteMessage = async (messageId: string) => {
  try {
    const updated = await chatService.deleteMessage(messageId);
    // Update local state
    if (selectedThreadId.value) {
      const messages = messagesMap.value[selectedThreadId.value];
      if (messages) {
        const index = messages.findIndex((m) => m.messageId === messageId);
        if (index !== -1) {
          messages[index] = { ...messages[index], ...updated };
          messagesMap.value[selectedThreadId.value] = [...messages];
        }
      }
    }
    closeContextMenu();
    snackbar.success("Message deleted");
  } catch (error) {
    snackbar.error("Failed to delete message");
  }
};

// Copy message
const copyMessage = (content: string) => {
  navigator.clipboard.writeText(content);
  snackbar.success("Message copied");
  closeContextMenu();
};

// Search messages
const searchInChat = useDebounceFn(async () => {
  if (!chatSearchQuery.value.trim()) {
    chatSearchResults.value = [];
    showSearchResults.value = false;
    return;
  }
  
  searchingMessages.value = true;
  try {
    const result = await chatService.searchMessages(chatSearchQuery.value);
    chatSearchResults.value = result.data;
    showSearchResults.value = true;
  } catch (error) {
    snackbar.error("Search failed");
  } finally {
    searchingMessages.value = false;
  }
}, 500);

watch(searchQuery, () => {
  threadsPage.value = 1;
  debouncedSearch();
});

watch(activeTab, () => {
  loadThreads(true);
});

watch(
  () => selectedThreadId.value,
  async (threadId) => {
    if (threadId) {
      await loadMessages(threadId, true);
      // Ensure scroll to bottom after messages are loaded
      scrollToBottom();
    }
  }
);

onMounted(async () => {
  await authStore.initAuth();
  await loadThreads(true);
  await fetchUsers();

  if (authStore.token) {
    chatSocketService.connect(authStore.token);
    chatSocketService.on("chat:message", handleIncomingMessage);
    chatSocketService.on("chat:thread", handleThreadUpdate);
    chatSocketService.on("chat:typing", handleTypingEvent);
    chatSocketService.on("chat:reaction", handleReactionEvent);
    chatSocketService.on("chat:messageEdit", handleMessageEditEvent);
    chatSocketService.on("chat:messageDelete", handleMessageDeleteEvent);
    chatSocketService.on("chat:presence", handlePresenceEvent);
    chatSocketService.on("chat:read", handleReadEvent);
  }

  // Disable parent page-content scroll for this view
  const pageContent = document.querySelector('.page-content') as HTMLElement;
  if (pageContent) {
    pageContent.style.overflow = 'hidden';
    pageContent.style.height = 'calc(100vh - 64px)';
  }
});

const handleReadEvent = (payload: any) => {
  if (selectedThread.value && selectedThread.value.threadId === payload.threadId) {
    const participant = selectedThread.value.participants.find(
      (p) => p.user.userId === payload.userId
    );
    if (participant) {
      participant.lastReadAt = payload.readAt;
    }
  }
};

onBeforeUnmount(() => {
  chatSocketService.off("chat:message", handleIncomingMessage);
  chatSocketService.off("chat:thread", handleThreadUpdate);
  chatSocketService.off("chat:typing", handleTypingEvent);
  chatSocketService.off("chat:reaction", handleReactionEvent);
  chatSocketService.off("chat:messageEdit", handleMessageEditEvent);
  chatSocketService.off("chat:messageDelete", handleMessageDeleteEvent);
  chatSocketService.off("chat:presence", handlePresenceEvent);
  chatSocketService.off("chat:read", handleReadEvent);
  if (selectedThreadId.value) {
    chatSocketService.leaveThread(selectedThreadId.value);
  }
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  chatSocketService.disconnect();

  // Restore parent page-content scroll
  const pageContent = document.querySelector('.page-content') as HTMLElement;
  if (pageContent) {
    pageContent.style.overflow = '';
    pageContent.style.height = '';
  }
});
</script>

<template>
  <div class="chat-view no-scroll">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <div class="title-icon">
            <v-icon icon="mdi-chat-outline" size="28" />
          </div>
          <div>
            <h1 class="page-title">Chat</h1>
            <p class="page-subtitle">Connect and communicate with your team</p>
          </div>
        </div>
        <div class="view-toggle">
          <span
            v-for="tab in ['All', 'Marked', 'Blocked']"
            :key="tab"
            class="view-toggle-item"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab as TabFilter"
          >
            <v-icon size="16" class="mr-1">
              {{ tab === 'All' ? 'mdi-message-text-outline' : tab === 'Marked' ? 'mdi-star-outline' : 'mdi-block-helper' }}
            </v-icon>
            {{ tab }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-calendar"
          rounded="lg"
          size="small"
        >
          {{ dayjs().format("MMM YYYY") }}
        </v-btn>
        <v-btn
          class="action-btn"
          prepend-icon="mdi-plus"
          rounded="lg"
          size="small"
          elevation="0"
          @click="newChatDialog = true"
        >
          Add New
        </v-btn>
      </div>
    </div>

    <div class="chat-container">
      <div class="chat-sidebar-wrapper">
        <v-card
          rounded="xl"
          class="chat-sidebar"
          elevation="0"
        >
          <!-- Sidebar Header -->
          <div class="sidebar-header">
            <h3 class="sidebar-title">Conversations</h3>
            <v-chip size="small" color="primary" variant="flat" class="conversation-count">
              {{ threadsTotal }}
            </v-chip>
          </div>

          <!-- Search Section -->
          <div class="sidebar-search">
            <v-text-field
              v-model="searchQuery"
              placeholder="Search conversations..."
              prepend-inner-icon="mdi-magnify"
              variant="solo-filled"
              density="compact"
              hide-details
              rounded="lg"
              flat
              bg-color="grey-lighten-4"
              class="search-input"
            />
          </div>

          <!-- Thread List -->
          <div class="thread-list-container">
            <div v-if="loadingThreads" class="d-flex justify-center align-center py-8">
              <v-progress-circular indeterminate color="primary" size="40" width="3" />
            </div>

            <div v-else-if="!threads.length" class="empty-threads">
              <div class="empty-icon-wrapper">
                <v-icon size="40" color="grey-lighten-1">mdi-chat-plus-outline</v-icon>
              </div>
              <div class="text-body-2 text-grey-darken-1 mb-1">No conversations yet</div>
              <div class="text-caption text-grey mb-3">Start a new chat to connect</div>
              <v-btn
                class="action-btn-small"
                size="small"
                rounded="lg"
                @click="newChatDialog = true"
              >
                <v-icon start size="16">mdi-plus</v-icon>
                Start Chat
              </v-btn>
            </div>

            <div v-else class="threads-wrapper">
              <div
                v-for="thread in threads"
                :key="thread.threadId"
                class="thread-item"
                :class="{
                  'thread-item--active': selectedThreadId === thread.threadId,
                  'thread-item--unread': thread.unreadCount && thread.unreadCount > 0,
                }"
                @click="selectThread(thread.threadId)"
              >
                <div class="thread-avatar-wrapper">
                  <v-avatar size="48" class="thread-avatar">
                    <v-img :src="threadAvatar(thread)" />
                  </v-avatar>
                  <div
                    v-if="!thread.isGroup"
                    class="presence-indicator"
                    :class="`presence-indicator--${threadPresenceStatus(thread)}`"
                  />
                </div>
                <div class="thread-content">
                  <div class="thread-header">
                    <span class="thread-name">
                      {{ threadTitle(thread) }}
                    </span>
                    <span class="thread-time">
                      {{ formatTimeLabel(thread.updatedAt) }}
                    </span>
                  </div>
                  <div class="thread-preview">
                    <span class="preview-text">
                      {{ formatPreview(thread) }}
                    </span>
                    <v-badge
                      v-if="thread.unreadCount"
                      :content="thread.unreadCount > 9 ? '9+' : thread.unreadCount"
                      color="primary"
                      inline
                      class="unread-badge"
                    />
                  </div>
                </div>
              </div>

              <div
                v-if="threads.length < threadsTotal"
                class="load-more-section"
              >
                <v-btn
                  variant="text"
                  size="small"
                  color="primary"
                  :loading="loadingMoreThreads"
                  @click="loadMoreThreads"
                >
                  <v-icon start size="16">mdi-chevron-down</v-icon>
                  Load more conversations
                </v-btn>
              </div>
            </div>
          </div>
        </v-card>
      </div>

      <div class="chat-main-wrapper">
        <v-card
          rounded="xl"
          class="chat-main-card"
          elevation="0"
        >
          <template v-if="selectedThread">
            <div class="chat-header">
              <div class="d-flex align-center">
                <div class="chat-header-avatar">
                  <v-avatar size="48" class="header-avatar">
                    <v-img :src="threadAvatar(selectedThread)" />
                  </v-avatar>
                  <div
                    v-if="!selectedThread.isGroup"
                    class="header-presence-dot"
                    :class="`presence-${threadPresenceStatus(selectedThread)}`"
                  />
                </div>
                <div class="chat-header-info">
                  <div class="chat-header-name">
                    {{ threadTitle(selectedThread) }}
                  </div>
                  <div class="chat-header-status">
                    <span class="status-dot" :style="{ backgroundColor: getPresenceColor(threadPresenceStatus(selectedThread)) }"></span>
                    {{ selectedThread.isGroup ? "Group Chat" : getPresenceLabel(threadPresenceStatus(selectedThread)) }}
                  </div>
                </div>
              </div>
              <div class="d-flex ga-2 align-center">
                <!-- Search bar -->
                <div class="chat-search-wrapper">
                  <v-text-field
                    v-model="chatSearchQuery"
                    density="compact"
                    variant="outlined"
                    hide-details
                    placeholder="Search messages..."
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    class="chat-search-field"
                    @input="searchInChat"
                    @click:clear="chatSearchResults = []; showSearchResults = false;"
                  />
                </div>
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  class="header-action-btn"
                  :color="selectedThread.isMarked ? 'primary' : undefined"
                  @click="toggleMarked"
                >
                  <v-icon :icon="selectedThread.isMarked ? 'mdi-star' : 'mdi-star-outline'" />
                </v-btn>
                <v-menu location="bottom end">
                  <template #activator="{ props }">
                    <v-btn icon variant="text" size="small" class="header-action-btn" v-bind="props">
                      <v-icon icon="mdi-dots-vertical" />
                    </v-btn>
                  </template>
                  <v-list rounded="lg" class="pa-1">
                    <v-list-item rounded="lg" @click="toggleBlocked">
                      <template #prepend>
                        <v-icon :icon="selectedThread.isBlocked ? 'mdi-lock-open-outline' : 'mdi-block-helper'" size="small" />
                      </template>
                      <v-list-item-title>
                        {{ selectedThread.isBlocked ? "Unblock" : "Block" }}
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </div>

            <!-- Search Results Overlay -->
            <v-card
              v-if="showSearchResults && chatSearchResults.length > 0"
              class="mx-4 mb-2"
              variant="outlined"
              max-height="300"
              style="overflow-y: auto;"
            >
              <v-list density="compact">
                <v-list-subheader>
                  Search Results ({{ chatSearchResults.length }})
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    class="ml-2"
                    @click="showSearchResults = false; chatSearchQuery = '';"
                  >
                    <v-icon size="small">mdi-close</v-icon>
                  </v-btn>
                </v-list-subheader>
                <v-list-item
                  v-for="result in chatSearchResults"
                  :key="result.messageId"
                  class="py-2"
                >
                  <template #prepend>
                    <v-avatar size="32">
                      <v-img :src="result.sender.profileImageUrl || undefined" />
                    </v-avatar>
                  </template>
                  <v-list-item-title class="text-caption font-weight-medium">
                    {{ result.sender.fullName || result.sender.username }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-truncate">
                    {{ result.content }}
                  </v-list-item-subtitle>
                  <template #append>
                    <span class="text-caption text-grey">
                      {{ formatTimeLabel(result.createdAt) }}
                    </span>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>

            <div
              v-if="selectedThread.isBlocked"
              class="blocked-notice"
            >
              <v-icon size="small" class="mr-2">mdi-block-helper</v-icon>
              You blocked this conversation. Unblock to continue chatting.
            </div>

            <div
              class="messages-container"
              ref="messageContainer"
            >
              <div v-if="loadingMessages" class="d-flex justify-center pa-4">
                <v-progress-circular indeterminate color="primary" />
              </div>

              <div v-else>
                <div
                  v-if="hasMoreMessages[selectedThread.threadId]"
                  class="text-center mb-3"
                >
                  <v-btn
                    variant="outlined"
                    size="small"
                    :loading="loadingOlder"
                    @click="loadOlderMessages"
                  >
                    Load previous messages
                  </v-btn>
                </div>

                <div
                  v-if="!messagesForThread.length && !loadingMessages"
                  class="text-center text-grey pa-4"
                >
                  No messages yet. Say hello!
                </div>

                <div
                  v-for="msg in messagesForThread"
                  :key="msg.messageId"
                  class="mb-4"
                  :class="msg.isOwn ? 'text-right' : ''"
                >
                  <div
                    class="d-inline-flex align-end ga-2"
                    :class="msg.isOwn ? 'flex-row-reverse' : ''"
                  >
                    <v-avatar v-if="!msg.isOwn" size="32">
                      <v-img :src="msg.sender.profileImageUrl || undefined" />
                    </v-avatar>
                    <div>
                      <!-- Edit mode -->
                      <div v-if="editingMessageId === msg.messageId" class="d-flex align-center ga-2">
                        <v-text-field
                          v-model="editMessageText"
                          density="compact"
                          hide-details
                          variant="outlined"
                          autofocus
                          :style="{ width: Math.max(150, Math.min(400, editMessageText.length * 10 + 50)) + 'px' }"
                          @keyup.enter="saveEditMessage(msg.messageId)"
                          @keyup.escape="cancelEdit()"
                        />
                        <v-btn icon size="small" color="success" @click="saveEditMessage(msg.messageId)">
                          <v-icon>mdi-check</v-icon>
                        </v-btn>
                        <v-btn icon size="small" color="error" @click="cancelEdit()">
                          <v-icon>mdi-close</v-icon>
                        </v-btn>
                      </div>
                      <!-- Normal message display -->
                      <div
                        v-else
                        class="message-bubble pa-3 rounded-lg position-relative"
                        :class="[
                          msg.isOwn ? 'own-message' : 'other-message',
                          msg.isDeleted ? 'deleted-message' : ''
                        ]"
                        @mouseenter="toggleReactionMenu(msg.messageId)"
                        @mouseleave="reactionMenuMsgId = null"
                        @contextmenu="(e: MouseEvent) => msg.isOwn && !msg.isDeleted && openContextMenu(e, msg.messageId, !!msg.isOwn)"
                      >
                        <span :class="{ 'text-grey font-italic': msg.isDeleted }">
                          {{ msg.content }}
                        </span>
                        <span v-if="msg.isEdited && !msg.isDeleted" class="text-caption text-grey ml-1">(edited)</span>
                        
                        <!-- Context menu for own messages -->
                        <v-menu
                          v-if="msg.isOwn && !msg.isDeleted"
                          :model-value="contextMenuMsgId === msg.messageId"
                          @update:model-value="contextMenuMsgId = $event ? msg.messageId : null"
                          location="bottom"
                          :target="[contextMenuPosition.x, contextMenuPosition.y]"
                        >
                          <v-list density="compact">
                            <v-list-item @click="startEditMessage(msg)">
                              <template #prepend><v-icon size="small">mdi-pencil</v-icon></template>
                              <v-list-item-title>Edit</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="deleteMessage(msg.messageId)">
                              <template #prepend><v-icon size="small" color="error">mdi-delete</v-icon></template>
                              <v-list-item-title class="text-error">Delete</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="copyMessage(msg.content)">
                              <template #prepend><v-icon size="small">mdi-content-copy</v-icon></template>
                              <v-list-item-title>Copy</v-list-item-title>
                            </v-list-item>
                          </v-list>
                        </v-menu>
                        
                        <!-- Add reaction button -->
                        <v-btn
                          v-if="reactionMenuMsgId === msg.messageId && !msg.isDeleted"
                          icon
                          size="x-small"
                          variant="text"
                          class="reaction-add-btn"
                          style="position: absolute; top: -8px; right: -8px;"
                        >
                          <v-icon size="small">mdi-emoticon-outline</v-icon>
                          <v-menu activator="parent" location="top">
                            <v-card class="pa-2">
                              <div class="d-flex ga-1">
                                <v-btn
                                  v-for="emoji in emojiList.slice(0, 6)"
                                  :key="emoji"
                                  icon
                                  size="small"
                                  variant="text"
                                  @click="addReaction(msg.messageId, emoji)"
                                >{{ emoji }}</v-btn>
                              </div>
                            </v-card>
                          </v-menu>
                        </v-btn>
                      </div>
                      <!-- Reactions display -->
                      <div v-if="msg.reactions && msg.reactions.length > 0 && !msg.isDeleted" class="d-flex ga-1 mt-1" :class="msg.isOwn ? 'justify-end' : ''">
                        <v-chip
                          v-for="reaction in msg.reactions"
                          :key="reaction.emoji"
                          size="x-small"
                          :color="reaction.userIds.includes(authStore.user?.userId || '') ? 'primary' : 'grey-lighten-2'"
                          @click="toggleReaction(msg.messageId, reaction.emoji, reaction.userIds.includes(authStore.user?.userId || ''))"
                        >
                          {{ reaction.emoji }} {{ reaction.count }}
                        </v-chip>
                      </div>
                        <div class="text-caption text-medium-emphasis mt-1" :class="msg.isOwn ? 'text-right' : 'text-left'">
                          {{ formatTimeLabel(msg.createdAt) }}
                          <span v-if="msg.isOwn && (msg as any).seenBy" class="ml-1 text-primary">
                            <v-icon size="small" color="primary">mdi-check-all</v-icon> Seen
                          </span>
                        </div>
                    </div>
                    <v-avatar v-if="msg.isOwn" size="32">
                      <v-img :src="authStore.user?.profileImageUrl || undefined" />
                    </v-avatar>
                  </div>
                </div>
              </div>
            </div>

            <!-- Typing indicator -->
            <div v-if="typingUsersText" class="px-4 pb-2 text-caption text-grey-darken-1 typing-indicator">
              <v-icon size="small" class="mr-1">mdi-dots-horizontal</v-icon>
              {{ typingUsersText }}
            </div>

            <!-- Message Input -->
            <div class="message-input-container">
              <div v-if="selectedThread.isBlocked" class="blocked-input-notice">
                <v-icon size="14" class="mr-1">mdi-lock-outline</v-icon>
                Unblock to send new messages.
              </div>

              <!-- Selected file preview -->
              <div v-if="selectedFile" class="mb-2 pa-2 bg-grey-lighten-4 rounded d-flex align-center justify-space-between">
                 <div class="d-flex align-center overflow-hidden">
                    <v-icon icon="mdi-file-document-outline" class="mr-2" color="primary"></v-icon>
                    <span class="text-caption text-truncate">{{ selectedFile.name }} ({{ (selectedFile.size / 1024).toFixed(1) }} KB)</span>
                 </div>
                 <v-btn icon="mdi-close" variant="text" size="x-small" density="comfortable" @click="selectedFile = null; if(fileInputRef) fileInputRef.value = ''">
                   <v-icon>mdi-close</v-icon>
                 </v-btn>
              </div>

              <div class="d-flex align-end ga-2">
                <v-btn icon density="compact" variant="text" class="mr-1" @click="triggerFileUpload" :disabled="selectedThread.isBlocked">
                  <v-icon color="grey-darken-1">mdi-paperclip</v-icon>
                </v-btn>
                <input
                  ref="fileInputRef"
                  type="file"
                  class="d-none"
                  @change="handleFileUpload"
                />

                <v-menu
                  v-model="showEmojiPicker"
                  :close-on-content-click="false"
                  location="top start"
                  offset="10"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon
                      density="compact"
                      variant="text"
                      color="grey-darken-1"
                      v-bind="props"
                      :disabled="selectedThread.isBlocked"
                    >
                      <v-icon>mdi-emoticon-outline</v-icon>
                    </v-btn>
                  </template>
                  <v-card elevation="5">
                    <EmojiPicker :native="true" @select="onSelectEmoji" />
                  </v-card>
                </v-menu>

                <v-textarea
                  v-model="newMessage"
                  placeholder="Type a message..."
                  variant="outlined"
                  hide-details
                  density="compact"
                  auto-grow
                  rows="1"
                  max-rows="5"
                  bg-color="grey-lighten-4"
                  rounded="lg"
                  class="message-input"
                  :disabled="selectedThread.isBlocked"
                  @keydown.enter.exact.prevent="sendMessage"
                  @input="handleTyping"
                />
                
                <v-btn
                  icon
                  density="compact"
                  variant="text"
                  color="primary"
                  :disabled="(!newMessage.trim() && !selectedFile) || selectedThread.isBlocked || sendingMessage"
                  :loading="sendingMessage"
                  @click="sendMessage"
                >
                  <v-icon>mdi-send</v-icon>
                </v-btn>
              </div>
            </div>
          </template>

          <!-- Enhanced Empty State -->
          <div v-else class="empty-chat-state">
            <div class="empty-chat-content">
              <div class="empty-chat-icon-wrapper">
                <div class="empty-chat-icon-bg"></div>
                <v-icon size="56" color="grey-lighten-1">mdi-forum-outline</v-icon>
              </div>
              <h3 class="empty-chat-title">Select a conversation</h3>
              <p class="empty-chat-subtitle">Choose from your existing chats or start a new one</p>
              <v-btn
                class="action-btn mt-4"
                rounded="lg"
                size="default"
                @click="newChatDialog = true"
              >
                <v-icon start>mdi-plus</v-icon>
                Start New Chat
              </v-btn>
            </div>
          </div>
        </v-card>
      </div>
    </div>

      <!-- New Chat Dialog -->
      <v-dialog v-model="newChatDialog" max-width="480" persistent>
        <v-card rounded="xl" class="new-chat-dialog">
          <div class="dialog-header">
            <div class="dialog-icon">
              <v-icon size="24" color="white">mdi-chat-plus-outline</v-icon>
            </div>
            <div class="dialog-header-text">
              <h3 class="dialog-title">Start a Conversation</h3>
              <p class="dialog-subtitle">Select participants to begin chatting</p>
            </div>
          </div>

          <v-divider />

          <v-card-text class="pa-5">
            <div class="form-group">
              <label class="form-label">Participants</label>
              <v-autocomplete
                v-model="selectedParticipantIds"
                :items="participants"
                :item-title="(item) => item.fullName || item.username"
                item-value="userId"
                placeholder="Search and select participants..."
                clearable
                multiple
                chips
                closable-chips
                variant="outlined"
                density="comfortable"
                hide-details
                rounded="lg"
                :menu-props="{ maxHeight: 260 }"
              >
                <template #chip="{ item, props: chipProps }">
                  <v-chip v-bind="chipProps" color="primary" variant="flat" size="small">
                    {{ item.title }}
                  </v-chip>
                </template>
              </v-autocomplete>
            </div>

            <div v-if="selectedParticipantIds.length > 1" class="form-group mt-4">
              <label class="form-label">Group Title</label>
              <v-text-field
                v-model="newChatTitle"
                placeholder="Enter a name for this group..."
                variant="outlined"
                density="comfortable"
                hide-details
                rounded="lg"
              />
            </div>

            <div class="form-group mt-4">
              <label class="form-label">First Message (Optional)</label>
              <v-textarea
                v-model="initialMessage"
                placeholder="Say something to start the conversation..."
                variant="outlined"
                rows="3"
                hide-details
                rounded="lg"
                no-resize
              />
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions class="pa-4 dialog-actions">
            <v-btn
              variant="outlined"
              color="grey-darken-1"
              rounded="lg"
              @click="newChatDialog = false"
            >
              Cancel
            </v-btn>
            <v-btn
              class="create-chat-btn"
              rounded="lg"
              :loading="creatingChat"
              :disabled="!selectedParticipantIds.length"
              @click="createChat"
            >
              <v-icon start>mdi-send</v-icon>
              Start Chat
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
</template>

<style scoped>
/* No Scroll Layout */
.chat-view.no-scroll {
  height: 100%;
  max-height: calc(100vh - 64px - 48px); /* 64px for app bar, 48px for page padding */
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.chat-view {
  padding: 4px;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 24px;
  flex-shrink: 0;
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
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 6px 20px rgba(241, 24, 76, 0.35);
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

.view-toggle {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.view-toggle-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle-item:hover {
  color: #f1184c;
  background: rgba(241, 24, 76, 0.05);
}

.view-toggle-item.active {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(241, 24, 76, 0.4);
}

.action-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white !important;
  font-weight: 600;
  text-transform: none;
  padding: 0 20px;
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.3);
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(241, 24, 76, 0.4);
}

.action-btn-small {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white !important;
  font-weight: 600;
  text-transform: none;
  box-shadow: 0 2px 10px rgba(241, 24, 76, 0.3);
  transition: all 0.3s ease;
}

.action-btn-small:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.4);
}

/* Chat Container - Main Layout */
.chat-container {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chat-sidebar-wrapper {
  width: 340px;
  flex-shrink: 0;
}

.chat-main-wrapper {
  flex: 1;
  min-width: 0;
}

/* Chat Sidebar Styles */
.chat-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 0;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.conversation-count {
  font-weight: 700;
  font-size: 11px;
}

.sidebar-search {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.search-input :deep(.v-field) {
  border-radius: 10px;
}

.thread-list-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.thread-list-container::-webkit-scrollbar {
  width: 5px;
}

.thread-list-container::-webkit-scrollbar-track {
  background: transparent;
}

.thread-list-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
}

.thread-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.15);
}

.empty-threads {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon-wrapper {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.threads-wrapper {
  padding: 8px;
}

.thread-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
  background: transparent;
  position: relative;
}

.thread-item:hover {
  background: #f8fafc;
}

.thread-item--active {
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.08) 0%, rgba(255, 107, 138, 0.08) 100%);
  border-left: 3px solid #f1184c;
}

.thread-item--active:hover {
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.12) 0%, rgba(255, 107, 138, 0.12) 100%);
}

.thread-item--unread .thread-name {
  font-weight: 700;
}

.thread-item--unread .preview-text {
  color: #1e293b;
  font-weight: 500;
}

.thread-avatar-wrapper {
  position: relative;
  margin-right: 12px;
  flex-shrink: 0;
}

.thread-avatar {
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.presence-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: absolute;
  bottom: 0;
  right: 0;
  border: 2.5px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.presence-indicator--active {
  background: linear-gradient(135deg, #22c55e 0%, #4ade80 100%);
}

.presence-indicator--inactive {
  background: linear-gradient(135deg, #eab308 0%, #facc15 100%);
}

.presence-indicator--busy {
  background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
}

.presence-indicator--out_of_office {
  background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
}

.thread-content {
  flex: 1;
  overflow: hidden;
}

.thread-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.thread-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.thread-time {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  flex-shrink: 0;
  margin-left: 8px;
}

.thread-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-text {
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.unread-badge :deep(.v-badge__badge) {
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
}

.load-more-section {
  display: flex;
  justify-content: center;
  padding: 12px 8px;
  border-top: 1px solid #f1f5f9;
}

/* Chat Main Card */
.chat-main-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

/* Chat Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fefefe 0%, #fafbfc 100%);
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.chat-header-avatar {
  position: relative;
  margin-right: 14px;
}

.header-avatar {
  border: 2.5px solid white;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
}

.header-presence-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: absolute;
  bottom: 2px;
  right: 2px;
  border: 2.5px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.chat-header-info {
  display: flex;
  flex-direction: column;
}

.chat-header-name {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}

.chat-header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.chat-search-wrapper {
  width: 180px;
}

.chat-search-field :deep(.v-field) {
  border-radius: 10px;
  font-size: 13px;
}

.header-action-btn {
  border-radius: 8px;
  transition: all 0.2s ease;
}

.header-action-btn:hover {
  background: rgba(241, 24, 76, 0.08);
}

/* Messages Container */
.messages-container {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: linear-gradient(180deg, #f9fafb 0%, #f5f6f8 100%);
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.18);
}

/* Blocked Notice */
.blocked-notice {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #fef3c7;
  color: #92400e;
  font-size: 13px;
  font-weight: 500;
  border-bottom: 1px solid #fcd34d;
}

.blocked-input-notice {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 10px;
}

/* Message Input Container */
.message-input-container {
  padding: 16px 20px;
  background: #ffffff;
  border-top: 1px solid #f1f5f9;
  flex-shrink: 0;
}

/* Empty Chat State */
.empty-chat-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(180deg, #fafbfc 0%, #f8f9fa 100%);
}

.empty-chat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px;
}

.empty-chat-icon-wrapper {
  position: relative;
  margin-bottom: 24px;
}

.empty-chat-icon-bg {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(241, 24, 76, 0.05) 0%, rgba(255, 107, 138, 0.08) 100%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: pulse-gentle 3s ease-in-out infinite;
}

@keyframes pulse-gentle {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0.7;
  }
}

.empty-chat-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.empty-chat-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  max-width: 280px;
}

/* Message Styles */
.cursor-pointer {
  cursor: pointer;
}

.border-b {
  border-bottom: 1px solid #e2e8f0;
}

.border-t {
  border-top: 1px solid #e2e8f0;
}

.message-bubble {
  max-width: 480px;
  word-wrap: break-word;
  display: inline-block;
  width: fit-content;
  transition: all 0.2s ease;
}

.own-message {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white;
  border-radius: 18px 18px 4px 18px;
  box-shadow: 0 3px 12px rgba(241, 24, 76, 0.25);
}

.other-message {
  background: white;
  border: 1px solid #e8ecf0;
  border-radius: 18px 18px 18px 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.deleted-message {
  background: #f8fafc !important;
  color: #94a3b8 !important;
  border: 1px dashed #cbd5e1 !important;
  font-style: italic;
}

.bg-primary-lighten-5 {
  background-color: rgba(241, 24, 76, 0.08) !important;
}

/* Legacy Presence (for header) */
.presence-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: absolute;
  bottom: 0;
  right: 0;
  border: 2px solid white;
}

.presence-active {
  background-color: #22c55e;
}

.presence-inactive {
  background-color: #eab308;
}

.presence-busy {
  background-color: #ef4444;
}

.presence-out_of_office {
  background-color: #6b7280;
}

/* Typing Indicator Animation */
.typing-indicator {
  display: flex;
  align-items: center;
  animation: fade-in 0.3s ease;
  padding: 0 20px 12px;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Message Input Enhancement */
.message-input :deep(.v-field) {
  border-radius: 22px;
}

/* Smooth Scroll Behavior */
.overflow-y-auto {
  scroll-behavior: smooth;
}

/* New Chat Dialog Styles */
.new-chat-dialog {
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
}

.dialog-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-header-text {
  flex: 1;
}

.dialog-title {
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin: 0;
  line-height: 1.3;
}

.dialog-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin: 4px 0 0 0;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.create-chat-btn {
  background: linear-gradient(135deg, #f1184c 0%, #ff6b8a 100%);
  color: white !important;
  font-weight: 600;
  text-transform: none;
  padding: 0 20px;
  box-shadow: 0 4px 15px rgba(241, 24, 76, 0.3);
}

.create-chat-btn:hover {
  box-shadow: 0 6px 20px rgba(241, 24, 76, 0.4);
}

.create-chat-btn:disabled {
  opacity: 0.6;
}
</style>
