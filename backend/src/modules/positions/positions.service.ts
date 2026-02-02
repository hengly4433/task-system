import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PositionsRepository } from './positions.repository';
import { PositionsMapper } from './positions.mapper';
import { CreatePositionDto, UpdatePositionDto, PositionResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class PositionsService {
  constructor(
    private readonly positionsRepository: PositionsRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(): Promise<PositionResponseDto[]> {
    const positions = await this.positionsRepository.findAll();
    return PositionsMapper.toResponseList(positions);
  }

  async findById(id: string): Promise<PositionResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const position = await this.positionsRepository.findById(BigInt(id), tenantId);
    if (!position) {
      throw new NotFoundException('Position not found');
    }
    return PositionsMapper.toResponse(position);
  }

  async create(dto: CreatePositionDto): Promise<PositionResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Check if name already exists
    const existing = await this.positionsRepository.findByName(dto.positionName);
    if (existing) {
      throw new ConflictException('Position with this name already exists');
    }

    const position = await this.positionsRepository.create({
      positionName: dto.positionName,
      description: dto.description,
    });
    return PositionsMapper.toResponse(position);
  }

  async update(id: string, dto: UpdatePositionDto): Promise<PositionResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const position = await this.positionsRepository.findById(BigInt(id), tenantId);
    if (!position) {
      throw new NotFoundException('Position not found');
    }

    // Check if new name conflicts with another position
    if (dto.positionName && dto.positionName !== position.positionName) {
      const existing = await this.positionsRepository.findByName(dto.positionName);
      if (existing) {
        throw new ConflictException('Position with this name already exists');
      }
    }

    const updated = await this.positionsRepository.update(BigInt(id), {
      positionName: dto.positionName,
      description: dto.description,
    }, tenantId);
    return PositionsMapper.toResponse(updated);
  }

  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const position = await this.positionsRepository.findById(BigInt(id), tenantId);
    if (!position) {
      throw new NotFoundException('Position not found');
    }

    // Check if position is in use
    const userCount = await this.positionsRepository.countUsers(BigInt(id), tenantId);
    if (userCount > 0) {
      throw new ConflictException(`Cannot delete position: ${userCount} users are assigned to it`);
    }

    await this.positionsRepository.delete(BigInt(id), tenantId);
  }
}
