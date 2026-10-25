import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ReviewEscritoDto {
  @ApiProperty({
    example: 'APROBAR',
    enum: ['APROBAR', 'RECHAZAR'],
    description: 'Acción tomada por el Docente Supervisor',
  })
  @IsIn(['APROBAR', 'RECHAZAR'])
  accion: 'APROBAR' | 'RECHAZAR';

  @ApiProperty({
    example: 'Revisado y conforme a derecho. Proceder a radicación ante juzgado.',
    description: 'Observaciones formativas o justificación jurídica (CUN-05)',
  })
  @IsString()
  @IsNotEmpty()
  observacionesDocente: string;
}
