import { Test, TestingModule } from '@nestjs/testing';
import { MediasoupServerController } from './mediasoup.controller';
import { MediasoupServerService } from './mediasoup.service';
import { CreateMediasoupServerDto } from './dto/create-mediasoup-server.dto';
import { UpdateMediasoupServerDto } from './dto/update-mediasoup-server.dto';
import { QueryMediasoupServerDto } from './dto/query-mediasoup-server.dto';
import { MediasoupServerResponseDto } from './dto/mediasoup-server-response.dto';
import {
  ApiResponseDto,
  PaginatedApiResponseDto,
} from '../common/helpers/response/api-response.dto';
import { Request } from 'express';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
class MockRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}

describe('MediasoupServerController', () => {
  let controller: MediasoupServerController;
  let service: jest.Mocked<MediasoupServerService>;

  const mockServer: MediasoupServerResponseDto = {
    id: 'xyz',
    url: 'https://media.example.com',
    username: 'admin',
    password: 'mocked',
    maxNumberOfSessions: 100,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    id: 'req-123',
    path: '/mediasoup-server',
  } as Request & { id: string; path: string };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(mockServer),
      findAll: jest.fn().mockResolvedValue({
        servers: [mockServer],
        total: 1,
        page: 1,
        limit: 10,
      }),
      findOne: jest.fn().mockResolvedValue(mockServer),
      update: jest.fn().mockResolvedValue(mockServer),
      toggleActive: jest.fn().mockResolvedValue(mockServer),
      remove: jest.fn().mockResolvedValue(mockServer),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediasoupServerController],
      providers: [{ provide: MediasoupServerService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    controller = module.get<MediasoupServerController>(
      MediasoupServerController,
    );
  });

  describe('create()', () => {
    it('should create a mediasoup server', async () => {
      const dto: CreateMediasoupServerDto = {
        url: 'https://media.example.com',
        username: 'admin',
        password: 'Secret123!',
        maxNumberOfSessions: 100,
        active: true,
      };

      const result = await controller.create(dto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(result.data).toEqual(mockServer);
      expect(result.message).toBe('Mediasoup server created successfully');
      expect(result.statusCode).toBe(201);
      // Check meta fields directly on the result
      expect(result.requestId).toBe(mockRequest.id);
      expect(result.path).toBe(mockRequest.path);
    });
  });

  describe('findAll()', () => {
    it('should return paginated servers', async () => {
      const query: QueryMediasoupServerDto = { page: 1, limit: 10 };

      const result = await controller.findAll(query, mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toBeInstanceOf(PaginatedApiResponseDto);
      expect(result.data).toEqual([mockServer]);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.message).toBe('Mediasoup servers retrieved successfully');
      // Check meta fields directly on the result
      expect(result.requestId).toBe(mockRequest.id);
      expect(result.path).toBe(mockRequest.path);
    });
  });

  describe('findOne()', () => {
    it('should return a server by ID', async () => {
      const result = await controller.findOne('xyz', mockRequest);

      expect(service.findOne).toHaveBeenCalledWith('xyz');
      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(result.data).toEqual(mockServer);
      expect(result.message).toBe('Mediasoup server retrieved successfully');
      // Check meta fields directly on the result
      expect(result.requestId).toBe(mockRequest.id);
      expect(result.path).toBe(mockRequest.path);
    });
  });

  describe('update()', () => {
    it('should update a server', async () => {
      const dto: UpdateMediasoupServerDto = { url: 'https://new.example.com' };

      const result = await controller.update('xyz', dto, mockRequest);

      expect(service.update).toHaveBeenCalledWith('xyz', dto);
      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(result.data).toEqual(mockServer);
      expect(result.message).toBe('Mediasoup server updated successfully');
      // Check meta fields directly on the result
      expect(result.requestId).toBe(mockRequest.id);
      expect(result.path).toBe(mockRequest.path);
    });
  });

  describe('toggleActive()', () => {
    it('should toggle server active status', async () => {
      const result = await controller.toggleActive('xyz', mockRequest);

      expect(service.toggleActive).toHaveBeenCalledWith('xyz');
      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(result.data).toEqual(mockServer);
      expect(result.message).toMatch(/successfully$/);
      // Check meta fields directly on the result
      expect(result.requestId).toBe(mockRequest.id);
      expect(result.path).toBe(mockRequest.path);
    });
  });

  describe('remove()', () => {
    it('should delete a server', async () => {
      const result = await controller.remove('xyz', mockRequest);

      expect(service.remove).toHaveBeenCalledWith('xyz');
      expect(result).toBeInstanceOf(ApiResponseDto);
      expect(result.data).toEqual(mockServer);
      expect(result.message).toBe('Mediasoup server deleted successfully');
      // Check meta fields directly on the result
      expect(result.requestId).toBe(mockRequest.id);
      expect(result.path).toBe(mockRequest.path);
    });
  });
});
