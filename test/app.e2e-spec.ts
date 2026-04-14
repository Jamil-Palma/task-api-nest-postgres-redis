import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1'); // Coincide con main.ts
    await app.init();
  });

  it('/api/v1 (GET) - Should return 404 as no root handler exists', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(404);
  });
  
  afterAll(async () => {
    await app.close();
  });
});