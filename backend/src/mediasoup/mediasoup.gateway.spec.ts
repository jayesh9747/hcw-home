import { Test, TestingModule } from '@nestjs/testing';
import { MediasoupGateway } from './mediasoup.gateway';
import { DatabaseService } from '../database/database.service';
import { MediasoupSessionService } from './mediasoup-session.service';
import { Server, Socket } from 'socket.io';

describe('MediasoupGateway', () => {
  let gateway: MediasoupGateway;
  let mediasoupService: any;
  let dbService: any;

  beforeEach(async () => {
    mediasoupService = {
      getRouter: jest.fn(),
    };

    dbService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediasoupGateway,
        { provide: DatabaseService, useValue: dbService },
        { provide: MediasoupSessionService, useValue: mediasoupService },
      ],
    }).compile();

    gateway = module.get<MediasoupGateway>(MediasoupGateway);
    // @ts-ignore
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as Server;
  });

  describe('handleGetCapabilities', () => {
    it('should return rtpCapabilities if router exists', async () => {
      const fakeRouter = {
        rtpCapabilities: { codecs: [], headerExtensions: [] },
      };
      mediasoupService.getRouter.mockReturnValue(fakeRouter);

      const client = {} as Socket;
      const result = await gateway.handleGetCapabilities(client, {
        consultationId: 1,
      });

      expect(mediasoupService.getRouter).toHaveBeenCalledWith(1);
      expect(result).toEqual({ rtpCapabilities: fakeRouter.rtpCapabilities });
    });

    it('should return rtpCapabilities as undefined if no router', async () => {
      mediasoupService.getRouter.mockReturnValue(undefined);

      const client = {} as Socket;
      const result = await gateway.handleGetCapabilities(client, {
        consultationId: 2,
      });

      expect(mediasoupService.getRouter).toHaveBeenCalledWith(2);
      expect(result).toEqual({ rtpCapabilities: undefined });
    });
  });

  describe('handleCreateTransport', () => {
    it('should create and return transport details if router exists', async () => {
      const fakeTransport = {
        id: 'transport123',
        iceParameters: { usernameFragment: 'abc' },
        iceCandidates: [{ foundation: '1', ip: '127.0.0.1' }],
        dtlsParameters: { fingerprints: [] },
      };

      const fakeRouter = {
        createWebRtcTransport: jest.fn().mockResolvedValue(fakeTransport),
      };
      mediasoupService.getRouter.mockReturnValue(fakeRouter);

      const client = {} as Socket;
      const data = { consultationId: 3, type: 'producer' as const };

      const result = await gateway.handleCreateTransport(client, data);

      expect(mediasoupService.getRouter).toHaveBeenCalledWith(3);
      expect(fakeRouter.createWebRtcTransport).toHaveBeenCalledWith({
        listenIps: [
          { ip: '0.0.0.0', announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });
      expect(result).toEqual({
        id: 'transport123',
        iceParameters: fakeTransport.iceParameters,
        iceCandidates: fakeTransport.iceCandidates,
        dtlsParameters: fakeTransport.dtlsParameters,
      });
    });

    it('should throw error if router does not exist', async () => {
      mediasoupService.getRouter.mockReturnValue(undefined);
      const client = {} as Socket;
      const data = { consultationId: 4, type: 'consumer' as const };

      await expect(gateway.handleCreateTransport(client, data)).rejects.toThrow(
        'No router found for consultation',
      );
    });
  });
});
