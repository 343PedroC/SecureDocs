import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateEscritoDto } from './dto/create-escrito.dto';
import { UpdateEscritoDto } from './dto/update-escrito.dto';
import { ReviewEscritoDto } from './dto/review-escrito.dto';
import {
  Role,
  EstadoEscrito,
  EstadoExpediente,
  AuditAction,
} from '@prisma/client';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

@Injectable()
export class LegalDraftsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Crea un memorial o escrito procesal en estado inicial BORRADOR (RF-08)
   */
  async create(dto: CreateEscritoDto, author: AuthUser, ip?: string) {
    const exp = await this.prisma.expediente.findUnique({
      where: { id: dto.expedienteId },
    });
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    if (exp.estado === EstadoExpediente.ARCHIVADO) {
      throw new BadRequestException('No se pueden redactar escritos para un expediente archivado.');
    }

    // Si es pasante, verificar que esté asignado al expediente
    if (author.role === Role.PASANTE && exp.pasanteId !== author.id) {
      throw new ForbiddenException('Solo el pasante asignado puede redactar escritos en este expediente.');
    }

    const escrito = await this.prisma.escritoProcesal.create({
      data: {
        expedienteId: dto.expedienteId,
        autorId: author.id,
        titulo: dto.titulo,
        tipo: dto.tipo,
        contenido: dto.contenido,
        estado: EstadoEscrito.BORRADOR,
        version: 1,
      },
      include: {
        autor: { select: { id: true, name: true, role: true } },
      },
    });

    await this.audit.log({
      actorId: author.id,
      action: AuditAction.ESCRITO_CREADO,
      entityType: 'EscritoProcesal',
      entityId: escrito.id,
      ipAddress: ip,
      metadata: { titulo: escrito.titulo, tipo: escrito.tipo, radicado: exp.radicado },
    });

    return escrito;
  }

  /**
   * Actualiza el contenido del escrito (solo permitido en BORRADOR o RECHAZADO)
   */
  async update(id: string, dto: UpdateEscritoDto, user: AuthUser) {
    const escrito = await this.prisma.escritoProcesal.findUnique({ where: { id } });
    if (!escrito) throw new NotFoundException('Escrito no encontrado');

    if (escrito.estado === EstadoEscrito.APROBADO) {
      throw new BadRequestException(
        'El escrito ya cuenta con aval docente (APROBADO) y no puede ser modificado.',
      );
    }

    if (escrito.estado === EstadoEscrito.EN_REVISION) {
      throw new BadRequestException(
        'El escrito se encuentra en revisión por el Docente Supervisor y no puede editarse.',
      );
    }

    if (user.role === Role.PASANTE && escrito.autorId !== user.id) {
      throw new ForbiddenException('No tiene permisos para modificar este escrito.');
    }

    return this.prisma.escritoProcesal.update({
      where: { id },
      data: {
        titulo: dto.titulo ?? escrito.titulo,
        contenido: dto.contenido ?? escrito.contenido,
        estado: EstadoEscrito.BORRADOR, // Si estaba rechazado y se edita, vuelve a borrador
        version: escrito.version + 1,
      },
    });
  }

  /**
   * Someter escrito a revisión formal del Docente Supervisor (RF-08)
   */
  async submitForReview(id: string, user: AuthUser, ip?: string) {
    const escrito = await this.prisma.escritoProcesal.findUnique({
      where: { id },
      include: { expediente: true },
    });
    if (!escrito) throw new NotFoundException('Escrito no encontrado');

    if (escrito.estado === EstadoEscrito.APROBADO) {
      throw new BadRequestException('El escrito ya se encuentra aprobado.');
    }

    const updated = await this.prisma.escritoProcesal.update({
      where: { id },
      data: {
        estado: EstadoEscrito.EN_REVISION,
        fechaEnvioRevision: new Date(),
      },
    });

    await this.audit.log({
      actorId: user.id,
      action: AuditAction.ESCRITO_ENVIADO_REVISION,
      entityType: 'EscritoProcesal',
      entityId: escrito.id,
      ipAddress: ip,
      metadata: { radicado: escrito.expediente.radicado, version: escrito.version },
    });

    return updated;
  }

  /**
   * Docente Supervisor avala o rechaza el escrito con observaciones (CUN-05, RF-08, RF-10)
   */
  async review(id: string, dto: ReviewEscritoDto, supervisor: AuthUser, ip?: string) {
    const escrito = await this.prisma.escritoProcesal.findUnique({
      where: { id },
      include: { expediente: true },
    });
    if (!escrito) throw new NotFoundException('Escrito no encontrado');

    const esAprobado = dto.accion === 'APROBAR';
    const nuevoEstado = esAprobado ? EstadoEscrito.APROBADO : EstadoEscrito.RECHAZADO;

    const updated = await this.prisma.escritoProcesal.update({
      where: { id },
      data: {
        estado: nuevoEstado,
        observacionesDocente: dto.observacionesDocente,
        revisadoPorId: supervisor.id,
        fechaAprobacion: esAprobado ? new Date() : null,
      },
      include: {
        revisadoPor: { select: { id: true, name: true, role: true } },
      },
    });

    await this.audit.log({
      actorId: supervisor.id,
      action: esAprobado ? AuditAction.ESCRITO_APROBADO : AuditAction.ESCRITO_RECHAZADO,
      entityType: 'EscritoProcesal',
      entityId: escrito.id,
      ipAddress: ip,
      metadata: {
        radicado: escrito.expediente.radicado,
        accion: dto.accion,
        observaciones: dto.observacionesDocente,
      },
    });

    return updated;
  }

  /**
   * Listar escritos de un expediente específico
   */
  async findByExpediente(expedienteId: string) {
    return this.prisma.escritoProcesal.findMany({
      where: { expedienteId },
      include: {
        autor: { select: { id: true, name: true, role: true } },
        revisadoPor: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Listar escritos pendientes de revisión para el tablero de supervisión docente (RF-10)
   */
  async findPendingReview(supervisor: AuthUser) {
    const me = await this.prisma.user.findUnique({ where: { id: supervisor.id } });

    return this.prisma.escritoProcesal.findMany({
      where: {
        estado: EstadoEscrito.EN_REVISION,
        expediente: {
          OR: [
            { docenteSupervisorId: supervisor.id },
            ...(me?.areaAsignada ? [{ areaJuridica: me.areaAsignada }] : []),
          ],
        },
      },
      include: {
        expediente: {
          select: {
            id: true,
            radicado: true,
            areaJuridica: true,
            tipoCaso: true,
            sensibilidad: true,
          },
        },
        autor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { fechaEnvioRevision: 'asc' },
    });
  }

  async findOne(id: string) {
    const escrito = await this.prisma.escritoProcesal.findUnique({
      where: { id },
      include: {
        expediente: {
          include: {
            cliente: { select: { id: true, nombreCompleto: true, numeroDocumento: true } },
          },
        },
        autor: { select: { id: true, name: true, role: true } },
        revisadoPor: { select: { id: true, name: true, role: true } },
      },
    });

    if (!escrito) throw new NotFoundException('Escrito no encontrado');
    return escrito;
  }
}
