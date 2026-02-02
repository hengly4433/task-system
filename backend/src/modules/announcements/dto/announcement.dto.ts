import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty() @IsString() announcementText: string;
}

export class AnnouncementResponseDto {
  @ApiProperty() announcementId: string;
  @ApiProperty() projectId: string;
  @ApiProperty() announcementText: string;
  @ApiProperty({ nullable: true }) createdBy: string | null;
  @ApiProperty() createdAt: string;
}
