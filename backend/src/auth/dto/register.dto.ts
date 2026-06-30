import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Pedro Gutierrez' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'contraseña-segura', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
