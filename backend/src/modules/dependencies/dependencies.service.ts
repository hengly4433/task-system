import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DependenciesRepository } from './dependencies.repository';
import { DependenciesMapper } from './dependencies.mapper';
import { CreateDependencyDto, DependencyResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';
import { PrismaService } from '../../common/database';

@Injectable()
export class DependenciesService {
  constructor(
    private readonly dependenciesRepository: DependenciesRepository,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  async create(taskId: string, dto: CreateDependencyDto): Promise<DependencyResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const taskIdBigInt = BigInt(taskId);
    const dependentTaskIdBigInt = BigInt(dto.dependentTaskId);

    // Verify both tasks belong to tenant
    const tasks = await this.prisma.task.findMany({
      where: {
        taskId: { in: [taskIdBigInt, dependentTaskIdBigInt] },
        project: {
          tenantId,
        },
      },
    });

    if (tasks.length !== 2 && taskIdBigInt !== dependentTaskIdBigInt) {
      throw new NotFoundException('One or both tasks not found in this tenant');
    }

    // Rule 1: Cannot depend on itself
    if (taskIdBigInt === dependentTaskIdBigInt) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    // Rule 2: Check if dependency already exists
    const exists = await this.dependenciesRepository.exists(taskIdBigInt, dependentTaskIdBigInt);
    if (exists) {
      throw new ConflictException('This dependency already exists');
    }

    // Rule 3: Check for cycles using DFS
    const wouldCreateCycle = await this.wouldCreateCycle(taskIdBigInt, dependentTaskIdBigInt);
    if (wouldCreateCycle) {
      throw new BadRequestException('Adding this dependency would create a circular dependency');
    }

    const dependency = await this.dependenciesRepository.create(taskIdBigInt, dependentTaskIdBigInt);
    return DependenciesMapper.toResponse(dependency);
  }

  async findByTask(taskId: string): Promise<DependencyResponseDto[]> {
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

    const dependencies = await this.dependenciesRepository.findByTask(BigInt(taskId));
    return DependenciesMapper.toResponseList(dependencies);
  }

  async delete(dependencyId: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify dependency belongs to tenant via tasks
    const dependency = await this.prisma.taskDependency.findFirst({
      where: {
        dependencyId: BigInt(dependencyId),
        task: {
          project: {
            tenantId,
          },
        },
      },
    });

    if (!dependency) {
      throw new NotFoundException('Dependency not found in this tenant');
    }
    await this.dependenciesRepository.delete(BigInt(dependencyId));
  }

  /**
   * DFS cycle detection:
   * Check if adding an edge from taskId -> dependentTaskId would create a cycle.
   * A cycle exists if there's a path from dependentTaskId back to taskId.
   */
  private async wouldCreateCycle(taskId: bigint, dependentTaskId: bigint): Promise<boolean> {
    const allDeps = await this.dependenciesRepository.getAllDependenciesForCycleCheck();
    
    // Build adjacency list: task -> [tasks it depends on]
    const graph = new Map<string, string[]>();
    for (const dep of allDeps) {
      const key = dep.taskId.toString();
      if (!graph.has(key)) {
        graph.set(key, []);
      }
      graph.get(key)!.push(dep.dependentTaskId.toString());
    }

    // Add the proposed new edge
    const taskIdStr = taskId.toString();
    const dependentTaskIdStr = dependentTaskId.toString();
    if (!graph.has(taskIdStr)) {
      graph.set(taskIdStr, []);
    }
    graph.get(taskIdStr)!.push(dependentTaskIdStr);

    // DFS from dependentTaskId to see if we can reach taskId
    const visited = new Set<string>();
    const stack = [dependentTaskIdStr];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === taskIdStr) {
        return true; // Found cycle
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      const neighbors = graph.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }

    return false;
  }
}
