import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type DocumentEntityDocument = DocumentEntity & MongooseDocument;

export enum DocumentStatus {
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true, collection: 'documents' })
export class DocumentEntity {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true, default: '' })
  description!: string;

  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ required: true })
  fileUrl!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true, min: 0 })
  size!: number;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  ownerId!: MongooseSchema.Types.ObjectId | string;

  @Prop({
    type: String,
    enum: Object.values(DocumentStatus),
    default: DocumentStatus.UPLOADING,
    index: true,
  })
  status!: DocumentStatus;

  @Prop({ type: [String], default: [], index: true })
  tags!: string[];

  @Prop({ default: null })
  processingError?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DocumentEntitySchema = SchemaFactory.createForClass(DocumentEntity);
DocumentEntitySchema.index({ title: 'text', description: 'text', tags: 'text' });
