import { IsString, IsOptional, IsInt, IsDateString, MaxLength, Min, IsArray, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateMeetingDto {
  @ApiProperty({ description: 'Meeting title', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Meeting description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Meeting agenda' })
  @IsOptional()
  @IsString()
  agenda?: string;

  @ApiProperty({ description: 'Start time in ISO format' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'End time in ISO format' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ description: 'Meeting location' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({ description: 'Meeting URL (e.g., Zoom, Google Meet)' })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  meetingUrl?: string;

  @ApiPropertyOptional({ description: 'Related task ID' })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Array of user IDs to invite', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attendeeIds?: string[];
}

export class UpdateMeetingDto {
  @ApiPropertyOptional({ description: 'Meeting title', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Meeting description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Meeting agenda' })
  @IsOptional()
  @IsString()
  agenda?: string;

  @ApiPropertyOptional({ description: 'Start time in ISO format' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time in ISO format' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Meeting location' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({ description: 'Meeting URL (e.g., Zoom, Google Meet)' })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  meetingUrl?: string;

  @ApiPropertyOptional({ description: 'Meeting status', enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  @IsOptional()
  @IsString()
  @IsIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Related task ID' })
  @IsOptional()
  @IsString()
  taskId?: string;
}

export class AddAttendeeDto {
  @ApiProperty({ description: 'User ID to add as attendee' })
  @IsString()
  userId: string;
}

export class UpdateAttendeeStatusDto {
  @ApiProperty({ description: 'Attendee response status', enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE'] })
  @IsString()
  @IsIn(['PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE'])
  status: string;
}

export class RespondToMeetingDto {
  @ApiProperty({ description: 'Response status', enum: ['ACCEPTED', 'DECLINED', 'TENTATIVE'] })
  @IsString()
  @IsIn(['ACCEPTED', 'DECLINED', 'TENTATIVE'])
  status: string;
}

export class MeetingFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by start date (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by end date (ISO format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Get only upcoming meetings' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  upcoming?: boolean;
}

export class MeetingAttendeeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() meetingId: string;
  @ApiProperty() userId: string;
  @ApiProperty() username: string;
  @ApiProperty({ nullable: true }) fullName: string | null;
  @ApiProperty({ nullable: true }) profileImageUrl: string | null;
  @ApiProperty() status: string;
  @ApiProperty() joinedAt: string;
}

export class MeetingOrganizerDto {
  @ApiProperty() userId: string;
  @ApiProperty() username: string;
  @ApiProperty({ nullable: true }) fullName: string | null;
  @ApiProperty({ nullable: true }) profileImageUrl: string | null;
}

export class MeetingResponseDto {
  @ApiProperty() meetingId: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ nullable: true }) agenda: string | null;
  @ApiProperty() startTime: string;
  @ApiProperty() endTime: string;
  @ApiProperty({ nullable: true }) duration: number | null;
  @ApiProperty({ nullable: true }) location: string | null;
  @ApiProperty({ nullable: true }) meetingUrl: string | null;
  @ApiProperty() status: string;
  @ApiProperty({ nullable: true }) taskId: string | null;
  @ApiProperty() createdBy: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
  @ApiProperty({ type: MeetingOrganizerDto }) organizer: MeetingOrganizerDto;
  @ApiProperty({ type: [MeetingAttendeeResponseDto] }) attendees: MeetingAttendeeResponseDto[];
}

export class MeetingListResponseDto {
  @ApiProperty({ type: [MeetingResponseDto] }) data: MeetingResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
}
