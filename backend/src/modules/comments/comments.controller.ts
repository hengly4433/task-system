import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto, CommentResponseDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  async create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<CommentResponseDto> {
    return this.commentsService.create(taskId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all comments for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async findByTask(@Param('taskId') taskId: string): Promise<CommentResponseDto[]> {
    return this.commentsService.findByTask(taskId);
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  async delete(
    @Param('commentId') commentId: string,
    @CurrentUser('userId') userId: bigint,
  ): Promise<void> {
    return this.commentsService.delete(commentId, userId);
  }
}
