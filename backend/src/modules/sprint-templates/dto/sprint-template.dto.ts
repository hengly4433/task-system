import { IsString, IsOptional, IsInt, IsBoolean, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/pagination';

export class CreateSprintTemplateDto {
  @ApiProperty({ description: 'Department ID this template belongs to' })
  @IsString()
  departmentId: string;

  @ApiProperty({ description: 'Template name', example: '2-Week Development Sprint' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ description: 'Sprint name pattern with {number} placeholder', example: 'Sprint {number}' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  namePattern?: string;

  @ApiPropertyOptional({ description: 'Default sprint duration in days', default: 14 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value, 10))
  durationDays?: number;

  @ApiPropertyOptional({ description: 'Default goal template text' })
  @IsOptional()
  @IsString()
  goalTemplate?: string;

  @ApiPropertyOptional({ description: 'Whether this is the default template for the department' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateSprintTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Sprint name pattern with {number} placeholder' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  namePattern?: string;

  @ApiPropertyOptional({ description: 'Default sprint duration in days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value, 10))
  durationDays?: number;

  @ApiPropertyOptional({ description: 'Default goal template text' })
  @IsOptional()
  @IsString()
  goalTemplate?: string;

  @ApiPropertyOptional({ description: 'Whether this is the default template' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class ListSprintTemplatesQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class SprintTemplateResponseDto {
  @ApiProperty() templateId: string;
  @ApiProperty() departmentId: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) namePattern: string | null;
  @ApiProperty() durationDays: number;
  @ApiProperty({ nullable: true }) goalTemplate: string | null;
  @ApiProperty() isDefault: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}
