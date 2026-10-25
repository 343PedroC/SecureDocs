import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TipoDocumentoIdentidad } from '@prisma/client';

export class CreateClienteDto {
  @ApiProperty({ enum: TipoDocumentoIdentidad, default: TipoDocumentoIdentidad.CC })
  @IsEnum(TipoDocumentoIdentidad)
  tipoDocumento: TipoDocumentoIdentidad;

  @ApiProperty({ example: '1047489632' })
  @IsString()
  @IsNotEmpty()
  numeroDocumento: string;

  @ApiProperty({ example: 'Rosa Elena Benítez' })
  @IsString()
  @IsNotEmpty()
  nombreCompleto: string;

  @ApiProperty({ example: '3015556677', required: false })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({ example: 'rosa.benitez@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Barrio La Esperanza, Manzana 4', required: false })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiProperty({ example: 1, description: 'Estrato socioeconómico (1 a 6)' })
  @IsInt()
  @Min(1)
  @Max(6)
  estrato: number;

  @ApiProperty({ example: 'A2', description: 'Grupo SISBEN IV (ej: A1, B2)', required: false })
  @IsString()
  @IsOptional()
  grupoSisben?: string;

  @ApiProperty({ example: true, description: 'Manifiesta no contar con recursos económicos suficientes' })
  @IsBoolean()
  declaracionIndefension: boolean;

  @ApiProperty({ example: false, description: 'Es víctima de violencia intrafamiliar o de género' })
  @IsBoolean()
  @IsOptional()
  esVictimaViolencia?: boolean;

  @ApiProperty({ example: false, description: 'El caso involucra a niños, niñas o adolescentes (NNA)' })
  @IsBoolean()
  @IsOptional()
  esMenorEdad?: boolean;

  @ApiProperty({
    example: true,
    description: 'Aceptación explícita del consentimiento de Hábeas Data (Ley 1581) antes de capturar datos',
  })
  @IsBoolean()
  consentimientoHabeasData: boolean;
}
