import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ChatUserDto {
  @ApiProperty() userId: string;
  @ApiProperty() username: string;
  @ApiPropertyOptional({ nullable: true }) fullName: string | null;
  @ApiPropertyOptional({ nullable: true }) profileImageUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) presenceStatus?: string | null;
  @ApiPropertyOptional({ nullable: true }) lastSeenAt?: string | null;
}

export class ChatParticipantDto {
  @ApiProperty() user: ChatUserDto;
  @ApiProperty() isBlocked: boolean;
  @ApiProperty() isMarked: boolean;
  @ApiPropertyOptional({ nullable: true }) lastReadAt?: string | null;
}

export class ChatReactionDto {
  @ApiProperty() emoji: string;
  @ApiProperty() count: number;
  @ApiProperty({ type: [String] }) userIds: string[];
}

export class ChatMessageDto {
  @ApiProperty() messageId: string;
  @ApiProperty() threadId: string;
  @ApiProperty() content: string;
  @ApiProperty({ type: ChatUserDto }) sender: ChatUserDto;
  @ApiProperty() createdAt: string;
  @ApiPropertyOptional({ nullable: true }) updatedAt?: string | null;
  @ApiProperty() isEdited: boolean;
  @ApiProperty() isDeleted: boolean;
  @ApiPropertyOptional({ nullable: true }) attachmentUrl?: string | null;
  @ApiPropertyOptional({ nullable: true }) attachmentType?: string | null;
  @ApiPropertyOptional({ nullable: true }) attachmentName?: string | null;
  @ApiProperty({ type: [ChatReactionDto] }) reactions: ChatReactionDto[];
}

export class ChatThreadDto {
  @ApiProperty() threadId: string;
  @ApiProperty() isGroup: boolean;
  @ApiPropertyOptional({ nullable: true }) title?: string | null;
  @ApiProperty({ type: [ChatParticipantDto] }) participants: ChatParticipantDto[];
  @ApiPropertyOptional({ type: ChatMessageDto, nullable: true })
  lastMessage?: ChatMessageDto | null;
  @ApiProperty() unreadCount: number;
  @ApiProperty() isBlocked: boolean;
  @ApiProperty() isMarked: boolean;
  @ApiProperty() updatedAt: string;
}

export class ThreadListResponseDto {
  @ApiProperty({ type: [ChatThreadDto] }) data: ChatThreadDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
}

export class MessagesResponseDto {
  @ApiProperty({ type: [ChatMessageDto] }) data: ChatMessageDto[];
  @ApiProperty() hasMore: boolean;
  @ApiPropertyOptional({ nullable: true }) nextCursor?: string | null;
  @ApiProperty() pageSize: number;
}

export class CreateThreadDto {
  @ApiProperty({
    description: 'User IDs to include (current user is added automatically)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  participantIds: string[];

  @ApiPropertyOptional({ description: 'Thread title (used for groups)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Create as group chat', default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isGroup?: boolean;

  @ApiPropertyOptional({ description: 'Initial message text' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  initialMessage?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Message content', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}

export class EditMessageDto {
  @ApiProperty({ description: 'New message content', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  @IsNotEmpty()
  q: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class SearchResultDto {
  @ApiProperty({ type: [ChatMessageDto] }) data: ChatMessageDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
}

export class ThreadListQueryDto {
  @ApiPropertyOptional({ enum: ['all', 'marked', 'blocked'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'marked', 'blocked'])
  filter?: 'all' | 'marked' | 'blocked';

  @ApiPropertyOptional({ description: 'Search by name/title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class MessageQueryDto {
  @ApiPropertyOptional({ description: 'Cursor (messageId) to page older messages' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class SetFlagDto {
  @ApiProperty({ description: 'Flag value' })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  value: boolean;
}

export class MarkReadDto {
  @ApiPropertyOptional({ description: 'Message ID to mark up to' })
  @IsOptional()
  @IsString()
  messageId?: string;
}

export class AddReactionDto {
  @ApiProperty({ description: 'Emoji character(s)', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  emoji: string;
}

export class TypingEventDto {
  @ApiProperty() threadId: string;
  @ApiProperty() userId: string;
  @ApiProperty() username: string;
  @ApiProperty() isTyping: boolean;
}

export class ReactionEventDto {
  @ApiProperty() messageId: string;
  @ApiProperty() threadId: string;
  @ApiProperty() emoji: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: ['add', 'remove'] }) action: 'add' | 'remove';
}

export class UpdatePresenceDto {
  @ApiProperty({ 
    description: 'Presence status',
    enum: ['ACTIVE', 'INACTIVE', 'BUSY', 'OUT_OF_OFFICE'],
  })
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE', 'BUSY', 'OUT_OF_OFFICE'])
  status: string;
}

