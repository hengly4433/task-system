import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { CreateLabelDto, LabelResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class LabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateLabelDto): Promise<LabelResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    
    const existing = await this.prisma.label.findFirst({
      where: {
        labelName: dto.labelName,
        tenantId,
      },
    });
    if (existing) throw new ConflictException('Label with this name already exists in this tenant');

    const label = await this.prisma.label.create({
      data: { 
        labelName: dto.labelName, 
        labelColor: dto.labelColor,
        tenantId,
      },
    });
    return this.mapToResponse(label);
  }

  async findAll(): Promise<LabelResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const labels = await this.prisma.label.findMany({ 
      where: { tenantId },
      orderBy: { labelName: 'asc' },
    });
    return labels.map((l) => this.mapToResponse(l));
  }

  async assignToTask(taskId: string, labelId: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    // Verify task belongs to tenant
    const task = await this.prisma.task.findFirst({
      where: {
        taskId: BigInt(taskId),
        project: {
          tenantId,
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found in this tenant');

    // Verify label belongs to tenant
    const label = await this.prisma.label.findFirst({
      where: {
        labelId: BigInt(labelId),
        tenantId,
      },
    });
    if (!label) throw new NotFoundException('Label not found in this tenant');

    const exists = await this.prisma.taskLabel.findFirst({
      where: { taskId: BigInt(taskId), labelId: BigInt(labelId) },
    });
    if (exists) throw new ConflictException('Label already assigned to task');

    await this.prisma.taskLabel.create({
      data: { taskId: BigInt(taskId), labelId: BigInt(labelId) },
    });
  }

  async unassignFromTask(taskId: string, labelId: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    const taskLabel = await this.prisma.taskLabel.findFirst({
      where: { 
        taskId: BigInt(taskId), 
        labelId: BigInt(labelId),
        task: {
          project: {
            tenantId,
          },
        },
      },
    });
    if (!taskLabel) throw new NotFoundException('Label mapping not found in this tenant');
    await this.prisma.taskLabel.delete({ where: { taskLabelId: taskLabel.taskLabelId } });
  }

  async getTaskLabels(taskId: string): Promise<LabelResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const taskLabels = await this.prisma.taskLabel.findMany({
      where: { 
        taskId: BigInt(taskId),
        task: {
          project: {
            tenantId,
          },
        },
      },
      include: { label: true },
    });
    return taskLabels.map((tl) => this.mapToResponse(tl.label));
  }

  private mapToResponse(l: { labelId: bigint; labelName: string; labelColor: string }): LabelResponseDto {
    return { labelId: l.labelId.toString(), labelName: l.labelName, labelColor: l.labelColor };
  }
}
