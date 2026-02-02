import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentsRepository } from './attachments.repository';
import { AuditModule } from '../../common/audit';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionModule } from '../../common/subscription';

@Module({
  imports: [AuditModule, NotificationsModule, SubscriptionModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsRepository],
  exports: [AttachmentsService, AttachmentsRepository],
})
export class AttachmentsModule {}
