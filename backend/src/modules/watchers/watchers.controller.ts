import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { WatchersService } from './watchers.service';
import { AddWatcherDto, WatcherResponseDto } from './dto';

@ApiTags('Task Watchers')
@ApiBearerAuth()
@Controller('tasks/:taskId/watchers')
export class WatchersController {
  constructor(private readonly watchersService: WatchersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all watchers for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'List of watchers', type: [WatcherResponseDto] })
  async findByTask(@Param('taskId') taskId: string): Promise<WatcherResponseDto[]> {
    return this.watchersService.findByTask(taskId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a watcher to a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 201, description: 'Watcher added', type: WatcherResponseDto })
  @ApiResponse({ status: 404, description: 'Task or user not found' })
  @ApiResponse({ status: 409, description: 'User is already watching' })
  async addWatcher(
    @Param('taskId') taskId: string,
    @Body() dto: AddWatcherDto,
  ): Promise<WatcherResponseDto> {
    return this.watchersService.addWatcher(taskId, dto.userId.toString());
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a watcher from a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: 204, description: 'Watcher removed' })
  @ApiResponse({ status: 404, description: 'Watcher not found' })
  async removeWatcher(
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.watchersService.removeWatcher(taskId, userId);
  }
}
