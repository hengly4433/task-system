import { IsString, IsOptional, IsDateString, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateTimeEntryDto {
  @ApiProperty({ description: 'Task ID to log time for' })
  @IsString()
  taskId: string;

  @ApiProperty({ description: 'Date of the time entry (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Hours worked (0.25 to 24)', minimum: 0.25, maximum: 24 })
  @IsNumber()
  @Min(0.25)
  @Max(24)
  hours: number;

  @ApiPropertyOptional({ description: 'Optional description of work done' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateTimeEntryDto {
  @ApiPropertyOptional({ description: 'Hours worked (0.25 to 24)', minimum: 0.25, maximum: 24 })
  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(24)
  hours?: number;

  @ApiPropertyOptional({ description: 'Optional description of work done' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class TimeEntryFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by task ID' })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Start date for range filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for range filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  pageSize?: number;
}

export class TaskInfoDto {
  @ApiProperty() taskId: string;
  @ApiProperty() taskName: string;
  @ApiProperty({ nullable: true }) projectId: string | null;
  @ApiProperty({ nullable: true }) projectName: string | null;
}

export class TimeEntryResponseDto {
  @ApiProperty() timeEntryId: string;
  @ApiProperty() taskId: string;
  @ApiProperty() userId: string;
  @ApiProperty() date: string;
  @ApiProperty() hours: number;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
  @ApiPropertyOptional({ type: TaskInfoDto }) task?: TaskInfoDto;
}

export class WeeklyTimeEntryDto {
  @ApiProperty() taskId: string;
  @ApiProperty() taskName: string;
  @ApiProperty({ nullable: true }) projectId: string | null;
  @ApiProperty({ nullable: true }) projectName: string | null;
  @ApiProperty({ nullable: true }) projectColor: string | null;
  @ApiProperty({ description: 'Hours for each day of the week [Mon, Tue, Wed, Thu, Fri, Sat, Sun]', type: [Number] })
  days: number[];
  @ApiProperty({ description: 'Entry IDs for each day (for editing)', type: [String] })
  entryIds: (string | null)[];
  @ApiProperty() totalHours: number;
}

export class WeeklyTimesheetResponseDto {
  @ApiProperty() startDate: string;
  @ApiProperty() endDate: string;
  @ApiProperty({ type: [WeeklyTimeEntryDto] }) entries: WeeklyTimeEntryDto[];
  @ApiProperty() totalHours: number;
  @ApiProperty() tasksLogged: number;
  @ApiProperty({ type: [Number] }) dailyTotals: number[];
}
