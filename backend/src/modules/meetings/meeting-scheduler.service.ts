import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/database';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class MeetingSchedulerService {
  private readonly logger = new Logger(MeetingSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Runs every minute to check for meetings starting in 14-15 minutes
   * and sends reminder notifications to all attendees
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkUpcomingMeetings(): Promise<void> {
    const now = new Date();
    
    // Calculate the time window: 14-15 minutes from now
    const minTime = new Date(now.getTime() + 14 * 60 * 1000); // 14 minutes from now
    const maxTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

    this.logger.debug(
      `Checking for meetings starting between ${minTime.toISOString()} and ${maxTime.toISOString()}`,
    );

    try {
      // Find meetings starting in the 14-15 minute window
      const upcomingMeetings = await this.prisma.meeting.findMany({
        where: {
          startTime: {
            gte: minTime,
            lt: maxTime,
          },
          status: 'SCHEDULED',
        },
        include: {
          attendees: {
            where: {
              status: {
                in: ['ACCEPTED', 'PENDING'],
              },
            },
            include: {
              user: {
                select: {
                  userId: true,
                  fullName: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      if (upcomingMeetings.length === 0) {
        this.logger.debug('No upcoming meetings found in the 14-15 minute window');
        return;
      }

      this.logger.log(`Found ${upcomingMeetings.length} meeting(s) starting in ~15 minutes`);

      // Send reminder notifications to all attendees
      for (const meeting of upcomingMeetings) {
        const meetingTitle = meeting.title;
        const startTime = meeting.startTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        this.logger.log(
          `Sending reminders for meeting: "${meetingTitle}" (${meeting.attendees.length} attendees)`,
        );

        for (const attendee of meeting.attendees) {
          const notificationText = `⏰ Reminder: Meeting "${meetingTitle}" starts in 15 minutes at ${startTime}`;

          // Create notification in DB
          const notification = await this.prisma.notification.create({
            data: {
              userId: attendee.userId,
              notificationText,
              entityType: 'MEETING',
              entityId: meeting.meetingId.toString(),
            },
          });

          // Send real-time notification
          this.notificationsGateway.sendToUser(attendee.userId, {
            notificationId: notification.notificationId.toString(),
            notificationText: notification.notificationText,
            entityType: notification.entityType,
            entityId: notification.entityId,
            isRead: notification.isRead,
            createdAt: notification.createdAt.toISOString(),
          });

          this.logger.debug(
            `Sent reminder to user ${attendee.user.fullName || attendee.user.username}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error checking upcoming meetings: ${error.message}`, error.stack);
    }
  }
}
