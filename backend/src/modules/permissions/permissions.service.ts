import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PermissionsRepository } from './permissions.repository';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
  RolePermissionResponseDto,
  PermissionsByCategoryResponseDto,
  UpdateRolePermissionsDto,
} from './dto';
import { PermissionsMapper } from './permissions.mapper';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  // Permission CRUD operations
  async create(dto: CreatePermissionDto): Promise<PermissionResponseDto> {
    const existing = await this.permissionsRepository.findPermissionByCode(dto.code);
    if (existing) {
      throw new ConflictException('Permission with this code already exists');
    }

    const permission = await this.permissionsRepository.createPermission({
      code: dto.code,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      sortOrder: dto.sortOrder ?? 0,
    });

    return PermissionsMapper.toResponse(permission);
  }

  async findAll(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionsRepository.findAllPermissions();
    return PermissionsMapper.toResponseList(permissions);
  }

  async findAllGroupedByCategory(): Promise<PermissionsByCategoryResponseDto[]> {
    const permissions = await this.permissionsRepository.findAllPermissions();
    const categories = await this.permissionsRepository.getCategories();

    return categories.map((category) => ({
      category,
      permissions: PermissionsMapper.toResponseList(
        permissions.filter((p) => p.category === category),
      ),
    }));
  }

  async findByCategory(category: string): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionsRepository.findPermissionsByCategory(category);
    return PermissionsMapper.toResponseList(permissions);
  }

  async findById(permissionId: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionsRepository.findPermissionById(BigInt(permissionId));
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    return PermissionsMapper.toResponse(permission);
  }

  async update(permissionId: string, dto: UpdatePermissionDto): Promise<PermissionResponseDto> {
    const existing = await this.permissionsRepository.findPermissionById(BigInt(permissionId));
    if (!existing) {
      throw new NotFoundException('Permission not found');
    }

    // Check code uniqueness if updating code
    if (dto.code && dto.code !== existing.code) {
      const codeExists = await this.permissionsRepository.findPermissionByCode(dto.code);
      if (codeExists) {
        throw new ConflictException('Permission with this code already exists');
      }
    }

    const permission = await this.permissionsRepository.updatePermission(BigInt(permissionId), {
      ...(dto.code && { code: dto.code }),
      ...(dto.name && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category && { category: dto.category }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });

    return PermissionsMapper.toResponse(permission);
  }

  async delete(permissionId: string): Promise<void> {
    const existing = await this.permissionsRepository.findPermissionById(BigInt(permissionId));
    if (!existing) {
      throw new NotFoundException('Permission not found');
    }
    await this.permissionsRepository.deletePermission(BigInt(permissionId));
  }

  // Role-Permission management
  async getRolePermissions(roleId: string): Promise<RolePermissionResponseDto[]> {
    const rolePermissions = await this.permissionsRepository.findRolePermissions(BigInt(roleId));
    return PermissionsMapper.rolePermissionsToResponseList(rolePermissions);
  }

  async updateRolePermissions(roleId: string, dto: UpdateRolePermissionsDto): Promise<RolePermissionResponseDto[]> {
    const permissions = dto.permissions.map((p) => ({
      permissionId: BigInt(p.permissionId),
      granted: p.granted,
    }));

    await this.permissionsRepository.bulkUpsertRolePermissions(BigInt(roleId), permissions);

    // Return updated permissions
    const updated = await this.permissionsRepository.findRolePermissions(BigInt(roleId));
    return PermissionsMapper.rolePermissionsToResponseList(updated);
  }

  async getCategories(): Promise<string[]> {
    return this.permissionsRepository.getCategories();
  }

  // Seed initial permissions (called during app bootstrap or manually)
  async seedInitialPermissions(): Promise<void> {
    const initialPermissions = [
      // Tasks category
      { code: 'task.add', name: 'Add Tasks', category: 'tasks', sortOrder: 1 },
      { code: 'task.edit_own', name: 'Edit own Tasks', category: 'tasks', sortOrder: 2 },
      { code: 'task.edit_other', name: 'Edit other user task', category: 'tasks', sortOrder: 3 },
      { code: 'task.delete_own', name: 'Delete own task', category: 'tasks', sortOrder: 4 },
      { code: 'task.delete_other', name: 'Delete other user task', category: 'tasks', sortOrder: 5 },
      { code: 'task.assign_own', name: 'Change assignment for own task', category: 'tasks', sortOrder: 6 },
      { code: 'task.assign_other', name: 'Change assignment for other user task', category: 'tasks', sortOrder: 7 },
      { code: 'task.status_own', name: 'Change progress status for own task', category: 'tasks', sortOrder: 8 },
      { code: 'task.status_other', name: 'Change progress status for other user task', category: 'tasks', sortOrder: 9 },
      { code: 'task.due_date_own', name: 'Change due date for own task', category: 'tasks', sortOrder: 10 },
      { code: 'task.due_date_other', name: 'Change due date for other user task', category: 'tasks', sortOrder: 11 },
      { code: 'task.comment_add', name: 'Add comment', category: 'tasks', sortOrder: 12 },
      { code: 'task.comment_edit_own', name: 'Edit own comment', category: 'tasks', sortOrder: 13 },
      { code: 'task.comment_delete_own', name: 'Delete own comment', category: 'tasks', sortOrder: 14 },
      { code: 'task.comment_delete_other', name: 'Delete other user comment', category: 'tasks', sortOrder: 15 },
      
      // Meetings category
      { code: 'meeting.create', name: 'Create meetings', category: 'meetings', sortOrder: 1 },
      { code: 'meeting.edit_own', name: 'Edit own meetings', category: 'meetings', sortOrder: 2 },
      { code: 'meeting.edit_other', name: 'Edit other user meetings', category: 'meetings', sortOrder: 3 },
      { code: 'meeting.delete_own', name: 'Delete own meetings', category: 'meetings', sortOrder: 4 },
      { code: 'meeting.delete_other', name: 'Delete other user meetings', category: 'meetings', sortOrder: 5 },
      
      // Calendar category
      { code: 'calendar.view_all', name: 'View all calendar events', category: 'calendar', sortOrder: 1 },
      { code: 'calendar.create_event', name: 'Create calendar events', category: 'calendar', sortOrder: 2 },
      
      // Chat category
      { code: 'chat.send_message', name: 'Send messages', category: 'chat', sortOrder: 1 },
      { code: 'chat.delete_own_message', name: 'Delete own messages', category: 'chat', sortOrder: 2 },
      { code: 'chat.delete_other_message', name: 'Delete other user messages', category: 'chat', sortOrder: 3 },
      
      // Timesheets category
      { code: 'timesheet.log_own', name: 'Log own time entries', category: 'timesheets', sortOrder: 1 },
      { code: 'timesheet.view_all', name: 'View all time entries', category: 'timesheets', sortOrder: 2 },
      { code: 'timesheet.edit_other', name: 'Edit other user time entries', category: 'timesheets', sortOrder: 3 },
      
      // Reports category
      { code: 'report.view', name: 'View reports', category: 'reports', sortOrder: 1 },
      { code: 'report.export', name: 'Export reports', category: 'reports', sortOrder: 2 },
      
      // Users management
      { code: 'user.view', name: 'View users', category: 'users', sortOrder: 1 },
      { code: 'user.create', name: 'Create users', category: 'users', sortOrder: 2 },
      { code: 'user.edit', name: 'Edit users', category: 'users', sortOrder: 3 },
      { code: 'user.delete', name: 'Delete users', category: 'users', sortOrder: 4 },
      { code: 'user.assign_roles', name: 'Assign roles to users', category: 'users', sortOrder: 5 },
      
      // Workspace management
      { code: 'workspace.create', name: 'Create workspaces', category: 'workspace', sortOrder: 1 },
      { code: 'workspace.edit', name: 'Edit workspaces', category: 'workspace', sortOrder: 2 },
      { code: 'workspace.delete', name: 'Delete workspaces', category: 'workspace', sortOrder: 3 },
      { code: 'workspace.manage_members', name: 'Manage workspace members', category: 'workspace', sortOrder: 4 },
      
      // Boards category
      { code: 'board.create', name: 'Create boards', category: 'boards', sortOrder: 1 },
      { code: 'board.edit', name: 'Edit boards', category: 'boards', sortOrder: 2 },
      { code: 'board.delete', name: 'Delete boards', category: 'boards', sortOrder: 3 },
    ];

    for (const perm of initialPermissions) {
      const existing = await this.permissionsRepository.findPermissionByCode(perm.code);
      if (!existing) {
        await this.permissionsRepository.createPermission(perm);
      }
    }
  }
}
