import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
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
  AddReactionDto,
  EditMessageDto,
  SearchQueryDto,
  SearchResultDto,
  ChatUserDto,
  UpdatePresenceDto,
} from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count across all threads' })
  @ApiResponse({ status: 200, type: Number })
  async getUnreadCount(
    @CurrentUser('userId') userId: bigint,
  ): Promise<number> {
    return this.chatService.getUnreadCount(userId);
  }

  @Get('threads')
  @ApiOperation({ summary: 'List chat threads for current user' })
  @ApiResponse({ status: 200, type: ThreadListResponseDto })
  async listThreads(
    @Query() query: ThreadListQueryDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ThreadListResponseDto> {
    return this.chatService.listThreads(userId, query);
  }

  @Get('threads/:threadId')
  @ApiOperation({ summary: 'Get a single thread' })
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  @ApiResponse({ status: 200, type: ChatThreadDto })
  async getThread(
    @Param('threadId') threadId: string,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ChatThreadDto> {
    return this.chatService.getThread(threadId, userId);
  }

  @Post('threads')
  @ApiOperation({ summary: 'Create a chat thread' })
  @ApiResponse({ status: 201, type: ChatThreadDto })
  async createThread(
    @Body() dto: CreateThreadDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ChatThreadDto> {
    return this.chatService.createThread(dto, userId);
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({ summary: 'Get messages for a thread (paged via cursor)' })
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  @ApiResponse({ status: 200, type: MessagesResponseDto })
  async getMessages(
    @Param('threadId') threadId: string,
    @Query() query: MessageQueryDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<MessagesResponseDto> {
    return this.chatService.getMessages(threadId, query, userId);
  }

  @Post('threads/:threadId/messages')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 messages per minute
  @ApiOperation({ summary: 'Send a message in a thread' })
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  @ApiResponse({ status: 201, type: ChatMessageDto })
  async sendMessage(
    @Param('threadId') threadId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ChatMessageDto> {
    return this.chatService.sendMessage(threadId, dto, userId);
  }

  @Post('threads/:threadId/messages/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Send a message with file attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        content: { type: 'string', description: 'Optional message text' },
      },
      required: ['file'],
    },
  })
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  @ApiResponse({ status: 201, type: ChatMessageDto })
  async sendMessageWithAttachment(
    @Param('threadId') threadId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('content') content: string,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ChatMessageDto> {
    return this.chatService.sendMessageWithFile(threadId, file, content || '', userId);
  }

  @Patch('threads/:threadId/mark')
  @ApiOperation({ summary: 'Mark or unmark a thread (favorite/star)' })
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  @ApiResponse({ status: 200, type: ChatThreadDto })
  async markThread(
    @Param('threadId') threadId: string,
    @Body() dto: SetFlagDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ChatThreadDto> {
    return this.chatService.setMarked(threadId, dto, userId);
  }

  @Patch('threads/:threadId/block')
  @ApiOperation({ summary: 'Block or unblock a thread for the current user' })
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  @ApiResponse({ status: 200, type: ChatThreadDto })
  async blockThread(
    @Param('threadId') threadId: string,
    @Body() dto: SetFlagDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ChatThreadDto> {
    return this.chatService.setBlocked(threadId, dto, userId);
  }

  @Patch('threads/:threadId/read')
  @ApiOperation({ summary: 'Mark messages as read up to a specific message' })
  @ApiParam({ name: 'threadId', description: 'Thread ID' })
  @ApiResponse({ status: 200, type: ChatThreadDto })
  async markRead(
    @Param('threadId') threadId: string,
    @Body() dto: MarkReadDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ChatThreadDto> {
    return this.chatService.markRead(threadId, dto, userId);
  }

  @Post('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Add a reaction to a message' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 201, type: ChatMessageDto })
  async addReaction(
    @Param('messageId') messageId: string,
    @Body() dto: AddReactionDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ChatMessageDto> {
    return this.chatService.addReaction(messageId, dto, userId);
  }

  @Delete('messages/:messageId/reactions/:emoji')
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiParam({ name: 'emoji', description: 'Emoji to remove' })
  @ApiResponse({ status: 200, type: ChatMessageDto })
  async removeReaction(
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ChatMessageDto> {
    return this.chatService.removeReaction(messageId, emoji, userId);
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message (only sender can edit)' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, type: ChatMessageDto })
  async editMessage(
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ChatMessageDto> {
    return this.chatService.editMessage(messageId, dto.content, userId);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message (soft delete, only sender can delete)' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, type: ChatMessageDto })
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ChatMessageDto> {
    return this.chatService.deleteMessage(messageId, userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search messages across all user threads' })
  @ApiResponse({ status: 200, type: SearchResultDto })
  async searchMessages(
    @Query() query: SearchQueryDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<SearchResultDto> {
    return this.chatService.searchMessages(query.q, userId, query.page, query.pageSize);
  }

  @Patch('presence')
  @ApiOperation({ summary: 'Update user presence status' })
  @ApiResponse({ status: 200, type: ChatUserDto })
  async updatePresence(
    @Body() dto: UpdatePresenceDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ChatUserDto> {
    return this.chatService.updatePresence(userId, dto.status);
  }
}
