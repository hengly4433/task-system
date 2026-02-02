import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto, AddTeamMemberDto } from './dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private service: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team' })
  create(@Body() dto: CreateTeamDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teams with optional filters' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('departmentId') departmentId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(departmentId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID with members' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update team' })
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  // Member management endpoints
  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to team' })
  addMember(@Param('id') id: string, @Body() dto: AddTeamMemberDto) {
    return this.service.addMember(id, dto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from team' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.service.removeMember(id, userId);
  }
}
