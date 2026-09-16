import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '../schemas/document.schema';

export class DocumentResponseDto {
  @ApiProperty({ example: '65f123456789abcdef012345' })
  id!: string;

  @ApiProperty({ example: 'Manual de Ciberseguridad' })
  title!: string;

  @ApiProperty({ example: 'Políticas y normativas internas de seguridad' })
  description!: string;

  @ApiProperty({ example: 'manual_seguridad.pdf' })
  fileName!: string;

  @ApiProperty({ example: '/uploads/documents/a1b2c3d4-e5f6.pdf' })
  fileUrl!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ example: 1048576, description: 'File size in bytes' })
  size!: number;

  @ApiProperty({ example: '65f123456789abcdef012344', description: 'Owner user ID' })
  ownerId!: string;

  @ApiProperty({ enum: DocumentStatus, example: DocumentStatus.PROCESSING })
  status!: DocumentStatus;

  @ApiProperty({ example: ['seguridad', 'normativas'] })
  tags!: string[];

  @ApiPropertyOptional({ example: null })
  processingError?: string;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedDocumentsResponseDto {
  @ApiProperty({ type: [DocumentResponseDto] })
  data!: DocumentResponseDto[];

  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
