import * as Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),

  // MongoDB
  MONGO_URI: Joi.string()
    .uri()
    .default('mongodb://localhost:27017/knowledgeflow'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_URL: Joi.string().optional(),

  // Keycloak OIDC
  KEYCLOAK_BASE_URL: Joi.string().uri().default('http://localhost:8080'),
  KEYCLOAK_REALM: Joi.string().default('KnowledgeFlow'),
  KEYCLOAK_CLIENT_ID_BACKEND: Joi.string().default('knowledgeflow-backend'),
  KEYCLOAK_CLIENT_ID_FRONTEND: Joi.string().default('knowledgeflow-frontend'),
  KEYCLOAK_ISSUER_URL: Joi.string()
    .uri()
    .default('http://localhost:8080/realms/KnowledgeFlow'),
  KEYCLOAK_JWKS_URI: Joi.string()
    .uri()
    .default('http://localhost:8080/realms/KnowledgeFlow/protocol/openid-connect/certs'),

  // AI Service & Gemini
  AI_SERVICE_URL: Joi.string().uri().default('http://localhost:8000'),
  INTERNAL_SERVICE_SECRET: Joi.string()
    .min(16)
    .default('change_this_internal_shared_secret_for_dev_mode'),
  GEMINI_API_KEY: Joi.string().allow('').optional(),

  // Processing defaults
  MAX_FILE_SIZE_MB: Joi.number().default(15),
  CHUNK_SIZE: Joi.number().default(500),
  CHUNK_OVERLAP: Joi.number().default(50),
  TOP_K: Joi.number().default(5),
});
