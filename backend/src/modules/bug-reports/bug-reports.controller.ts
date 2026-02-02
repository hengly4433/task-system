import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BugReportsService } from './bug-reports.service';
import { CreateBugReportDto, UpdateBugReportDto, BugReportResponseDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Bug Reports')
@ApiBearerAuth()
@Controller('projects/:projectId/bugs')
export class BugReportsController {
  constructor(private readonly bugReportsService: BugReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Report a bug' })
  async create(@Param('projectId') projectId: string, @Body() dto: CreateBugReportDto, @CurrentUser('userId') userId: bigint): Promise<BugReportResponseDto> {
    return this.bugReportsService.create(projectId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bugs for a project' })
  async findByProject(@Param('projectId') projectId: string): Promise<BugReportResponseDto[]> {
    return this.bugReportsService.findByProject(projectId);
  }

  @Patch(':bugId')
  @ApiOperation({ summary: 'Update a bug report' })
  async update(@Param('bugId') bugId: string, @Body() dto: UpdateBugReportDto, @CurrentUser('userId') userId: bigint): Promise<BugReportResponseDto> {
    return this.bugReportsService.update(bugId, dto, userId);
  }
}
