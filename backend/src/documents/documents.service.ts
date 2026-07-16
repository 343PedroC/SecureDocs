import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private storage: StorageService,
    private audit: AuditService,
  ) {}

  async upload(
    file: Express.Multer.File,
    userId: string,
    folderId?: string,
    ip?: string,
  ) {
    if (folderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: folderId },
      });
      if (!folder) throw new NotFoundException('Carpeta no encontrada');
      if (folder.ownerId !== userId)
        throw new ForbiddenException('Sin acceso a esa carpeta');
    }

    const fileBuffer = file.buffer;
    const sha256 = this.crypto.sha256(fileBuffer);
    const { encrypted, iv, authTag } = this.crypto.encrypt(fileBuffer);
    const storageKey = `docs/${uuidv4()}`;

    await this.storage.putObject(storageKey, encrypted);

    // Check if a document with same name exists for versioning
    const existing = await this.prisma.document.findFirst({
      where: { ownerId: userId, originalName: file.originalname, status: 'active' },
      include: { versions: true },
    });

    if (existing) {
      // Save current content as a new version before updating
      const nextVersion = existing.versions.length + 1;
      await this.prisma.documentVersion.create({
        data: {
          documentId: existing.id,
          versionNumber: nextVersion,
          originalName: existing.originalName,
          mimeType: existing.mimeType,
          size: existing.size,
          sha256: existing.sha256,
          storageKey: existing.storageKey,
          encryptionIv: existing.encryptionIv,
          encryptionAuthTag: existing.encryptionAuthTag,
        },
      });

      const document = await this.prisma.document.update({
        where: { id: existing.id },
        data: {
          mimeType: file.mimetype,
          size: file.size,
          sha256,
          storageKey,
          encryptionIv: iv,
          encryptionAuthTag: authTag,
          ...(folderId !== undefined ? { folderId } : {}),
        },
      });

      await this.audit.log({
        actorId: userId,
        action: 'DOCUMENT_VERSION_CREATED',
        entityType: 'Document',
        entityId: document.id,
        ipAddress: ip,
        metadata: { originalName: file.originalname, version: nextVersion + 1 },
      });

      return {
        id: document.id,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        sha256: document.sha256,
        createdAt: document.createdAt,
        newVersion: true,
        versionNumber: nextVersion + 1,
      };
    }

    const document = await this.prisma.document.create({
      data: {
        ownerId: userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        sha256,
        storageKey,
        encryptionIv: iv,
        encryptionAuthTag: authTag,
        folderId: folderId ?? null,
      },
    });

    await this.prisma.documentPermission.create({
      data: { documentId: document.id, userId, permission: 'owner' },
    });

    await this.audit.log({
      actorId: userId,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: document.id,
      ipAddress: ip,
      metadata: { originalName: file.originalname, size: file.size, sha256 },
    });

    return {
      id: document.id,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
      sha256: document.sha256,
      createdAt: document.createdAt,
    };
  }

  async download(documentId: string, userId: string, ip?: string) {
    const permission = await this.prisma.documentPermission.findFirst({
      where: { documentId, userId, permission: { in: ['owner', 'read'] } },
    });

    if (!permission) {
      await this.audit.log({
        actorId: userId,
        action: 'DOCUMENT_ACCESS_DENIED',
        entityType: 'Document',
        entityId: documentId,
        ipAddress: ip,
      });
      throw new ForbiddenException('No tienes permiso para acceder a este documento');
    }

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.status === 'deleted') {
      throw new NotFoundException('Documento no encontrado');
    }

    const encryptedBuffer = await this.storage.getObject(document.storageKey);
    const decrypted = this.crypto.decrypt(
      encryptedBuffer,
      document.encryptionIv,
      document.encryptionAuthTag,
    );

    await this.audit.log({
      actorId: userId,
      action: 'DOCUMENT_DOWNLOADED',
      entityType: 'Document',
      entityId: document.id,
      ipAddress: ip,
    });

    return {
      buffer: decrypted,
      originalName: document.originalName,
      mimeType: document.mimeType,
    };
  }

  async downloadVersion(documentId: string, versionId: string, userId: string, ip?: string) {
    const permission = await this.prisma.documentPermission.findFirst({
      where: { documentId, userId, permission: { in: ['owner', 'read'] } },
    });

    if (!permission) {
      await this.audit.log({
        actorId: userId,
        action: 'DOCUMENT_ACCESS_DENIED',
        entityType: 'Document',
        entityId: documentId,
        ipAddress: ip,
      });
      throw new ForbiddenException('No tienes permiso para acceder a este documento');
    }

    const version = await this.prisma.documentVersion.findFirst({
      where: { id: versionId, documentId },
    });

    if (!version) throw new NotFoundException('Versión no encontrada');

    const encryptedBuffer = await this.storage.getObject(version.storageKey);
    const decrypted = this.crypto.decrypt(
      encryptedBuffer,
      version.encryptionIv,
      version.encryptionAuthTag,
    );

    return {
      buffer: decrypted,
      originalName: version.originalName,
      mimeType: version.mimeType,
    };
  }

  async getVersions(documentId: string, userId: string) {
    const permission = await this.prisma.documentPermission.findFirst({
      where: { documentId, userId, permission: { in: ['owner', 'read'] } },
    });
    if (!permission) throw new ForbiddenException('Sin acceso');

    return this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        originalName: true,
        mimeType: true,
        size: true,
        sha256: true,
        createdAt: true,
        encryptionIv: true,
        encryptionAuthTag: true,
        storageKey: true,
      },
    });
  }

  async softDelete(documentId: string, userId: string, ip?: string) {
    const permission = await this.prisma.documentPermission.findFirst({
      where: { documentId, userId, permission: 'owner' },
    });
    if (!permission) throw new ForbiddenException('Solo el propietario puede eliminar este documento');

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document || document.status === 'deleted') {
      throw new NotFoundException('Documento no encontrado');
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'deleted' },
    });

    await this.audit.log({
      actorId: userId,
      action: 'DOCUMENT_DELETED',
      entityType: 'Document',
      entityId: documentId,
      ipAddress: ip,
      metadata: { originalName: document.originalName },
    });

    return { message: 'Documento eliminado correctamente' };
  }

  async findTrash(userId: string) {
    const permissions = await this.prisma.documentPermission.findMany({
      where: { userId, permission: 'owner' },
      include: {
        document: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            status: true,
            updatedAt: true,
          },
        },
      },
    });

    return permissions
      .filter((p) => p.document.status === 'deleted')
      .map((p) => p.document);
  }

  async restore(documentId: string, userId: string, ip?: string) {
    const permission = await this.prisma.documentPermission.findFirst({
      where: { documentId, userId, permission: 'owner' },
    });
    if (!permission) throw new ForbiddenException('Solo el propietario puede restaurar este documento');

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document || document.status !== 'deleted') {
      throw new NotFoundException('Documento eliminado no encontrado');
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'active' },
    });

    await this.audit.log({
      actorId: userId,
      action: 'DOCUMENT_RESTORED',
      entityType: 'Document',
      entityId: documentId,
      ipAddress: ip,
      metadata: { originalName: document.originalName },
    });

    return { message: 'Documento restaurado correctamente' };
  }

  async moveToFolder(documentId: string, userId: string, folderId: string | null, ip?: string) {
    const permission = await this.prisma.documentPermission.findFirst({
      where: { documentId, userId, permission: 'owner' },
    });
    if (!permission) throw new ForbiddenException('Solo el propietario puede mover este documento');

    if (folderId) {
      const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder) throw new NotFoundException('Carpeta no encontrada');
      if (folder.ownerId !== userId) throw new ForbiddenException('Sin acceso a esa carpeta');
    }

    const document = await this.prisma.document.update({
      where: { id: documentId },
      data: { folderId: folderId ?? null },
    });

    await this.audit.log({
      actorId: userId,
      action: 'DOCUMENT_MOVED',
      entityType: 'Document',
      entityId: documentId,
      ipAddress: ip,
      metadata: { folderId },
    });

    return { id: document.id, folderId: document.folderId };
  }

  async shareDocument(documentId: string, ownerUserId: string, targetEmail: string, ip?: string) {
    const ownerPermission = await this.prisma.documentPermission.findFirst({
      where: { documentId, userId: ownerUserId, permission: 'owner' },
    });
    if (!ownerPermission) {
      throw new ForbiddenException('Solo el propietario puede compartir este documento');
    }

    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.status === 'deleted') {
      throw new NotFoundException('Documento no encontrado');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { email: targetEmail },
      select: { id: true, email: true, name: true },
    });
    if (!targetUser) {
      throw new NotFoundException(`No existe un usuario con el email "${targetEmail}"`);
    }

    if (targetUser.id === ownerUserId) {
      throw new BadRequestException('No puedes compartir un documento contigo mismo');
    }

    const existing = await this.prisma.documentPermission.findUnique({
      where: { documentId_userId: { documentId, userId: targetUser.id } },
    });
    if (existing) {
      throw new ConflictException(`"${targetEmail}" ya tiene acceso a este documento`);
    }

    await this.prisma.documentPermission.create({
      data: { documentId, userId: targetUser.id, permission: 'read' },
    });

    await this.audit.log({
      actorId: ownerUserId,
      action: 'DOCUMENT_SHARED',
      entityType: 'Document',
      entityId: documentId,
      ipAddress: ip,
      metadata: { sharedWith: targetUser.email, sharedWithId: targetUser.id },
    });

    return {
      message: `Documento compartido con ${targetUser.name} (${targetUser.email})`,
      user: targetUser,
    };
  }

  async getPermissions(documentId: string, requestingUserId: string) {
    const ownerPermission = await this.prisma.documentPermission.findFirst({
      where: { documentId, userId: requestingUserId, permission: { in: ['owner'] } },
    });
    if (!ownerPermission) {
      throw new ForbiddenException('Solo el propietario puede ver los permisos de este documento');
    }

    return this.prisma.documentPermission.findMany({
      where: { documentId },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async revokePermission(documentId: string, ownerUserId: string, targetUserId: string, ip?: string) {
    const ownerPermission = await this.prisma.documentPermission.findFirst({
      where: { documentId, userId: ownerUserId, permission: 'owner' },
    });
    if (!ownerPermission) {
      throw new ForbiddenException('Solo el propietario puede revocar permisos');
    }

    if (targetUserId === ownerUserId) {
      throw new BadRequestException('No puedes revocar tu propio acceso como propietario');
    }

    const existing = await this.prisma.documentPermission.findUnique({
      where: { documentId_userId: { documentId, userId: targetUserId } },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Este usuario no tiene acceso al documento');
    }

    await this.prisma.documentPermission.delete({
      where: { documentId_userId: { documentId, userId: targetUserId } },
    });

    await this.audit.log({
      actorId: ownerUserId,
      action: 'DOCUMENT_UNSHARED',
      entityType: 'Document',
      entityId: documentId,
      ipAddress: ip,
      metadata: { revokedFrom: existing.user.email, revokedFromId: targetUserId },
    });

    return { message: `Acceso de ${existing.user.name} revocado correctamente` };
  }

  async findAllForUser(userId: string, folderId?: string | null) {
    const permissions = await this.prisma.documentPermission.findMany({
      where: { userId },
      include: {
        document: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            sha256: true,
            status: true,
            folderId: true,
            createdAt: true,
            updatedAt: true,
            owner: { select: { id: true, email: true, name: true } },
            folder: { select: { id: true, name: true } },
            versions: { select: { id: true, versionNumber: true, createdAt: true }, orderBy: { versionNumber: 'desc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return permissions
      .filter((p) => {
        if (p.document.status !== 'active') return false;
        if (folderId !== undefined) return p.document.folderId === folderId;
        return true;
      })
      .map((p) => ({
        ...p.document,
        permission: p.permission,
        versionCount: p.document.versions.length + 1,
      }));
  }
}
