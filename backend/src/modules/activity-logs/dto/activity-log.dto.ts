import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListActivityLogsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() activityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
}

export class ActivityLogResponseDto {
  @ApiProperty() logId: string;
  @ApiProperty() userId: string;
  @ApiProperty() activityType: string;
  @ApiProperty({ nullable: true }) details: string | null;
  @ApiProperty() createdAt: string;
}
