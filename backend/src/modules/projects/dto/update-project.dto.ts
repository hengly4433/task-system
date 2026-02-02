import { IsString, IsOptional, IsDateString, MaxLength, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Project name', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  projectName?: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Owner ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;

  @ApiPropertyOptional({ description: 'Team ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teamId?: number;

  @ApiPropertyOptional({ description: 'Workspace ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workspaceId?: number;
  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;
}
