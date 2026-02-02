import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ListProjectsQueryDto,
  ProjectResponseDto,
  ProjectMemberResponseDto,
  AddMemberDto,
} from './dto';
import { PaginatedResult } from '../../common/pagination';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created', type: ProjectResponseDto })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project found', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findById(@Param('id') id: string): Promise<ProjectResponseDto> {
    return this.projectsService.findById(id);
  }

  @Get()
  @ApiOperation({ summary: 'List all projects with pagination' })
  @ApiResponse({ status: 200, description: 'List of projects' })
  async findAll(@Query() query: ListProjectsQueryDto): Promise<PaginatedResult<ProjectResponseDto>> {
    return this.projectsService.findAll(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project updated', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 204, description: 'Project deleted' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: bigint,
  ): Promise<void> {
    return this.projectsService.softDelete(id, userId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Member added', type: ProjectMemberResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser('userId') userId: bigint,
  ): Promise<ProjectMemberResponseDto> {
    return this.projectsService.addMember(id, dto.userId.toString(), userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @CurrentUser('userId') userId: bigint,
  ): Promise<void> {
    return this.projectsService.removeMember(id, memberUserId, userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get all members of a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of members', type: [ProjectMemberResponseDto] })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getMembers(@Param('id') id: string): Promise<ProjectMemberResponseDto[]> {
    return this.projectsService.getMembers(id);
  }
}
