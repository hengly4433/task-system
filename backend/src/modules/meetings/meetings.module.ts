import { Module } from '@nestjs/common';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { MeetingSchedulerService } from './meeting-scheduler.service';
import { MeetingAttachmentsService } from './meeting-attachments.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../../common/storage/storage.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [NotificationsModule, StorageModule, AuditModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingSchedulerService, MeetingAttachmentsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
