import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async search(query: string) {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, name: true },
      take: 10,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async changeRole(
    adminId: string,
    targetId: string,
    role: Role,
    ip?: string,
  ) {
    if (adminId === targetId) {
      throw new BadRequestException('No puedes cambiar tu propio rol');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    await this.audit.log({
      actorId: adminId,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: targetId,
      ipAddress: ip,
      metadata: { previousRole: user.role, newRole: role },
    });

    return updated;
  }

  async setActive(
    adminId: string,
    targetId: string,
    isActive: boolean,
    ip?: string,
  ) {
    if (adminId === targetId) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    await this.audit.log({
      actorId: adminId,
      action: isActive ? 'USER_ENABLED' : 'USER_DISABLED',
      entityType: 'User',
      entityId: targetId,
      ipAddress: ip,
    });

    return updated;
  }
}
