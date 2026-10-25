import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { EstadoTurno } from '@prisma/client';

@Injectable()
export class AdmissionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Calcula el índice de vulnerabilidad socioeconómica conforme a la Ley 2113 de 2021
   */
  calcularIndiceVulnerabilidad(dto: CreateClienteDto): number {
    let indice = 0;

    // Ponderación por estrato
    if (dto.estrato === 1) indice += 0.35;
    else if (dto.estrato === 2) indice += 0.25;
    else if (dto.estrato === 3) indice += 0.15;

    // Ponderación por Sisbén
    if (dto.grupoSisben) {
      const letra = dto.grupoSisben.toUpperCase().charAt(0);
      if (letra === 'A') indice += 0.3; // Pobreza extrema
      else if (letra === 'B') indice += 0.2; // Pobreza moderada
      else if (letra === 'C') indice += 0.1; // Vulnerable
    }

    if (dto.declaracionIndefension) indice += 0.2;
    if (dto.esVictimaViolencia) indice += 0.2;
    if (dto.esMenorEdad) indice += 0.15;

    return Math.min(1.0, Math.round(indice * 100) / 100);
  }

  /**
   * Registra un cliente garantizando consentimiento previo de Hábeas Data (RF-01, RF-02)
   */
  async createClient(dto: CreateClienteDto, userId?: string, ip?: string) {
    if (!dto.consentimientoHabeasData) {
      throw new BadRequestException(
        'El consentimiento de Hábeas Data (Ley 1581) es un requisito obligatorio previo a la captura de datos.',
      );
    }

    const existing = await this.prisma.cliente.findUnique({
      where: { numeroDocumento: dto.numeroDocumento },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un cliente registrado con el documento ${dto.numeroDocumento}`,
      );
    }

    const indiceVulnerabilidad = this.calcularIndiceVulnerabilidad(dto);

    const cliente = await this.prisma.cliente.create({
      data: {
        ...dto,
        indiceVulnerabilidad,
        fechaConsentimiento: new Date(),
      },
    });

    return {
      cliente,
      esAdmisible: dto.estrato <= 3 || dto.declaracionIndefension || dto.esVictimaViolencia,
      mensaje:
        dto.estrato <= 3 || dto.declaracionIndefension || dto.esVictimaViolencia
          ? 'Usuario admisible para el Consultorio Jurídico (Ley 2113 de 2021)'
          : 'Usuario no cumple criterios de vulnerabilidad económica. Remitir a Defensoría o consultorio privado.',
    };
  }

  /**
   * Busca clientes por cédula o nombre
   */
  async searchClients(query: string) {
    if (!query || query.trim().length === 0) {
      return this.prisma.cliente.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.cliente.findMany({
      where: {
        OR: [
          { numeroDocumento: { contains: query.trim(), mode: 'insensitive' } },
          { nombreCompleto: { contains: query.trim(), mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClientById(id: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        expedientes: {
          select: {
            id: true,
            radicado: true,
            areaJuridica: true,
            tipoCaso: true,
            estado: true,
            fechaApertura: true,
          },
        },
        turnos: {
          orderBy: { fecha: 'desc' },
          take: 5,
        },
      },
    });

    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  /**
   * Genera turno consecutivo diario de atención (RF-01)
   */
  async createTurno(dto: CreateTurnoDto, userId?: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const ultimoTurno = await this.prisma.turnoAtencion.findFirst({
      where: {
        fecha: {
          gte: hoy,
          lt: manana,
        },
      },
      orderBy: { numeroTurno: 'desc' },
    });

    const numeroTurno = (ultimoTurno?.numeroTurno ?? 0) + 1;

    return this.prisma.turnoAtencion.create({
      data: {
        numeroTurno,
        clienteId: dto.clienteId,
        observaciones: dto.observaciones,
        atendidoPorId: userId,
      },
      include: {
        cliente: true,
      },
    });
  }

  /**
   * Listar turnos de la jornada actual
   */
  async getTodayTurnos() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    return this.prisma.turnoAtencion.findMany({
      where: {
        fecha: {
          gte: hoy,
          lt: manana,
        },
      },
      include: {
        cliente: true,
        atendidoPor: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { numeroTurno: 'asc' },
    });
  }

  /**
   * Cambiar estado de turno (ej: pasar de EN_ESPERA a ATENDIENDO o FINALIZADO)
   */
  async updateTurnoStatus(id: string, estado: EstadoTurno, userId?: string) {
    const turno = await this.prisma.turnoAtencion.findUnique({ where: { id } });
    if (!turno) throw new NotFoundException('Turno no encontrado');

    return this.prisma.turnoAtencion.update({
      where: { id },
      data: {
        estado,
        atendidoPorId: userId ?? turno.atendidoPorId,
      },
      include: {
        cliente: true,
      },
    });
  }
}
