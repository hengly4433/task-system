import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty({ description: 'Position name', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  positionName: string;

  @ApiPropertyOptional({ description: 'Position description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePositionDto {
  @ApiPropertyOptional({ description: 'Position name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  positionName?: string;

  @ApiPropertyOptional({ description: 'Position description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class PositionResponseDto {
  @ApiProperty() positionId: string;
  @ApiProperty() positionName: string;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() createdAt: string;
}
