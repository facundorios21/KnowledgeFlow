export default () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/knowledgeflow',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
  },
  keycloak: {
    baseUrl: process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080',
    realm: process.env.KEYCLOAK_REALM || 'KnowledgeFlow',
    backendClientId: process.env.KEYCLOAK_CLIENT_ID_BACKEND || 'knowledgeflow-backend',
    frontendClientId: process.env.KEYCLOAK_CLIENT_ID_FRONTEND || 'knowledgeflow-frontend',
    issuerUrl: process.env.KEYCLOAK_ISSUER_URL || 'http://localhost:8080/realms/KnowledgeFlow',
    jwksUri: process.env.KEYCLOAK_JWKS_URI || 'http://localhost:8080/realms/KnowledgeFlow/protocol/openid-connect/certs',
  },
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    internalSecret: process.env.INTERNAL_SERVICE_SECRET || 'change_this_internal_shared_secret_for_dev_mode',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
  },
  processing: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10),
    chunkSize: parseInt(process.env.CHUNK_SIZE || '500', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '50', 10),
    topK: parseInt(process.env.TOP_K || '5', 10),
  },
});
