import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { User, UserRole } from './../src/modules/users/entities/user.entity';
import { Organization } from './../src/modules/organizations/entities/organization.entity';

describe('Tasks API & Multi-tenancy (e2e)', () => {
  let app: INestApplication;
  let userAToken: string;
  let userBToken: string;
  let createdTaskId: string;

  jest.setTimeout(60000);

  const testRunId = Date.now();
  const dynamicTaskTitle = `E2E CI Task ${testRunId}`;
  const userA = { email: 'admin@default.com', password: 'password123' };
  const userB = { email: 'e2e_userB@secondary.com', password: 'password123' };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    
    await app.init();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    const orgRepository = moduleFixture.get<Repository<Organization>>(getRepositoryToken(Organization));

    let secondaryOrg = await orgRepository.findOne({ where: { name: 'E2E Secondary Corp' } });
    if (!secondaryOrg) {
      secondaryOrg = await orgRepository.save({ name: 'E2E Secondary Corp' });
    }

    let secondaryUser = await userRepository.findOne({ where: { email: userB.email } });
    if (!secondaryUser) {
      const passwordHash = await bcrypt.hash(userB.password, 10);
      await userRepository.save({
        email: userB.email,
        passwordHash,
        role: UserRole.USER,
        organization: secondaryOrg,
        organizationId: secondaryOrg.id,
      });
    }

    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(userA);
    
    if (!resA.body.data || !resA.body.data.access_token) {
      throw new Error('Failed to log in User A. Ensure onModuleInit seeding is working.');
    }
    userAToken = resA.body.data.access_token;

    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(userB);
    
    userBToken = resB.body.data.access_token;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Task Lifecycle (Happy Path)', () => {
    it('Should create a task for User A (201)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: dynamicTaskTitle,
          description: 'Testing lifecycle',
          priority: 'high',
          tags: ['e2e', 'ci'],
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(dynamicTaskTitle);
      createdTaskId = response.body.data.id;
    });

    it('Should list tasks with pagination and filters (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tasks?limit=5&page=1')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('meta');
      expect(response.body.data.meta.total).toBeGreaterThan(0);
      expect(Array.isArray(response.body.data.data)).toBeTruthy();
    });

    it('Should find a single task by ID (200)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(createdTaskId);
    });
  });

  describe('2. Multi-tenancy & Security (Unhappy Paths)', () => {
    it('Should prevent User B from reading User A task (404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);
    });

    it('Should prevent User B from updating User A task (404)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ title: 'Hacked title' })
        .expect(404);
    });

    it('Should return 400 for invalid task data', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: '', priority: 'invalid' })
        .expect(400);
    });
  });

  describe('3. Updates & Cleanup', () => {
    it('Should allow User A to update status (200)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'done' })
        .expect(200);

      expect(response.body.data.status).toBe('done');
    });

    it('Should soft-delete task (204)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(204);
    });

    it('Should not find task after soft-delete (404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });
  });
});