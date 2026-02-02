import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Milestones')
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new milestone' })
  create(@Body() dto: CreateMilestoneDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all milestones defined (optionally by project)' })
  findAll(@Query('projectId') projectId?: string) {
    if (projectId) {
      return this.service.findByProject(projectId);
    }
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get milestone by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update milestone' })
  update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete milestone' })
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
