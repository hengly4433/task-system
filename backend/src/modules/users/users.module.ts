import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { AuditModule } from '../../common/audit';
import { StorageModule } from '../../common/storage';
import { MailModule } from '../../common/mail';

@Module({
  imports: [AuditModule, StorageModule, MailModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}

