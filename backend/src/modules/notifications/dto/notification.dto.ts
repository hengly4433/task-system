import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty() notificationId: string;
  @ApiProperty() notificationText: string;
  @ApiProperty({ required: false }) entityType?: string;
  @ApiProperty({ required: false }) entityId?: string;
  @ApiProperty() isRead: boolean;
  @ApiProperty() createdAt: string;
}
