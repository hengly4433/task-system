import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectReportQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
}

export class TaskStatusSummaryDto {
  @ApiProperty() status: string;
  @ApiProperty() count: number;
  @ApiProperty() percentage: number;
}

export class ProjectReportDto {
  @ApiProperty() projectId: string;
  @ApiProperty() projectName: string;
  @ApiProperty() totalTasks: number;
  @ApiProperty() completedTasks: number;
  @ApiProperty() overdueTasks: number;
  @ApiProperty() averageProgress: number;
  @ApiProperty({ type: [TaskStatusSummaryDto] }) statusBreakdown: TaskStatusSummaryDto[];
}

export class TeamPerformanceDto {
  @ApiProperty() userId: string;
  @ApiProperty() userName: string;
  @ApiProperty() tasksAssigned: number;
  @ApiProperty() tasksCompleted: number;
  @ApiProperty() totalTimeLogged: number; // minutes
  @ApiProperty() averageProgress: number;
}

export class TimeSummaryDto {
  @ApiProperty() projectId: string;
  @ApiProperty() projectName: string;
  @ApiProperty() totalMinutes: number;
  @ApiProperty() userBreakdown: { userId: string; userName: string; minutes: number }[];
}

export class TasksByPriorityDto {
  @ApiProperty() high: number;
  @ApiProperty() medium: number;
  @ApiProperty() low: number;
}

export class TasksByStatusDto {
  @ApiProperty() notStarted: number;
  @ApiProperty() inProgress: number;
  @ApiProperty() inReview: number;
  @ApiProperty() completed: number;
  @ApiProperty() cancelled: number;
}

export class DashboardSummaryDto {
  @ApiProperty() totalProjects: number;
  @ApiProperty() totalTasks: number;
  @ApiProperty() completedTasks: number;
  @ApiProperty() inProgressTasks: number;
  @ApiProperty() overdueTasks: number;
  @ApiProperty() upcomingMeetings: number;
  @ApiProperty() totalTimeLogged?: number;
  @ApiProperty({ type: TasksByPriorityDto }) tasksByPriority?: TasksByPriorityDto;
  @ApiProperty({ type: TasksByStatusDto }) tasksByStatus?: TasksByStatusDto;
}

export class TasksCompletedChartDto {
  @ApiProperty({ type: [String] }) labels: string[];
  @ApiProperty({ type: [Number] }) data: number[];
}

export class SpentTimeChartDto {
  @ApiProperty({ type: [String] }) labels: string[];
  @ApiProperty({ type: [Number] }) data: number[];
  @ApiProperty({ type: [String] }) colors: string[];
}

export class TimesheetSummaryDto {
  @ApiProperty({ type: [String] }) labels: string[];
  @ApiProperty({ type: [Number] }) logged: number[];
  @ApiProperty({ type: [Number] }) notLogged: number[];
}
