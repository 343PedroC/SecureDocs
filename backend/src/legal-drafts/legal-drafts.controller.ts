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
import { LegalDraftsService } from './legal-drafts.service';
import { CreateEscritoDto } from './dto/create-escrito.dto';
import { UpdateEscritoDto } from './dto/update-escrito.dto';
import { ReviewEscritoDto } from './dto/review-escrito.dto';
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

@ApiTags('Escritos Procesales y Aprobaciones (CUN-04, CUN-05)')
@Controller('legal-drafts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LegalDraftsController {
  constructor(private drafts: LegalDraftsService) {}

  @Post()
  @Roles(Role.PASANTE, Role.DOCENTE_SUPERVISOR, Role.DIRECTOR, Role.admin)
  @ApiOperation({ summary: 'Elaborar nuevo escrito procesal en estado BORRADOR (RF-08)' })
  create(
    @Body() dto: CreateEscritoDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.drafts.create(dto, user, req.ip);
  }

  @Patch(':id')
  @Roles(Role.PASANTE, Role.DOCENTE_SUPERVISOR, Role.DIRECTOR, Role.admin)
  @ApiOperation({ summary: 'Actualizar escrito procesal (solo si está en BORRADOR o RECHAZADO)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEscritoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.drafts.update(id, dto, user);
  }

  @Post(':id/submit')
  @Roles(Role.PASANTE, Role.admin)
  @ApiOperation({ summary: 'Pasante somete escrito a revisión formal del Docente Supervisor' })
  submitForReview(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.drafts.submitForReview(id, user, req.ip);
  }

  @Post(':id/review')
  @Roles(Role.DOCENTE_SUPERVISOR, Role.DIRECTOR, Role.admin)
  @ApiOperation({ summary: 'Docente Supervisor avala (APROBADO) o rechaza el escrito con observaciones (RF-08)' })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewEscritoDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.drafts.review(id, dto, user, req.ip);
  }

  @Get('pending-review')
  @Roles(Role.DOCENTE_SUPERVISOR, Role.DIRECTOR, Role.admin)
  @ApiOperation({ summary: 'Tablero docente: listar escritos pendientes de revisión' })
  findPendingReview(@CurrentUser() user: AuthUser) {
    return this.drafts.findPendingReview(user);
  }

  @Get('expediente/:expedienteId')
  @Roles(
    Role.DIRECTOR,
    Role.DOCENTE_SUPERVISOR,
    Role.PASANTE,
    Role.ADMINISTRATIVO,
    Role.admin,
  )
  @ApiOperation({ summary: 'Listar escritos asociados a un expediente' })
  findByExpediente(@Param('expedienteId') expedienteId: string) {
    return this.drafts.findByExpediente(expedienteId);
  }

  @Get(':id')
  @Roles(
    Role.DIRECTOR,
    Role.DOCENTE_SUPERVISOR,
    Role.PASANTE,
    Role.ADMINISTRATIVO,
    Role.admin,
  )
  @ApiOperation({ summary: 'Obtener detalle de un escrito procesal' })
  findOne(@Param('id') id: string) {
    return this.drafts.findOne(id);
  }
}
