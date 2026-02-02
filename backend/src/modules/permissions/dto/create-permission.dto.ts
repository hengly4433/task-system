import { IsString, IsOptional, IsInt, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ description: 'Permission code (unique identifier)', example: 'task.add' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  code: string;

  @ApiProperty({ description: 'Display name', example: 'Add Tasks' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ description: 'Description of the permission' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Category for grouping', example: 'tasks' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  category: string;

  @ApiPropertyOptional({ description: 'Sort order within category', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
