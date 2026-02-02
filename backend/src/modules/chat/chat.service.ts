import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { StorageService } from '../../common/storage';
import { sanitizeRichText } from '../../common/utils';
import {
  ChatMessageDto,
  ChatThreadDto,
  CreateThreadDto,
  MarkReadDto,
  MessageQueryDto,
  MessagesResponseDto,
  SendMessageDto,
  SetFlagDto,
  ThreadListQueryDto,
  ThreadListResponseDto,
  ChatParticipantDto,
  ChatUserDto,
  ChatReactionDto,
  AddReactionDto,
} from './dto';
import { ChatGateway } from './chat.gateway';
import { TenantContextService } from '../../common/tenant';

const USER_SELECT = {
  userId: true,
  username: true,
  fullName: true,
  profileImageUrl: true,
  presenceStatus: true,
  lastSeenAt: true,
} as const;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly storageService: StorageService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private toUserDto(user: any): ChatUserDto {
    return {
      userId: user.userId.toString(),
      username: user.username,
      fullName: user.fullName || null,
      profileImageUrl: user.profileImageUrl || null,
      presenceStatus: user.presenceStatus || 'ACTIVE',
      lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
    };
  }

  private toParticipantDto(participant: any): ChatParticipantDto {
    return {
      user: this.toUserDto(participant.user),
      isBlocked: participant.isBlocked,
      isMarked: participant.isMarked,
      lastReadAt: participant.lastReadAt
        ? participant.lastReadAt.toISOString()
        : null,
    };
  }

  private aggregateReactions(reactions: any[]): ChatReactionDto[] {
    const map = new Map<string, { emoji: string; count: number; userIds: string[] }>();
    for (const r of reactions) {
      if (!map.has(r.emoji)) {
        map.set(r.emoji, { emoji: r.emoji, count: 0, userIds: [] });
      }
      const entry = map.get(r.emoji)!;
      entry.count += 1;
      entry.userIds.push(r.userId.toString());
    }
    return Array.from(map.values());
  }

  private toMessageDto(message: any): ChatMessageDto {
    const isDeleted = !!message.deletedAt;
    return {
      messageId: message.messageId.toString(),
      threadId: message.threadId.toString(),
      content: isDeleted ? '[This message was deleted]' : message.content,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt ? message.updatedAt.toISOString() : null,
      isEdited: message.isEdited || false,
      isDeleted,
      sender: this.toUserDto(message.sender),
      attachmentUrl: isDeleted ? null : (message.attachmentUrl || null),
      attachmentType: isDeleted ? null : (message.attachmentType || null),
      attachmentName: isDeleted ? null : (message.attachmentName || null),
      reactions: this.aggregateReactions(message.reactions || []),
    };
  }

  private async toThreadDto(
    thread: any,
    userId: bigint,
    unreadCount: number,
    lastMessage?: any | null,
  ): Promise<ChatThreadDto> {
    const participant = thread.participants.find(
      (p: any) => p.userId === userId,
    );

    return {
      threadId: thread.threadId.toString(),
      isGroup: thread.isGroup,
      title: thread.title,
      participants: thread.participants.map((p: any) =>
        this.toParticipantDto(p),
      ),
      lastMessage: lastMessage ? this.toMessageDto(lastMessage) : null,
      unreadCount,
      isBlocked: participant?.isBlocked ?? false,
      isMarked: participant?.isMarked ?? false,
      updatedAt: thread.updatedAt.toISOString(),
    };
  }

  private async ensureMembership(threadId: string, userId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    const thread = await this.prisma.chatThread.findFirst({
      where: {
        threadId: BigInt(threadId),
        tenantId,
        deletedAt: null,
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: {
              select: USER_SELECT,
            },
          },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found or inaccessible');
    }

    const participant = thread.participants.find((p: any) => p.userId === userId);
    return { thread, participant };
  }

  private async buildThreadSummary(threadId: bigint, userId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    const thread = await this.prisma.chatThread.findFirst({
      where: { threadId, tenantId, deletedAt: null },
      include: {
        participants: {
          include: {
            user: {
              select: USER_SELECT,
            },
          },
        },
        messages: {
          where: { deletedAt: null },
          include: { sender: { select: USER_SELECT } },
          orderBy: { messageId: 'desc' },
          take: 1,
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const participant = thread.participants.find((p: any) => p.userId === userId);
    const lastReadAt = participant?.lastReadAt;

    const unreadCount = await this.prisma.chatMessage.count({
      where: {
        threadId,
        deletedAt: null,
        senderId: { not: userId },
        ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
      },
    });

    return this.toThreadDto(
      thread,
      userId,
      unreadCount,
      thread.messages[0] || null,
    );
  }

  async listThreads(
    userId: bigint,
    query: ThreadListQueryDto,
  ): Promise<ThreadListResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);

    const participantFilter: any = { userId };
    if (query.filter === 'marked') {
      participantFilter.isMarked = true;
    } else if (query.filter === 'blocked') {
      participantFilter.isBlocked = true;
    }

    const where: any = {
      tenantId,
      deletedAt: null,
      participants: { some: participantFilter },
    };

    if (query.search) {
      const search = query.search;
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        {
          participants: {
            some: {
              user: {
                OR: [
                  { username: { contains: search, mode: 'insensitive' } },
                  { fullName: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ];
    }

    const [threads, total] = await Promise.all([
      this.prisma.chatThread.findMany({
        where,
        include: {
          participants: {
            include: {
              user: { select: USER_SELECT },
            },
          },
          messages: {
            where: { deletedAt: null },
            include: { sender: { select: USER_SELECT } },
            orderBy: { messageId: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.chatThread.count({ where }),
    ]);

    // Batch unread count query - N+1 optimization
    const threadIds = threads.map(t => t.threadId);
    const unreadCounts = new Map<bigint, number>();
    
    if (threadIds.length > 0) {
      // Get participant last read times for all threads at once
      const participantData = await this.prisma.chatParticipant.findMany({
        where: {
          threadId: { in: threadIds },
          userId,
        },
        select: { threadId: true, lastReadAt: true },
      });
      
      const lastReadMap = new Map(participantData.map(p => [p.threadId, p.lastReadAt]));
      
      // Count unread messages for each thread
      for (const threadId of threadIds) {
        const lastReadAt = lastReadMap.get(threadId);
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            threadId,
            deletedAt: null,
            senderId: { not: userId },
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        });
        unreadCounts.set(threadId, unreadCount);
      }
    }

    const data: ChatThreadDto[] = [];

    for (const thread of threads) {
      data.push(
        await this.toThreadDto(
          thread,
          userId,
          unreadCounts.get(thread.threadId) || 0,
          thread.messages[0] || null,
        ),
      );
    }

    return { data, total, page, pageSize };
  }

  async getUnreadCount(userId: bigint): Promise<number> {
    const tenantId = this.tenantContext.requireTenantId();
    // Get all thread IDs where user is a participant
    const participations = await this.prisma.chatParticipant.findMany({
      where: { 
        userId,
        thread: {
          tenantId,
        },
      },
      select: { threadId: true, lastReadAt: true },
    });

    let totalUnread = 0;
    for (const p of participations) {
      const unread = await this.prisma.chatMessage.count({
        where: {
          threadId: p.threadId,
          deletedAt: null,
          senderId: { not: userId },
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });
      totalUnread += unread;
    }

    return totalUnread;
  }

  async getThread(threadId: string, userId: bigint): Promise<ChatThreadDto> {
    return this.buildThreadSummary(BigInt(threadId), userId);
  }

  async createThread(
    dto: CreateThreadDto,
    userId: bigint,
  ): Promise<ChatThreadDto> {
    const participantIds = Array.from(
      new Set([...dto.participantIds, userId.toString()]),
    );

    if (participantIds.length < 2) {
      throw new BadRequestException('Add at least one participant');
    }

    const isGroup = dto.isGroup ?? participantIds.length > 2;
    let thread = null;

    // Reuse existing direct thread if possible
    if (!isGroup && participantIds.length === 2) {
      const otherId = BigInt(
        participantIds.find((id) => id !== userId.toString()) as string,
      );

      const tenantId = this.tenantContext.requireTenantId();
      thread = await this.prisma.chatThread.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          isGroup: false,
          participants: {
            every: { userId: { in: [userId, otherId] } },
          },
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: otherId } } },
          ],
        },
        include: {
          participants: {
            include: { user: { select: USER_SELECT } },
          },
          messages: {
            where: { deletedAt: null },
            include: { sender: { select: USER_SELECT } },
            orderBy: { messageId: 'desc' },
            take: 1,
          },
        },
      });
    }

    if (!thread) {
      // Use transaction for atomicity when creating new thread
      thread = await this.prisma.$transaction(async (tx) => {
        const newThread = await tx.chatThread.create({
          data: {
            title: dto.title || null,
            isGroup,
            createdBy: userId,
            tenantId: this.tenantContext.requireTenantId(),
            participants: {
              create: participantIds.map((id) => ({
                userId: BigInt(id),
              })),
            },
          },
          include: {
            participants: {
              include: { user: { select: USER_SELECT } },
            },
            messages: {
              where: { deletedAt: null },
              include: { sender: { select: USER_SELECT } },
              orderBy: { messageId: 'desc' },
              take: 1,
            },
          },
        });
        return newThread;
      });
    }

    // Access messages from the already populated include
    const threadMessages = (thread as any).messages || [];
    let lastMessage = threadMessages[0] || null;

    if (dto.initialMessage) {
      // Sanitize initial message content
      const sanitizedContent = sanitizeRichText(dto.initialMessage);
      const createdMessage = await this.prisma.chatMessage.create({
        data: {
          threadId: thread.threadId,
          senderId: userId,
          content: sanitizedContent,
        },
        include: { sender: { select: USER_SELECT } },
      });
      lastMessage = createdMessage;
      await this.prisma.chatThread.update({
        where: { threadId: thread.threadId },
        data: { updatedAt: new Date() },
      });
    }

    const response = await this.toThreadDto(
      thread,
      userId,
      0,
      lastMessage,
    );

    // Access participants from the already populated include
    const threadParticipants = (thread as any).participants || [];
    const participantUserIds = threadParticipants.map((p: any) => p.userId);
    await Promise.all(
      participantUserIds.map(async (pid: bigint) => {
        if (pid === userId) {
          this.chatGateway.sendThreadUpdate([pid], { thread: response });
          return;
        }
        const summary = await this.buildThreadSummary(thread.threadId, pid);
        this.chatGateway.sendThreadUpdate([pid], { thread: summary });
      }),
    );

    if (lastMessage) {
      this.chatGateway.sendMessageToUsers(participantUserIds, {
        threadId: thread.threadId.toString(),
        message: this.toMessageDto(lastMessage),
      });
    }

    return response;
  }

  async getMessages(
    threadId: string,
    query: MessageQueryDto,
    userId: bigint,
  ): Promise<MessagesResponseDto> {
    await this.ensureMembership(threadId, userId);
    const take = Math.min(query.pageSize ?? 30, 100);

    const messages = await this.prisma.chatMessage.findMany({
      where: { threadId: BigInt(threadId), deletedAt: null },
      include: { sender: { select: USER_SELECT }, reactions: true },
      orderBy: { messageId: 'desc' },
      take,
      ...(query.cursor
        ? { cursor: { messageId: BigInt(query.cursor) }, skip: 1 }
        : {}),
    });

    const hasMore =
      messages.length === take
        ? (await this.prisma.chatMessage.count({
            where: {
              threadId: BigInt(threadId),
              deletedAt: null,
              messageId: {
                lt: messages[messages.length - 1].messageId,
              },
            },
          })) > 0
        : false;

    return {
      data: messages.reverse().map((m) => this.toMessageDto(m)),
      hasMore,
      nextCursor: hasMore
        ? messages[messages.length - 1].messageId.toString()
        : null,
      pageSize: take,
    };
  }

  async sendMessage(
    threadId: string,
    dto: SendMessageDto,
    userId: bigint,
  ): Promise<ChatMessageDto> {
    const { thread, participant } = await this.ensureMembership(
      threadId,
      userId,
    );

    if (participant?.isBlocked) {
      throw new ForbiddenException('You have blocked this conversation');
    }

    // Sanitize content to prevent XSS
    const sanitizedContent = sanitizeRichText(dto.content);

    const message = await this.prisma.chatMessage.create({
      data: {
        threadId: BigInt(threadId),
        senderId: userId,
        content: sanitizedContent,
      },
      include: { sender: { select: USER_SELECT }, reactions: true },
    });

    await this.prisma.chatThread.update({
      where: { threadId: BigInt(threadId) },
      data: { updatedAt: new Date() },
    });

    const dtoMessage = this.toMessageDto(message);
    const participantUserIds = thread.participants.map((p: any) => p.userId);
    this.chatGateway.sendMessageToUsers(participantUserIds, {
      threadId: thread.threadId.toString(),
      message: dtoMessage,
    });

    await Promise.all(
      participantUserIds.map(async (pid: bigint) => {
        const summary = await this.buildThreadSummary(thread.threadId, pid);
        this.chatGateway.sendThreadUpdate([pid], { thread: summary });
      }),
    );

    return dtoMessage;
  }

  async setMarked(
    threadId: string,
    dto: SetFlagDto,
    userId: bigint,
  ): Promise<ChatThreadDto> {
    await this.ensureMembership(threadId, userId);

    await this.prisma.chatParticipant.update({
      where: {
        threadId_userId: {
          threadId: BigInt(threadId),
          userId,
        },
      },
      data: { isMarked: dto.value },
    });

    return this.buildThreadSummary(BigInt(threadId), userId);
  }

  async setBlocked(
    threadId: string,
    dto: SetFlagDto,
    userId: bigint,
  ): Promise<ChatThreadDto> {
    await this.ensureMembership(threadId, userId);

    await this.prisma.chatParticipant.update({
      where: {
        threadId_userId: {
          threadId: BigInt(threadId),
          userId,
        },
      },
      data: { isBlocked: dto.value },
    });

    return this.buildThreadSummary(BigInt(threadId), userId);
  }
  async markRead(
    threadId: string,
    dto: MarkReadDto,
    userId: bigint,
  ): Promise<ChatThreadDto> {
    await this.ensureMembership(threadId, userId);

    let lastReadAt = new Date();
    if (dto.messageId) {
      const tenantId = this.tenantContext.requireTenantId();
      const message = await this.prisma.chatMessage.findFirst({
        where: { 
          messageId: BigInt(dto.messageId), 
          threadId: BigInt(threadId),
          thread: {
            tenantId,
          },
        },
      });
      if (message) {
        lastReadAt = message.createdAt;
      }
    }

    await this.prisma.chatParticipant.update({
      where: {
        threadId_userId: {
          threadId: BigInt(threadId),
          userId,
        },
      },
      data: { lastReadAt },
    });

    // Broadcast read event to other participants in the thread
    this.chatGateway.broadcastRead(BigInt(threadId), userId, lastReadAt);

    return this.buildThreadSummary(BigInt(threadId), userId);
  }

  async addReaction(
    messageId: string,
    dto: AddReactionDto,
    userId: bigint,
  ): Promise<ChatMessageDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const message = await this.prisma.chatMessage.findFirst({
      where: { 
        messageId: BigInt(messageId), 
        deletedAt: null,
        thread: {
          tenantId,
        },
      },
      include: { thread: { include: { participants: true } } },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const isParticipant = message.thread.participants.some(
      (p: any) => p.userId === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant of this thread');
    }

    await this.prisma.chatMessageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId: BigInt(messageId),
          userId,
          emoji: dto.emoji,
        },
      },
      create: {
        messageId: BigInt(messageId),
        userId,
        emoji: dto.emoji,
      },
      update: {},
    });

    const updatedMessage = await this.prisma.chatMessage.findUnique({
      where: { messageId: BigInt(messageId) },
      include: { sender: { select: USER_SELECT }, reactions: true },
    });

    const participantUserIds = message.thread.participants.map((p: any) => p.userId);
    this.chatGateway.broadcastReaction(participantUserIds, {
      messageId,
      threadId: message.threadId.toString(),
      emoji: dto.emoji,
      userId: userId.toString(),
      action: 'add',
    });

    return this.toMessageDto(updatedMessage);
  }

  async removeReaction(
    messageId: string,
    emoji: string,
    userId: bigint,
  ): Promise<ChatMessageDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const message = await this.prisma.chatMessage.findFirst({
      where: { 
        messageId: BigInt(messageId), 
        deletedAt: null,
        thread: {
          tenantId,
        },
      },
      include: { thread: { include: { participants: true } } },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const isParticipant = message.thread.participants.some(
      (p: any) => p.userId === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant of this thread');
    }

    await this.prisma.chatMessageReaction.deleteMany({
      where: {
        messageId: BigInt(messageId),
        userId,
        emoji,
      },
    });

    const updatedMessage = await this.prisma.chatMessage.findUnique({
      where: { messageId: BigInt(messageId) },
      include: { sender: { select: USER_SELECT }, reactions: true },
    });

    const participantUserIds = message.thread.participants.map((p: any) => p.userId);
    this.chatGateway.broadcastReaction(participantUserIds, {
      messageId,
      threadId: message.threadId.toString(),
      emoji,
      userId: userId.toString(),
      action: 'remove',
    });

    return this.toMessageDto(updatedMessage);
  }

  async sendMessageWithAttachment(
    threadId: string,
    content: string,
    attachmentUrl: string,
    attachmentType: string,
    attachmentName: string,
    userId: bigint,
  ): Promise<ChatMessageDto> {
    const { thread, participant } = await this.ensureMembership(threadId, userId);

    if (participant?.isBlocked) {
      throw new ForbiddenException('You have blocked this conversation');
    }

    // Sanitize content to prevent XSS
    const sanitizedContent = sanitizeRichText(content);

    const message = await this.prisma.chatMessage.create({
      data: {
        threadId: BigInt(threadId),
        senderId: userId,
        content: sanitizedContent,
        attachmentUrl,
        attachmentType,
        attachmentName,
      },
      include: { sender: { select: USER_SELECT }, reactions: true },
    });

    await this.prisma.chatThread.update({
      where: { threadId: BigInt(threadId) },
      data: { updatedAt: new Date() },
    });

    const dtoMessage = this.toMessageDto(message);
    const participantUserIds = thread.participants.map((p: any) => p.userId);
    this.chatGateway.sendMessageToUsers(participantUserIds, {
      threadId: thread.threadId.toString(),
      message: dtoMessage,
    });

    await Promise.all(
      participantUserIds.map(async (pid: bigint) => {
        const summary = await this.buildThreadSummary(thread.threadId, pid);
        this.chatGateway.sendThreadUpdate([pid], { thread: summary });
      }),
    );

    return dtoMessage;
  }

  /**
   * Edit a message (only the sender can edit)
   */
  async editMessage(
    messageId: string,
    content: string,
    userId: bigint,
  ): Promise<ChatMessageDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const message = await this.prisma.chatMessage.findFirst({
      where: { 
        messageId: BigInt(messageId),
        thread: {
          tenantId,
        },
      },
      include: {
        sender: { select: USER_SELECT },
        thread: { include: { participants: true } },
        reactions: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    if (message.deletedAt) {
      throw new BadRequestException('Cannot edit a deleted message');
    }

    // Sanitize content to prevent XSS
    const sanitizedContent = sanitizeRichText(content);

    const updated = await this.prisma.chatMessage.update({
      where: { messageId: BigInt(messageId) },
      data: {
        content: sanitizedContent,
        isEdited: true,
        updatedAt: new Date(),
      },
      include: { sender: { select: USER_SELECT }, reactions: true },
    });

    const dtoMessage = this.toMessageDto(updated);
    
    // Broadcast edit to all participants
    const participantUserIds = message.thread.participants.map((p: any) => p.userId);
    this.chatGateway.broadcastMessageEdit(participantUserIds, {
      threadId: message.threadId.toString(),
      message: dtoMessage,
    });

    return dtoMessage;
  }

  /**
   * Delete a message (soft delete - only the sender can delete)
   */
  async deleteMessage(
    messageId: string,
    userId: bigint,
  ): Promise<ChatMessageDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const message = await this.prisma.chatMessage.findFirst({
      where: { 
        messageId: BigInt(messageId),
        thread: {
          tenantId,
        },
      },
      include: {
        sender: { select: USER_SELECT },
        thread: { include: { participants: true } },
        reactions: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    if (message.deletedAt) {
      throw new BadRequestException('Message is already deleted');
    }

    const updated = await this.prisma.chatMessage.update({
      where: { messageId: BigInt(messageId) },
      data: { deletedAt: new Date() },
      include: { sender: { select: USER_SELECT }, reactions: true },
    });

    const dtoMessage = this.toMessageDto(updated);
    
    // Broadcast delete to all participants
    const participantUserIds = message.thread.participants.map((p: any) => p.userId);
    this.chatGateway.broadcastMessageDelete(participantUserIds, {
      threadId: message.threadId.toString(),
      messageId: message.messageId.toString(),
      message: dtoMessage,
    });

    return dtoMessage;
  }

  /**
   * Search messages across all threads the user participates in
   */
  async searchMessages(
    query: string,
    userId: bigint,
    page = 1,
    pageSize = 20,
  ): Promise<{ data: ChatMessageDto[]; total: number; page: number; pageSize: number }> {
    const tenantId = this.tenantContext.requireTenantId();
    // Get thread IDs where user is a participant
    const userThreads = await this.prisma.chatParticipant.findMany({
      where: { 
        userId,
        thread: {
          tenantId,
        },
      },
      select: { threadId: true },
    });
    const threadIds = userThreads.map((t) => t.threadId);

    if (threadIds.length === 0) {
      return { data: [], total: 0, page, pageSize };
    }

    const skip = (page - 1) * pageSize;

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: {
          threadId: { in: threadIds },
          deletedAt: null,
          content: { contains: query, mode: 'insensitive' },
        },
        include: { sender: { select: USER_SELECT }, reactions: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.chatMessage.count({
        where: {
          threadId: { in: threadIds },
          deletedAt: null,
          content: { contains: query, mode: 'insensitive' },
        },
      }),
    ]);

    return {
      data: messages.map((m) => this.toMessageDto(m)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Send a message with a file attachment
   */
  async sendMessageWithFile(
    threadId: string,
    file: Express.Multer.File,
    content: string,
    userId: bigint,
  ): Promise<ChatMessageDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const thread = await this.prisma.chatThread.findFirst({
      where: { 
        threadId: BigInt(threadId),
        tenantId,
      },
      include: { participants: { include: { user: true } } },
    });

    if (!thread) throw new NotFoundException('Thread not found');
    const isMember = thread.participants.some((p) => p.userId === userId);
    if (!isMember) throw new ForbiddenException('Not a thread participant');

    const participant = thread.participants.find((p) => p.userId === userId);
    if (participant?.isBlocked) {
      throw new ForbiddenException('You are blocked from this conversation');
    }

    // Upload file to Supabase storage
    const uploadResult = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      `chat/${threadId}`,
    );

    // Determine attachment type
    let attachmentType = 'file';
    if (file.mimetype.startsWith('image/')) {
      attachmentType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      attachmentType = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      attachmentType = 'audio';
    }

    // Create the message with attachment
    const message = await this.prisma.chatMessage.create({
      data: {
        threadId: BigInt(threadId),
        senderId: userId,
        content: content || file.originalname,
        attachmentUrl: uploadResult.publicUrl,
        attachmentType,
        attachmentName: file.originalname,
      },
      include: { sender: { select: USER_SELECT }, reactions: true },
    });

    await this.prisma.chatThread.update({
      where: { threadId: BigInt(threadId) },
      data: { updatedAt: new Date() },
    });

    const dtoMessage = this.toMessageDto(message);
    const participantUserIds = thread.participants.map((p: any) => p.userId);
    this.chatGateway.sendMessageToUsers(participantUserIds, {
      threadId: thread.threadId.toString(),
      message: dtoMessage,
    });

    await Promise.all(
      participantUserIds.map(async (pid: bigint) => {
        const summary = await this.buildThreadSummary(thread.threadId, pid);
        this.chatGateway.sendThreadUpdate([pid], { thread: summary });
      }),
    );

    return dtoMessage;
  }

  /**
   * Update user presence status
   */
  async updatePresence(userId: bigint, status: string): Promise<ChatUserDto> {
    const user = await this.prisma.user.update({
      where: { userId },
      data: { presenceStatus: status, lastSeenAt: new Date() },
    });

    const dtoUser = this.toUserDto(user);
    this.chatGateway.broadcastPresence(userId, status);
    
    return dtoUser;
  }
}
