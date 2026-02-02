import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto, AddWorkspaceMemberDto, WorkspaceResponseDto, WorkspaceMemberResponseDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a workspace' })
  async create(@Body() dto: CreateWorkspaceDto, @CurrentUser('userId') userId: bigint): Promise<WorkspaceResponseDto> {
    return this.workspacesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workspaces for current user' })
  async findAll(@CurrentUser('userId') userId: bigint): Promise<WorkspaceResponseDto[]> {
    return this.workspacesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by ID' })
  async findById(@Param('id') id: string): Promise<WorkspaceResponseDto> {
    return this.workspacesService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workspace' })
  async update(@Param('id') id: string, @Body() dto: UpdateWorkspaceDto, @CurrentUser('userId') userId: bigint): Promise<WorkspaceResponseDto> {
    return this.workspacesService.update(id, dto, userId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to workspace' })
  async addMember(@Param('id') id: string, @Body() dto: AddWorkspaceMemberDto): Promise<WorkspaceMemberResponseDto> {
    return this.workspacesService.addMember(id, dto);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get workspace members' })
  async getMembers(@Param('id') id: string): Promise<WorkspaceMemberResponseDto[]> {
    return this.workspacesService.getMembers(id);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from workspace' })
  async removeMember(@Param('id') id: string, @Param('userId') userId: string): Promise<void> {
    return this.workspacesService.removeMember(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workspace' })
  async delete(@Param('id') id: string, @CurrentUser('userId') userId: bigint): Promise<void> {
    return this.workspacesService.delete(id, userId);
  }
}
