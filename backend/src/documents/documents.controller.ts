import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from './documents.service';
import { ShareDocumentDto } from './dto/share-document.dto';
import { MoveDocumentDto } from './dto/move-document.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  private maxFileSize: number;

  constructor(
    private documents: DocumentsService,
    private config: ConfigService,
  ) {
    this.maxFileSize =
      Number(this.config.get('MAX_FILE_SIZE_MB') ?? 100) * 1024 * 1024;
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos accesibles para el usuario' })
  @ApiQuery({ name: 'folderId', required: false })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('folderId') folderId?: string,
  ) {
    const folder = folderId === 'null' ? null : folderId;
    return this.documents.findAllForUser(user.id, folder);
  }

  @Get('trash')
  @ApiOperation({ summary: 'Listar documentos eliminados del usuario' })
  trash(@CurrentUser() user: AuthUser) {
    return this.documents.findTrash(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Subir documento (se cifra automáticamente)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folderId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Body('folderId') folderId?: string,
  ) {
    if (!file) throw new BadRequestException('Se requiere un archivo');
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `El archivo supera el tamaño máximo permitido (${this.maxFileSize / 1024 / 1024} MB)`,
      );
    }
    return this.documents.upload(file, user.id, folderId || undefined, req.ip);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Descargar documento descifrado (requiere permiso)' })
  async download(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { buffer, originalName, mimeType } = await this.documents.download(
      id,
      user.id,
      req.ip,
    );
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Listar versiones anteriores del documento' })
  getVersions(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documents.getVersions(id, user.id);
  }

  @Get(':id/versions/:versionId/download')
  @ApiOperation({ summary: 'Descargar una versión anterior del documento' })
  async downloadVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { buffer, originalName, mimeType } =
      await this.documents.downloadVersion(id, versionId, user.id, req.ip);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar documento (soft delete, solo propietario)' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.documents.softDelete(id, user.id, req.ip);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restaurar documento eliminado (solo propietario)' })
  restore(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.documents.restore(id, user.id, req.ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mover documento a una carpeta' })
  move(
    @Param('id') id: string,
    @Body() dto: MoveDocumentDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const folderId = dto.folderId !== undefined ? (dto.folderId ?? null) : null;
    return this.documents.moveToFolder(id, user.id, folderId, req.ip);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Compartir documento con otro usuario por email' })
  share(
    @Param('id') id: string,
    @Body() dto: ShareDocumentDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.documents.shareDocument(id, user.id, dto.email, req.ip);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Ver usuarios con acceso al documento (solo propietario)' })
  getPermissions(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documents.getPermissions(id, user.id);
  }

  @Delete(':id/share/:userId')
  @ApiOperation({ summary: 'Revocar acceso de un usuario al documento (solo propietario)' })
  revoke(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.documents.revokePermission(id, user.id, targetUserId, req.ip);
  }
}
