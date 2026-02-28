import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './common/database';
import { AllExceptionsFilter, PrismaExceptionFilter } from './common/filters';
import { LoggingInterceptor } from './common/interceptors';
import { AuditModule } from './common/audit';
import { StorageModule } from './common/storage';
import { MailModule } from './common/mail';
import { TenantModule, TenantGuard } from './common/tenant';
import { SubscriptionModule } from './common/subscription';
import { PaymentModule } from './common/payment';
import { UsersModule } from './modules/users';
import { RolesModule } from './modules/roles';
import { ProjectsModule } from './modules/projects';
import { TasksModule } from './modules/tasks';
import { CommentsModule } from './modules/comments';
import { AttachmentsModule } from './modules/attachments';
import { TimeEntriesModule } from './modules/time-entries';
import { DependenciesModule } from './modules/dependencies';
import { ChecklistsModule } from './modules/checklists';
import { LabelsModule } from './modules/labels';
import { SprintsModule } from './modules/sprints';
import { MilestonesModule } from './modules/milestones';
import { BugReportsModule } from './modules/bug-reports';
import { NotificationsModule } from './modules/notifications';
import { PreferencesModule } from './modules/preferences';
import { RemindersModule } from './modules/reminders';
import { AnnouncementsModule } from './modules/announcements';
import { ActivityLogsModule } from './modules/activity-logs';
import { WorkspacesModule } from './modules/workspaces';
import { MeetingsModule } from './modules/meetings';
import { BoardsModule } from './modules/boards';
import { ReportsModule } from './modules/reports';
import { AuthModule, JwtAuthGuard } from './modules/auth';
import { PositionsModule } from './modules/positions';
import { ChatModule } from './modules/chat';
import { WatchersModule } from './modules/watchers';
import { TeamsModule } from './modules/teams';
import { TaskStatusesModule } from './modules/task-statuses';
import { DepartmentsModule } from './modules/departments';
import { SprintTemplatesModule } from './modules/sprint-templates';
import { PermissionsModule } from './modules/permissions';
import { TenantsModule } from './modules/tenants/tenants.module';

import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    PrismaModule,
    TenantModule,
    SubscriptionModule,
    PaymentModule,
    StorageModule,
    MailModule,
    AuditModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    AttachmentsModule,
    TimeEntriesModule,
    DependenciesModule,
    ChecklistsModule,
    LabelsModule,
    SprintsModule,
    MilestonesModule,
    BugReportsModule,
    NotificationsModule,
    PreferencesModule,
    RemindersModule,
    AnnouncementsModule,
    ActivityLogsModule,
    WorkspacesModule,
    MeetingsModule,
    BoardsModule,
    ReportsModule,
    PositionsModule,
    ChatModule,
    WatchersModule,
    TeamsModule,
    TaskStatusesModule,
    DepartmentsModule,
    SprintTemplatesModule,
    PermissionsModule,
    TenantsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
