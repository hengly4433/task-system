import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { PermissionsService } from './permissions.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
  RolePermissionResponseDto,
  PermissionsByCategoryResponseDto,
  UpdateRolePermissionsDto,
} from './dto';

@ApiTags('Permissions')
@Controller('permissions')
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // Permission CRUD
  @Post()
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({ status: 201, description: 'Permission created', type: PermissionResponseDto })
  @ApiResponse({ status: 409, description: 'Permission code already exists' })
  async create(@Body() dto: CreatePermissionDto): Promise<PermissionResponseDto> {
    return this.permissionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'List of permissions', type: [PermissionResponseDto] })
  async findAll(): Promise<PermissionResponseDto[]> {
    return this.permissionsService.findAll();
  }

  @Get('grouped')
  @ApiOperation({ summary: 'Get all permissions grouped by category' })
  @ApiResponse({ status: 200, description: 'Permissions grouped by category', type: [PermissionsByCategoryResponseDto] })
  async findAllGrouped(): Promise<PermissionsByCategoryResponseDto[]> {
    return this.permissionsService.findAllGroupedByCategory();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all permission categories' })
  @ApiResponse({ status: 200, description: 'List of categories', type: [String] })
  async getCategories(): Promise<string[]> {
    return this.permissionsService.getCategories();
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get permissions by category' })
  @ApiParam({ name: 'category', description: 'Category name' })
  @ApiResponse({ status: 200, description: 'Permissions in category', type: [PermissionResponseDto] })
  async findByCategory(@Param('category') category: string): Promise<PermissionResponseDto[]> {
    return this.permissionsService.findByCategory(category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a permission by ID' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Permission found', type: PermissionResponseDto })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async findById(@Param('id') id: string): Promise<PermissionResponseDto> {
    return this.permissionsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a permission' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Permission updated', type: PermissionResponseDto })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({ status: 409, description: 'Permission code already exists' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a permission' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 204, description: 'Permission deleted' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.permissionsService.delete(id);
  }

  // Role-Permission management
  @Get('roles/:roleId')
  @ApiOperation({ summary: 'Get permissions for a specific role' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role permissions', type: [RolePermissionResponseDto] })
  async getRolePermissions(@Param('roleId') roleId: string): Promise<RolePermissionResponseDto[]> {
    return this.permissionsService.getRolePermissions(roleId);
  }

  @Put('roles/:roleId')
  @ApiOperation({ summary: 'Update permissions for a role (batch update)' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role permissions updated', type: [RolePermissionResponseDto] })
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRolePermissionsDto,
  ): Promise<RolePermissionResponseDto[]> {
    return this.permissionsService.updateRolePermissions(roleId, dto);
  }

  // Seed endpoint (for development/setup - public access)
  @Post('seed')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed initial permissions (development)' })
  @ApiResponse({ status: 200, description: 'Permissions seeded' })
  async seedPermissions(): Promise<{ message: string }> {
    await this.permissionsService.seedInitialPermissions();
    return { message: 'Permissions seeded successfully' };
  }
}
