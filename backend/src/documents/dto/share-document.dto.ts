import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ShareDocumentDto {
  @ApiProperty({
    example: 'colega@empresa.com',
    description: 'Email del usuario con quien compartir el documento',
  })
  @IsEmail()
  email: string;
}
