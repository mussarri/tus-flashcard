/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIProviderType } from '@prisma/client';

export interface AuditLogData {
  adminUserId: string;
  actionType: string;
  actionMode?: string;
  provider?: AIProviderType;
  batchId?: string;
  approvedContentId?: string;
  topicId?: string;
  knowledgePointId?: string;
  success: boolean;
  resultCount?: number;
  skippedCount?: number;
  deletedCount?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface EntityActionLogData {
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  details?: Record<string, any>;
  success?: boolean;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an admin action
   */
  async logAction(data: AuditLogData | EntityActionLogData): Promise<void> {
    try {
      const normalizedData = this.isEntityActionLog(data)
        ? this.mapEntityActionToAuditLog(data)
        : data;
      await this.prisma.adminAuditLog.create({
        data: {
          adminUserId: normalizedData.adminUserId,
          actionType: normalizedData.actionType,
          actionMode: normalizedData.actionMode || null,
          provider: normalizedData.provider || null,
          batchId: normalizedData.batchId || null,
          approvedContentId: normalizedData.approvedContentId || null,
          topicId: normalizedData.topicId || null,
          knowledgePointId: normalizedData.knowledgePointId || null,
          success: normalizedData.success,
          resultCount: normalizedData.resultCount || null,
          skippedCount: normalizedData.skippedCount || null,
          deletedCount: normalizedData.deletedCount || null,
          errorMessage: normalizedData.errorMessage || null,
          metadata: normalizedData.metadata
            ? (normalizedData.metadata as any)
            : null,
        },
      });

      this.logger.log(
        `Audit log created: ${normalizedData.actionType} by ${normalizedData.adminUserId} - Success: ${normalizedData.success}`,
      );
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      this.logger.error(
        `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private isEntityActionLog(
    data: AuditLogData | EntityActionLogData,
  ): data is EntityActionLogData {
    return 'entityType' in data && 'entityId' in data && 'userId' in data;
  }

  private mapEntityActionToAuditLog(data: EntityActionLogData): AuditLogData {
    const details = data.details || {};
    return {
      adminUserId: data.userId,
      actionType: `${data.entityType}_${data.action}`,
      success: data.success ?? true,
      topicId:
        typeof details.topicId === 'string' ? details.topicId : undefined,
      knowledgePointId:
        typeof details.knowledgePointId === 'string'
          ? details.knowledgePointId
          : undefined,
      metadata: {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        details,
      },
    };
  }
}
