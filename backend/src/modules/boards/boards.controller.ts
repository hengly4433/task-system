import { Controller, Get, Patch, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BoardsService } from './boards.service';
import { MoveTaskDto, BoardViewResponseDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Boards')
@ApiBearerAuth()
@Controller()
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get('projects/:projectId/board')
  @ApiOperation({ summary: 'Get Kanban board view for a project' })
  async getBoardView(@Param('projectId') projectId: string): Promise<BoardViewResponseDto> {
    return this.boardsService.getBoardView(projectId);
  }

  @Patch('tasks/:taskId/move')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Move task to different column/status' })
  async moveTask(@Param('taskId') taskId: string, @Body() dto: MoveTaskDto, @CurrentUser('userId') userId: bigint): Promise<void> {
    return this.boardsService.moveTask(taskId, dto, userId);
  }

  @Patch('tasks/:taskId/progress')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update task progress percentage' })
  async updateProgress(@Param('taskId') taskId: string, @Body() dto: { percentComplete: number }, @CurrentUser('userId') userId: bigint): Promise<void> {
    return this.boardsService.updateTaskProgress(taskId, dto.percentComplete, userId);
  }
}
