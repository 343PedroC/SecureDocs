import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TipoActuacion } from '@prisma/client';

export class CreateActuacionDto {
  @ApiProperty({ example: 'uuid-expediente-123' })
  @IsString()
  @IsNotEmpty()
  expedienteId: string;

  @ApiProperty({ enum: TipoActuacion, example: TipoActuacion.NOTIFICACION_JUZGADO })
  @IsEnum(TipoActuacion)
  tipo: TipoActuacion;

  @ApiProperty({ example: 'Notificación de auto admisorio de la demanda. Traslado por 3 días hábiles.' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: '2026-10-25T10:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  fechaActuacion?: string;

  @ApiProperty({
    example: '2026-10-28T17:00:00.000Z',
    required: false,
    description: 'Fecha límite del término judicial para activar alertas de 7, 3 y 1 día (RF-09)',
  })
  @IsDateString()
  @IsOptional()
  fechaVencimientoTermino?: string;

  @ApiProperty({ example: 'uuid-documento-cifrado', required: false })
  @IsString()
  @IsOptional()
  documentoSoporteId?: string;
}
