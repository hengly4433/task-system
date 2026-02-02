import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { AuditModule } from '../../common/audit';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionModule } from '../../common/subscription';

@Module({
  imports: [AuditModule, NotificationsModule, SubscriptionModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
  exports: [TasksService, TasksRepository],
})
export class TasksModule {}
