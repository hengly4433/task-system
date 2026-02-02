import { IsString, IsOptional, IsInt, IsIn, IsDateString, MaxLength, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task name', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  taskName: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Priority', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Status (string code from workspace statuses)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Task type' })
  @IsOptional()
  @IsString()
  taskType?: string;

  @ApiPropertyOptional({ description: 'Estimated hours' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional({ description: 'Remaining hours' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  remainingHours?: number;

  @ApiPropertyOptional({ description: 'Story points' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  storyPoints?: number;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedTo?: number;

  @ApiPropertyOptional({ description: 'Tester user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  testerId?: number;

  @ApiPropertyOptional({ description: 'Due date (ISO format)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Parent task ID for subtasks' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentTaskId?: number;

  @ApiPropertyOptional({ description: 'Sprint ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sprintId?: number;

  // DETAILS section fields
  @ApiPropertyOptional({ description: 'Milestone' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  milestone?: string;

  @ApiPropertyOptional({ description: 'Team' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  team?: string;

  @ApiPropertyOptional({ description: 'Team ID (Relation)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teamId?: number;

  @ApiPropertyOptional({ description: 'Module/Feature area' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  module?: string;

  @ApiPropertyOptional({ description: 'External link/reference' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalLink?: string;

  @ApiPropertyOptional({ description: 'Build/Release version' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buildVersion?: string;

  // Department/Workflow scoping
  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional({ description: 'Workspace ID (workflow scope)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workspaceId?: number;

  @ApiPropertyOptional({ description: 'Status ID (FK to TaskStatus)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  statusId?: number;
}
