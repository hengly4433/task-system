import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Task Management API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;
  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth Module', () => {
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'Test123!',
      fullName: 'E2E Test User',
    };

    it('POST /api/auth/register - should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('userId');
      expect(res.body.username).toBe(testUser.username);
      expect(res.body.email).toBe(testUser.email);
      
      accessToken = res.body.accessToken;
      userId = res.body.userId;
    });

    it('POST /api/auth/register - should fail with duplicate username', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('POST /api/auth/login - should login successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ usernameOrEmail: testUser.username, password: testUser.password })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      accessToken = res.body.accessToken;
    });

    it('POST /api/auth/login - should fail with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ usernameOrEmail: testUser.username, password: 'WrongPassword' })
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    it('GET /api/users - should fail without token', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .expect(401);
    });

    it('GET /api/users - should succeed with token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('Projects Module', () => {
    it('POST /api/projects - should create a project', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ projectName: 'E2E Test Project', description: 'Created by E2E test' })
        .expect(201);

      expect(res.body.projectName).toBe('E2E Test Project');
      projectId = res.body.projectId;
    });

    it('GET /api/projects/:id - should get project by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.projectId).toBe(projectId);
    });
  });

  describe('Tasks Module', () => {
    it('POST /api/projects/:id/tasks - should create a task', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskName: 'E2E Test Task', description: 'Test task', priority: 'HIGH' })
        .expect(201);

      expect(res.body.taskName).toBe('E2E Test Task');
      expect(res.body.status).toBe('TODO');
      taskId = res.body.taskId;
    });

    it('PATCH /api/tasks/:id - should update task status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('GET /api/tasks/:id - should get task by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.taskId).toBe(taskId);
      expect(res.body.status).toBe('IN_PROGRESS');
    });
  });

  describe('Comments Module', () => {
    it('POST /api/tasks/:taskId/comments - should add a comment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ commentText: 'This is a test comment' })
        .expect(201);

      expect(res.body.commentText).toBe('This is a test comment');
    });

    it('GET /api/tasks/:taskId/comments - should get comments', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('Labels Module', () => {
    let labelId: string;
    const uniqueLabelName = `urgent_${Date.now()}`;

    it('POST /api/labels - should create a label', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/labels')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ labelName: uniqueLabelName, labelColor: '#FF0000' })
        .expect(201);

      expect(res.body.labelName).toBe(uniqueLabelName);
      labelId = res.body.labelId;
    });

    it('POST /api/tasks/:taskId/labels - should assign label to task', async () => {
      await request(app.getHttpServer())
        .post(`/api/tasks/${taskId}/labels`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ labelId })
        .expect(201);
    });

    it('GET /api/tasks/:taskId/labels - should get task labels', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tasks/${taskId}/labels`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
