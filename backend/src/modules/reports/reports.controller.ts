import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ProjectReportDto, TeamPerformanceDto, TimeSummaryDto, DashboardSummaryDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary for current user' })
  async getDashboard(@CurrentUser('userId') userId: bigint): Promise<DashboardSummaryDto> {
    return this.reportsService.getDashboardSummary(userId);
  }

  @Get('tasks-completed')
  @ApiOperation({ summary: 'Get tasks completed chart data' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getTasksCompletedChart(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser('userId') userId: bigint,
  ) {
    return this.reportsService.getTasksCompletedChart(startDate, endDate, userId);
  }

  @Get('spent-time')
  @ApiOperation({ summary: 'Get spent time by project/department' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'teamId', required: false, type: String })
  async getSpentTimeByDepartment(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.reportsService.getSpentTimeByDepartment(startDate, endDate, teamId);
  }

  @Get('team-performance')
  @ApiOperation({ summary: 'Get global team performance stats' })
  @ApiQuery({ name: 'teamId', required: false, type: String })
  async getTeamPerformance(@Query('teamId') teamId?: string) {
    return this.reportsService.getGlobalTeamPerformance(teamId);
  }

  @Get('timesheet-summary')
  @ApiOperation({ summary: 'Get timesheet summary chart data' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getTimesheetSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getTimesheetSummary(startDate, endDate);
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get project report with task status breakdown' })
  async getProjectReport(@Param('projectId') projectId: string): Promise<ProjectReportDto> {
    return this.reportsService.getProjectReport(projectId);
  }

  @Get('projects/:projectId/team')
  @ApiOperation({ summary: 'Get team performance for a project' })
  async getProjectTeamPerformance(@Param('projectId') projectId: string): Promise<TeamPerformanceDto[]> {
    return this.reportsService.getTeamPerformanceByProject(projectId);
  }

  @Get('projects/:projectId/time')
  @ApiOperation({ summary: 'Get time tracking summary for a project' })
  async getTimeSummary(@Param('projectId') projectId: string): Promise<TimeSummaryDto> {
    return this.reportsService.getTimeSummary(projectId);
  }
}
