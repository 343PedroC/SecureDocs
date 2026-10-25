import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ProceedingsService } from './proceedings.service';
import { CreateActuacionDto } from './dto/create-actuacion.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

@ApiTags('Actuaciones Procesales y Alertas de Términos (CUN-04, RF-09)')
@Controller('proceedings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProceedingsController {
  constructor(private proceedings: ProceedingsService) {}

  @Post()
  @Roles(Role.PASANTE, Role.DOCENTE_SUPERVISOR, Role.DIRECTOR, Role.admin)
  @ApiOperation({ summary: 'Registrar actuación procesal inmutable con fechas de término (RF-09)' })
  create(
    @Body() dto: CreateActuacionDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.proceedings.create(dto, user, req.ip);
  }

  @Get('alerts')
  @Roles(
    Role.DIRECTOR,
    Role.DOCENTE_SUPERVISOR,
    Role.PASANTE,
    Role.ADMINISTRATIVO,
    Role.admin,
  )
  @ApiOperation({ summary: 'Motor de alertas tempranas por vencimiento de términos (7, 3 y 1 día)' })
  getAlerts(@CurrentUser() user: AuthUser) {
    return this.proceedings.getAlerts(user);
  }

  @Get('expediente/:expedienteId')
  @Roles(
    Role.DIRECTOR,
    Role.DOCENTE_SUPERVISOR,
    Role.PASANTE,
    Role.ADMINISTRATIVO,
    Role.admin,
  )
  @ApiOperation({ summary: 'Consultar cronología / timeline de actuaciones de un caso' })
  findByExpediente(@Param('expedienteId') expedienteId: string) {
    return this.proceedings.findByExpediente(expedienteId);
  }

  @Patch(':id/complete')
  @Roles(Role.PASANTE, Role.DOCENTE_SUPERVISOR, Role.DIRECTOR, Role.admin)
  @ApiOperation({ summary: 'Marcar término procesal como cumplido' })
  completeTerm(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.proceedings.completeTerm(id, user);
  }
}
