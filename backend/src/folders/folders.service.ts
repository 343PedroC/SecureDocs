import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateFolderDto } from './dto/create-folder.dto';

@Injectable()
export class FoldersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateFolderDto, ip?: string) {
    if (dto.parentId) {
      const parent = await this.prisma.folder.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Carpeta padre no encontrada');
      if (parent.ownerId !== userId)
        throw new ForbiddenException('No tienes acceso a esa carpeta');
    }

    const folder = await this.prisma.folder.create({
      data: { name: dto.name, ownerId: userId, parentId: dto.parentId ?? null },
    });

    await this.audit.log({
      actorId: userId,
      action: 'FOLDER_CREATED',
      entityType: 'folder',
      entityId: folder.id,
      ipAddress: ip,
      metadata: { name: folder.name },
    });

    return folder;
  }

  async findAll(userId: string) {
    return this.prisma.folder.findMany({
      where: { ownerId: userId },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: { children: { select: { id: true, name: true } } },
    });
  }

  async remove(userId: string, folderId: string, ip?: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
    });
    if (!folder) throw new NotFoundException('Carpeta no encontrada');
    if (folder.ownerId !== userId) throw new ForbiddenException('Sin acceso');

    await this.deleteFolderRecursive(userId, folderId);

    await this.audit.log({
      actorId: userId,
      action: 'FOLDER_DELETED',
      entityType: 'folder',
      entityId: folderId,
      ipAddress: ip,
      metadata: { name: folder.name },
    });
  }

  private async deleteFolderRecursive(userId: string, folderId: string) {
    // Move documents in this folder to root
    await this.prisma.document.updateMany({
      where: { folderId, ownerId: userId },
      data: { folderId: null },
    });

    // Recurse into children before deleting the parent
    const children = await this.prisma.folder.findMany({
      where: { parentId: folderId, ownerId: userId },
      select: { id: true },
    });
    for (const child of children) {
      await this.deleteFolderRecursive(userId, child.id);
    }

    await this.prisma.folder.delete({ where: { id: folderId } });
  }
}
