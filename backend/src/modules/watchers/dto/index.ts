import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AddWatcherDto {
  @ApiProperty({ description: 'User ID to add as watcher' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  userId: number;
}

export class WatcherResponseDto {
  @ApiProperty()
  watcherId: string;

  @ApiProperty()
  taskId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  user?: {
    userId: string;
    fullName: string | null;
    profileImageUrl: string | null;
  };
}
