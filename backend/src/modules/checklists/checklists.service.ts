import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { CreateChecklistDto, CreateChecklistItemDto, UpdateChecklistItemDto, ChecklistResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class ChecklistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createChecklist(taskId: string, dto: CreateChecklistDto): Promise<ChecklistResponseDto> {
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

    const checklist = await this.prisma.checklist.create({
      data: { taskId: BigInt(taskId), checklistName: dto.checklistName },
      include: { items: true },
    });
    return this.mapToResponse(checklist);
  }

  async addItem(checklistId: string, dto: CreateChecklistItemDto): Promise<ChecklistResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    const checklist = await this.prisma.checklist.findFirst({
      where: { 
        checklistId: BigInt(checklistId),
        task: {
          project: {
            tenantId,
          },
        },
      },
      include: { items: true },
    });
    if (!checklist) throw new NotFoundException('Checklist not found in this tenant');

    await this.prisma.checklistItem.create({
      data: { checklistId: BigInt(checklistId), itemName: dto.itemName },
    });

    const updatedChecklist = await this.prisma.checklist.findUnique({
      where: { checklistId: BigInt(checklistId) },
      include: { items: true },
    });

    return this.mapToResponse(updatedChecklist!);
  }

  async toggleItem(itemId: string, dto: UpdateChecklistItemDto): Promise<ChecklistResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Find item and verify tenant ownership via checklist -> task -> project
    const item = await this.prisma.checklistItem.findFirst({ 
      where: { 
        checklistItemId: BigInt(itemId),
        checklist: {
          task: {
            project: {
              tenantId,
            },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Checklist item not found in this tenant');
    
    await this.prisma.checklistItem.update({
      where: { checklistItemId: BigInt(itemId) },
      data: { isCompleted: dto.isCompleted ?? !item.isCompleted },
    });
    const checklist = await this.prisma.checklist.findUnique({
      where: { checklistId: item.checklistId },
      include: { items: true },
    });
    return this.mapToResponse(checklist!);
  }

  async findByTask(taskId: string): Promise<ChecklistResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const checklists = await this.prisma.checklist.findMany({
      where: { 
        taskId: BigInt(taskId),
        task: {
          project: {
            tenantId,
          },
        },
      },
      include: { items: true },
    });
    return checklists.map((c) => this.mapToResponse(c));
  }

  private mapToResponse(checklist: { checklistId: bigint; taskId: bigint; checklistName: string; items: { checklistItemId: bigint; itemName: string; isCompleted: boolean }[] }): ChecklistResponseDto {
    return {
      checklistId: checklist.checklistId.toString(),
      taskId: checklist.taskId.toString(),
      checklistName: checklist.checklistName,
      items: checklist.items.map((i) => ({
        checklistItemId: i.checklistItemId.toString(),
        itemName: i.itemName,
        isCompleted: i.isCompleted,
      })),
    };
  }
}
