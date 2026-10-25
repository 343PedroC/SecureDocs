import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AreaJuridica } from '@prisma/client';

export class CreateCaseDto {
  @ApiProperty({ example: 'uuid-cliente-123' })
  @IsString()
  @IsNotEmpty()
  clienteId: string;

  @ApiProperty({ enum: AreaJuridica, example: AreaJuridica.CIVIL })
  @IsEnum(AreaJuridica)
  areaJuridica: AreaJuridica;

  @ApiProperty({ example: 'Fijación de Cuota de Alimentos' })
  @IsString()
  @IsNotEmpty()
  tipoCaso: string;

  @ApiProperty({ example: 'Hechos relevantes del caso...', required: false })
  @IsString()
  @IsOptional()
  hechos?: string;

  @ApiProperty({ example: 'Pretensiones del solicitante...', required: false })
  @IsString()
  @IsOptional()
  pretensiones?: string;

  @ApiProperty({ example: 'Carlos Arturo Domínguez', required: false, description: 'Para filtro de conflicto de interés' })
  @IsString()
  @IsOptional()
  contraparteNombre?: string;

  @ApiProperty({ example: '73541289', required: false })
  @IsString()
  @IsOptional()
  contraparteDocumento?: string;

  @ApiProperty({ example: 'uuid-docente', required: false })
  @IsString()
  @IsOptional()
  docenteSupervisorId?: string;

  @ApiProperty({ example: 'uuid-pasante', required: false })
  @IsString()
  @IsOptional()
  pasanteId?: string;
}
