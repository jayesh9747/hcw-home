import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationController } from './consultation.controller';
import { ConsultationService } from './consultation.service';
import {
  JoinConsultationDto,
  JoinConsultationResponseDto,
} from './dto/join-consultation.dto';
import {
  AdmitPatientDto,
  AdmitPatientResponseDto,
} from './dto/admit-patient.dto';
import { ApiResponseDto } from '../common/helpers/response/api-response.dto';
import { WaitingRoomPreviewResponseDto } from './dto/waiting-room-preview.dto';
import {
  CreateConsultationDto,
  ConsultationResponseDto,
} from './dto/create-consultation.dto';

describe('ConsultationController', () => {
  let controller: ConsultationController;
  let service: {
    createConsultation: jest.Mock;
    joinAsPatient: jest.Mock;
    joinAsPractitioner: jest.Mock;
    admitPatient: jest.Mock;
    getWaitingRoomConsultations: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createConsultation: jest.fn(),
      joinAsPatient: jest.fn(),
      joinAsPractitioner: jest.fn(),
      admitPatient: jest.fn(),
      getWaitingRoomConsultations: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsultationController],
      providers: [{ provide: ConsultationService, useValue: service }],
    }).compile();

    controller = module.get<ConsultationController>(ConsultationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createConsultation', () => {
    it('should call service and return ApiResponseDto', async () => {
      const createDto: CreateConsultationDto = {
        patientId: 2,
        ownerId: 3,
        scheduledDate: new Date(),
        groupId: undefined,
      };
      const userId = 3;
      const response: ApiResponseDto<ConsultationResponseDto> =
        ApiResponseDto.success(
          {
            id: 1,
            status: 'SCHEDULED',
            ownerId: 3,
            patientId: 2,
            scheduledDate: createDto.scheduledDate,
            groupId: undefined,
          },
          'Consultation created',
          201,
        );
      service.createConsultation.mockResolvedValue(response);

      const result = await controller.createConsultation(createDto, userId);
      // Log the API response
      console.log(
        '[createConsultation] API Response:',
        JSON.stringify(result, null, 2),
      );
      expect(service.createConsultation).toHaveBeenCalledWith(
        createDto,
        userId,
      );
      expect(result).toBe(response);
    });
  });

  describe('joinPatient', () => {
    it('should call service and return ApiResponseDto', async () => {
      const id = 1;
      const dto: JoinConsultationDto = { userId: 2 };
      const response: ApiResponseDto<JoinConsultationResponseDto> =
        ApiResponseDto.success(
          { success: true, statusCode: 200, message: 'ok', consultationId: 1 },
          'ok',
        );
      service.joinAsPatient.mockResolvedValue(response);

      const result = await controller.joinPatient(id, dto);
      // Log the API response
      console.log(
        '[joinPatient] API Response:',
        JSON.stringify(result, null, 2),
      );
      expect(service.joinAsPatient).toHaveBeenCalledWith(id, dto.userId);
      expect(result).toBe(response);
    });
  });

  describe('joinPractitioner', () => {
    it('should call service and return ApiResponseDto', async () => {
      const id = 1;
      const dto: JoinConsultationDto = { userId: 3 };
      const response: ApiResponseDto<JoinConsultationResponseDto> =
        ApiResponseDto.success(
          { success: true, statusCode: 200, message: 'ok', consultationId: 1 },
          'ok',
        );
      service.joinAsPractitioner.mockResolvedValue(response);

      const result = await controller.joinPractitioner(id, dto);
      // Log the API response
      console.log(
        '[joinPractitioner] API Response:',
        JSON.stringify(result, null, 2),
      );
      expect(service.joinAsPractitioner).toHaveBeenCalledWith(id, dto.userId);
      expect(result).toBe(response);
    });
  });

  describe('admitPatient', () => {
    it('should call service and return ApiResponseDto', async () => {
      const admitDto: AdmitPatientDto = { consultationId: 1 };
      const userId = 3;
      const response: ApiResponseDto<AdmitPatientResponseDto> =
        ApiResponseDto.success(
          {
            success: true,
            statusCode: 200,
            message: 'admitted',
            consultationId: 1,
          },
          'admitted',
        );
      service.admitPatient.mockResolvedValue(response);

      const result = await controller.admitPatient(admitDto, userId);
      // Log the API response
      console.log(
        '[admitPatient] API Response:',
        JSON.stringify(result, null, 2),
      );
      expect(service.admitPatient).toHaveBeenCalledWith(admitDto, userId);
      expect(result).toBe(response);
    });
  });

  describe('getWaitingRoom', () => {
    it('should call service and return ApiResponseDto', async () => {
      const userId = 2;
      const response: ApiResponseDto<WaitingRoomPreviewResponseDto> =
        ApiResponseDto.success(
          {
            success: true,
            statusCode: 200,
            message: 'Waiting room consultations fetched.',
            waitingRooms: [],
            totalCount: 0,
          },
          'Waiting room consultations fetched.',
        );
      service.getWaitingRoomConsultations.mockResolvedValue(response);

      const result = await controller.getWaitingRoom(userId);
      // Log the API response
      console.log(
        '[getWaitingRoom] API Response:',
        JSON.stringify(result, null, 2),
      );
      expect(service.getWaitingRoomConsultations).toHaveBeenCalledWith(userId);
      expect(result).toBe(response);
    });
  });
});
