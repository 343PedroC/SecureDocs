import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TipoEscrito } from '@prisma/client';

export class CreateEscritoDto {
  @ApiProperty({ example: 'uuid-expediente-123' })
  @IsString()
  @IsNotEmpty()
  expedienteId: string;

  @ApiProperty({ example: 'Demanda de Fijación de Cuota Alimentaria' })
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @ApiProperty({ enum: TipoEscrito, example: TipoEscrito.DEMANDA })
  @IsEnum(TipoEscrito)
  tipo: TipoEscrito;

  @ApiProperty({ example: 'SEÑOR JUEZ DE FAMILIA DE CARTAGENA...\n\nHECHOS:\n1. ...' })
  @IsString()
  @IsNotEmpty()
  contenido: string;
}
