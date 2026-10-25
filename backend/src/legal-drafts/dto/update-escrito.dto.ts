import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateEscritoDto {
  @ApiProperty({ example: 'Demanda de Fijación de Cuota Alimentaria (Corregida)', required: false })
  @IsString()
  @IsOptional()
  titulo?: string;

  @ApiProperty({ example: 'Texto corregido según observaciones del docente...', required: false })
  @IsString()
  @IsOptional()
  contenido?: string;
}
