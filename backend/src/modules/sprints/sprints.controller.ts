import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SprintsService } from './sprints.service';
import { CreateSprintDto, UpdateSprintDto, AssignTaskToSprintDto, CreateSprintFromTemplateDto, SprintResponseDto } from './dto';

@ApiTags('Sprints')
@ApiBearerAuth()
@Controller()
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post('sprints')
  @ApiOperation({ summary: 'Create a sprint' })
  async createDirect(@Body() dto: CreateSprintDto): Promise<SprintResponseDto> {
    return this.sprintsService.createDirect(dto);
  }

  @Get('sprints')
  @ApiOperation({ summary: 'Get all sprints' })
  async findAll(@Query('projectId') projectId?: string): Promise<SprintResponseDto[]> {
    if (projectId) {
      return this.sprintsService.findByProject(projectId);
    }
    return this.sprintsService.findAll();
  }

  @Get('sprints/:id')
  @ApiOperation({ summary: 'Get sprint by ID' })
  async findById(@Param('id') id: string): Promise<SprintResponseDto> {
    return this.sprintsService.findById(id);
  }

  @Patch('sprints/:id')
  @ApiOperation({ summary: 'Update a sprint' })
  async update(@Param('id') id: string, @Body() dto: UpdateSprintDto): Promise<SprintResponseDto> {
    return this.sprintsService.update(id, dto);
  }

  @Delete('sprints/:id')
  @ApiOperation({ summary: 'Delete a sprint' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.sprintsService.delete(id);
  }

  @Post('projects/:projectId/sprints')
  @ApiOperation({ summary: 'Create a sprint for a project' })
  async create(@Param('projectId') projectId: string, @Body() dto: CreateSprintDto): Promise<SprintResponseDto> {
    return this.sprintsService.create(projectId, dto);
  }

  @Get('projects/:projectId/sprints')
  @ApiOperation({ summary: 'Get all sprints for a project' })
  async findByProject(@Param('projectId') projectId: string): Promise<SprintResponseDto[]> {
    return this.sprintsService.findByProject(projectId);
  }

  @Patch('tasks/:taskId/sprint')
  @ApiOperation({ summary: 'Assign a task to a sprint' })
  async assignTask(@Param('taskId') taskId: string, @Body() dto: AssignTaskToSprintDto): Promise<void> {
    return this.sprintsService.assignTask(taskId, dto.sprintId);
  }

  @Post('projects/:projectId/sprints/from-template')
  @ApiOperation({ summary: 'Create a sprint from a template' })
  async createFromTemplate(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSprintFromTemplateDto
  ): Promise<SprintResponseDto> {
    return this.sprintsService.createFromTemplate(projectId, dto.templateId);
  }
}

