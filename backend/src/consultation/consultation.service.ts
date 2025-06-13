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

@Injectable()
export class ConsultationService {
  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => 'CONSULTATION_GATEWAY'))
    private readonly wsServer: Server, // Provided by gateway
  ) {}

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

    const patient = await this.db.user.findUnique({ where: { id: patientId } });
    if (!patient) throw HttpExceptionHelper.notFound('Patient does not exist');

    await this.db.participant.upsert({
      where: { consultationId_userId: { consultationId, userId: patientId } },
      create: {
        consultationId,
        userId: patientId,
        isActive: true,
        joinedAt: new Date(),
      },
      update: { isActive: true, joinedAt: new Date() },
    });

    if (consultation.status === ConsultationStatus.SCHEDULED) {
      await this.db.consultation.update({
        where: { id: consultationId },
        data: { status: ConsultationStatus.WAITING },
      });
    }

    // Real-time notification to practitioner
    if (consultation.owner && this.wsServer) {
      this.wsServer
        .to(`practitioner:${consultation.owner}`)
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

    if (consultation.owner !== practitionerId) {
      throw HttpExceptionHelper.forbidden(
        'Not the practitioner for this consultation',
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
    if (!consultation)
      throw HttpExceptionHelper.notFound('Consultation not found');

    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw HttpExceptionHelper.notFound('User not found');

    if (user.role !== UserRole.PRACTITIONER && user.role !== UserRole.ADMIN) {
      throw HttpExceptionHelper.forbidden(
        'Only practitioners or admins can admit patients',
      );
    }

    if (consultation.owner !== userId && user.role !== UserRole.ADMIN) {
      throw HttpExceptionHelper.forbidden(
        'Not authorized to admit patient to this consultation',
      );
    }

    if (consultation.status !== ConsultationStatus.WAITING) {
      throw HttpExceptionHelper.badRequest(
        'Consultation is not in waiting state',
      );
    }

    await this.db.consultation.update({
      where: { id: dto.consultationId },
      data: { status: ConsultationStatus.ACTIVE },
    });

    if (this.wsServer) {
      this.wsServer
        .to(`consultation:${dto.consultationId}`)
        .emit('consultation_status', {
          status: 'ACTIVE',
          initiatedBy: user.role,
        });
    }

    const responsePayload: AdmitPatientResponseDto = {
      success: true,
      statusCode: 200,
      message: 'Patient admitted and consultation activated.',
      consultationId: dto.consultationId,
    };

    return ApiResponseDto.success(
      responsePayload,
      responsePayload.message,
      responsePayload.statusCode,
    );
  }

  /**
   * Fetches all consultations in WAITING for a practitioner,
   * where patient has joined (isActive=true) but practitioner has not.
   */
  async getWaitingRoomConsultations(
    practitionerId: number,
  ): Promise<ApiResponseDto<WaitingRoomPreviewResponseDto>> {
    const consultations = await this.db.consultation.findMany({
      where: {
        status: ConsultationStatus.WAITING,
        owner: practitionerId,
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
