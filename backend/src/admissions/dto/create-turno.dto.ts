import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTurnoDto {
  @ApiProperty({ example: 'uuid-cliente-123', description: 'ID del cliente registrado' })
  @IsString()
  @IsNotEmpty()
  clienteId: string;

  @ApiProperty({ example: 'Consulta por fijación de alimentos', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
