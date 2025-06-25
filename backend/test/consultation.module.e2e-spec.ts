import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConsultationModule } from '../src/consultation/consultation.module';
import { DatabaseService } from '../src/database/database.service';
import { Server } from 'socket.io';
import { UserRole } from '@prisma/client';
import { ConsultationGateway } from '../src/consultation/consultation.gateway';

jest.setTimeout(30000);

const mockConsultation = {
  id: 1,
  status: 'SCHEDULED',
  ownerId: 10,
  scheduledDate: new Date(),
  version: 1,
};
const mockPatient = {
  id: 2,
  firstName: 'John',
  lastName: 'Doe',
  country: 'IN',
  role: 'PATIENT' as UserRole,
};
const mockPractitioner = {
  id: 10,
  firstName: 'Dr',
  lastName: 'Smith',
  country: 'IN',
  role: 'PRACTITIONER' as UserRole,
};

describe('ConsultationModule (E2E)', () => {
  let app: INestApplication;
  let dbService: DatabaseService;
  let wsServer: Server;

  beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const dbServiceMock = {
      consultation: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      participant: {
        upsert: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      message: {
        create: jest.fn(),
      },
    };

    wsServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConsultationModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(dbServiceMock)
      .overrideProvider('CONSULTATION_GATEWAY')
      .useValue(wsServer)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    app.useLogger(false);
    await app.init();

    dbService = moduleFixture.get(DatabaseService);
  });

  afterAll(async () => {
    await app.close();
    (console.error as jest.Mock).mockRestore();
    (console.warn as jest.Mock).mockRestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /consultation', () => {
    it('should create a new consultation (practitioner)', async () => {
      // The service expects three calls to user.findUnique: creator, patient, owner
      (dbService.user.findUnique as jest.Mock)
        .mockImplementationOnce(({ where }) =>
          where.id === 10 ? mockPractitioner : null,
        ) // creator
        .mockImplementationOnce(({ where }) =>
          where.id === 2 ? mockPatient : null,
        ) // patient
        .mockImplementationOnce(({ where }) =>
          where.id === 10 ? mockPractitioner : null,
        ); // owner
      (dbService.consultation.findFirst as jest.Mock).mockResolvedValue(null);
      (dbService.consultation.create as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        participants: [{ userId: 2 }],
      });

      const res = await request(app.getHttpServer())
        .post('/consultation?userId=10')
        .send({
          patientId: 2,
          scheduledDate: new Date().toISOString(),
          ownerId: 10,
        })
        .expect(201);

      expect(res.body.data.id).toBe(1);
      expect(dbService.consultation.create).toHaveBeenCalled();
    });

    it('should reject non-practitioner creators', async () => {
      // Only the creator lookup is needed for this test, and it should be a patient
      (dbService.user.findUnique as jest.Mock).mockImplementationOnce(
        ({ where }) => (where.id === 2 ? mockPatient : null),
      );

      const res = await request(app.getHttpServer())
        .post('/consultation?userId=2')
        .send({ patientId: 2 })
        .expect(403);

      expect(res.body.message).toMatch(/only practitioners or admins/i);
    });

    it('should not allow patient with active consultation', async () => {
      (dbService.user.findUnique as jest.Mock)
        .mockImplementationOnce(({ where }) =>
          where.id === 10 ? mockPractitioner : null,
        ) // creator
        .mockImplementationOnce(({ where }) =>
          where.id === 2 ? mockPatient : null,
        ) // patient
        .mockImplementationOnce(({ where }) =>
          where.id === 10 ? mockPractitioner : null,
        ); // owner
      (dbService.consultation.findFirst as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        status: 'ACTIVE',
      });

      const res = await request(app.getHttpServer())
        .post('/consultation?userId=10')
        .send({
          patientId: 2,
          scheduledDate: new Date().toISOString(),
        })
        .expect(409);

      expect(res.body.message).toMatch(/already has an active consultation/i);
    });
  });

  describe('POST /consultation/:id/join/patient', () => {
    it('should allow a patient to join a consultation', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue(
        mockConsultation,
      );
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (dbService.participant.findUnique as jest.Mock).mockResolvedValue({
        consultationId: 1,
        userId: 2,
      });
      (dbService.consultation.findFirst as jest.Mock).mockResolvedValue(null);
      (dbService.participant.update as jest.Mock).mockResolvedValue({});
      (dbService.consultation.update as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        status: 'WAITING',
      });

      const res = await request(app.getHttpServer())
        .post('/consultation/1/join/patient')
        .send({ userId: 2 })
        .expect(201);

      expect(res.body.data.consultationId).toBe(1);
      expect(dbService.participant.update).toHaveBeenCalled();
    });

    it('should return 404 for non-existent consultation', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/consultation/999/join/patient')
        .send({ userId: 2 })
        .expect(404);

      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 404 for invalid user ID', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue(
        mockConsultation,
      );
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/consultation/1/join/patient')
        .send({ userId: 999 })
        .expect(404);

      expect(res.body.message).toMatch(/does not exist/i);
    });

    it('should reject if patient not assigned to consultation', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue(
        mockConsultation,
      );
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (dbService.participant.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/consultation/1/join/patient')
        .send({ userId: 2 })
        .expect(403);

      expect(res.body.message).toMatch(/not assigned to this consultation/i);
    });

    it('should reject if patient is already active in another consultation', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue(
        mockConsultation,
      );
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (dbService.participant.findUnique as jest.Mock).mockResolvedValue({
        consultationId: 1,
        userId: 2,
      });
      (dbService.consultation.findFirst as jest.Mock).mockResolvedValue({
        id: 2,
        status: 'ACTIVE',
      });

      const res = await request(app.getHttpServer())
        .post('/consultation/1/join/patient')
        .send({ userId: 2 })
        .expect(409);

      expect(res.body.message).toMatch(
        /already active in another consultation/i,
      );
    });
    it('should reject if patient is already active in another consultation', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue(
        mockConsultation,
      );
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (dbService.participant.findUnique as jest.Mock).mockResolvedValue({
        consultationId: 1,
        userId: 2,
      });
      (dbService.consultation.findFirst as jest.Mock).mockResolvedValue({
        id: 2,
        status: 'ACTIVE',
      });

      const res = await request(app.getHttpServer())
        .post('/consultation/1/join/patient')
        .send({ userId: 2 })
        .expect(409);

      expect(res.body.message).toMatch(
        /already active in another consultation/i,
      );
    });

    it('should prevent patient join when consultation is COMPLETED', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        status: 'COMPLETED',
      });
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(mockPatient);

      const res = await request(app.getHttpServer())
        .post('/consultation/1/join/patient')
        .send({ userId: 2 })
        .expect(400);

      expect(res.body.message).toMatch(/cannot join completed consultation/i);
    });
  });

  describe('POST /consultation/:id/join/practitioner', () => {
    it('should allow owner practitioner to join', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        ownerId: 10,
      });
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(
        mockPractitioner,
      );
      (dbService.participant.upsert as jest.Mock).mockResolvedValue({});
      (dbService.consultation.update as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        status: 'ACTIVE',
      });

      const res = await request(app.getHttpServer())
        .post('/consultation/1/join/practitioner')
        .send({ userId: 10 })
        .expect(201);

      expect(res.body.data.consultationId).toBe(1);
      expect(dbService.participant.upsert).toHaveBeenCalled();
    });

    it('should return 403 for non-owner practitioner', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        ownerId: 10,
      });
      (dbService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockPractitioner,
        id: 11,
      });

      const res = await request(app.getHttpServer())
        .post('/consultation/1/join/practitioner')
        .send({ userId: 11 })
        .expect(403);

      expect(res.body.message).toMatch(/not the practitioner/i);
    });

    it('should handle invalid consultation status transition', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        status: 'COMPLETED',
      });
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(
        mockPractitioner,
      );

      const res = await request(app.getHttpServer())
        .post('/consultation/1/join/practitioner')
        .send({ userId: 10 })
        .expect(400);

      expect(res.body.message).toMatch(/cannot join completed consultation/i);
    });
  });

  describe('POST /consultation/admit', () => {
    it('should allow practitioner to admit patient', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        status: 'WAITING',
      });
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(
        mockPractitioner,
      );
      (dbService.consultation.update as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        status: 'ACTIVE',
      });

      const res = await request(app.getHttpServer())
        .post('/consultation/admit?userId=10')
        .send({ consultationId: 1 })
        .expect(201);

      expect(res.body.data.consultationId).toBe(1);
      expect(dbService.consultation.update).toHaveBeenCalled();
    });

    it('should return 400 when admitting to non-WAITING consultation', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        status: 'ACTIVE',
      });
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(
        mockPractitioner,
      );

      const res = await request(app.getHttpServer())
        .post('/consultation/admit?userId=10')
        .send({ consultationId: 1 })
        .expect(400);

      expect(res.body.message).toMatch(/consultation is not in waiting state/i);
    });

    it('should return 403 for non-admin/practitioner user', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue(
        mockConsultation,
      );
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(mockPatient);

      const res = await request(app.getHttpServer())
        .post('/consultation/admit?userId=2')
        .send({ consultationId: 1 })
        .expect(403);

      expect(res.body.message).toMatch(
        /only practitioners or admins can admit/i,
      );
    });

    it('should handle socket emission failure during admission', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        status: 'WAITING',
      });
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(
        mockPractitioner,
      );
      (dbService.consultation.update as jest.Mock).mockResolvedValue({});

      (wsServer.emit as jest.Mock).mockImplementation(() => {
        throw new Error('Socket connection failed');
      });

      const res = await request(app.getHttpServer())
        .post('/consultation/admit?userId=10')
        .send({ consultationId: 1 })
        .expect(201);

      expect(res.body.data.consultationId).toBe(1);
    });
  });

  describe('GET /consultation/waiting-room', () => {
    it('should return waiting room consultations', async () => {
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(
        mockPractitioner,
      );
      (dbService.consultation.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          participants: [
            {
              joinedAt: new Date(),
              user: {
                firstName: 'John',
                lastName: 'Doe',
                country: 'IN',
              },
            },
          ],
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/consultation/waiting-room?userId=10')
        .expect(200);

      expect(res.body.data.waitingRooms).toHaveLength(1);
      expect(res.body.data.waitingRooms[0].patientInitials).toBe('JD');
    });

    it('should return 404 for invalid practitioner ID', async () => {
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/consultation/waiting-room?userId=999')
        .expect(404);

      expect(res.body.message).toMatch(/user not found/i);
    });

    it('should handle database query failure', async () => {
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(
        mockPractitioner,
      );
      (dbService.consultation.findMany as jest.Mock).mockRejectedValue(
        new Error('Query timeout'),
      );

      const res = await request(app.getHttpServer())
        .get('/consultation/waiting-room?userId=10')
        .expect(500);

      expect(res.body.message).toMatch(/internal server error/i);
    });
  });

  describe('WebSocket Gateway', () => {
    it('should handle invalid connection parameters', async () => {
      const invalidSocket = {
        handshake: {
          query: { consultationId: 'invalid', userId: '2', role: 'INVALID' },
        },
        disconnect: jest.fn(),
      } as any;

      await app.get(ConsultationGateway).handleConnection(invalidSocket);
      expect(invalidSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle message validation failure', async () => {
      const validSocket = {
        handshake: {
          query: { consultationId: '1', userId: '2', role: 'PATIENT' },
        },
        join: jest.fn(),
        data: { consultationId: 1, userId: 2, role: 'PATIENT' },
        emit: jest.fn(),
      } as any;
      const gateway = app.get(ConsultationGateway);
      await gateway.handleSendMessage(validSocket, {
        consultationId: 1,
        userId: 2,
        content: 'A'.repeat(2001),
      });

      expect(validSocket.emit).not.toHaveBeenCalled();
      expect(dbService.message.create).not.toHaveBeenCalled();
    });

    it('should handle database failure during message processing', async () => {
      const validSocket = {
        handshake: {
          query: { consultationId: '1', userId: '2', role: 'PATIENT' },
        },
        join: jest.fn(),
        data: { consultationId: 1, userId: 2, role: 'PATIENT' },
        emit: jest.fn(),
      } as any;

      (dbService.message.create as jest.Mock).mockRejectedValue(
        new Error('DB write failed'),
      );

      const gateway = app.get(ConsultationGateway);
      await gateway.handleSendMessage(validSocket, {
        consultationId: 1,
        userId: 2,
        content: 'Valid message',
      });

      expect(validSocket.emit).toHaveBeenCalledWith('error', expect.anything());
    });
  });

  describe('Consultation State Management', () => {
    it('should handle concurrent admission attempts', async () => {
      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        status: 'WAITING',
      });
      (dbService.user.findUnique as jest.Mock).mockResolvedValue(
        mockPractitioner,
      );

      await request(app.getHttpServer())
        .post('/consultation/admit?userId=10')
        .send({ consultationId: 1 })
        .expect(201);

      (dbService.consultation.findUnique as jest.Mock).mockResolvedValue({
        ...mockConsultation,
        status: 'ACTIVE',
      });

      const res = await request(app.getHttpServer())
        .post('/consultation/admit?userId=10')
        .send({ consultationId: 1 })
        .expect(400);

      expect(res.body.message).toMatch(/consultation is not in waiting state/i);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid user IDs in query params', async () => {
      const res = await request(app.getHttpServer())
        .get('/consultation/waiting-room?userId=invalid')
        .expect(400);

      expect(
        typeof res.body.message === 'string' || Array.isArray(res.body.message),
      ).toBe(true);
      if (Array.isArray(res.body.message)) {
        expect(res.body.message.join(' ')).toMatch(
          /userId must be a positive integer/i,
        );
      } else {
        expect(res.body.message).toMatch(/userId must be a positive integer/i);
      }
    });

    it('should reject non-numeric consultation IDs', async () => {
      const res = await request(app.getHttpServer())
        .post('/consultation/invalid/join/patient')
        .send({ userId: 2 })
        .expect(400);

      expect(
        typeof res.body.message === 'string' || Array.isArray(res.body.message),
      ).toBe(true);
      if (Array.isArray(res.body.message)) {
        expect(res.body.message.join(' ')).toMatch(
          /consultationId must be a positive integer/i,
        );
      } else {
        expect(res.body.message).toMatch(
          /consultationId must be a positive integer/i,
        );
      }
    });

    it('should reject empty request bodies', async () => {
      const res = await request(app.getHttpServer())
        .post('/consultation/1/join/patient')
        .send({})
        .expect(400);

      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/userId must be a positive integer/i),
          expect.stringMatching(/userId must be an integer/i),
        ]),
      );
    });

    it('should reject invalid role in WebSocket connection', async () => {
      const invalidSocket = {
        handshake: {
          query: { consultationId: '1', userId: '2', role: 'INVALID_ROLE' },
        },
        disconnect: jest.fn(),
      } as any;

      await app.get(ConsultationGateway).handleConnection(invalidSocket);
      expect(invalidSocket.disconnect).toHaveBeenCalled();
    });
  });
});
