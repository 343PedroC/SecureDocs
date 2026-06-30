import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Buscar usuarios por email o nombre (para compartir documentos)' })
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
}
