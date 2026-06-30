import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
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
import { UsersService } from './users.service';
import { ChangeRoleDto } from './dto/change-role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Buscar usuarios por email o nombre (para compartir documentos)',
  })
  @ApiQuery({ name: 'q', description: 'Email o nombre a buscar' })
  search(@Query('q') q: string) {
    return this.users.search(q ?? '');
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Listar todos los usuarios (admin)' })
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener usuario por ID (admin)' })
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Cambiar rol de un usuario (admin)' })
  changeRole(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @Req() req: Request,
  ) {
    return this.users.changeRole(admin.id, id, dto.role, req.ip);
  }

  @Patch(':id/disable')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Desactivar usuario (admin)' })
  disable(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.users.setActive(admin.id, id, false, req.ip);
  }

  @Patch(':id/enable')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Activar usuario (admin)' })
  enable(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.users.setActive(admin.id, id, true, req.ip);
  }
}
