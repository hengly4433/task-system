import { Module } from '@nestjs/common';
import { TaskStatusesController } from './task-statuses.controller';
import { TaskStatusesService } from './task-statuses.service';
import { TaskStatusesRepository } from './task-statuses.repository';
import { PrismaModule } from '../../common/database';

@Module({
  imports: [PrismaModule],
  controllers: [TaskStatusesController],
  providers: [TaskStatusesService, TaskStatusesRepository],
  exports: [TaskStatusesService],
})
export class TaskStatusesModule {}
