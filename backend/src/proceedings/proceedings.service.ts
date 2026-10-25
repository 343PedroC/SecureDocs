import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateActuacionDto } from './dto/create-actuacion.dto';
import { Role, EstadoExpediente, AuditAction } from '@prisma/client';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AlertaTermino {
  actuacionId: string;
  expedienteId: string;
  radicado: string;
  tipoCaso: string;
  descripcion: string;
  fechaVencimiento: Date;
  diasRestantes: number;
  nivelAlerta: 'VENCIDO' | 'ALERTA_1_DIA' | 'ALERTA_3_DIAS' | 'ALERTA_7_DIAS' | 'NORMAL';
  pasante?: { id: string; name: string };
  docenteSupervisor?: { id: string; name: string };
}

@Injectable()
export class ProceedingsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Registro inmutable de actuaciones procesales con soporte adjunto (RF-09)
   */
  async create(dto: CreateActuacionDto, user: AuthUser, ip?: string) {
    const exp = await this.prisma.expediente.findUnique({
      where: { id: dto.expedienteId },
    });
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    if (exp.estado === EstadoExpediente.ARCHIVADO) {
      throw new BadRequestException('No se pueden registrar actuaciones en expedientes archivados.');
    }

    if (user.role === Role.PASANTE && exp.pasanteId !== user.id) {
      throw new ForbiddenException('Solo el pasante asignado puede registrar actuaciones en este expediente.');
    }

    const actuacion = await this.prisma.actuacionProcesal.create({
      data: {
        expedienteId: dto.expedienteId,
        registradoPorId: user.id,
        tipo: dto.tipo,
        descripcion: dto.descripcion,
        fechaActuacion: dto.fechaActuacion ? new Date(dto.fechaActuacion) : new Date(),
        fechaVencimientoTermino: dto.fechaVencimientoTermino
          ? new Date(dto.fechaVencimientoTermino)
          : null,
        documentoSoporteId: dto.documentoSoporteId,
      },
      include: {
        registradoPor: { select: { id: true, name: true, role: true } },
      },
    });

    await this.audit.log({
      actorId: user.id,
      action: AuditAction.ACTUACION_REGISTRADA,
      entityType: 'ActuacionProcesal',
      entityId: actuacion.id,
      ipAddress: ip,
      metadata: {
        radicado: exp.radicado,
        tipo: actuacion.tipo,
        vence: actuacion.fechaVencimientoTermino,
      },
    });

    return actuacion;
  }

  /**
   * Timeline de actuaciones de un expediente
   */
  async findByExpediente(expedienteId: string) {
    return this.prisma.actuacionProcesal.findMany({
      where: { expedienteId },
      include: {
        registradoPor: { select: { id: true, name: true, role: true } },
      },
      orderBy: { fechaActuacion: 'desc' },
    });
  }

  /**
   * Motor de Alertas Tempranas de Vencimiento de Términos (7, 3 y 1 día antes) (RF-09)
   */
  async getAlerts(user: AuthUser): Promise<AlertaTermino[]> {
    const whereExpediente: any = {
      estado: { not: EstadoExpediente.ARCHIVADO },
    };

    if (user.role === Role.PASANTE) {
      whereExpediente.pasanteId = user.id;
    } else if (user.role === Role.DOCENTE_SUPERVISOR) {
      const me = await this.prisma.user.findUnique({ where: { id: user.id } });
      whereExpediente.OR = [
        { docenteSupervisorId: user.id },
        ...(me?.areaAsignada ? [{ areaJuridica: me.areaAsignada }] : []),
      ];
    }

    const actuacionesConTermino = await this.prisma.actuacionProcesal.findMany({
      where: {
        fechaVencimientoTermino: { not: null },
        terminoCumplido: false,
        expediente: whereExpediente,
      },
      include: {
        expediente: {
          select: {
            id: true,
            radicado: true,
            tipoCaso: true,
            pasante: { select: { id: true, name: true } },
            docenteSupervisor: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { fechaVencimientoTermino: 'asc' },
    });

    const ahora = new Date();

    return actuacionesConTermino.map((act) => {
      const vence = new Date(act.fechaVencimientoTermino!);
      const diffMs = vence.getTime() - ahora.getTime();
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let nivelAlerta: AlertaTermino['nivelAlerta'] = 'NORMAL';
      if (diasRestantes < 0) {
        nivelAlerta = 'VENCIDO';
      } else if (diasRestantes <= 1) {
        nivelAlerta = 'ALERTA_1_DIA'; // Escalamiento de máxima prioridad a Director
      } else if (diasRestantes <= 3) {
        nivelAlerta = 'ALERTA_3_DIAS';
      } else if (diasRestantes <= 7) {
        nivelAlerta = 'ALERTA_7_DIAS';
      }

      return {
        actuacionId: act.id,
        expedienteId: act.expedienteId,
        radicado: act.expediente.radicado,
        tipoCaso: act.expediente.tipoCaso,
        descripcion: act.descripcion,
        fechaVencimiento: vence,
        diasRestantes,
        nivelAlerta,
        pasante: act.expediente.pasante ?? undefined,
        docenteSupervisor: act.expediente.docenteSupervisor ?? undefined,
      };
    });
  }

  /**
   * Marcar un término como cumplido (ej: memorial radicado a tiempo)
   */
  async completeTerm(id: string, user: AuthUser) {
    const act = await this.prisma.actuacionProcesal.findUnique({ where: { id } });
    if (!act) throw new NotFoundException('Actuación no encontrada');

    return this.prisma.actuacionProcesal.update({
      where: { id },
      data: { terminoCumplido: true },
    });
  }
}
