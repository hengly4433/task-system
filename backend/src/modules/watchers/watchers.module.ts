import { Module, forwardRef } from '@nestjs/common';
import { WatchersController } from './watchers.controller';
import { WatchersService } from './watchers.service';
import { WatchersRepository } from './watchers.repository';
import { PrismaModule } from '../../common/database';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, forwardRef(() => NotificationsModule)],
  controllers: [WatchersController],
  providers: [WatchersService, WatchersRepository],
  exports: [WatchersService],
})
export class WatchersModule {}
