import { IsString, IsOptional, IsInt, IsIn, IsDateString, MaxLength, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: 'Task name', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  taskName?: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Status (string code from workspace statuses)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Priority', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Task type' })
  @IsOptional()
  @IsString()
  taskType?: string;

  @ApiPropertyOptional({ description: 'Estimated hours' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedHours?: number | null;

  @ApiPropertyOptional({ description: 'Remaining hours' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  remainingHours?: number | null;

  @ApiPropertyOptional({ description: 'Story points' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  storyPoints?: number | null;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedTo?: number | null;

  @ApiPropertyOptional({ description: 'Tester user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  testerId?: number | null;

  @ApiPropertyOptional({ description: 'Due date (ISO format)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Sprint ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sprintId?: number | null;

  // DETAILS section fields
  @ApiPropertyOptional({ description: 'Milestone ID (Relation)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  milestoneId?: number | null;

  @ApiPropertyOptional({ description: 'Milestone (legacy string)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  milestone?: string | null;

  @ApiPropertyOptional({ description: 'Team' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  team?: string | null;

  @ApiPropertyOptional({ description: 'Team ID (Relation)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teamId?: number | null;

  @ApiPropertyOptional({ description: 'Module/Feature area' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  module?: string | null;

  @ApiPropertyOptional({ description: 'External link/reference' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalLink?: string | null;

  @ApiPropertyOptional({ description: 'Build/Release version' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buildVersion?: string | null;

  @ApiPropertyOptional({ description: 'Parent task ID for subtasks' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentTaskId?: number | null;

  // Department/Workflow scoping
  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number | null;

  @ApiPropertyOptional({ description: 'Workspace ID (workflow scope)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workspaceId?: number | null;

  @ApiPropertyOptional({ description: 'Status ID (FK to TaskStatus)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  statusId?: number | null;
}
