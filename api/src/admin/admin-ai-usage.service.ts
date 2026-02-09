import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAIUsageService {
  private readonly logger = new Logger(AdminAIUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get summary of AI usage (total tokens, cost, counts)
   */
  async getSummary() {
    const [totalUsage, costStats, taskCounts] = await Promise.all([
      this.prisma.aITokenUsage.aggregate({
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.aITokenUsage.aggregate({
        _sum: {
          costUSD: true,
        },
        _avg: {
          costUSD: true,
        },
      }),
      this.prisma.aITokenUsage.groupBy({
        by: ['taskType'],
        _count: {
          id: true,
        },
        _sum: {
          totalTokens: true,
          costUSD: true,
        },
      }),
    ]);

    return {
      total: {
        requests: totalUsage._count.id || 0,
        inputTokens: totalUsage._sum.inputTokens || 0,
        outputTokens: totalUsage._sum.outputTokens || 0,
        totalTokens: totalUsage._sum.totalTokens || 0,
        totalCostUSD: costStats._sum.costUSD || 0,
        averageCostUSD: costStats._avg.costUSD || 0,
      },
      byTask: taskCounts.map((tc) => ({
        taskType: tc.taskType,
        requests: tc._count.id,
        totalTokens: tc._sum.totalTokens || 0,
        totalCostUSD: tc._sum.costUSD || 0,
      })),
    };
  }

  /**
   * Get usage grouped by task type
   */
  async getUsageByTask() {
    const results = await this.prisma.aITokenUsage.groupBy({
      by: ['taskType'],
      _count: {
        id: true,
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUSD: true,
      },
      _avg: {
        costUSD: true,
        totalTokens: true,
      },
    });

    return results.map((r) => ({
      taskType: r.taskType,
      requests: r._count.id,
      inputTokens: r._sum.inputTokens || 0,
      outputTokens: r._sum.outputTokens || 0,
      totalTokens: r._sum.totalTokens || 0,
      totalCostUSD: r._sum.costUSD || 0,
      averageCostUSD: r._avg.costUSD || 0,
      averageTokens: r._avg.totalTokens || 0,
    }));
  }

  /**
   * Get usage grouped by model
   */
  async getUsageByModel() {
    const results = await this.prisma.aITokenUsage.groupBy({
      by: ['provider', 'model'],
      _count: {
        id: true,
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUSD: true,
      },
      _avg: {
        costUSD: true,
        totalTokens: true,
      },
    });

    return results.map((r) => ({
      provider: r.provider,
      model: r.model,
      requests: r._count.id,
      inputTokens: r._sum.inputTokens || 0,
      outputTokens: r._sum.outputTokens || 0,
      totalTokens: r._sum.totalTokens || 0,
      totalCostUSD: r._sum.costUSD || 0,
      averageCostUSD: r._avg.costUSD || 0,
      averageTokens: r._avg.totalTokens || 0,
    }));
  }

  /**
   * Get usage grouped by day
   */
  async getUsageByDay(from?: Date, to?: Date) {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = from;
      }
      if (to) {
        where.createdAt.lte = to;
      }
    }

    // Get all records in date range
    const records = await this.prisma.aITokenUsage.findMany({
      where,
      select: {
        createdAt: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUSD: true,
      },
    });

    // Group by day
    const grouped = new Map<
      string,
      {
        date: string;
        requests: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        totalCostUSD: number;
      }
    >();

    for (const record of records) {
      const dateKey = record.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      const existing = grouped.get(dateKey) || {
        date: dateKey,
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        totalCostUSD: 0,
      };

      existing.requests++;
      existing.inputTokens += record.inputTokens;
      existing.outputTokens += record.outputTokens;
      existing.totalTokens += record.totalTokens;
      existing.totalCostUSD += record.costUSD || 0;

      grouped.set(dateKey, existing);
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  /**
   * Get usage for a specific topic (by topicId/subcategory)
   */
  async getUsageByTopic(topicId: string) {
    const results = await this.prisma.aITokenUsage.findMany({
      where: {
        topicId,
      },
      select: {
        taskType: true,
        provider: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUSD: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const summary = results.reduce(
      (acc, r) => {
        acc.requests++;
        acc.inputTokens += r.inputTokens;
        acc.outputTokens += r.outputTokens;
        acc.totalTokens += r.totalTokens;
        acc.totalCostUSD += r.costUSD || 0;
        return acc;
      },
      {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        totalCostUSD: 0,
      },
    );

    return {
      topicId,
      summary,
      records: results,
    };
  }

  /**
   * Get usage for a specific batch
   */
  async getUsageByBatch(batchId: string) {
    const results = await this.prisma.aITokenUsage.findMany({
      where: {
        batchId,
      },
      select: {
        taskType: true,
        provider: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUSD: true,
        pageId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const summary = results.reduce(
      (acc, r) => {
        acc.requests++;
        acc.inputTokens += r.inputTokens;
        acc.outputTokens += r.outputTokens;
        acc.totalTokens += r.totalTokens;
        acc.totalCostUSD += r.costUSD || 0;
        return acc;
      },
      {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        totalCostUSD: 0,
      },
    );

    return {
      batchId,
      summary,
      records: results,
    };
  }
}
