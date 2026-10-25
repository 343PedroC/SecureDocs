import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AdmissionsService } from './admissions.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EstadoTurno, Role } from '@prisma/client';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

@ApiTags('Admisiones y Recepción (CUN-01)')
@Controller('admissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdmissionsController {
  constructor(private admissions: AdmissionsService) {}

  @Post('clients')
  @Roles(Role.DIRECTOR, Role.DOCENTE_SUPERVISOR, Role.PASANTE, Role.ADMINISTRATIVO, Role.admin)
  @ApiOperation({ summary: 'Registrar nuevo usuario/cliente con validación de Hábeas Data (RF-01, RF-02)' })
  createClient(
    @Body() dto: CreateClienteDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.admissions.createClient(dto, user.id, req.ip);
  }

  @Get('clients')
  @Roles(Role.DIRECTOR, Role.DOCENTE_SUPERVISOR, Role.PASANTE, Role.ADMINISTRATIVO, Role.admin)
  @ApiOperation({ summary: 'Buscar clientes por documento o nombre' })
  @ApiQuery({ name: 'q', required: false, description: 'Cédula o nombre' })
  searchClients(@Query('q') q?: string) {
    return this.admissions.searchClients(q ?? '');
  }

  @Get('clients/:id')
  @Roles(Role.DIRECTOR, Role.DOCENTE_SUPERVISOR, Role.PASANTE, Role.ADMINISTRATIVO, Role.admin)
  @ApiOperation({ summary: 'Obtener detalle del cliente y sus antecedentes en el consultorio' })
  getClientById(@Param('id') id: string) {
    return this.admissions.getClientById(id);
  }

  @Post('turnos')
  @Roles(Role.DIRECTOR, Role.DOCENTE_SUPERVISOR, Role.PASANTE, Role.ADMINISTRATIVO, Role.admin)
  @ApiOperation({ summary: 'Generar turno consecutivo de atención para hoy (RF-01)' })
  createTurno(@Body() dto: CreateTurnoDto, @CurrentUser() user: AuthUser) {
    return this.admissions.createTurno(dto, user.id);
  }

  @Get('turnos/today')
  @Roles(Role.DIRECTOR, Role.DOCENTE_SUPERVISOR, Role.PASANTE, Role.ADMINISTRATIVO, Role.admin)
  @ApiOperation({ summary: 'Listar turnos registrados para la jornada de hoy' })
  getTodayTurnos() {
    return this.admissions.getTodayTurnos();
  }

  @Patch('turnos/:id/status')
  @Roles(Role.DIRECTOR, Role.DOCENTE_SUPERVISOR, Role.PASANTE, Role.ADMINISTRATIVO, Role.admin)
  @ApiOperation({ summary: 'Actualizar estado del turno (ej: EN_ESPERA -> ATENDIENDO -> FINALIZADO)' })
  updateTurnoStatus(
    @Param('id') id: string,
    @Body('estado') estado: EstadoTurno,
    @CurrentUser() user: AuthUser,
  ) {
    return this.admissions.updateTurnoStatus(id, estado, user.id);
  }
}
