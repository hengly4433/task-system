import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TimeEntriesService } from './time-entries.service';
import { 
  CreateTimeEntryDto, 
  UpdateTimeEntryDto, 
  TimeEntryFiltersDto,
  TimeEntryResponseDto, 
  WeeklyTimesheetResponseDto,
} from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Time Entries')
@ApiBearerAuth()
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a time entry (or update if exists for same task/date)' })
  async create(
    @Body() dto: CreateTimeEntryDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<TimeEntryResponseDto> {
    return this.timeEntriesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all time entries for current user' })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAll(
    @Query() filters: TimeEntryFiltersDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<{ data: TimeEntryResponseDto[], total: number }> {
    return this.timeEntriesService.findAll(filters, userId);
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly timesheet data grouped by task' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date of the week (YYYY-MM-DD)' })
  async getWeekly(
    @Query('startDate') startDate: string,
    @CurrentUser('userId') userId: bigint,
  ): Promise<WeeklyTimesheetResponseDto> {
    return this.timeEntriesService.findWeekly(startDate, userId);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get all time entries for a specific task' })
  async findByTask(@Param('taskId') taskId: string): Promise<TimeEntryResponseDto[]> {
    return this.timeEntriesService.findByTask(taskId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a time entry' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTimeEntryDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<TimeEntryResponseDto> {
    return this.timeEntriesService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a time entry' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: bigint,
  ): Promise<void> {
    return this.timeEntriesService.delete(id, userId);
  }
}
