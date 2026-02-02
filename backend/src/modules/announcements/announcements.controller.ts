import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, AnnouncementResponseDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('projects/:projectId/announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an announcement' })
  async create(@Param('projectId') projectId: string, @Body() dto: CreateAnnouncementDto, @CurrentUser('userId') userId: bigint): Promise<AnnouncementResponseDto> {
    return this.announcementsService.create(projectId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all announcements for a project' })
  async findByProject(@Param('projectId') projectId: string): Promise<AnnouncementResponseDto[]> {
    return this.announcementsService.findByProject(projectId);
  }
}
