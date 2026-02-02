import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { StorageModule } from '../../common/storage';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, StorageModule, UsersModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
