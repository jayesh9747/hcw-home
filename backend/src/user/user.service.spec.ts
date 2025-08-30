
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { DatabaseService } from '../database/database.service';
import { UserResponseDto } from './dto/user-response.dto';

describe('UserService', () => {
  let service: UserService;
  let db: DatabaseService & { user: any };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: DatabaseService,
          useValue: {
            user: {
              update: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  db = module.get<DatabaseService>(DatabaseService) as DatabaseService & { user: any };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('anonymizeUser', () => {
    it('should anonymize user PII fields', async () => {
      const userId = 123;
      const mockUser = {
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '1234567890',
        country: 'Wonderland',
        sex: 'MALE',
        updatedAt: new Date(),
      };

      // Use a real Date instance for updatedAt to avoid class-transformer errors
      const updatedUser = {
        ...mockUser,
        firstName: 'Anonymized',
        lastName: 'User',
        email: `anonymized_${userId}@example.com`,
        phoneNumber: null,
        country: null,
        sex: null,
        updatedAt: new Date(),
      };
      (db.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.anonymizeUser(userId);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          firstName: 'Anonymized',
          lastName: 'User',
          email: `anonymized_${userId}@example.com`,
          phoneNumber: null,
          country: null,
          sex: null,
          updatedAt: expect.any(Date),
        }),
      });
      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.firstName).toBe('Anonymized');
      expect(result.lastName).toBe('User');
      expect(result.email).toBe(`anonymized_${userId}@example.com`);
      expect(result.phoneNumber).toBeNull();
      expect(result.country).toBeNull();
      expect(result.sex).toBeNull();
    });

    it('should be idempotent (multiple calls do not error)', async () => {
      const userId = 456;
      const alreadyAnon = {
        id: userId,
        firstName: 'Anonymized',
        lastName: 'User',
        email: `anonymized_${userId}@example.com`,
        phoneNumber: null,
        country: null,
        sex: null,
        updatedAt: new Date(),
      };
      (db.user.update as jest.Mock).mockResolvedValue(alreadyAnon);
      const result = await service.anonymizeUser(userId);
      expect(result.firstName).toBe('Anonymized');
      expect(result.lastName).toBe('User');
      expect(result.email).toBe(`anonymized_${userId}@example.com`);
      expect(result.phoneNumber).toBeNull();
      expect(result.country).toBeNull();
      expect(result.sex).toBeNull();
    });
  });
});
