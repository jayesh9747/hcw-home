import { Test, TestingModule } from '@nestjs/testing';
import { MediasoupServerService } from './mediasoup.service';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';
import { MediasoupServerResponseDto } from './dto/mediasoup-server-response.dto';
import { plainToInstance } from 'class-transformer';

jest.mock('bcrypt');

describe('MediasoupServerService', () => {
  let service: MediasoupServerService;
  let dbService: any;

  const rawServer = {
    id: 'xyz',
    url: 'https://media.example.com',
    username: 'admin',
    password: 'hashed-password',
    maxNumberOfSessions: 100,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const transformedDto = plainToInstance(
    MediasoupServerResponseDto,
    rawServer,
    {
      excludeExtraneousValues: true,
    },
  );

  beforeEach(async () => {
    dbService = {
      mediasoupServer: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediasoupServerService,
        { provide: DatabaseService, useValue: dbService },
      ],
    }).compile();

    service = module.get<MediasoupServerService>(MediasoupServerService);
  });

  describe('create', () => {
    it('should create a server successfully', async () => {
      dbService.mediasoupServer.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      dbService.mediasoupServer.create.mockResolvedValue(rawServer);

      const dto = {
        url: 'https://media.example.com',
        username: 'admin',
        password: 'password',
        maxNumberOfSessions: 100,
        active: true,
      };

      const result = await service.create(dto as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(result).toEqual(transformedDto);
    });

    it('should throw conflict exception if URL exists', async () => {
      dbService.mediasoupServer.findFirst.mockResolvedValue({ id: 'existing' });

      const dto = { url: 'https://existing.com' } as any;

      await expect(service.create(dto)).rejects.toThrow(
        'Mediasoup server URL already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should handle search and active filters', async () => {
      const mockServers = [rawServer];

      dbService.mediasoupServer.findMany.mockResolvedValue(mockServers);
      dbService.mediasoupServer.count.mockResolvedValue(1); // Ensure count is also mocked

      const query = {
        search: 'example',
        active: true,
        page: 1,
        limit: 10,
      };

      const result = await service.findAll(query);

      expect(result.servers).toHaveLength(1);
      expect(dbService.mediasoupServer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { url: { contains: 'example', mode: 'insensitive' } },
              { username: { contains: 'example', mode: 'insensitive' } },
            ],
            active: true,
          },
        }),
      );
    });
  });
  

  describe('findOne', () => {
    it('should return a server by ID', async () => {
      dbService.mediasoupServer.findUnique.mockResolvedValue(rawServer);

      const result = await service.findOne('xyz');

      expect(result).toEqual(transformedDto);
    });

    it('should throw not found exception', async () => {
      dbService.mediasoupServer.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid')).rejects.toThrow(
        'Mediasoup server not found',
      );
    });
  });

  describe('update', () => {
    it('should update a server successfully', async () => {
      const existingServer = { id: 'xyz', url: 'https://old.example.com' };
      dbService.mediasoupServer.findUnique.mockResolvedValue(existingServer);
      dbService.mediasoupServer.findFirst.mockResolvedValue(null);
      dbService.mediasoupServer.update.mockResolvedValue(rawServer);

      const dto = { url: 'https://new.example.com' } as any;
      const result = await service.update('xyz', dto);

      expect(result).toEqual(transformedDto);
    });

    it('should throw conflict for duplicate URL', async () => {
      const existingServer = { id: 'xyz', url: 'https://old.example.com' };
      dbService.mediasoupServer.findUnique.mockResolvedValue(existingServer);
      dbService.mediasoupServer.findFirst.mockResolvedValue({ id: 'other' });

      const dto = { url: 'https://duplicate.com' } as any;

      await expect(service.update('xyz', dto)).rejects.toThrow(
        'Mediasoup server URL already exists',
      );
    });
  });

  describe('toggleActive', () => {
    it('should toggle active status', async () => {
      const existingServer = { id: 'xyz', active: false };
      dbService.mediasoupServer.findUnique.mockResolvedValue(existingServer);
      dbService.mediasoupServer.update.mockResolvedValue({
        ...rawServer,
        active: true,
      });

      const result = await service.toggleActive('xyz');

      expect(result.active).toBe(true);
    });

    it('should throw not found for invalid ID', async () => {
      dbService.mediasoupServer.findUnique.mockResolvedValue(null);

      await expect(service.toggleActive('invalid')).rejects.toThrow(
        'Mediasoup server not found',
      );
    });
  });

  describe('remove', () => {
    it('should delete a server', async () => {
      dbService.mediasoupServer.findUnique.mockResolvedValue({ id: 'xyz' });
      dbService.mediasoupServer.delete.mockResolvedValue(rawServer);

      const result = await service.remove('xyz');

      expect(result).toEqual(transformedDto);
    });

    it('should throw not found for invalid ID', async () => {
      dbService.mediasoupServer.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid')).rejects.toThrow(
        'Mediasoup server not found',
      );
    });
  });

  describe('getAvailableServer', () => {
    it('should return an active server', async () => {
      dbService.mediasoupServer.findFirst.mockResolvedValue(rawServer);

      const result = await service.getAvailableServer();

      expect(result).toEqual(transformedDto);
    });

    it('should return null if no active server', async () => {
      dbService.mediasoupServer.findFirst.mockResolvedValue(null);

      const result = await service.getAvailableServer();

      expect(result).toBeNull();
    });
  });
});
