import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, ListTasksQueryDto, TaskResponseDto } from './dto';
import { PaginatedResult } from '../../common/pagination';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Create a new task in a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Task created', type: TaskResponseDto })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(projectId, dto, userId);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task found', type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findById(@Param('id') id: string): Promise<TaskResponseDto> {
    return this.tasksService.findById(id);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'List all tasks with pagination (filtered by user access)' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  async findAll(
    @Query() query: ListTasksQueryDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<PaginatedResult<TaskResponseDto>> {
    return this.tasksService.findAll(query, userId);
  }

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'List all tasks in a project with pagination' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  async findByProject(
    @Param('projectId') projectId: string,
    @Query() query: ListTasksQueryDto,
  ): Promise<PaginatedResult<TaskResponseDto>> {
    return this.tasksService.findByProject(projectId, query);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated', type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(id, dto, userId);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 204, description: 'Task deleted' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: bigint,
  ): Promise<void> {
    return this.tasksService.softDelete(id, userId);
  }

  @Get('tasks/:id/subtasks')
  @ApiOperation({ summary: 'Get subtasks of a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'List of subtasks', type: [TaskResponseDto] })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getSubtasks(@Param('id') id: string): Promise<TaskResponseDto[]> {
    return this.tasksService.getSubtasks(id);
  }

  @Get('tasks/:id/history')
  @ApiOperation({ summary: 'Get task change history' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task history' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getHistory(@Param('id') id: string): Promise<any[]> {
    return this.tasksService.getHistory(id);
  }
}

