import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import {
  DocumentEntity,
  DocumentEntitySchema,
} from './schemas/document.schema';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { FileValidationService } from './validators/file-validation.service';
import { STORAGE_PROVIDER } from './storage/storage-provider.interface';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { CustomLoggerService } from '../common/logger/custom-logger.service';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentEntity.name, schema: DocumentEntitySchema },
    ]),
    ConfigModule,
    QueuesModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    FileValidationService,
    {
      provide: STORAGE_PROVIDER,
      useClass: LocalStorageProvider,
    },
    CustomLoggerService,
  ],
  exports: [DocumentsService, MongooseModule],
})
export class DocumentsModule {}
