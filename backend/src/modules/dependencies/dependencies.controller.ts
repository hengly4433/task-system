import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { DependenciesService } from './dependencies.service';
import { CreateDependencyDto, DependencyResponseDto } from './dto';

@ApiTags('Task Dependencies')
@ApiBearerAuth()
@Controller('tasks/:taskId/dependencies')
export class DependenciesController {
  constructor(private readonly dependenciesService: DependenciesService) {}

  @Post()
  @ApiOperation({ summary: 'Add a dependency to a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID that will have the dependency' })
  @ApiResponse({ status: 201, type: DependencyResponseDto })
  @ApiResponse({ status: 400, description: 'Self-reference or circular dependency' })
  @ApiResponse({ status: 409, description: 'Dependency already exists' })
  async create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateDependencyDto,
  ): Promise<DependencyResponseDto> {
    return this.dependenciesService.create(taskId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all dependencies of a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async findByTask(@Param('taskId') taskId: string): Promise<DependencyResponseDto[]> {
    return this.dependenciesService.findByTask(taskId);
  }

  @Delete(':dependencyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a dependency' })
  @ApiParam({ name: 'dependencyId', description: 'Dependency ID' })
  @ApiResponse({ status: 204, description: 'Dependency removed' })
  @ApiResponse({ status: 404, description: 'Dependency not found' })
  async delete(@Param('dependencyId') dependencyId: string): Promise<void> {
    return this.dependenciesService.delete(dependencyId);
  }
}
