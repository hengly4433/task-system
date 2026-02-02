import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DepartmentsRepository } from './departments.repository';
import { CreateDepartmentDto, UpdateDepartmentDto, ListDepartmentsQueryDto, DepartmentResponseDto } from './dto';
import { DepartmentsMapper } from './departments.mapper';
import { PaginatedResult, createPaginatedResult, getPaginationParams } from '../../common/pagination';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly repository: DepartmentsRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
    // Check if code already exists
    const existing = await this.repository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(`Department with code "${dto.code}" already exists`);
    }

    const department = await this.repository.create({
      tenant: { connect: { tenantId: this.tenantContext.requireTenantId() } },
      name: dto.name,
      code: dto.code,
      description: dto.description,
      isActive: dto.isActive ?? true,
    });

    return DepartmentsMapper.toResponse(department);
  }

  async findById(departmentId: string): Promise<DepartmentResponseDto> {
    const department = await this.repository.findById(BigInt(departmentId));
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return DepartmentsMapper.toResponse(department);
  }

  async findByCode(code: string): Promise<DepartmentResponseDto> {
    const department = await this.repository.findByCode(code);
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return DepartmentsMapper.toResponse(department);
  }

  async findAll(query: ListDepartmentsQueryDto): Promise<PaginatedResult<DepartmentResponseDto>> {
    const { skip, take } = getPaginationParams(query);
    const tenantId = this.tenantContext.requireTenantId();

    const where: any = { tenantId };
    
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [departments, totalItems] = await Promise.all([
      this.repository.findMany({ skip, take, where }),
      this.repository.count(where),
    ]);

    return createPaginatedResult(DepartmentsMapper.toResponseList(departments), totalItems, query);
  }

  async update(departmentId: string, dto: UpdateDepartmentDto): Promise<DepartmentResponseDto> {
    const existing = await this.repository.findById(BigInt(departmentId));
    if (!existing) {
      throw new NotFoundException('Department not found');
    }

    // Check if code update conflicts
    if (dto.code && dto.code !== existing.code) {
      const conflicting = await this.repository.findByCode(dto.code);
      if (conflicting) {
        throw new ConflictException(`Department with code "${dto.code}" already exists`);
      }
    }

    const updated = await this.repository.update(BigInt(departmentId), {
      ...(dto.name && { name: dto.name }),
      ...(dto.code && { code: dto.code }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    return DepartmentsMapper.toResponse(updated);
  }

  async delete(departmentId: string): Promise<void> {
    const department = await this.repository.findById(BigInt(departmentId));
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    await this.repository.softDelete(BigInt(departmentId));
  }

  // User-Department management
  async addUserToDepartment(userId: string, departmentId: string, isPrimary: boolean = false): Promise<void> {
    const department = await this.repository.findById(BigInt(departmentId));
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    await this.repository.addUserToDepartment(BigInt(userId), BigInt(departmentId), isPrimary);
  }

  async removeUserFromDepartment(userId: string, departmentId: string): Promise<void> {
    await this.repository.removeUserFromDepartment(BigInt(userId), BigInt(departmentId));
  }

  async getUserDepartments(userId: string): Promise<DepartmentResponseDto[]> {
    const userDepts = await this.repository.getUserDepartments(BigInt(userId));
    return userDepts.map((ud: { department: any }) => DepartmentsMapper.toResponse(ud.department));
  }
}
