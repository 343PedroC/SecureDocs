import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignCaseDto {
  @ApiProperty({ example: 'uuid-docente', required: false, description: 'ID del Docente Supervisor' })
  @IsString()
  @IsOptional()
  docenteSupervisorId?: string;

  @ApiProperty({ example: 'uuid-pasante', required: false, description: 'ID del Pasante asignado' })
  @IsString()
  @IsOptional()
  pasanteId?: string;
}
