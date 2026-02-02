import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LabelsService } from './labels.service';
import { CreateLabelDto, AssignLabelDto, LabelResponseDto } from './dto';

@ApiTags('Labels')
@ApiBearerAuth()
@Controller()
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post('labels')
  @ApiOperation({ summary: 'Create a new label' })
  async create(@Body() dto: CreateLabelDto): Promise<LabelResponseDto> {
    return this.labelsService.create(dto);
  }

  @Get('labels')
  @ApiOperation({ summary: 'Get all labels' })
  async findAll(): Promise<LabelResponseDto[]> {
    return this.labelsService.findAll();
  }

  @Post('tasks/:taskId/labels')
  @ApiOperation({ summary: 'Assign a label to a task' })
  async assignToTask(@Param('taskId') taskId: string, @Body() dto: AssignLabelDto): Promise<void> {
    return this.labelsService.assignToTask(taskId, dto.labelId);
  }

  @Delete('tasks/:taskId/labels/:labelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a label from a task' })
  async unassignFromTask(@Param('taskId') taskId: string, @Param('labelId') labelId: string): Promise<void> {
    return this.labelsService.unassignFromTask(taskId, labelId);
  }

  @Get('tasks/:taskId/labels')
  @ApiOperation({ summary: 'Get all labels for a task' })
  async getTaskLabels(@Param('taskId') taskId: string): Promise<LabelResponseDto[]> {
    return this.labelsService.getTaskLabels(taskId);
  }
}
