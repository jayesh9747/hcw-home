import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { ConsultationStatus, UserRole } from '@prisma/client';
import { Server } from 'socket.io';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
import { ApiResponseDto } from 'src/common/helpers/response/api-response.dto';
import { JoinConsultationResponseDto } from './dto/join-consultation.dto';
import { WaitingRoomPreviewResponseDto } from './dto/waiting-room-preview.dto';
import {
  AdmitPatientDto,
  AdmitPatientResponseDto,
} from './dto/admit-patient.dto';
import {
  CreateConsultationDto,
  ConsultationResponseDto,
} from './dto/create-consultation.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ConsultationService {
  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => 'CONSULTATION_GATEWAY'))
    private readonly wsServer: Server, 
  ) {}

  /**
   * Create a new consultation (practitioner/admin only).
   * A patient can have only one active consultation at a time.
   */
  async createConsultation(
    createDto: CreateConsultationDto,
    userId: number,
  ): Promise<ApiResponseDto<ConsultationResponseDto>> {
    // Auth check: Only practitioner or admin can create
    const creator = await this.db.user.findUnique({ where: { id: userId } });
    if (!creator) throw HttpExceptionHelper.notFound('Creator user not found');
    if (
      creator.role !== UserRole.PRACTITIONER &&
      creator.role !== UserRole.ADMIN
    ) {
      throw HttpExceptionHelper.forbidden(
        'Only practitioners or admins can create consultations',
      );
    }

    // Patient existence check
    const patient = await this.db.user.findUnique({
      where: { id: createDto.patientId },
    });
    if (!patient) throw HttpExceptionHelper.notFound('Patient does not exist');
    if (patient.role !== UserRole.PATIENT)
      throw HttpExceptionHelper.badRequest('Target user is not a patient');

    // Practitioner existence check 
    let ownerId = createDto.ownerId ?? userId;
    const practitioner = await this.db.user.findUnique({
      where: { id: ownerId },
    });
    if (!practitioner || practitioner.role !== UserRole.PRACTITIONER)
      throw HttpExceptionHelper.badRequest(
        'Owner must be a valid practitioner',
      );

    // Prevent patient from having multiple active consultations
    const existing = await this.db.consultation.findFirst({
      where: {
        participants: {
          some: { userId: createDto.patientId },
        },
        status: {
          in: [
            ConsultationStatus.SCHEDULED,
            ConsultationStatus.WAITING,
            ConsultationStatus.ACTIVE,
          ],
        },
      },
    });
    if (existing)
      throw HttpExceptionHelper.conflict(
        'Patient already has an active consultation',
      );

    // Create consultation and initial patient participant 
    const consultation = await this.db.consultation.create({
      data: {
        ownerId,
        scheduledDate: createDto.scheduledDate,
        createdBy: userId,
        status: ConsultationStatus.SCHEDULED,
        groupId: createDto.groupId,
        participants: {
          create: {
            userId: createDto.patientId,
            isActive: false,
            isBeneficiary: true,
          },
        },
      },
      include: { participants: true },
    });

    // 6. Return response
    return ApiResponseDto.success(
      plainToInstance(ConsultationResponseDto, consultation),
      'Consultation created',
      201,
    );
  }

  /**
   * Patient joins a consultation (enters waiting room).
   */
  async joinAsPatient(
    consultationId: number,
    patientId: number,
  ): Promise<ApiResponseDto<JoinConsultationResponseDto>> {
    const consultation = await this.db.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation)
      throw HttpExceptionHelper.notFound('Consultation not found');

    if (consultation.status === ConsultationStatus.COMPLETED) {
      throw HttpExceptionHelper.badRequest(
        'Cannot join completed consultation',
      );
    }

    const patient = await this.db.user.findUnique({ where: { id: patientId } });
    if (!patient) throw HttpExceptionHelper.notFound('Patient does not exist');
    if (patient.role !== UserRole.PATIENT)
      throw HttpExceptionHelper.badRequest('User is not a patient');

    // Patient can only join if assigned as participant
    const isAssigned = await this.db.participant.findUnique({
      where: { consultationId_userId: { consultationId, userId: patientId } },
    });
    if (!isAssigned)
      throw HttpExceptionHelper.forbidden(
        'Patient is not assigned to this consultation',
      );

    // Patient cannot join if already active in another consultation
    const activeConsultation = await this.db.consultation.findFirst({
      where: {
        id: { not: consultationId },
        participants: {
          some: { userId: patientId, isActive: true },
        },
        status: {
          in: [
            ConsultationStatus.SCHEDULED,
            ConsultationStatus.WAITING,
            ConsultationStatus.ACTIVE,
          ],
        },
      },
    });
    if (activeConsultation)
      throw HttpExceptionHelper.conflict(
        'Patient is already active in another consultation',
      );

    await this.db.participant.update({
      where: { consultationId_userId: { consultationId, userId: patientId } },
      data: { isActive: true, joinedAt: new Date() },
    });

    if (consultation.status === ConsultationStatus.SCHEDULED) {
      await this.db.consultation.update({
        where: { id: consultationId },
        data: { status: ConsultationStatus.WAITING },
      });
    }

    // Real-time notification to practitioner
    if (consultation.ownerId && this.wsServer) {
      this.wsServer
        .to(`practitioner:${consultation.ownerId}`)
        .emit('patient_waiting', {
          consultationId,
          patientInitials: `${patient.firstName?.[0] ?? ''}${patient.lastName?.[0] ?? ''}`,
          joinTime: new Date(),
          language: patient.country ?? null,
        });
    }

    const responsePayload: JoinConsultationResponseDto = {
      success: true,
      statusCode: 200,
      message: 'Patient joined consultation and entered waiting room.',
      consultationId,
    };

    return ApiResponseDto.success(
      responsePayload,
      responsePayload.message,
      responsePayload.statusCode,
    );
  }

  /**
   * Practitioner joins a consultation (admits themselves).
   */
  async joinAsPractitioner(
    consultationId: number,
    practitionerId: number,
  ): Promise<ApiResponseDto<JoinConsultationResponseDto>> {
    const consultation = await this.db.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation)
      throw HttpExceptionHelper.notFound('Consultation not found');

    const practitioner = await this.db.user.findUnique({
      where: { id: practitionerId },
    });
    if (!practitioner)
      throw HttpExceptionHelper.notFound('Practitioner does not exist');

    if (consultation.ownerId !== practitionerId) {
      throw HttpExceptionHelper.forbidden(
        'Not the practitioner for this consultation',
      );
    }

    if (consultation.status === ConsultationStatus.COMPLETED) {
      throw HttpExceptionHelper.badRequest(
        'Cannot join completed consultation',
      );
    }

    await this.db.participant.upsert({
      where: {
        consultationId_userId: { consultationId, userId: practitionerId },
      },
      create: {
        consultationId,
        userId: practitionerId,
        isActive: true,
        joinedAt: new Date(),
      },
      update: { isActive: true, joinedAt: new Date() },
    });

    await this.db.consultation.update({
      where: { id: consultationId },
      data: { status: ConsultationStatus.ACTIVE },
    });

    if (this.wsServer) {
      this.wsServer
        .to(`consultation:${consultationId}`)
        .emit('consultation_status', {
          status: 'ACTIVE',
          initiatedBy: 'PRACTITIONER',
        });
    }

    const responsePayload: JoinConsultationResponseDto = {
      success: true,
      statusCode: 200,
      message: 'Practitioner joined and activated the consultation.',
      consultationId,
    };

    return ApiResponseDto.success(
      responsePayload,
      responsePayload.message,
      responsePayload.statusCode,
    );
  }

  /**
   * Practitioner or admin explicitly admits a patient (manual admit flow).
   * Only users with PRACTITIONER or ADMIN role are allowed.
   */
  async admitPatient(
    dto: AdmitPatientDto,
    userId: number,
  ): Promise<ApiResponseDto<AdmitPatientResponseDto>> {
    const consultation = await this.db.consultation.findUnique({
      where: { id: dto.consultationId },
    });
    if (!consultation) {
      throw HttpExceptionHelper.notFound('Consultation not found');
    }

    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw HttpExceptionHelper.notFound('User not found');
    }

    // Authorization checks
    if (user.role !== UserRole.PRACTITIONER && user.role !== UserRole.ADMIN) {
      throw HttpExceptionHelper.forbidden(
        'Only practitioners or admins can admit patients',
      );
    }

    if (consultation.ownerId !== userId && user.role !== UserRole.ADMIN) {
      throw HttpExceptionHelper.forbidden(
        'Not authorized to admit patient to this consultation',
      );
    }

    // State validation
    if (consultation.status !== ConsultationStatus.WAITING) {
      throw HttpExceptionHelper.badRequest(
        'Consultation is not in waiting state',
      );
    }

    try {
      // Optimistic concurrency control
      const updatedConsultation = await this.db.consultation.update({
        where: {
          id: dto.consultationId,
          version: consultation.version, // Ensure we only update if the version matches
        },
        data: {
          status: ConsultationStatus.ACTIVE,
          version: consultation.version + 1,
        },
      });

      // Safe WebSocket notification
      if (this.wsServer) {
        try {
          this.wsServer
            .to(`consultation:${dto.consultationId}`)
            .emit('consultation_status', {
              status: 'ACTIVE',
              initiatedBy: user.role,
            });
        } catch (socketError) {
          console.error('WebSocket emission failed:', socketError);
        }
      }

      return ApiResponseDto.success(
        {
          success: true,
          statusCode: 200,
          message: 'Patient admitted and consultation activated.',
          consultationId: dto.consultationId,
        },
        'Patient admitted successfully',
        200,
      );
    } catch (error) {
      if (error.code === 'P2025') {
        throw HttpExceptionHelper.conflict(
          'Consultation state changed. Please refresh and retry.',
          error,
        );
      }
      console.error('Admission failed:', error);
      throw HttpExceptionHelper.internalServerError(
        'Failed to admit patient',
        error,
      );
    }
  }

  /**
   * Fetches all consultations in WAITING for a practitioner,
   * where patient has joined (isActive=true) but practitioner has not.
   */
  async getWaitingRoomConsultations(
    practitionerId: number,
  ): Promise<ApiResponseDto<WaitingRoomPreviewResponseDto>> {
    const practitioner = await this.db.user.findUnique({
      where: { id: practitionerId },
    });
    if (!practitioner) {
      throw HttpExceptionHelper.notFound('User not found');
    }

    const consultations = await this.db.consultation.findMany({
      where: {
        status: ConsultationStatus.WAITING,
        ownerId: practitionerId,
        participants: {
          some: {
            isActive: true,
            user: { role: UserRole.PATIENT },
          },
        },
        NOT: {
          participants: {
            some: {
              isActive: true,
              user: { role: UserRole.PRACTITIONER },
            },
          },
        },
      },
      select: {
        id: true,
        participants: {
          where: {
            isActive: true,
            user: { role: UserRole.PATIENT },
          },
          select: {
            joinedAt: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                country: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const waitingRooms = consultations.map((c) => {
      const patient = c.participants[0]?.user;
      return {
        id: c.id,
        patientInitials: patient
          ? `${patient.firstName?.[0] ?? ''}${patient.lastName?.[0] ?? ''}`
          : '',
        joinTime: c.participants[0]?.joinedAt ?? null,
        language: patient?.country ?? null,
      };
    });

    const responsePayload = new WaitingRoomPreviewResponseDto({
      success: true,
      statusCode: 200,
      message: 'Waiting room consultations fetched.',
      waitingRooms,
      totalCount: waitingRooms.length,
    });

    return ApiResponseDto.success(
      responsePayload,
      responsePayload.message,
      responsePayload.statusCode,
    );
  }
}
