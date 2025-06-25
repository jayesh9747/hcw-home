import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationService } from './consultation.service';
import { DatabaseService } from '../database/database.service';
import { Server } from 'socket.io';
import { ConsultationStatus, UserRole } from '@prisma/client';
import { AdmitPatientDto } from './dto/admit-patient.dto';
import { CreateConsultationDto } from './dto/create-consultation.dto';

const mockConsultation = {
  id: 1,
  status: ConsultationStatus.SCHEDULED,
  ownerId: 10,
  version: 1,
  scheduledDate: new Date(),
  groupId: null,
};
const mockPatient = {
  id: 2,
  firstName: 'John',
  lastName: 'Doe',
  country: 'IN',
  role: UserRole.PATIENT,
};
const mockPractitioner = {
  id: 10,
  firstName: 'Dr',
  lastName: 'Smith',
  country: 'IN',
  role: UserRole.PRACTITIONER,
};
const mockAdmin = {
  id: 20,
  role: UserRole.ADMIN,
};

describe('ConsultationService', () => {
  let service: ConsultationService;
  let db: Record<string, any>;
  let wsServer: Server;

  beforeEach(async () => {
    db = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationService,
        { provide: DatabaseService, useValue: db },
        { provide: 'CONSULTATION_GATEWAY', useValue: wsServer },
      ],
    }).compile();

    service = module.get<ConsultationService>(ConsultationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- createConsultation ---
  describe('createConsultation', () => {
    const createDto: CreateConsultationDto = {
      patientId: 2,
      ownerId: 10,
      scheduledDate: new Date(),
      groupId: null,
    };

    it('should throw if creator is not practitioner/admin', async () => {
      db.user.findUnique.mockResolvedValue({ ...mockPatient });
      await expect(service.createConsultation(createDto, 2)).rejects.toThrow(
        /practitioners or admins/i,
      );
    });

    it('should throw if patient does not exist', async () => {
      db.user.findUnique
        .mockResolvedValueOnce({ ...mockPractitioner }) // creator
        .mockResolvedValueOnce(null); // patient
      await expect(service.createConsultation(createDto, 10)).rejects.toThrow(
        /Patient does not exist/i,
      );
    });

    it('should throw if patient is not a patient', async () => {
      db.user.findUnique
        .mockResolvedValueOnce({ ...mockPractitioner }) // creator
        .mockResolvedValueOnce({ ...mockPractitioner }); // patient (bad)
      await expect(service.createConsultation(createDto, 10)).rejects.toThrow(
        /not a patient/i,
      );
    });

    it('should throw if owner is not a practitioner', async () => {
      db.user.findUnique
        .mockResolvedValueOnce({ ...mockPractitioner }) // creator
        .mockResolvedValueOnce({ ...mockPatient }) // patient
        .mockResolvedValueOnce({ ...mockPatient }); // owner (bad)
      await expect(service.createConsultation(createDto, 10)).rejects.toThrow(
        /Owner must be a valid practitioner/i,
      );
    });

    it('should throw if patient has an active consultation', async () => {
      db.user.findUnique
        .mockResolvedValueOnce({ ...mockPractitioner }) // creator
        .mockResolvedValueOnce({ ...mockPatient }) // patient
        .mockResolvedValueOnce({ ...mockPractitioner }); // owner
      db.consultation.findFirst.mockResolvedValue({ id: 99 });
      await expect(service.createConsultation(createDto, 10)).rejects.toThrow(
        /already has an active consultation/i,
      );
    });

    it('should create consultation and participant', async () => {
      db.user.findUnique
        .mockResolvedValueOnce({ ...mockPractitioner }) // creator
        .mockResolvedValueOnce({ ...mockPatient }) // patient
        .mockResolvedValueOnce({ ...mockPractitioner }); // owner
      db.consultation.findFirst.mockResolvedValue(null);
      db.consultation.create.mockResolvedValue({
        ...mockConsultation,
        participants: [{ userId: 2, isActive: false }],
      });

      const result = await service.createConsultation(createDto, 10);
      expect(db.consultation.create).toHaveBeenCalled();
      expect(result.data).toBeDefined();
      expect(result.data!.ownerId).toBe(10);
      expect(result.data!.status).toBe(ConsultationStatus.SCHEDULED);
    });
  });

  // --- joinAsPatient ---
  describe('joinAsPatient', () => {
    it('should throw not found if consultation does not exist', async () => {
      db.consultation.findUnique.mockResolvedValue(null);
      await expect(service.joinAsPatient(1, 2)).rejects.toThrow(
        /Consultation not found/i,
      );
    });

    it('should throw if consultation is completed', async () => {
      db.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.COMPLETED,
      });
      await expect(service.joinAsPatient(1, 2)).rejects.toThrow(
        /Cannot join completed consultation/i,
      );
    });

    it('should throw not found if patient does not exist', async () => {
      db.consultation.findUnique.mockResolvedValue(mockConsultation);
      db.user.findUnique.mockResolvedValue(null);
      await expect(service.joinAsPatient(1, 2)).rejects.toThrow(
        /Patient does not exist/i,
      );
    });

    it('should throw if not assigned as participant', async () => {
      db.consultation.findUnique.mockResolvedValue(mockConsultation);
      db.user.findUnique.mockResolvedValue(mockPatient);
      db.participant.findUnique.mockResolvedValue(null);
      await expect(service.joinAsPatient(1, 2)).rejects.toThrow(
        /not assigned to this consultation/i,
      );
    });

    it('should throw if already active in another consultation', async () => {
      db.consultation.findUnique.mockResolvedValue(mockConsultation);
      db.user.findUnique.mockResolvedValue(mockPatient);
      db.participant.findUnique.mockResolvedValue({ userId: 2 });
      db.consultation.findFirst.mockResolvedValue({ id: 99 });
      await expect(service.joinAsPatient(1, 2)).rejects.toThrow(
        /already active in another consultation/i,
      );
    });

    it('should upsert participant and update status if scheduled', async () => {
      db.consultation.findUnique.mockResolvedValue(mockConsultation);
      db.user.findUnique.mockResolvedValue(mockPatient);
      db.participant.findUnique.mockResolvedValue({ userId: 2 });
      db.consultation.findFirst.mockResolvedValue(null);
      db.participant.update.mockResolvedValue({});
      db.consultation.update.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.WAITING,
      });

      const result = await service.joinAsPatient(1, 2);
      expect(db.participant.update).toHaveBeenCalled();
      expect(db.consultation.update).toHaveBeenCalled();
      expect(result.data?.consultationId).toBe(1);
      expect(wsServer.to).toHaveBeenCalledWith('practitioner:10');
    });
  });

  // --- joinAsPractitioner ---
  describe('joinAsPractitioner', () => {
    it('should throw not found if consultation does not exist', async () => {
      db.consultation.findUnique.mockResolvedValue(null);
      await expect(service.joinAsPractitioner(1, 10)).rejects.toThrow(
        /Consultation not found/i,
      );
    });

    it('should throw not found if practitioner does not exist', async () => {
      db.consultation.findUnique.mockResolvedValue(mockConsultation);
      db.user.findUnique.mockResolvedValue(null);
      await expect(service.joinAsPractitioner(1, 10)).rejects.toThrow(
        /Practitioner does not exist/i,
      );
    });

    it('should throw forbidden if not the owner', async () => {
      db.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        ownerId: 99,
      });
      db.user.findUnique.mockResolvedValue(mockPractitioner);
      await expect(service.joinAsPractitioner(1, 10)).rejects.toThrow(
        /Not the practitioner/i,
      );
    });

    it('should throw if consultation is completed', async () => {
      db.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.COMPLETED,
        ownerId: 10,
      });
      db.user.findUnique.mockResolvedValue(mockPractitioner);
      await expect(service.joinAsPractitioner(1, 10)).rejects.toThrow(
        /Cannot join completed consultation/i,
      );
    });

    it('should upsert participant and activate consultation', async () => {
      db.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        ownerId: 10,
      });
      db.user.findUnique.mockResolvedValue(mockPractitioner);
      db.participant.upsert.mockResolvedValue({});
      db.consultation.update.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.ACTIVE,
      });

      const result = await service.joinAsPractitioner(1, 10);
      expect(db.participant.upsert).toHaveBeenCalled();
      expect(db.consultation.update).toHaveBeenCalled();
      expect(result.data?.consultationId).toBe(1);
      expect(wsServer.to).toHaveBeenCalledWith('consultation:1');
    });
  });

  // --- admitPatient ---
  describe('admitPatient', () => {
    const dto: AdmitPatientDto = { consultationId: 1 };

    it('should throw not found if consultation does not exist', async () => {
      db.consultation.findUnique.mockResolvedValue(null);
      await expect(service.admitPatient(dto, 10)).rejects.toThrow(
        /Consultation not found/i,
      );
    });

    it('should throw not found if user does not exist', async () => {
      db.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.WAITING,
        version: 1,
      });
      db.user.findUnique.mockResolvedValue(null);
      await expect(service.admitPatient(dto, 10)).rejects.toThrow(
        /User not found/i,
      );
    });

    it('should throw forbidden if user is not practitioner/admin', async () => {
      db.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.WAITING,
        version: 1,
      });
      db.user.findUnique.mockResolvedValue({ ...mockPatient });
      await expect(service.admitPatient(dto, 2)).rejects.toThrow(
        /Only practitioners or admins/i,
      );
    });

    it('should throw forbidden if practitioner is not owner', async () => {
      db.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        ownerId: 11,
        status: ConsultationStatus.WAITING,
        version: 1,
      });
      db.user.findUnique.mockResolvedValue(mockPractitioner);
      await expect(service.admitPatient(dto, 10)).rejects.toThrow(
        /Not authorized to admit/i,
      );
    });

    it('should throw bad request if consultation not in WAITING', async () => {
      db.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.ACTIVE,
        version: 1,
      });
      db.user.findUnique.mockResolvedValue(mockPractitioner);
      await expect(service.admitPatient(dto, 10)).rejects.toThrow(
        /not in waiting state/i,
      );
    });

    it('should admit patient and emit socket event', async () => {
      db.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.WAITING,
        version: 1,
      });
      db.user.findUnique.mockResolvedValue(mockPractitioner);
      db.consultation.update.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.ACTIVE,
        version: 2,
      });

      const result = await service.admitPatient(dto, 10);
      expect(db.consultation.update).toHaveBeenCalled();
      expect(wsServer.to).toHaveBeenCalledWith('consultation:1');
      expect(result.data?.consultationId).toBe(1);
    });

    it('should handle socket emission failure gracefully', async () => {
      db.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.WAITING,
        version: 1,
      });
      db.user.findUnique.mockResolvedValue(mockPractitioner);
      db.consultation.update.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.ACTIVE,
        version: 2,
      });
      (wsServer.emit as jest.Mock).mockImplementation(() => {
        throw new Error('Socket error');
      });

      const result = await service.admitPatient(dto, 10);
      expect(result.data?.consultationId).toBe(1);
    });

    it('should throw conflict if update fails with P2025', async () => {
      db.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.WAITING,
        version: 1,
      });
      db.user.findUnique.mockResolvedValue(mockPractitioner);
      db.consultation.update.mockRejectedValue({ code: 'P2025' });

      await expect(service.admitPatient(dto, 10)).rejects.toThrow(
        /state changed/i,
      );
    });

    it('should throw internal server error for unknown errors', async () => {
      db.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.WAITING,
        version: 1,
      });
      db.user.findUnique.mockResolvedValue(mockPractitioner);
      db.consultation.update.mockRejectedValue(new Error('Unknown'));

      await expect(service.admitPatient(dto, 10)).rejects.toThrow(
        /Failed to admit patient/i,
      );
    });
  });

  // --- getWaitingRoomConsultations ---
  describe('getWaitingRoomConsultations', () => {
    it('should throw not found if practitioner does not exist', async () => {
      db.user.findUnique.mockResolvedValue(null);
      await expect(service.getWaitingRoomConsultations(10)).rejects.toThrow(
        /User not found/i,
      );
    });

    it('should return waiting rooms for practitioner', async () => {
      db.user.findUnique.mockResolvedValue(mockPractitioner);
      db.consultation.findMany.mockResolvedValue([
        {
          id: 1,
          participants: [
            {
              joinedAt: new Date(),
              user: { firstName: 'A', lastName: 'B', country: 'IN' },
            },
          ],
        },
      ]);

      const result = await service.getWaitingRoomConsultations(10);
      expect(result.data).toBeDefined();
      expect(result.data!.waitingRooms).toHaveLength(1);
      expect(result.data!.waitingRooms[0].patientInitials).toBe('AB');
      expect(result.data!.totalCount).toBe(1);
    });
  });
});
