import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface LogParams {
  actorId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: LogParams) {
    return this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findAll(filters: {
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    from?: Date;
    to?: Date;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.action && { action: filters.action }),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.entityId && { entityId: filters.entityId }),
        ...(filters.from || filters.to
          ? {
              createdAt: {
                ...(filters.from && { gte: filters.from }),
                ...(filters.to && { lte: filters.to }),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        actor: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async getSummary(from?: Date, to?: Date) {
    const dateFilter =
      from || to
        ? {
            createdAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {};

    const logs = await this.prisma.auditLog.findMany({
      where: dateFilter,
      select: { action: true, createdAt: true },
    });

    const byAction: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] ?? 0) + 1;
      const day = log.createdAt.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    }

    return {
      total: logs.length,
      byAction,
      byDay: Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
    };
  }

  async getByDocument(documentId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType: 'Document', entityId: documentId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async getByUser(targetUserId: string) {
    return this.prisma.auditLog.findMany({
      where: { actorId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        actor: { select: { id: true, email: true, name: true } },
      },
    });
  }
}
