import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import * as path from 'path';

import {
  DocumentEntity,
  DocumentEntityDocument,
  DocumentStatus,
} from './schemas/document.schema';
import { StorageProvider, STORAGE_PROVIDER } from './storage/storage-provider.interface';
import { FileValidationService } from './validators/file-validation.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import {
  DocumentResponseDto,
  PaginatedDocumentsResponseDto,
} from './dto/document-response.dto';
import { UserRole } from '../common/decorators/roles.decorator';
import { CustomLoggerService } from '../common/logger/custom-logger.service';

export interface UserContext {
  id: string;
  role: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documentModel: Model<DocumentEntityDocument>,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    private readonly fileValidationService: FileValidationService,
    private readonly logger: CustomLoggerService,
  ) {}

  async create(
    file: Express.Multer.File,
    createDto: CreateDocumentDto,
    user: UserContext,
  ): Promise<DocumentResponseDto> {
    // 1. Rigorous File Validation (MIME, Extension, Size, Magic Bytes)
    const validated = this.fileValidationService.validateFile(file);

    // 2. Persist File to Storage
    const { fileUrl } = await this.storageProvider.saveFile(file);

    // 3. Fallback Title to original filename if omitted
    const title =
      createDto.title && createDto.title.trim().length > 0
        ? createDto.title.trim()
        : path.parse(file.originalname).name;

    // 4. Create Document in Database
    const doc = await this.documentModel.create({
      title,
      description: createDto.description || '',
      fileName: file.originalname,
      fileUrl,
      mimeType: validated.mimeType,
      size: validated.size,
      ownerId: user.id,
      status: DocumentStatus.PROCESSING,
      tags: createDto.tags || [],
    });

    this.logger.log(
      `Document created with ID ${doc._id} by user ${user.id}`,
      'DocumentsService',
    );

    return this.mapToDto(doc);
  }

  async findAll(
    query: QueryDocumentsDto,
    user: UserContext,
  ): Promise<PaginatedDocumentsResponseDto> {
    const filter: FilterQuery<DocumentEntityDocument> = {};

    // RBAC: Non-admin users only view their own documents
    if (user.role !== UserRole.ADMIN) {
      filter.ownerId = user.id;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.tag) {
      filter.tags = query.tag.toLowerCase();
    }

    if (query.search && query.search.trim().length > 0) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ title: regex }, { description: regex }, { tags: regex }];
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.documentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.documentModel.countDocuments(filter).exec(),
    ]);

    return {
      data: data.map((d) => this.mapToDto(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string, user: UserContext): Promise<DocumentResponseDto> {
    const doc = await this.findEntityById(id);
    this.checkPermission(doc, user);
    return this.mapToDto(doc);
  }

  async update(
    id: string,
    updateDto: UpdateDocumentDto,
    user: UserContext,
  ): Promise<DocumentResponseDto> {
    const doc = await this.findEntityById(id);
    this.checkPermission(doc, user);

    if (updateDto.title !== undefined) doc.title = updateDto.title.trim();
    if (updateDto.description !== undefined) doc.description = updateDto.description.trim();
    if (updateDto.tags !== undefined) doc.tags = updateDto.tags;

    await doc.save();
    this.logger.log(`Document ${id} updated by user ${user.id}`, 'DocumentsService');
    return this.mapToDto(doc);
  }

  async remove(id: string, user: UserContext): Promise<{ message: string; id: string }> {
    const doc = await this.findEntityById(id);
    this.checkPermission(doc, user);

    // Delete physical file
    await this.storageProvider.deleteFile(doc.fileUrl);

    // Delete database record
    await this.documentModel.findByIdAndDelete(id).exec();
    this.logger.log(`Document ${id} removed by user ${user.id}`, 'DocumentsService');

    return { message: 'Document successfully deleted', id };
  }

  async process(id: string, user: UserContext): Promise<DocumentResponseDto> {
    const doc = await this.findEntityById(id);
    this.checkPermission(doc, user);

    doc.status = DocumentStatus.PROCESSING;
    doc.processingError = undefined;
    await doc.save();

    this.logger.log(
      `Processing requested for document ${id} (Ready for BullMQ dispatch in Phase 4)`,
      'DocumentsService',
    );

    return this.mapToDto(doc);
  }

  async summarize(id: string, user: UserContext): Promise<{ documentId: string; status: DocumentStatus; message: string }> {
    const doc = await this.findEntityById(id);
    this.checkPermission(doc, user);

    if (doc.status !== DocumentStatus.READY) {
      throw new BadRequestException(
        `Cannot summarize document with status ${doc.status}. Document must be READY.`,
      );
    }

    return {
      documentId: id,
      status: doc.status,
      message: 'Document is ready for summarization via AI service',
    };
  }

  async ask(id: string, question: string, user: UserContext): Promise<{ documentId: string; question: string; status: DocumentStatus; message: string }> {
    if (!question || question.trim().length === 0) {
      throw new BadRequestException('Question must not be empty');
    }

    const doc = await this.findEntityById(id);
    this.checkPermission(doc, user);

    if (doc.status !== DocumentStatus.READY) {
      throw new BadRequestException(
        `Cannot query document with status ${doc.status}. Document must be READY.`,
      );
    }

    return {
      documentId: id,
      question: question.trim(),
      status: doc.status,
      message: 'Document is ready for question-answering via RAG pipeline',
    };
  }

  private async findEntityById(id: string): Promise<DocumentEntityDocument> {
    const doc = await this.documentModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }
    return doc;
  }

  private checkPermission(doc: DocumentEntityDocument, user: UserContext): void {
    if (user.role === UserRole.ADMIN) {
      return;
    }
    if (doc.ownerId.toString() !== user.id) {
      throw new ForbiddenException('You do not have permission to access this document');
    }
  }

  private mapToDto(doc: DocumentEntityDocument): DocumentResponseDto {
    return {
      id: doc._id.toString(),
      title: doc.title,
      description: doc.description,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      mimeType: doc.mimeType,
      size: doc.size,
      ownerId: doc.ownerId.toString(),
      status: doc.status,
      tags: doc.tags,
      processingError: doc.processingError,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
