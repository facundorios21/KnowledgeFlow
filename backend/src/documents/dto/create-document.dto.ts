import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDocumentDto {
  @ApiPropertyOptional({
    description: 'Document title. Defaults to original file name if omitted.',
    example: 'Manual de Procedimientos de Ciberseguridad 2026',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Brief description or summary notes about the document',
    example: 'Políticas internas actualizadas sobre control de accesos y contraseñas.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated or array of categorization tags',
    example: 'seguridad,normativas,it',
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
  tags?: string[];
}
