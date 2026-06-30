import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { DocumentsService } from './documents.service';
import { ShareDocumentDto } from './dto/share-document.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024;

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private documents: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar documentos accesibles para el usuario' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.documents.findAllForUser(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Subir documento (se cifra automáticamente)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.documents.upload(file, user.id, req.ip);
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
