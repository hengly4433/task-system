import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { LogActivityParams, LogTaskHistoryParams } from './audit.types';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log user activity. Optionally accepts a transaction client for transactional writes.
   */
  async logActivity(
    params: LogActivityParams,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.activityLog.create({
      data: {
        userId: params.userId,
        activityType: params.activityType,
        details: params.details,
      },
    });
  }

  /**
   * Log task history record. Optionally accepts a transaction client for transactional writes.
   */
  async logTaskHistory(
    params: LogTaskHistoryParams,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.taskHistory.create({
      data: {
        taskId: params.taskId,
        changedBy: params.changedBy,
        changeDescription: params.changeDescription,
      },
    });
  }

  /**
   * Execute a database operation with audit logging in the same transaction
   */
  async withAudit<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    auditParams: (LogActivityParams | LogTaskHistoryParams)[],
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const result = await operation(tx);

      for (const params of auditParams) {
        if ('activityType' in params) {
          await this.logActivity(params, tx);
        } else {
          await this.logTaskHistory(params, tx);
        }
      }

      return result;
    });
  }
}
