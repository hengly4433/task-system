import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MeetingsService } from './meetings.service';
import { MeetingAttachmentsService, MeetingAttachmentResponseDto } from './meeting-attachments.service';
import { 
  CreateMeetingDto, 
  UpdateMeetingDto,
  AddAttendeeDto, 
  RespondToMeetingDto,
  MeetingFiltersDto,
  MeetingResponseDto, 
  MeetingAttendeeResponseDto,
  MeetingListResponseDto,
} from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Meetings')
@ApiBearerAuth()
@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly meetingAttachmentsService: MeetingAttachmentsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a meeting' })
  async create(@Body() dto: CreateMeetingDto, @CurrentUser('userId') userId: bigint): Promise<MeetingResponseDto> {
    return this.meetingsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all meetings with optional filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'upcoming', required: false, type: Boolean })
  async findAll(@Query() filters: MeetingFiltersDto): Promise<MeetingListResponseDto> {
    return this.meetingsService.findAll(filters);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get meetings for current user' })
  async findByUser(@CurrentUser('userId') userId: bigint): Promise<MeetingResponseDto[]> {
    return this.meetingsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get meeting by ID' })
  async findById(@Param('id') id: string): Promise<MeetingResponseDto> {
    return this.meetingsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a meeting' })
  async update(
    @Param('id') id: string, 
    @Body() dto: UpdateMeetingDto, 
    @CurrentUser('userId') userId: bigint
  ): Promise<MeetingResponseDto> {
    return this.meetingsService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a meeting' })
  async delete(@Param('id') id: string, @CurrentUser('userId') userId: bigint): Promise<void> {
    return this.meetingsService.delete(id, userId);
  }

  @Post(':id/attendees')
  @ApiOperation({ summary: 'Add an attendee to meeting' })
  async addAttendee(
    @Param('id') id: string, 
    @Body() dto: AddAttendeeDto,
    @CurrentUser('userId') userId: bigint
  ): Promise<MeetingAttendeeResponseDto> {
    return this.meetingsService.addAttendee(id, dto, userId);
  }

  @Delete(':id/attendees/:userId')
  @ApiOperation({ summary: 'Remove an attendee from meeting' })
  async removeAttendee(
    @Param('id') id: string, 
    @Param('userId') attendeeUserId: string,
    @CurrentUser('userId') userId: bigint
  ): Promise<void> {
    return this.meetingsService.removeAttendee(id, attendeeUserId, userId);
  }

  @Patch(':id/respond')
  @ApiOperation({ summary: 'Accept or decline a meeting invitation' })
  async respondToMeeting(
    @Param('id') id: string, 
    @Body() dto: RespondToMeetingDto,
    @CurrentUser('userId') userId: bigint
  ): Promise<void> {
    return this.meetingsService.respondToMeeting(id, userId, dto.status);
  }

  // ==================== ATTACHMENT ENDPOINTS ====================

  @Post(':id/attachments/upload')
  @ApiOperation({ summary: 'Upload an attachment to a meeting' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') meetingId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: bigint,
  ): Promise<MeetingAttachmentResponseDto> {
    return this.meetingAttachmentsService.uploadFile(meetingId, file, userId);
  }

  @Get(':id/attachments')
  @ApiOperation({ summary: 'Get all attachments for a meeting' })
  async getAttachments(@Param('id') meetingId: string): Promise<MeetingAttachmentResponseDto[]> {
    return this.meetingAttachmentsService.findByMeeting(meetingId);
  }

  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Delete an attachment from a meeting' })
  async deleteAttachment(
    @Param('id') meetingId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser('userId') userId: bigint,
  ): Promise<void> {
    return this.meetingAttachmentsService.delete(meetingId, attachmentId, userId);
  }
}
