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
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { AssignCaseDto } from './dto/assign-case.dto';
import {
  RequestCloseCaseDto,
  EndorseCloseCaseDto,
  ApproveCloseCaseDto,
} from './dto/close-case.dto';
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

@ApiTags('Expedientes Jurídicos (CUN-02, CUN-03, CUN-07)')
@Controller('cases')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CasesController {
  constructor(private cases: CasesService) {}

  @Post()
  @Roles(Role.DIRECTOR, Role.DOCENTE_SUPERVISOR, Role.PASANTE, Role.ADMINISTRATIVO, Role.admin)
  @ApiOperation({ summary: 'Apertura y radicación de expediente con radicado único (RF-04, RF-05)' })
  create(
    @Body() dto: CreateCaseDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.cases.createCase(dto, user, req.ip);
  }

  @Get()
  @Roles(
    Role.DIRECTOR,
    Role.DOCENTE_SUPERVISOR,
    Role.PASANTE,
    Role.ADMINISTRATIVO,
    Role.ADMIN_TI,
    Role.admin,
  )
  @ApiOperation({ summary: 'Listar expedientes bajo principio de mínimo privilegio (RF-07)' })
  @ApiQuery({ name: 'area', required: false })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('area') area?: string,
    @Query('estado') estado?: string,
    @Query('search') search?: string,
  ) {
    return this.cases.findAll(user, { area, estado, search });
  }

  @Get(':id')
  @Roles(
    Role.DIRECTOR,
    Role.DOCENTE_SUPERVISOR,
    Role.PASANTE,
    Role.ADMINISTRATIVO,
    Role.ADMIN_TI,
    Role.admin,
  )
  @ApiOperation({ summary: 'Obtener detalle completo del expediente (documentos, escritos y actuaciones)' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.cases.findOne(id, user);
  }

  @Patch(':id/assign')
  @Roles(Role.DIRECTOR, Role.DOCENTE_SUPERVISOR, Role.ADMINISTRATIVO, Role.admin)
  @ApiOperation({ summary: 'Asignar o reasignar expediente con validación de conflictos y cargas (RF-06)' })
  assignCase(
    @Param('id') id: string,
    @Body() dto: AssignCaseDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.cases.assignCase(id, dto, user, req.ip);
  }

  @Post(':id/close-request')
  @Roles(Role.PASANTE, Role.DOCENTE_SUPERVISOR, Role.DIRECTOR, Role.admin)
  @ApiOperation({ summary: 'Pasante radica informe final solicitando cierre del expediente (CUN-07)' })
  requestClose(
    @Param('id') id: string,
    @Body() dto: RequestCloseCaseDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.cases.requestClose(id, dto, user, req.ip);
  }

  @Patch(':id/close-endorse')
  @Roles(Role.DOCENTE_SUPERVISOR, Role.DIRECTOR, Role.admin)
  @ApiOperation({ summary: 'Docente Supervisor avala informe final de cierre (CUN-07)' })
  endorseClose(
    @Param('id') id: string,
    @Body() dto: EndorseCloseCaseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cases.endorseClose(id, dto, user);
  }

  @Patch(':id/close-approve')
  @Roles(Role.DIRECTOR, Role.admin)
  @ApiOperation({ summary: 'Director aprueba cierre definitivo y archiva expediente como inmutable (RN10)' })
  approveClose(
    @Param('id') id: string,
    @Body() dto: ApproveCloseCaseDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.cases.approveClose(id, dto, user, req.ip);
  }
}
