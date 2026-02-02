import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSprintDto {
  @ApiProperty() @IsString() @MaxLength(120) sprintName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() goal?: string;
  @ApiPropertyOptional({ description: 'Required when creating via POST /sprints' }) @IsOptional() @IsString() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class UpdateSprintDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) sprintName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() goal?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class AssignTaskToSprintDto {
  @ApiProperty() @IsString() sprintId: string;
}

export class CreateSprintFromTemplateDto {
  @ApiProperty({ description: 'Sprint template ID' }) @IsString() templateId: string;
}

export class SprintResponseDto {
  @ApiProperty() sprintId: string;
  @ApiProperty() projectId: string;
  @ApiProperty() sprintName: string;
  @ApiProperty({ nullable: true }) goal: string | null;
  @ApiProperty({ nullable: true }) startDate: string | null;
  @ApiProperty({ nullable: true }) endDate: string | null;
  @ApiProperty({ nullable: true }) status: string | null;
}

