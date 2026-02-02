import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { 
  CreateMeetingDto, 
  UpdateMeetingDto, 
  AddAttendeeDto, 
  MeetingResponseDto, 
  MeetingAttendeeResponseDto,
  MeetingFiltersDto,
  MeetingListResponseDto,
} from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateMeetingDto, userId: bigint): Promise<MeetingResponseDto> {
    // Validate taskId if provided
    if (dto.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { 
          taskId: BigInt(dto.taskId), 
          deletedAt: null,
          project: { tenantId: this.tenantContext.requireTenantId() }
        },
      });
      if (!task) throw new BadRequestException('Linked task not found in this organization');
    }

    // Calculate duration in minutes
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    const meeting = await this.prisma.meeting.create({
      data: {
        title: dto.title,
        description: dto.description,
        agenda: dto.agenda,
        startTime,
        endTime,
        duration: durationMinutes,
        location: dto.location,
        meetingUrl: dto.meetingUrl,
        taskId: dto.taskId ? BigInt(dto.taskId) : null,
        tenantId: this.tenantContext.requireTenantId(),
        createdBy: userId,
      },
      include: { 
        creator: { select: { userId: true, username: true, fullName: true, profileImageUrl: true } },
        attendees: { include: { user: { select: { userId: true, username: true, fullName: true, profileImageUrl: true } } } },
      },
    });

    // Auto-add creator as attendee with ACCEPTED status
    await this.prisma.meetingAttendee.create({
      data: { meetingId: meeting.meetingId, userId, status: 'ACCEPTED' },
    });

    // Add other attendees if provided
    if (dto.attendeeIds && dto.attendeeIds.length > 0) {
      const organizerName = meeting.creator.fullName || meeting.creator.username;
      
      for (const attendeeId of dto.attendeeIds) {
        const attendeeUserId = BigInt(attendeeId);
        if (attendeeUserId === userId) continue; // Skip creator
        
        await this.prisma.meetingAttendee.create({
          data: { meetingId: meeting.meetingId, userId: attendeeUserId, status: 'PENDING' },
        });

        // Send notification to each invitee
        await this.notificationsService.createNotification(
          attendeeUserId,
          `${organizerName} invited you to meeting: "${meeting.title}"`,
          'MEETING',
          meeting.meetingId.toString(),
        );
      }
    }

    // Fetch the complete meeting with all attendees
    const completeMeeting = await this.findById(meeting.meetingId.toString());
    return completeMeeting;
  }

  async findAll(filters?: MeetingFiltersDto): Promise<MeetingListResponseDto> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: this.tenantContext.requireTenantId(),
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.upcoming) {
      where.startTime = { gte: new Date() };
    }

    if (filters?.startDate) {
      where.startTime = { ...where.startTime, gte: new Date(filters.startDate) };
    }

    if (filters?.endDate) {
      where.startTime = { ...where.startTime, lte: new Date(filters.endDate) };
    }

    const [meetings, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        include: { 
          creator: { select: { userId: true, username: true, fullName: true, profileImageUrl: true } },
          attendees: { include: { user: { select: { userId: true, username: true, fullName: true, profileImageUrl: true } } } },
        },
        orderBy: { startTime: 'asc' },
        skip,
        take: pageSize,
      }),
      this.prisma.meeting.count({ where }),
    ]);

    return {
      data: meetings.map((m) => this.mapToResponse(m)),
      total,
      page,
      pageSize,
    };
  }

  async findById(meetingId: string): Promise<MeetingResponseDto> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { 
        meetingId: BigInt(meetingId),
        tenantId: this.tenantContext.requireTenantId(),
      },
      include: { 
        creator: { select: { userId: true, username: true, fullName: true, profileImageUrl: true } },
        attendees: { include: { user: { select: { userId: true, username: true, fullName: true, profileImageUrl: true } } } },
      },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return this.mapToResponse(meeting);
  }

  async findByUser(userId: bigint): Promise<MeetingResponseDto[]> {
    const attendances = await this.prisma.meetingAttendee.findMany({
      where: { 
        userId,
        meeting: { tenantId: this.tenantContext.requireTenantId() }
      },
      include: { 
        meeting: { 
          include: { 
            creator: { select: { userId: true, username: true, fullName: true, profileImageUrl: true } },
            attendees: { include: { user: { select: { userId: true, username: true, fullName: true, profileImageUrl: true } } } },
          },
        },
      },
    });
    return attendances.map((a) => this.mapToResponse(a.meeting));
  }

  async update(meetingId: string, dto: UpdateMeetingDto, userId: bigint): Promise<MeetingResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const meeting = await this.prisma.meeting.findFirst({
      where: { meetingId: BigInt(meetingId), tenantId },
    });
    
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.createdBy !== userId) {
      throw new ForbiddenException('Only the meeting organizer can update the meeting');
    }

    // Calculate duration if both times are being updated
    let duration = meeting.duration;
    const startTime = dto.startTime ? new Date(dto.startTime) : meeting.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : meeting.endTime;
    duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    const updatedMeeting = await this.prisma.meeting.update({
      where: { meetingId: BigInt(meetingId), tenantId },
      data: {
        title: dto.title,
        description: dto.description,
        agenda: dto.agenda,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        duration,
        location: dto.location,
        meetingUrl: dto.meetingUrl,
        status: dto.status,
        taskId: dto.taskId !== undefined ? (dto.taskId ? BigInt(dto.taskId) : null) : undefined,
      },
      include: { 
        creator: { select: { userId: true, username: true, fullName: true, profileImageUrl: true } },
        attendees: { include: { user: { select: { userId: true, username: true, fullName: true, profileImageUrl: true } } } },
      },
    });

    return this.mapToResponse(updatedMeeting);
  }

  async delete(meetingId: string, userId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const meeting = await this.prisma.meeting.findFirst({
      where: { meetingId: BigInt(meetingId), tenantId },
    });
    
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (meeting.createdBy !== userId) {
      throw new ForbiddenException('Only the meeting organizer can delete the meeting');
    }

    await this.prisma.meeting.delete({
      where: { meetingId: BigInt(meetingId), tenantId },
    });
  }

  async addAttendee(meetingId: string, dto: AddAttendeeDto, inviterId?: bigint): Promise<MeetingAttendeeResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const meeting = await this.prisma.meeting.findFirst({
      where: { meetingId: BigInt(meetingId), tenantId },
      include: { creator: { select: { fullName: true, username: true } } },
    });
    
    if (!meeting) throw new NotFoundException('Meeting not found');

    const exists = await this.prisma.meetingAttendee.findFirst({
      where: { meetingId: BigInt(meetingId), userId: BigInt(dto.userId) },
    });
    if (exists) throw new ConflictException('User is already an attendee');

    const attendee = await this.prisma.meetingAttendee.create({
      data: { meetingId: BigInt(meetingId), userId: BigInt(dto.userId) },
      include: { user: { select: { userId: true, username: true, fullName: true, profileImageUrl: true } } },
    });

    // Send notification to the invitee
    const organizerName = meeting.creator.fullName || meeting.creator.username;
    await this.notificationsService.createNotification(
      BigInt(dto.userId),
      `${organizerName} invited you to meeting: "${meeting.title}"`,
      'MEETING',
      meetingId,
    );

    return this.mapAttendeeToResponse(attendee);
  }

  async removeAttendee(meetingId: string, attendeeUserId: string, userId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const meeting = await this.prisma.meeting.findFirst({
      where: { meetingId: BigInt(meetingId), tenantId },
    });
    
    if (!meeting) throw new NotFoundException('Meeting not found');
    
    // Only organizer or the attendee themselves can remove
    if (meeting.createdBy !== userId && BigInt(attendeeUserId) !== userId) {
      throw new ForbiddenException('Not authorized to remove this attendee');
    }

    const attendee = await this.prisma.meetingAttendee.findFirst({
      where: { meetingId: BigInt(meetingId), userId: BigInt(attendeeUserId) },
    });
    if (!attendee) throw new NotFoundException('Attendee not found');

    await this.prisma.meetingAttendee.delete({ where: { id: attendee.id } });
  }

  async respondToMeeting(meetingId: string, userId: bigint, status: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const meeting = await this.prisma.meeting.findFirst({
      where: { meetingId: BigInt(meetingId), tenantId },
      include: { creator: { select: { userId: true, fullName: true, username: true } } },
    });
    
    if (!meeting) throw new NotFoundException('Meeting not found');

    const attendee = await this.prisma.meetingAttendee.findFirst({
      where: { meetingId: BigInt(meetingId), userId },
    });
    if (!attendee) throw new NotFoundException('You are not an attendee of this meeting');

    await this.prisma.meetingAttendee.update({ 
      where: { id: attendee.id }, 
      data: { status },
    });

    // Notify organizer of the response
    const responder = await this.prisma.user.findUnique({
      where: { userId },
      select: { fullName: true, username: true },
    });
    const responderName = responder?.fullName || responder?.username || 'Someone';
    const statusText = status === 'ACCEPTED' ? 'accepted' : status === 'DECLINED' ? 'declined' : 'tentatively accepted';
    
    await this.notificationsService.createNotification(
      meeting.createdBy,
      `${responderName} ${statusText} your meeting invitation: "${meeting.title}"`,
      'MEETING',
      meetingId,
    );
  }

  async updateAttendeeStatus(meetingId: string, attendeeUserId: string, status: string): Promise<void> {
    const attendee = await this.prisma.meetingAttendee.findFirst({
      where: { meetingId: BigInt(meetingId), userId: BigInt(attendeeUserId) },
    });
    if (!attendee) throw new NotFoundException('Attendee not found');
    await this.prisma.meetingAttendee.update({ where: { id: attendee.id }, data: { status } });
  }

  private mapToResponse(m: any): MeetingResponseDto {
    return {
      meetingId: m.meetingId.toString(),
      title: m.title,
      description: m.description,
      agenda: m.agenda,
      startTime: m.startTime.toISOString(),
      endTime: m.endTime.toISOString(),
      duration: m.duration,
      location: m.location,
      meetingUrl: m.meetingUrl,
      status: m.status,
      taskId: m.taskId?.toString() || null,
      createdBy: m.createdBy.toString(),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      organizer: {
        userId: m.creator.userId.toString(),
        username: m.creator.username,
        fullName: m.creator.fullName,
        profileImageUrl: m.creator.profileImageUrl,
      },
      attendees: m.attendees.map((a: any) => this.mapAttendeeToResponse(a)),
    };
  }

  private mapAttendeeToResponse(a: any): MeetingAttendeeResponseDto {
    return {
      id: a.id.toString(),
      meetingId: a.meetingId.toString(),
      userId: a.userId.toString(),
      username: a.user.username,
      fullName: a.user.fullName,
      profileImageUrl: a.user.profileImageUrl,
      status: a.status,
      joinedAt: a.joinedAt.toISOString(),
    };
  }
}
