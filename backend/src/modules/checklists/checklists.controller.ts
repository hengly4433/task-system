import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto, CreateChecklistItemDto, UpdateChecklistItemDto, ChecklistResponseDto } from './dto';

@ApiTags('Checklists')
@ApiBearerAuth()
@Controller('tasks/:taskId/checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a checklist for a task' })
  async createChecklist(@Param('taskId') taskId: string, @Body() dto: CreateChecklistDto): Promise<ChecklistResponseDto> {
    return this.checklistsService.createChecklist(taskId, dto);
  }

  @Post(':checklistId/items')
  @ApiOperation({ summary: 'Add an item to a checklist' })
  async addItem(@Param('checklistId') checklistId: string, @Body() dto: CreateChecklistItemDto): Promise<ChecklistResponseDto> {
    return this.checklistsService.addItem(checklistId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Toggle or update a checklist item' })
  async toggleItem(@Param('itemId') itemId: string, @Body() dto: UpdateChecklistItemDto): Promise<ChecklistResponseDto> {
    return this.checklistsService.toggleItem(itemId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all checklists for a task' })
  async findByTask(@Param('taskId') taskId: string): Promise<ChecklistResponseDto[]> {
    return this.checklistsService.findByTask(taskId);
  }
}
