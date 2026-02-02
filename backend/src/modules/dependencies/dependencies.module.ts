import { Module } from '@nestjs/common';
import { DependenciesController } from './dependencies.controller';
import { DependenciesService } from './dependencies.service';
import { DependenciesRepository } from './dependencies.repository';

@Module({
  controllers: [DependenciesController],
  providers: [DependenciesService, DependenciesRepository],
  exports: [DependenciesService, DependenciesRepository],
})
export class DependenciesModule {}
