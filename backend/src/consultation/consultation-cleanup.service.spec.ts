import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationCleanupService } from './consultation-cleanup.service';
import { DatabaseService } from '../../src/database/database.service';
import { ConfigService } from '../../src/config/config.service';
import { MediasoupSessionService } from '../../src/mediasoup/mediasoup-session.service';
import { UserService } from '../../src/user/user.service';

enum ConsultationStatus {
  COMPLETED = 'COMPLETED',
  TERMINATED_OPEN = 'TERMINATED_OPEN',
}
enum UserRole {
  PATIENT = 'PATIENT',
}

describe('ConsultationCleanupService', () => {
  let service: ConsultationCleanupService;
  let db: any;
  let userService: any;
  let mediasoupSessionService: any;
  let configService: any;

  beforeEach(async () => {
    db = {
      consultation: { findMany: jest.fn(), updateMany: jest.fn() },
      participant: { findMany: jest.fn() },
      deletedConsultationLog: { createMany: jest.fn() },
      mediasoupTransport: { findMany: jest.fn() },
    };
    userService = { anonymizeUser: jest.fn() };
    mediasoupSessionService = { cleanupRouterForConsultation: jest.fn(), closeTransport: jest.fn() };
    configService = { consultationRetentionHours: 24, consultationDeletionBufferHours: 1 };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationCleanupService,
        { provide: DatabaseService, useValue: db },
        { provide: UserService, useValue: userService },
        { provide: MediasoupSessionService, useValue: mediasoupSessionService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<ConsultationCleanupService>(ConsultationCleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should anonymize owner and patient participants before soft-deleting expired consultations', async () => {
    const consultations = [
      { id: 1, ownerId: 10, status: ConsultationStatus.COMPLETED, deletionScheduledAt: new Date(Date.now() - 10000000), isDeleted: false },
      { id: 2, ownerId: 20, status: ConsultationStatus.TERMINATED_OPEN, deletionScheduledAt: new Date(Date.now() - 10000000), isDeleted: false },
    ];
    db.consultation.findMany.mockResolvedValue(consultations);
    db.participant.findMany.mockImplementation(({ where }) => {
      if (where.consultationId === 1) return Promise.resolve([{ userId: 101, role: UserRole.PATIENT }]);
      if (where.consultationId === 2) return Promise.resolve([{ userId: 201, role: UserRole.PATIENT }, { userId: 202, role: UserRole.PATIENT }]);
      return Promise.resolve([]);
    });
    db.consultation.updateMany.mockResolvedValue({ count: 2 });
    db.deletedConsultationLog.createMany.mockResolvedValue({ count: 2 });
    db.mediasoupTransport.findMany.mockResolvedValue([]);
    userService.anonymizeUser.mockResolvedValue({});
    mediasoupSessionService.cleanupRouterForConsultation.mockResolvedValue(undefined);

    await service.handleExpiredConsultations();

    // Owner anonymization
    expect(userService.anonymizeUser).toHaveBeenCalledWith(10);
    expect(userService.anonymizeUser).toHaveBeenCalledWith(20);
    // Participant anonymization
    expect(userService.anonymizeUser).toHaveBeenCalledWith(101);
    expect(userService.anonymizeUser).toHaveBeenCalledWith(201);
    expect(userService.anonymizeUser).toHaveBeenCalledWith(202);
    // Soft-delete
    expect(db.consultation.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      data: { isDeleted: true },
    });
    // Audit log
    expect(db.deletedConsultationLog.createMany).toHaveBeenCalled();
  });
});
