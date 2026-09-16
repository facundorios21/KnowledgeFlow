import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { CustomLoggerService } from './common/logger/custom-logger.service';

async function bootstrap() {
  const logger = new CustomLoggerService();
  const app = await NestFactory.create(AppModule, {
    logger,
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const frontendUrl = configService.get<string>('frontendUrl', 'http://localhost:5173');

  // Global prefix with exclusions for health and swagger
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'api/docs'],
  });

  // CORS configuration
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Internal-Service-Key'],
  });

  // Global Validation Pipe with strict whitelisting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable graceful shutdown hooks (for SIGTERM / SIGINT in Docker)
  app.enableShutdownHooks();

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('KnowledgeFlow API')
    .setDescription(
      'KnowledgeFlow Core Backend API: Document processing, RAG orchestration, semantic search, and OIDC identity validation.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter Keycloak Access Token (Bearer <token>)',
      },
      'JWT',
    )
    .addTag('Health', 'System and database health monitoring')
    .addTag('Auth', 'Identity verification and user context')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`KnowledgeFlow Backend is running on port ${port}`, 'Bootstrap');
  logger.log(`Swagger OpenAPI documentation available at http://localhost:${port}/api/docs`, 'Bootstrap');
  logger.log(`Health check available at http://localhost:${port}/health`, 'Bootstrap');
}

bootstrap();
