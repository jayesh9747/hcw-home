jest.setTimeout(30000);

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CanActivate } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { CreateMediasoupServerDto } from '../src/mediasoup/dto/create-mediasoup-server.dto';
import { UpdateMediasoupServerDto } from '../src/mediasoup/dto/update-mediasoup-server.dto';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';

class MockAuthGuard implements CanActivate {
  canActivate() {
    return true;
  }
}
class MockRolesGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

describe('MediasoupServerController (e2e)', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let createdServerId: string;
  const testServerData: CreateMediasoupServerDto = {
    url: 'https://test-mediasoup.example.com',
    username: 'test_user',
    password: 'ValidPass123!',
    maxNumberOfSessions: 50,
    active: true,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await databaseService.mediasoupServer.deleteMany();
  });

  describe('/mediasoup-server (POST)', () => {
    it('should create a new mediasoup server', async () => {
      const response = await request(app.getHttpServer())
        .post('/mediasoup-server')
        .send(testServerData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Mediasoup server created successfully',
        data: {
          id: expect.any(String),
          url: testServerData.url,
          username: testServerData.username,
          maxNumberOfSessions: testServerData.maxNumberOfSessions,
          active: testServerData.active,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        requestId: expect.any(String),
        status: 'success',
        statusCode: 201,
        timestamp: expect.any(String),
        path: '/mediasoup-server',
      });

      createdServerId = response.body.data.id;
    });

    it('should return 409 when creating duplicate URL', async () => {
      await request(app.getHttpServer())
        .post('/mediasoup-server')
        .send(testServerData);

      const response = await request(app.getHttpServer())
        .post('/mediasoup-server')
        .send(testServerData)
        .expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        message: 'Mediasoup server URL already exists',
        path: '/mediasoup-server',
        requestId: expect.any(String),
        status: 'error',
        success: false,
        timestamp: expect.any(String),
      });
    });

    it('should validate input data', async () => {
      const invalidData = { ...testServerData, url: 'invalid-url' };
      const response = await request(app.getHttpServer())
        .post('/mediasoup-server')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Validation failed',
        error: {
          validationErrors: {
            url: ['Invalid URL format'],
          },
        },
      });
    });
  });

  describe('/mediasoup-server (GET)', () => {
    beforeEach(async () => {
      await databaseService.mediasoupServer.createMany({
        data: [
          testServerData,
          { ...testServerData, url: 'https://server2.com' },
          { ...testServerData, url: 'https://server3.com', active: false },
        ],
      });
    });

    it('should retrieve servers with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/mediasoup-server?page=1&limit=2')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Mediasoup servers retrieved successfully',
        data: expect.any(Array),
        pagination: {
          total: 3,
          page: 1,
          limit: 2,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
        requestId: expect.any(String),
        status: 'success',
        statusCode: 200,
        timestamp: expect.any(String),
        path: '/mediasoup-server',
      });
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by active status', async () => {
      const response = await request(app.getHttpServer())
        .get('/mediasoup-server?active=true')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((s) => s.active)).toBe(true);
    });

    it('should search by URL', async () => {
      const response = await request(app.getHttpServer())
        .get('/mediasoup-server?search=server3')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].url).toBe('https://server3.com');
    });
  });

  describe('/mediasoup-server/:id (GET)', () => {
    it('should retrieve a server by ID', async () => {
      const server = await databaseService.mediasoupServer.create({
        data: testServerData,
      });

      const response = await request(app.getHttpServer())
        .get(`/mediasoup-server/${server.id}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Mediasoup server retrieved successfully',
        data: {
          id: server.id,
          url: server.url,
          username: server.username,
          maxNumberOfSessions: server.maxNumberOfSessions,
          active: server.active,
          createdAt: server.createdAt.toISOString(),
          updatedAt: server.updatedAt.toISOString(),
        },
        requestId: expect.any(String),
        status: 'success',
        statusCode: 200,
        timestamp: expect.any(String),
        path: `/mediasoup-server/${server.id}`,
      });
    });

    it('should return 404 for non-existent server', async () => {
      const response = await request(app.getHttpServer())
        .get('/mediasoup-server/non-existent-id')
        .expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        message: 'Mediasoup server not found',
        path: '/mediasoup-server/non-existent-id',
        requestId: expect.any(String),
        status: 'error',
        success: false,
        timestamp: expect.any(String),
      });
    });
  });

  describe('/mediasoup-server/:id (PATCH)', () => {
    let serverId: string;

    beforeEach(async () => {
      const server = await databaseService.mediasoupServer.create({
        data: testServerData,
      });
      serverId = server.id;
    });

    it('should update a server', async () => {
      const updateData: UpdateMediasoupServerDto = {
        url: 'https://updated-url.com',
        maxNumberOfSessions: 75,
      };

      const response = await request(app.getHttpServer())
        .patch(`/mediasoup-server/${serverId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.url).toBe(updateData.url);
      expect(response.body.data.maxNumberOfSessions).toBe(
        updateData.maxNumberOfSessions,
      );
    });

    it('should prevent duplicate URLs', async () => {
      await databaseService.mediasoupServer.create({
        data: { ...testServerData, url: 'https://duplicate.com' },
      });

      const response = await request(app.getHttpServer())
        .patch(`/mediasoup-server/${serverId}`)
        .send({ url: 'https://duplicate.com' })
        .expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        message: 'Mediasoup server URL already exists',
        path: `/mediasoup-server/${serverId}`,
        requestId: expect.any(String),
        status: 'error',
        success: false,
        timestamp: expect.any(String),
      });
    });
  });

  describe('/mediasoup-server/:id/toggle-active (PATCH)', () => {
    let serverId: string;

    beforeEach(async () => {
      const server = await databaseService.mediasoupServer.create({
        data: testServerData,
      });
      serverId = server.id;
    });

    it('should toggle active status', async () => {
      // Initial toggle
      const response1 = await request(app.getHttpServer())
        .patch(`/mediasoup-server/${serverId}/toggle-active`)
        .expect(200);

      expect(response1.body.data.active).toBe(false);

      // Toggle back
      const response2 = await request(app.getHttpServer())
        .patch(`/mediasoup-server/${serverId}/toggle-active`)
        .expect(200);

      expect(response2.body.data.active).toBe(true);
    });

    it('should return 404 for non-existent server', async () => {
      const response = await request(app.getHttpServer())
        .patch('/mediasoup-server/non-existent-id/toggle-active')
        .expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        message: 'Mediasoup server not found',
        path: '/mediasoup-server/non-existent-id/toggle-active',
        requestId: expect.any(String),
        status: 'error',
        success: false,
        timestamp: expect.any(String),
      });
    });
  });

  describe('/mediasoup-server/:id (DELETE)', () => {
    it('should delete a server', async () => {
      const server = await databaseService.mediasoupServer.create({
        data: testServerData,
      });

      await request(app.getHttpServer())
        .delete(`/mediasoup-server/${server.id}`)
        .expect(200);

      const deletedServer = await databaseService.mediasoupServer.findUnique({
        where: { id: server.id },
      });
      expect(deletedServer).toBeNull();
    });

    it('should return 404 for non-existent server', async () => {
      const response = await request(app.getHttpServer())
        .delete('/mediasoup-server/non-existent-id')
        .expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        message: 'Mediasoup server not found',
        path: '/mediasoup-server/non-existent-id',
        requestId: expect.any(String),
        status: 'error',
        success: false,
        timestamp: expect.any(String),
      });
    });
  });

  // WebSocket Gateway Tests
  describe('WebSocket Gateway', () => {
    it('should get router capabilities', async () => {
      // This would require WebSocket client implementation
      // Test would verify WebSocket connection and message handling
    });

    it('should create transport', async () => {
      // WebSocket test for transport creation
    });
  });
});
