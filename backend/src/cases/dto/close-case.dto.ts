import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestCloseCaseDto {
  @ApiProperty({ example: 'Se adelantó trámite de conciliación logrando acuerdo total...', description: 'Informe final de gestión del pasante' })
  @IsString()
  @IsNotEmpty()
  informeFinalPasante: string;

  @ApiProperty({ example: 'Conciliación exitosa', description: 'Motivo de finalización (Sentencia, Conciliación, Desistimiento)' })
  @IsString()
  @IsNotEmpty()
  motivoCierre: string;
}

export class EndorseCloseCaseDto {
  @ApiProperty({ example: 'Aprobado el informe de gestión sin observaciones', required: false })
  @IsString()
  @IsOptional()
  observacionesDocente?: string;
}

export class ApproveCloseCaseDto {
  @ApiProperty({ example: 'Cierre aprobado por Dirección y orden de archivo inmutable', required: false })
  @IsString()
  @IsOptional()
  observacionesDirector?: string;

  @ApiProperty({ example: true, description: 'Constancia de devolución de documentos originales (Ley 594 de 2000)' })
  devolucionOriginalesUsuario: boolean;
}
