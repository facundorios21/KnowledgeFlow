import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Documents Module (E2E)', () => {
  let app: INestApplication;
  let userToken: string;
  let createdDocId: string;

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

    // Acquire standard user access token from Keycloak
    const tokenUrl = 'http://localhost:8080/realms/KnowledgeFlow/protocol/openid-connect/token';
    const body = new URLSearchParams({
      client_id: 'knowledgeflow-frontend',
      grant_type: 'password',
      username: 'standard_user',
      password: 'User123!',
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = (await res.json()) as { access_token: string };
    userToken = data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/documents should reject unauthenticated requests with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/documents')
      .expect(401);
  });

  it('POST /api/v1/documents should upload a valid PDF and return 201 with PROCESSING status', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4 sample testing content for KnowledgeFlow');

    const response = await request(app.getHttpServer())
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', validPdfBuffer, 'politicas_seguridad.pdf')
      .field('title', 'Manual de Políticas')
      .field('description', 'Documento de prueba inicial')
      .field('tags', 'seguridad,normativa')
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Manual de Políticas');
    expect(response.body.status).toBe('PROCESSING');
    expect(response.body.mimeType).toBe('application/pdf');
    expect(response.body.tags).toContain('seguridad');
    expect(response.body.tags).toContain('normativa');

    createdDocId = response.body.id;
  });

  it('GET /api/v1/documents/:id should retrieve the uploaded document', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/documents/${createdDocId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.id).toBe(createdDocId);
    expect(response.body.title).toBe('Manual de Políticas');
  });

  it('PATCH /api/v1/documents/:id should update document metadata', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/documents/${createdDocId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Manual de Políticas de Ciberseguridad v2',
        tags: ['seguridad', 'actualizado'],
      })
      .expect(200);

    expect(response.body.title).toBe('Manual de Políticas de Ciberseguridad v2');
    expect(response.body.tags).toContain('actualizado');
  });

  it('GET /api/v1/documents should return paginated list including the created document', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/documents?page=1&limit=10')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('total');
    expect(response.body.total).toBeGreaterThanOrEqual(1);
    const found = response.body.data.some((d: { id: string }) => d.id === createdDocId);
    expect(found).toBe(true);
  });

  it('POST /api/v1/documents should reject files with invalid magic bytes (400)', async () => {
    const fakePdfBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ executable signature

    await request(app.getHttpServer())
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', fakePdfBuffer, 'fake.pdf')
      .expect(400);
  });

  it('DELETE /api/v1/documents/:id should delete document and physical storage', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/documents/${createdDocId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    // Verify it is now 404
    await request(app.getHttpServer())
      .get(`/api/v1/documents/${createdDocId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
  });
});
