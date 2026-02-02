import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SprintTemplatesService } from './sprint-templates.service';
import { CreateSprintTemplateDto, UpdateSprintTemplateDto, ListSprintTemplatesQueryDto, SprintTemplateResponseDto } from './dto';

@ApiTags('Sprint Templates')
@ApiBearerAuth()
@Controller()
export class SprintTemplatesController {
  constructor(private readonly service: SprintTemplatesService) {}

  @Post('sprint-templates')
  @ApiOperation({ summary: 'Create a sprint template' })
  @ApiResponse({ status: 201, description: 'Template created successfully', type: SprintTemplateResponseDto })
  async create(@Body() dto: CreateSprintTemplateDto) {
    return this.service.create(dto);
  }

  @Get('sprint-templates')
  @ApiOperation({ summary: 'Get all sprint templates (paginated)' })
  async findAll(@Query() query: ListSprintTemplatesQueryDto) {
    return this.service.findAll(query);
  }

  @Get('sprint-templates/:id')
  @ApiOperation({ summary: 'Get sprint template by ID' })
  @ApiResponse({ status: 200, type: SprintTemplateResponseDto })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('sprint-templates/:id')
  @ApiOperation({ summary: 'Update a sprint template' })
  @ApiResponse({ status: 200, type: SprintTemplateResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateSprintTemplateDto) {
    return this.service.update(id, dto);
  }

  @Delete('sprint-templates/:id')
  @ApiOperation({ summary: 'Delete a sprint template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Get('departments/:departmentId/sprint-templates')
  @ApiOperation({ summary: 'Get all sprint templates for a department (unpaginated)' })
  @ApiResponse({ status: 200, type: [SprintTemplateResponseDto] })
  async findByDepartment(@Param('departmentId') departmentId: string) {
    return this.service.findByDepartment(departmentId);
  }
}
