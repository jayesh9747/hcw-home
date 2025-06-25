// --- Mock setup must come first! ---
const createRouterMock = jest.fn().mockResolvedValue({
  id: 'router-123',
  rtpCapabilities: { codecs: [] },
});

const createWorkerMock = jest.fn().mockResolvedValue({
  pid: 9999,
  createRouter: createRouterMock,
});

jest.mock('mediasoup', () => ({
  __esModule: true,
  createWorker: createWorkerMock,
}));

import * as mediasoup from 'mediasoup';
import { Test, TestingModule } from '@nestjs/testing';
import { MediasoupSessionService } from './mediasoup-session.service';
import { DatabaseService } from '../database/database.service';
import { Logger } from '@nestjs/common';

describe('MediasoupSessionService', () => {
  let service: MediasoupSessionService;
  let dbService: jest.Mocked<DatabaseService>;
  let logger: Logger;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediasoupSessionService,
        {
          provide: DatabaseService,
          useValue: {
            mediasoupRouter: {
              create: jest.fn().mockResolvedValue({}),
            },
            mediasoupServer: {
              findFirst: jest.fn().mockResolvedValue({ id: 'server-123' }),
            },
          },
        },
      ],
    }).compile();

    service = module.get(MediasoupSessionService);
    dbService = module.get(DatabaseService) as jest.Mocked<DatabaseService>;

    logger = service['logger'];
    jest.spyOn(logger, 'log').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeWorkers', () => {
    it('should create 3 workers on startup', async () => {
      // Wait a tick for constructor's async call to finish
      await new Promise((res) => setTimeout(res, 10));

      expect(createWorkerMock).toHaveBeenCalledTimes(3);
      expect(service['workers']).toHaveLength(3);
    });
  });

  describe('createRouterForConsultation', () => {
    it('should create and store router in DB', async () => {
      await new Promise((res) => setTimeout(res, 10));
      const consultationId = 101;

      const router = await service.createRouterForConsultation(consultationId);

      expect(router).toBeDefined();
      expect(router.id).toBe('router-123');

      expect(dbService.mediasoupRouter.create).toHaveBeenCalledWith({
        data: {
          consultationId,
          routerId: 'router-123',
          serverId: 'server-123',
        },
      });
    });

    it('should throw if no server is available', async () => {
      (dbService.mediasoupServer.findFirst as jest.Mock).mockResolvedValueOnce(
        null,
      );
      await new Promise((res) => setTimeout(res, 10));

      await expect(service.createRouterForConsultation(1)).rejects.toThrow(
        'No available mediasoup server found',
      );
    });
  });

  describe('getRouter', () => {
    it('should return the router for the consultation', async () => {
      await new Promise((res) => setTimeout(res, 10));

      const consultationId = 42;
      const router = await service.createRouterForConsultation(consultationId);
      expect(service.getRouter(consultationId)).toBe(router);
    });

    it('should return undefined if no router exists', () => {
      expect(service.getRouter(999)).toBeUndefined();
    });
  });

  describe('getAvailableServer', () => {
    it('should return the active server', async () => {
      const server = await service['getAvailableServer']();

      expect(server).toEqual({ id: 'server-123' });
      expect(dbService.mediasoupServer.findFirst).toHaveBeenCalledWith({
        where: { active: true },
      });
    });
  });
});
