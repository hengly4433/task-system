import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMilestoneDto {
  @ApiProperty() @IsString() @MaxLength(150) milestoneName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dueDate?: string;
}

export class MilestoneResponseDto {
  @ApiProperty() milestoneId: string;
  @ApiProperty() projectId: string;
  @ApiProperty() milestoneName: string;
  @ApiProperty({ nullable: true }) dueDate: string | null;
  @ApiProperty() createdAt: string;
}
