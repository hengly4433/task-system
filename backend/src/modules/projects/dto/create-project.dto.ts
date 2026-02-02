import { IsString, IsOptional, IsDateString, MaxLength, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  projectName: string;

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

  @ApiPropertyOptional({ description: 'Team ID to associate with the project' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teamId?: number;

  @ApiPropertyOptional({ description: 'Workspace ID to associate with the project' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workspaceId?: number;

  @ApiPropertyOptional({ description: 'Department ID to associate with the project' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;
}
