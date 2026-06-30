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
}
