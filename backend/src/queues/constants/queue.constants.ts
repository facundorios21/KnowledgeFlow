export const DOCUMENT_PROCESSING_QUEUE = 'document-processing';

export enum DocumentJobName {
  PROCESS_DOCUMENT = 'process-document',
  EXTRACT_TEXT = 'extract-text',
  CHUNK_DOCUMENT = 'chunk-document',
  GENERATE_EMBEDDINGS = 'generate-embeddings',
  INDEX_DOCUMENT = 'index-document',
  GENERATE_SUMMARY = 'generate-summary',
}

export interface DocumentProcessingJobData {
  documentId: string;
  ownerId: string;
  fileUrl: string;
  mimeType: string;
  fileName: string;
  forceReprocess?: boolean;
}

export interface DocumentProcessingJobResult {
  documentId: string;
  status: 'READY' | 'SKIPPED';
  reason?: string;
  processedAt: string;
}
