import { Module } from '@nestjs/common';
import { SprintTemplatesController } from './sprint-templates.controller';
import { SprintTemplatesService } from './sprint-templates.service';
import { SprintTemplatesRepository } from './sprint-templates.repository';
import { PrismaModule } from '../../common/database';

@Module({
  imports: [PrismaModule],
  controllers: [SprintTemplatesController],
  providers: [SprintTemplatesService, SprintTemplatesRepository],
  exports: [SprintTemplatesService],
})
export class SprintTemplatesModule {}
