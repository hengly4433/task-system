import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { CreateReminderDto, ReminderResponseDto } from './dto';

@ApiTags('Reminders')
@ApiBearerAuth()
@Controller('tasks/:taskId/reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a reminder for a task' })
  async create(@Param('taskId') taskId: string, @Body() dto: CreateReminderDto): Promise<ReminderResponseDto> {
    return this.remindersService.create(taskId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reminders for a task' })
  async findByTask(@Param('taskId') taskId: string): Promise<ReminderResponseDto[]> {
    return this.remindersService.findByTask(taskId);
  }

  @Delete(':reminderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a reminder' })
  async delete(@Param('reminderId') reminderId: string): Promise<void> {
    return this.remindersService.delete(reminderId);
  }
}
