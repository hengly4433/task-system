import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, AssignRoleDto, RoleResponseDto, UserRoleMappingResponseDto } from './dto';
import { TenantRoleGuard, RequireTenantRole } from '../../common/tenant';

@ApiTags('Roles')
@Controller('roles')
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created', type: RoleResponseDto })
  @ApiResponse({ status: 409, description: 'Role already exists' })
  @ApiResponse({ status: 403, description: 'OWNER or ADMIN role required' })
  async create(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'List of roles', type: [RoleResponseDto] })
  async findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  @Post(':id/assign')
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 201, description: 'Role assigned', type: UserRoleMappingResponseDto })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'User already has this role' })
  @ApiResponse({ status: 403, description: 'OWNER or ADMIN role required' })
  async assignRole(
    @Param('id') roleId: string,
    @Body() dto: AssignRoleDto,
  ): Promise<UserRoleMappingResponseDto> {
    return this.rolesService.assignRole(roleId, dto.userId.toString());
  }

  @Delete(':id/unassign/:userId')
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unassign a role from a user' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'Role unassigned' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 403, description: 'OWNER or ADMIN role required' })
  async unassignRole(
    @Param('id') roleId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.rolesService.unassignRole(roleId, userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all roles for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of user roles', type: [RoleResponseDto] })
  async getUserRoles(@Param('userId') userId: string): Promise<RoleResponseDto[]> {
    return this.rolesService.getUserRoles(userId);
  }
}

