import { IsString, IsOptional, IsInt, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePermissionDto {
  @ApiPropertyOptional({ description: 'Permission code (unique identifier)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the permission' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Category for grouping' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ description: 'Sort order within category' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
