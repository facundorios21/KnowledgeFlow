import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth & Identity (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'api/docs'],
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should be publicly accessible without authentication', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.details).toHaveProperty('database');
  });

  it('GET /api/v1/auth/me should reject requests without a Bearer token (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);
  });

  it('GET /api/v1/auth/me should reject requests with an invalid Bearer token (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token.value')
      .expect(401);
  });

  describe('Live Keycloak Token Validation & Sync', () => {
    async function getAccessToken(username: string, password: string): Promise<string> {
      const tokenUrl = 'http://localhost:8080/realms/KnowledgeFlow/protocol/openid-connect/token';
      const body = new URLSearchParams({
        client_id: 'knowledgeflow-frontend',
        grant_type: 'password',
        username,
        password,
      });

      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!res.ok) {
        throw new Error(`Failed to obtain token from Keycloak: ${res.statusText}`);
      }

      const data = (await res.json()) as { access_token: string };
      return data.access_token;
    }

    it('should authenticate standard_user and sync profile with USER role', async () => {
      const token = await getAccessToken('standard_user', 'User123!');

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('keycloakUserId');
      expect(response.body.email).toBe('user@knowledgeflow.local');
      expect(response.body.role).toBe('USER');
    });

    it('should authenticate admin_user and sync profile with ADMIN role', async () => {
      const token = await getAccessToken('admin_user', 'Admin123!');

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('keycloakUserId');
      expect(response.body.email).toBe('admin@knowledgeflow.local');
      expect(response.body.role).toBe('ADMIN');
      expect(response.body.keycloakRoles).toContain('ADMIN');
    });
  });
});
