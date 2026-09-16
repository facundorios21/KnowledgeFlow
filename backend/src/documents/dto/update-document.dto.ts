import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateDocumentDto {
  @ApiPropertyOptional({
    description: 'Updated document title',
    example: 'Manual de Procedimientos de Seguridad v2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated document description',
    example: 'Versión revisada con anexos de políticas de contraseñas.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated tags array or comma-separated list',
    example: ['seguridad', 'v2', 'politicas'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);
    }
    return [];
  })
  @IsArray()
  tags?: string[];
}
