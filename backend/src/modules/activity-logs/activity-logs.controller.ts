import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { ListActivityLogsQueryDto, ActivityLogResponseDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get activity logs for current user' })
  async findByUser(@CurrentUser('userId') userId: bigint, @Query() query: ListActivityLogsQueryDto): Promise<ActivityLogResponseDto[]> {
    return this.activityLogsService.findByUser(userId, query);
  }

  @Get()
  @ApiOperation({ summary: 'Get all activity logs (admin)' })
  async findAll(@Query() query: ListActivityLogsQueryDto): Promise<ActivityLogResponseDto[]> {
    return this.activityLogsService.findAll(query);
  }
}
