import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationGateway } from './consultation.gateway';
import { DatabaseService } from '../database/database.service';
import { Server, Socket } from 'socket.io';
import { NotFoundException } from '@nestjs/common';

describe('ConsultationGateway', () => {
  let gateway: ConsultationGateway;
  let dbService: DatabaseService;
  let serverMock: Server;

  // Mock socket client factory
  const createMockClient = (data: any = {}) => ({
    handshake: {
      query: {
        consultationId: String(data.consultationId || ''),
        userId: String(data.userId || ''),
        role: data.role || '',
      },
    },
    join: jest.fn(),
    data: { ...data },
    disconnect: jest.fn(),
    emit: jest.fn(),
  });

  beforeEach(async () => {
    // Mock database service
    const dbServiceMock = {
      participant: {
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      consultation: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 1) return { status: 'WAITING' };
          if (where.id === 2) return { status: 'ACTIVE' };
          return null;
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      message: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    // Mock server
    serverMock = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as Server;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationGateway,
        { provide: DatabaseService, useValue: dbServiceMock },
      ],
    }).compile();

    gateway = module.get<ConsultationGateway>(ConsultationGateway);
    dbService = module.get<DatabaseService>(DatabaseService);
    gateway.server = serverMock;

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleConnection', () => {
    it('should join consultation room and mark patient active', async () => {
      const client = createMockClient({
        consultationId: 1,
        userId: 2,
        role: 'PATIENT',
      }) as unknown as Socket;

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith('consultation:1');
      expect(dbService.participant.upsert).toHaveBeenCalledWith({
        where: { consultationId_userId: { consultationId: 1, userId: 2 } },
        create: {
          consultationId: 1,
          userId: 2,
          isActive: true,
          joinedAt: expect.any(Date),
        },
        update: { isActive: true, joinedAt: expect.any(Date) },
      });
    });

    it('should join practitioner room for practitioner role', async () => {
      const client = createMockClient({
        consultationId: 1,
        userId: 99,
        role: 'PRACTITIONER',
      }) as unknown as Socket;

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith('consultation:1');
      expect(client.join).toHaveBeenCalledWith('practitioner:99');
    });

    it('should disconnect on invalid connection params', async () => {
      const client = createMockClient({
        consultationId: 0,
        userId: 0,
        role: 'ADMIN',
      }) as unknown as Socket;

      await gateway.handleConnection(client);
      
      expect(client.disconnect).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle database errors and disconnect', async () => {
      const client = createMockClient({
        consultationId: 1,
        userId: 2,
        role: 'PATIENT',
      }) as unknown as Socket;
      
      jest.spyOn(dbService.participant, 'upsert').mockRejectedValue(new Error('DB error'));
      
      await gateway.handleConnection(client);
      
      expect(client.disconnect).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should mark participant inactive and revert consultation status', async () => {
      const client = createMockClient({
        consultationId: 1,
        userId: 2,
      }) as unknown as Socket;

      await gateway.handleDisconnect(client);

      expect(dbService.participant.updateMany).toHaveBeenCalledWith({
        where: { consultationId: 1, userId: 2 },
        data: { isActive: false },
      });
      expect(dbService.consultation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'SCHEDULED' },
      });
    });

    it('should not revert status if patients remain', async () => {
      const client = createMockClient({
        consultationId: 1,
        userId: 2,
      }) as unknown as Socket;
      
      jest.spyOn(dbService.participant, 'findMany').mockResolvedValue([{
        id: 3,
        consultationId: 0,
        userId: 0,
        isActive: false,
        isBeneficiary: false,
        token: null,
        joinedAt: null,
        language: null
      }]);

      await gateway.handleDisconnect(client);

      expect(dbService.consultation.update).not.toHaveBeenCalled();
    });

    it('should not update consultation if status is not WAITING', async () => {
      const client = createMockClient({
        consultationId: 2, // Status ACTIVE
        userId: 2,
      }) as unknown as Socket;

      await gateway.handleDisconnect(client);

      expect(dbService.consultation.update).not.toHaveBeenCalled();
    });

    it('should handle errors during disconnect', async () => {
      const client = createMockClient({
        consultationId: 1,
        userId: 2,
      }) as unknown as Socket;
      
      jest.spyOn(dbService.participant, 'updateMany').mockRejectedValue(new Error('DB error'));

      await gateway.handleDisconnect(client);
      
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('handleAdmitPatient', () => {
    it('should update consultation status and emit event', async () => {
      const client = createMockClient() as unknown as Socket;
      const data = { consultationId: 5 };

      await gateway.handleAdmitPatient(client, data);

      expect(dbService.consultation.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { status: 'ACTIVE' },
      });
      expect(serverMock.to).toHaveBeenCalledWith('consultation:5');
      expect(serverMock.emit).toHaveBeenCalledWith('consultation_status', {
        status: 'ACTIVE',
        initiatedBy: 'PRACTITIONER',
      });
    });

    it('should handle database errors', async () => {
      const client = createMockClient() as unknown as Socket;
      const data = { consultationId: 5 };
      
      jest.spyOn(dbService.consultation, 'update').mockRejectedValue(new NotFoundException());
      
      await gateway.handleAdmitPatient(client, data);
      
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('handleSendMessage', () => {
    it('should save valid message and broadcast it', async () => {
      const client = createMockClient({ role: 'PATIENT' }) as unknown as Socket;
      const data = {
        consultationId: 7,
        userId: 9,
        content: 'Valid message',
      };

      await gateway.handleSendMessage(client, data);

      expect(dbService.message.create).toHaveBeenCalledWith({
        data: {
          consultationId: 7,
          userId: 9,
          content: 'Valid message',
        },
      });
      expect(serverMock.to).toHaveBeenCalledWith('consultation:7');
      expect(serverMock.emit).toHaveBeenCalledWith('new_message', expect.anything());
    });

    it('should reject empty messages', async () => {
      const client = createMockClient({ role: 'PATIENT' }) as unknown as Socket;
      const data = {
        consultationId: 1,
        userId: 2,
        content: '',
      };

      await gateway.handleSendMessage(client, data);

      expect(dbService.message.create).not.toHaveBeenCalled();
      expect(serverMock.emit).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should reject messages exceeding 2000 characters', async () => {
      const client = createMockClient({ role: 'PATIENT' }) as unknown as Socket;
      const longMessage = 'a'.repeat(2001);
      const data = {
        consultationId: 1,
        userId: 2,
        content: longMessage,
      };

      await gateway.handleSendMessage(client, data);

      expect(dbService.message.create).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle message saving errors', async () => {
      const client = createMockClient({ role: 'PATIENT' }) as unknown as Socket;
      const data = {
        consultationId: 7,
        userId: 9,
        content: 'Valid message',
      };
      
      jest.spyOn(dbService.message, 'create').mockRejectedValue(new Error('DB error'));
      
      await gateway.handleSendMessage(client, data);
      
      expect(console.error).toHaveBeenCalled();
    });
  });
});
