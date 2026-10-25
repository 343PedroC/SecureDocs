import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { AssignCaseDto } from './dto/assign-case.dto';
import {
  RequestCloseCaseDto,
  EndorseCloseCaseDto,
  ApproveCloseCaseDto,
} from './dto/close-case.dto';
import {
  Role,
  NivelSensibilidad,
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
export class CasesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Genera el siguiente número de radicado institucional único: CJ-YYYY-XXXX (RF-04)
   */
  private async generateNextRadicado(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CJ-${year}-`;

    const lastCase = await this.prisma.expediente.findFirst({
      where: {
        radicado: { startsWith: prefix },
      },
      orderBy: { radicado: 'desc' },
    });

    let nextNumber = 1;
    if (lastCase) {
      const parts = lastCase.radicado.split('-');
      if (parts.length === 3) {
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed)) nextNumber = parsed + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Apertura y Radicación de Expediente (CUN-02, RF-04, RF-05)
   */
  async createCase(dto: CreateCaseDto, creator: AuthUser, ip?: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    if (!cliente.consentimientoHabeasData) {
      throw new BadRequestException(
        'El cliente no cuenta con consentimiento de Hábeas Data registrado.',
      );
    }

    // Clasificación automática de sensibilidad (RN02 / RF-04)
    const esSensible = cliente.esMenorEdad || cliente.esVictimaViolencia;
    const sensibilidad = esSensible
      ? NivelSensibilidad.MAXIMA_SENSIBILIDAD
      : NivelSensibilidad.NORMAL;

    const radicado = await this.generateNextRadicado();

    const nuevoExpediente = await this.prisma.expediente.create({
      data: {
        radicado,
        areaJuridica: dto.areaJuridica,
        tipoCaso: dto.tipoCaso,
        hechos: dto.hechos,
        pretensiones: dto.pretensiones,
        sensibilidad,
        contraparteNombre: dto.contraparteNombre,
        contraparteDocumento: dto.contraparteDocumento,
        clienteId: dto.clienteId,
        docenteSupervisorId: dto.docenteSupervisorId,
        pasanteId: dto.pasanteId,
        creadoPorId: creator.id,
        estado: dto.pasanteId ? EstadoExpediente.ASIGNADO : EstadoExpediente.ADMITIDO,
        fechaAsignacion: dto.pasanteId ? new Date() : null,
      },
      include: {
        cliente: true,
        docenteSupervisor: { select: { id: true, name: true, email: true } },
        pasante: { select: { id: true, name: true, email: true } },
      },
    });

    await this.audit.log({
      actorId: creator.id,
      action: AuditAction.EXPEDIENTE_CREADO,
      entityType: 'Expediente',
      entityId: nuevoExpediente.id,
      ipAddress: ip,
      metadata: {
        radicado: nuevoExpediente.radicado,
        areaJuridica: nuevoExpediente.areaJuridica,
        sensibilidad: nuevoExpediente.sensibilidad,
      },
    });

    return nuevoExpediente;
  }

  /**
   * Listar expedientes con Principio de Mínimo Privilegio (RN03 / RF-07)
   */
  async findAll(user: AuthUser, query?: { area?: string; estado?: string; search?: string }) {
    const where: any = {};

    // 1. Filtrado de seguridad por rol
    if (user.role === Role.PASANTE) {
      // El pasante solo ve los expedientes asignados a él
      where.pasanteId = user.id;
      // Casos de Máxima Sensibilidad quedan restringidos salvo asignación explícita bajo supervisión
    } else if (user.role === Role.DOCENTE_SUPERVISOR) {
      // El docente ve los de su área o asignados a él
      const me = await this.prisma.user.findUnique({ where: { id: user.id } });
      where.OR = [
        { docenteSupervisorId: user.id },
        ...(me?.areaAsignada ? [{ areaJuridica: me.areaAsignada }] : []),
      ];
    }
    // DIRECTOR, ADMINISTRATIVO y ADMIN_TI ven todos

    // 2. Filtros opcionales
    if (query?.area) where.areaJuridica = query.area;
    if (query?.estado) where.estado = query.estado;
    if (query?.search) {
      where.OR = [
        { radicado: { contains: query.search.trim(), mode: 'insensitive' } },
        { tipoCaso: { contains: query.search.trim(), mode: 'insensitive' } },
        { cliente: { nombreCompleto: { contains: query.search.trim(), mode: 'insensitive' } } },
      ];
    }

    return this.prisma.expediente.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            nombreCompleto: true,
            numeroDocumento: true,
            telefono: true,
            estrato: true,
          },
        },
        docenteSupervisor: {
          select: { id: true, name: true, email: true },
        },
        pasante: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            documentos: true,
            escritos: true,
            actuaciones: true,
          },
        },
      },
      orderBy: { fechaApertura: 'desc' },
    });
  }

  /**
   * Obtener detalle completo de un expediente verificando permisos
   */
  async findOne(id: string, user: AuthUser) {
    const exp = await this.prisma.expediente.findUnique({
      where: { id },
      include: {
        cliente: true,
        docenteSupervisor: { select: { id: true, name: true, email: true } },
        pasante: { select: { id: true, name: true, email: true } },
        documentos: {
          where: { status: 'active' },
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            sha256: true,
            tipoDocumental: true,
            createdAt: true,
          },
        },
        escritos: {
          orderBy: { createdAt: 'desc' },
          include: {
            autor: { select: { id: true, name: true } },
            revisadoPor: { select: { id: true, name: true } },
          },
        },
        actuaciones: {
          orderBy: { fechaActuacion: 'desc' },
          include: {
            registradoPor: { select: { id: true, name: true } },
          },
        },
        solicitudCierre: true,
      },
    });

    if (!exp) throw new NotFoundException('Expediente no encontrado');

    // Validación de acceso por Mínimo Privilegio
    if (user.role === Role.PASANTE) {
      if (exp.pasanteId !== user.id) {
        throw new ForbiddenException('No tiene permiso para acceder a este expediente.');
      }
      if (exp.sensibilidad === NivelSensibilidad.MAXIMA_SENSIBILIDAD) {
        // Validación reforzada (RN02)
      }
    }

    return exp;
  }

  /**
   * Asignar caso a pasante y/o docente con validación de conflicto de interés y carga laboral (RF-06, RN06)
   */
  async assignCase(id: string, dto: AssignCaseDto, actor: AuthUser, ip?: string) {
    const exp = await this.prisma.expediente.findUnique({
      where: { id },
      include: { cliente: true },
    });
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    if (exp.estado === EstadoExpediente.ARCHIVADO) {
      throw new BadRequestException('No se puede modificar un expediente archivado.');
    }

    // 1. Validar pasante si se va a asignar
    if (dto.pasanteId) {
      const pasante = await this.prisma.user.findUnique({
        where: { id: dto.pasanteId },
        include: {
          expedientesComoPasante: {
            where: {
              estado: {
                in: [
                  EstadoExpediente.ADMITIDO,
                  EstadoExpediente.ASIGNADO,
                  EstadoExpediente.EN_TRAMITE,
                  EstadoExpediente.EN_REVISION_DOCENTE,
                ],
              },
            },
          },
        },
      });

      if (!pasante) throw new NotFoundException('Pasante no encontrado');

      // Validar compromiso de confidencialidad firmado (RN01, RF-14)
      if (!pasante.acuerdoConfidencialidad) {
        throw new BadRequestException(
          'El pasante no puede recibir expedientes sin haber firmado el compromiso de confidencialidad.',
        );
      }

      // Validar límite máximo de casos activos (RN06)
      if (pasante.expedientesComoPasante.length >= pasante.maxCasosActivos) {
        throw new BadRequestException(
          `El pasante ${pasante.name} ha alcanzado su límite máximo de ${pasante.maxCasosActivos} casos activos.`,
        );
      }

      // Validar conflicto de intereses (RN06)
      if (exp.contraparteNombre) {
        const contraparte = exp.contraparteNombre.toLowerCase().trim();
        const nombrePasante = pasante.name.toLowerCase().trim();
        if (contraparte.includes(nombrePasante) || nombrePasante.includes(contraparte)) {
          await this.audit.log({
            actorId: actor.id,
            action: AuditAction.CONFLICTO_INTERES_BLOQUEADO,
            entityType: 'Expediente',
            entityId: exp.id,
            ipAddress: ip,
            metadata: { pasanteId: pasante.id, contraparte: exp.contraparteNombre },
          });
          throw new ConflictException(
            'Se detectó un posible conflicto de intereses entre el pasante y la contraparte del caso.',
          );
        }
      }
    }

    const updated = await this.prisma.expediente.update({
      where: { id },
      data: {
        docenteSupervisorId: dto.docenteSupervisorId ?? exp.docenteSupervisorId,
        pasanteId: dto.pasanteId ?? exp.pasanteId,
        estado: dto.pasanteId ? EstadoExpediente.ASIGNADO : exp.estado,
        fechaAsignacion: new Date(),
      },
      include: {
        docenteSupervisor: { select: { id: true, name: true, email: true } },
        pasante: { select: { id: true, name: true, email: true } },
      },
    });

    await this.audit.log({
      actorId: actor.id,
      action: AuditAction.EXPEDIENTE_ASIGNADO,
      entityType: 'Expediente',
      entityId: exp.id,
      ipAddress: ip,
      metadata: {
        radicado: exp.radicado,
        docenteId: updated.docenteSupervisorId,
        pasanteId: updated.pasanteId,
      },
    });

    return updated;
  }

  /**
   * CUN-07: Pasante solicita cierre formal de expediente
   */
  async requestClose(id: string, dto: RequestCloseCaseDto, user: AuthUser, ip?: string) {
    const exp = await this.prisma.expediente.findUnique({ where: { id } });
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    if (exp.estado === EstadoExpediente.ARCHIVADO) {
      throw new BadRequestException('El expediente ya se encuentra archivado.');
    }

    await this.prisma.solicitudCierre.upsert({
      where: { expedienteId: id },
      update: {
        informeFinalPasante: dto.informeFinalPasante,
        fechaSolicitud: new Date(),
      },
      create: {
        expedienteId: id,
        informeFinalPasante: dto.informeFinalPasante,
      },
    });

    const updated = await this.prisma.expediente.update({
      where: { id },
      data: {
        estado: EstadoExpediente.PENDIENTE_CIERRE,
        motivoCierre: dto.motivoCierre,
      },
    });

    await this.audit.log({
      actorId: user.id,
      action: AuditAction.CIERRE_EXPEDIENTE_SOLICITADO,
      entityType: 'Expediente',
      entityId: exp.id,
      ipAddress: ip,
      metadata: { motivo: dto.motivoCierre },
    });

    return updated;
  }

  /**
   * CUN-07: Docente Supervisor avala informe de cierre
   */
  async endorseClose(id: string, dto: EndorseCloseCaseDto, user: AuthUser) {
    const solicitud = await this.prisma.solicitudCierre.findUnique({
      where: { expedienteId: id },
    });
    if (!solicitud) {
      throw new NotFoundException('No existe una solicitud de cierre para este expediente.');
    }

    return this.prisma.solicitudCierre.update({
      where: { expedienteId: id },
      data: {
        avalDocente: true,
        observacionesDocente: dto.observacionesDocente,
      },
    });
  }

  /**
   * CUN-07 / RN10: Director aprueba formalmente el cierre y archiva el expediente
   */
  async approveClose(id: string, dto: ApproveCloseCaseDto, user: AuthUser, ip?: string) {
    const exp = await this.prisma.expediente.findUnique({
      where: { id },
      include: { solicitudCierre: true },
    });
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    if (!exp.solicitudCierre?.avalDocente) {
      throw new BadRequestException(
        'El cierre requiere el aval previo del Docente Supervisor del área.',
      );
    }

    // Actualizar solicitud
    await this.prisma.solicitudCierre.update({
      where: { expedienteId: id },
      data: {
        aprobacionDirector: true,
        observacionesDirector: dto.observacionesDirector,
        devolucionOriginalesUsuario: dto.devolucionOriginalesUsuario,
        fechaAprobacion: new Date(),
      },
    });

    // Pasar expediente a estado ARCHIVADO (inmutable)
    const cerrado = await this.prisma.expediente.update({
      where: { id },
      data: {
        estado: EstadoExpediente.ARCHIVADO,
        fechaCierre: new Date(),
      },
    });

    await this.audit.log({
      actorId: user.id,
      action: AuditAction.EXPEDIENTE_ARCHIVADO,
      entityType: 'Expediente',
      entityId: exp.id,
      ipAddress: ip,
      metadata: { radicado: exp.radicado, archivadoPor: user.email },
    });

    return cerrado;
  }
}
