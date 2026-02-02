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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TaskStatusesService } from './task-statuses.service';
import { CreateTaskStatusDto, UpdateTaskStatusDto, ListTaskStatusesQueryDto, ReorderStatusesDto, TaskStatusResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Task Statuses')
@ApiBearerAuth()
@Controller('task-statuses')
@UseGuards(JwtAuthGuard)
export class TaskStatusesController {
  constructor(private readonly service: TaskStatusesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task status' })
  @ApiResponse({ status: 201, description: 'Status created successfully', type: TaskStatusResponseDto })
  async create(@Body() dto: CreateTaskStatusDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all task statuses (paginated)' })
  async findAll(@Query() query: ListTaskStatusesQueryDto) {
    return this.service.findAll(query);
  }

  @Get('by-project')
  @ApiOperation({ summary: 'Get statuses for a project (with department fallback)' })
  async getByProject(@Query('projectId') projectId?: string) {
    return this.service.getStatusesByProject(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a status by ID' })
  @ApiResponse({ status: 200, type: TaskStatusResponseDto })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task status' })
  @ApiResponse({ status: 200, type: TaskStatusResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task status' })
  @ApiResponse({ status: 204, description: 'Status deleted successfully' })
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder task statuses' })
  @ApiResponse({ status: 200, description: 'Statuses reordered successfully', type: [TaskStatusResponseDto] })
  async reorder(@Body() dto: ReorderStatusesDto) {
    return this.service.reorder(dto.statusIds);
  }

  @Post('initialize/:projectId')
  @ApiOperation({ summary: 'Initialize default statuses for a project' })
  @ApiResponse({ status: 201, description: 'Default statuses created', type: [TaskStatusResponseDto] })
  async initializeDefaults(@Param('projectId') projectId: string) {
    return this.service.initializeDefaultStatuses(projectId);
  }
}
