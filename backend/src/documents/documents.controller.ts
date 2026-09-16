import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiPayloadTooLargeResponse,
} from '@nestjs/swagger';

import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import {
  DocumentResponseDto,
  PaginatedDocumentsResponseDto,
} from './dto/document-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Documents')
@ApiBearerAuth('JWT')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a document (PDF, TXT, DOCX) with metadata',
    description:
      'Uploads and validates a document. Checks MIME type, extension, size, and magic bytes. Persists file to storage and saves document metadata with status PROCESSING.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, TXT, or DOCX up to 15MB)',
        },
        title: {
          type: 'string',
          description: 'Custom document title (optional, defaults to file name)',
        },
        description: {
          type: 'string',
          description: 'Document description or summary (optional)',
        },
        tags: {
          type: 'string',
          description: 'Comma-separated tags (e.g. "seguridad,it,normativa")',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Document uploaded and registered successfully',
    type: DocumentResponseDto,
  })
  @ApiPayloadTooLargeResponse({ description: 'File exceeds maximum allowed size' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDto: CreateDocumentDto,
    @CurrentUser() user: { id: string; role: string },
  ): Promise<DocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('A document file is required');
    }
    return this.documentsService.create(file, createDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'List documents with filtering and pagination',
    description:
      'Returns paginated list of documents. Regular users see only their own documents; administrators see all documents.',
  })
  @ApiOkResponse({
    description: 'Paginated document list',
    type: PaginatedDocumentsResponseDto,
  })
  async findAll(
    @Query() queryDto: QueryDocumentsDto,
    @CurrentUser() user: { id: string; role: string },
  ): Promise<PaginatedDocumentsResponseDto> {
    return this.documentsService.findAll(queryDto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details by ID' })
  @ApiOkResponse({ type: DocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @ApiForbiddenResponse({ description: 'User does not have permission' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ): Promise<DocumentResponseDto> {
    return this.documentsService.findById(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata (title, description, tags)' })
  @ApiOkResponse({ type: DocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @ApiForbiddenResponse({ description: 'User does not have permission' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDocumentDto,
    @CurrentUser() user: { id: string; role: string },
  ): Promise<DocumentResponseDto> {
    return this.documentsService.update(id, updateDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a document and its stored physical file' })
  @ApiOkResponse({ schema: { example: { message: 'Document successfully deleted', id: '123' } } })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @ApiForbiddenResponse({ description: 'User does not have permission' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.documentsService.remove(id, user);
  }

  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger asynchronous document reprocessing' })
  @ApiOkResponse({ type: DocumentResponseDto })
  async process(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.documentsService.process(id, user);
  }

  @Post(':id/summarize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request document summary from AI service' })
  async summarize(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.documentsService.summarize(id, user);
  }

  @Post(':id/ask')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask a specific question scoped to this document' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['question'],
      properties: {
        question: {
          type: 'string',
          example: '¿Cuáles son las políticas de seguridad para el trabajo remoto?',
        },
      },
    },
  })
  async ask(
    @Param('id') id: string,
    @Body('question') question: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.documentsService.ask(id, question, user);
  }
}
