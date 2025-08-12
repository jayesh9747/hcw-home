import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { DatabaseService } from 'src/database/database.service';
import { MediasoupSessionService } from 'src/mediasoup/mediasoup-session.service';
import { ConsultationStatus, UserRole } from '@prisma/client';
import { EndConsultationDto } from './dto/end-consultation.dto';
import { RateConsultationDto } from './dto/rate-consultation.dto';

@WebSocketGateway({ namespace: '/consultation', cors: true })
export class ConsultationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConsultationGateway.name);
  private clientRooms = new Map<string, number>();
  private clientTransports = new Map<string, Set<string>>();
  private clientProducers = new Map<string, Set<string>>();
  private clientConsumers = new Map<string, Set<string>>();

  private joinNotificationDebounce = new Map<string, number>();

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => ConsultationService))
    private readonly consultationService: ConsultationService,
    @Inject(forwardRef(() => MediasoupSessionService))
    private readonly mediasoupSessionService: MediasoupSessionService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const q = client.handshake.query;
      const consultationId = Number(q.consultationId);
      const userId = Number(q.userId);
      const role = q.role as UserRole;

      const allowedRoles = [UserRole.PATIENT, UserRole.PRACTITIONER] as const;
      if (!consultationId || !userId || !allowedRoles.includes(role as any)) {
        client.emit('error', { message: 'Invalid connection parameters.' });
        client.disconnect(true);
        return;
      }

      // Check if the same role already connected (except patient can have multiple)
      if (role === UserRole.PRACTITIONER) {
        const connectedPractitioners =
          await this.databaseService.participant.findMany({
            where: {
              consultationId,
              isActive: true,
              role: UserRole.PRACTITIONER,
            },
          });
        if (
          connectedPractitioners.length > 0 &&
          !connectedPractitioners.some((p) => p.userId === userId)
        ) {
          client.emit('error', {
            message:
              'Another practitioner is already connected to this consultation.',
          });
          client.disconnect(true);
          return;
        }
      }

      await client.join(`consultation:${consultationId}`);
      if (role === UserRole.PRACTITIONER) {
        await client.join(`practitioner:${userId}`);
      }

      client.data = { consultationId, userId, role };
      this.clientRooms.set(client.id, consultationId);
      this.clientTransports.set(client.id, new Set());
      this.clientProducers.set(client.id, new Set());
      this.clientConsumers.set(client.id, new Set());

      await this.databaseService.participant.upsert({
        where: { consultationId_userId: { consultationId, userId } },
        create: {
          consultationId,
          userId,
          role,
          isActive: true,
          joinedAt: new Date(),
          lastActiveAt: new Date(),
        },
        update: {
          isActive: true,
          joinedAt: new Date(),
          lastActiveAt: new Date(),
        },
      });

      this.logger.log(
        `Client connected: ${client.id}, Consultation: ${consultationId}, User: ${userId}, Role: ${role}`,
      );

      const nowISO = new Date().toISOString();
      this.server.to(`consultation:${consultationId}`).emit('system_message', {
        type: 'user_joined',
        userId,
        role,
        timestamp: nowISO,
        message:
          role === UserRole.PATIENT
            ? `Patient joined the consultation`
            : `Practitioner joined the consultation`,
      });

      // If patient joins and consultation is waiting, emit "waiting for participant" system message
      if (role === UserRole.PATIENT) {
        const consultation = await this.databaseService.consultation.findUnique(
          {
            where: { id: consultationId },
            select: { status: true },
          },
        );
        if (consultation?.status === ConsultationStatus.WAITING) {
          this.server
            .to(`consultation:${consultationId}`)
            .emit('system_message', {
              type: 'waiting_for_participant',
              userId,
              role,
              timestamp: nowISO,
              message: `Patient is waiting for practitioner to join`,
            });
        }
      }

      // Notify patients when practitioner joins
      if (role === UserRole.PRACTITIONER) {
        const patientParticipants =
          await this.databaseService.participant.findMany({
            where: { consultationId, role: UserRole.PATIENT, isActive: true },
          });

        if (patientParticipants.length > 0) {
          this.server
            .to(`consultation:${consultationId}`)
            .emit('doctor_joined', {
              consultationId,
              practitionerId: userId,
              message: 'Doctor has joined. You may now join the consultation.',
            });
        }
      }

      // Patient connection logic
      if (role === UserRole.PATIENT) {
        const consultation = await this.databaseService.consultation.findUnique(
          {
            where: { id: consultationId },
            include: { owner: true, rating: true },
          },
        );

        if (consultation) {
          const canJoin = consultation.status === ConsultationStatus.ACTIVE;
          const waitingForDoctor =
            consultation.status === ConsultationStatus.WAITING ||
            consultation.status === ConsultationStatus.DRAFT;

          const practitionerId = consultation.owner?.id ?? consultation.ownerId;

          if (practitionerId) {
            const debounceKey = `patient_join_notify:${consultationId}:${practitionerId}`;
            const now = Date.now();
            const lastNotified =
              this.joinNotificationDebounce.get(debounceKey) ?? 0;
            const debounceDurationMs = 60 * 1000; // 1 minute debounce

            if (now - lastNotified > debounceDurationMs) {
              this.server
                .to(`practitioner:${practitionerId}`)
                .emit('patient_waiting', {
                  consultationId,
                  patientId: userId,
                  message: 'Patient is waiting in the consultation room.',
                });
              this.joinNotificationDebounce.set(debounceKey, now);
            }
          }

          client.emit('consultation_status_patient', {
            status: consultation.status,
            canJoin,
            waitingForDoctor,
            scheduledDate: consultation.scheduledDate,
            doctorName: consultation.owner
              ? `${consultation.owner.firstName} ${consultation.owner.lastName}`
              : '',
            rating: consultation.rating
              ? {
                  value: consultation.rating.rating,
                  color: consultation.rating.rating >= 4 ? 'green' : 'red',
                  done: true,
                }
              : { value: 0, color: null, done: false },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`, error.stack);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const { consultationId, userId, role } = client.data ?? {};
      if (!consultationId || !userId || !role) return;

      await this.databaseService.participant.updateMany({
        where: { consultationId, userId },
        data: { isActive: false, lastActiveAt: new Date() },
      });

      for (const transportId of this.clientTransports.get(client.id) ?? []) {
        try {
          await this.mediasoupSessionService.closeTransport(transportId);
        } catch (e) {
          this.logger.warn(
            `Failed to close transport ${transportId}: ${e.message}`,
          );
        }
      }
      for (const producerId of this.clientProducers.get(client.id) ?? []) {
        try {
          await this.mediasoupSessionService.closeProducer(producerId);
        } catch (e) {
          this.logger.warn(
            `Failed to close producer ${producerId}: ${e.message}`,
          );
        }
      }
      for (const consumerId of this.clientConsumers.get(client.id) ?? []) {
        try {
          await this.mediasoupSessionService.closeConsumer(consumerId);
        } catch (e) {
          this.logger.warn(
            `Failed to close consumer ${consumerId}: ${e.message}`,
          );
        }
      }

      this.clientTransports.delete(client.id);
      this.clientProducers.delete(client.id);
      this.clientConsumers.delete(client.id);

      const consultation = await this.databaseService.consultation.findUnique({
        where: { id: consultationId },
      });
      if (!consultation) return;

      const nowISO = new Date().toISOString();
      this.server.to(`consultation:${consultationId}`).emit('system_message', {
        type: 'user_left',
        userId,
        role,
        timestamp: nowISO,
        message:
          role === UserRole.PATIENT
            ? `Patient left the consultation`
            : `Practitioner left the consultation`,
      });

      // Practitioner leaves => terminate session and cleanup
      if (role === UserRole.PRACTITIONER) {
        await this.databaseService.consultation.update({
          where: { id: consultationId },
          data: { status: ConsultationStatus.TERMINATED_OPEN },
        });

        try {
          await this.mediasoupSessionService.cleanupRouterForConsultation(
            consultationId,
          );
        } catch (e) {
          this.logger.warn(
            `Mediasoup cleanup failed for consultation ${consultationId}: ${e.message}`,
          );
        }

        this.server
          .to(`consultation:${consultationId}`)
          .emit('media_session_closed', {
            consultationId,
            mediasoupCleaned: true,
          });
        this.server
          .to(`consultation:${consultationId}`)
          .emit('consultation_terminated', {
            consultationId,
            reason: 'Practitioner disconnected',
          });
      }

      // When all patients leave and status is waiting, revert status to scheduled
      if (role === UserRole.PATIENT) {
        const activePatients = await this.databaseService.participant.findMany({
          where: { consultationId, role: UserRole.PATIENT, isActive: true },
        });

        if (
          activePatients.length === 0 &&
          consultation.status === ConsultationStatus.WAITING
        ) {
          await this.databaseService.consultation.update({
            where: { id: consultationId },
            data: { status: ConsultationStatus.SCHEDULED },
          });

          this.server
            .to(`consultation:${consultationId}`)
            .emit('consultation_status', {
              status: ConsultationStatus.SCHEDULED,
              triggeredBy: 'All patients left',
            });
        }
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`, error.stack);
    }
  }

  @SubscribeMessage('admit_patient')
  async handleAdmitPatient(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: number },
  ) {
    try {
      const { consultationId } = data;
      const { role, userId } = client.data;

      if (role !== UserRole.PRACTITIONER && role !== UserRole.ADMIN) {
        throw new Error('Only practitioners or admins can admit patients');
      }

      const admissionResult = await this.consultationService.admitPatient(
        { consultationId },
        userId,
      );

      if (admissionResult.success) {
        // Ensure mediasoup router is ready for the consultation
        let mediasoupRouter =
          this.mediasoupSessionService.getRouter(consultationId);
        if (!mediasoupRouter) {
          mediasoupRouter =
            await this.mediasoupSessionService.createRouterForConsultation(
              consultationId,
            );
          this.logger.log(
            `Mediasoup router created for consultation ${consultationId} on admit_patient`,
          );
        }

        // Notify all participants of status change and mediasoup session
        this.server
          .to(`consultation:${consultationId}`)
          .emit('consultation_status', {
            status: ConsultationStatus.ACTIVE,
            initiatedBy: role,
          });

        this.server
          .to(`consultation:${consultationId}`)
          .emit('media_session_live', { consultationId });
      }

      return admissionResult;
    } catch (error) {
      this.logger.error('Admit patient failed', error.stack);
      client.emit('error', {
        message: 'Failed to admit patient',
        details: error.message,
      });
    }
  }

  @SubscribeMessage('end_consultation')
  async handleEndConsultation(
    @ConnectedSocket() client: Socket,
    @MessageBody() endDto: EndConsultationDto,
  ) {
    try {
      const { consultationId, action } = endDto;
      const { role, userId } = client.data;

      if (role !== UserRole.PRACTITIONER && role !== UserRole.ADMIN) {
        throw new Error('Only practitioners or admins can end consultations');
      }

      const result = await this.consultationService.endConsultation(
        endDto,
        userId,
      );

      if (result.success && result.data) {
        this.server
          .to(`consultation:${consultationId}`)
          .emit('consultation_ended', {
            status: result.data.status,
            action,
            terminatedBy: userId,
            deletionScheduledAt: result.data.deletionScheduledAt ?? undefined,
            retentionHours: result.data.retentionHours ?? undefined,
          });

        this.server
          .to(`consultation:${consultationId}`)
          .emit('media_session_closed', {
            consultationId,
            mediasoupCleaned: true,
          });

        if (result.data.status === ConsultationStatus.COMPLETED) {
          this.server
            .to(`consultation:${consultationId}`)
            .emit('consultation_status_patient', {
              status: ConsultationStatus.COMPLETED,
              canJoin: false,
              waitingForDoctor: false,
              showRating: true,
            });
        }
      } else {
        client.emit('error', {
          message: 'Failed to end consultation: No response from service',
        });
      }
    } catch (error) {
      this.logger.error(
        `End consultation error: ${error.message}`,
        error.stack,
      );
      client.emit('error', {
        message: 'Failed to end consultation',
        details: error.message,
      });
    }
  }

  @SubscribeMessage('fetch_messages')
  async handleFetchMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { consultationId: number; beforeId?: number; limit?: number },
  ) {
    try {
      const messages = await this.consultationService.getMessages(
        data.consultationId,
        data.beforeId,
        data.limit ?? 30,
      );
      client.emit('messages_page', { messages: messages.reverse() });
    } catch (err) {
      this.logger.error('Fetch messages error', err.stack);
      client.emit('error', {
        message: 'Failed to fetch messages',
        details: err.message,
      });
    }
  }

  @SubscribeMessage('sync_read_receipts')
  async handleSyncReadReceipts(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: number; readMessageIds: number[] },
  ) {
    try {
      const { userId } = client.data;
      const { consultationId, readMessageIds } = data;
      for (const messageId of readMessageIds) {
        await this.databaseService.messageReadReceipt.upsert({
          where: { messageId_userId: { messageId, userId } },
          update: { readAt: new Date() },
          create: { messageId, userId, readAt: new Date() },
        });
        this.server.to(`consultation:${consultationId}`).emit('message_read', {
          messageId,
          userId,
          readAt: new Date(),
        });
      }
    } catch (err) {
      this.logger.error('Sync read receipts error', err.stack);
      client.emit('error', {
        message: 'Failed to synchronize read receipts',
        details: err.message,
      });
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      consultationId: number;
      userId: number;
      content: string;
      clientUuid: string;
      mediaUrl?: string;
      mediaType?: string;
    },
  ) {
    try {
      if (
        !data.content ||
        typeof data.content !== 'string' ||
        data.content.trim().length === 0 ||
        data.content.length > 2000
      ) {
        return;
      }

      const message = await this.databaseService.message.create({
        data: {
          consultationId: data.consultationId,
          userId: data.userId,
          content: data.content,
          clientUuid: data.clientUuid,
          mediaUrl: data.mediaUrl ?? null,
          mediaType: data.mediaType ?? null,
        },
      });

      this.server
        .to(`consultation:${data.consultationId}`)
        .emit('new_message', {
          id: message.id,
          userId: data.userId,
          content: data.content,
          clientUuid: data.clientUuid,
          mediaUrl: data.mediaUrl ?? null,
          mediaType: data.mediaType ?? null,
          timestamp: message.createdAt,
          role: client.data.role,
        });
    } catch (error) {
      this.logger.error('Send message error', error.stack);
      client.emit('error', {
        message: 'Failed to send message',
        details: error.message,
      });
    }
  }

  @SubscribeMessage('message_read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: number; userId: number },
  ) {
    try {
      await this.databaseService.messageReadReceipt.upsert({
        where: {
          messageId_userId: { messageId: data.messageId, userId: data.userId },
        },
        update: { readAt: new Date() },
        create: {
          messageId: data.messageId,
          userId: data.userId,
          readAt: new Date(),
        },
      });

      const message = await this.databaseService.message.findUnique({
        where: { id: data.messageId },
      });
      if (message?.consultationId) {
        this.server
          .to(`consultation:${message.consultationId}`)
          .emit('message_read', {
            messageId: data.messageId,
            userId: data.userId,
            readAt: new Date(),
          });
      }
    } catch (error) {
      this.logger.error('Message read update failed', error.stack);
      client.emit('error', {
        message: 'Failed to update read receipt',
        details: error.message,
      });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: number; userId: number },
  ) {
    this.server
      .to(`consultation:${data.consultationId}`)
      .emit('typing', { userId: data.userId });
  }

  @SubscribeMessage('stop_typing')
  async handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: number; userId: number },
  ) {
    this.server
      .to(`consultation:${data.consultationId}`)
      .emit('stop_typing', { userId: data.userId });
  }

  @SubscribeMessage('rate_consultation')
  async handleRateConsultation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RateConsultationDto,
  ) {
    try {
      const { consultationId, rating, comment } = data;
      const { userId, role } = client.data;

      if (role !== UserRole.PATIENT) {
        throw new Error('Only patients can rate consultations');
      }

      await this.consultationService.rateConsultation(userId, {
        consultationId,
        rating,
        comment,
      });

      this.server
        .to(`consultation:${consultationId}`)
        .emit('consultation_rated', {
          consultationId,
          patientId: userId,
          rating,
        });

      this.server
        .to(`consultation:${consultationId}`)
        .emit('consultation_status_patient', {
          status: ConsultationStatus.COMPLETED,
          canJoin: false,
          waitingForDoctor: false,
          showRating: false,
          rating: {
            value: rating,
            color: rating >= 4 ? 'green' : 'red',
            done: true,
          },
        });
    } catch (error) {
      this.logger.error('Rate consultation failed', error.stack);
      client.emit('error', {
        message: 'Failed to rate consultation',
        details: error.message,
      });
    }
  }

  @SubscribeMessage('consultation_keep_alive')
  async handleKeepAlive(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: number },
  ) {
    try {
      const { consultationId } = data;
      const { userId } = client.data;

      const participant = await this.databaseService.participant.findUnique({
        where: { consultationId_userId: { consultationId, userId } },
      });

      if (!participant) {
        return;
      }

      await this.databaseService.participant.update({
        where: { consultationId_userId: { consultationId, userId } },
        data: { lastActiveAt: new Date() },
      });
    } catch {
      // Silently ignore to avoid flooding errors
    }
  }

  @SubscribeMessage('assign_practitioner')
  async handleAssignPractitioner(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: number; practitionerId: number },
  ) {
    try {
      const { consultationId, practitionerId } = data;
      const { role, userId } = client.data;

      if (role !== UserRole.ADMIN) {
        throw new Error('Only admins can assign practitioners');
      }

      const updated =
        await this.consultationService.assignPractitionerToConsultation(
          consultationId,
          practitionerId,
          userId,
        );

      if (!updated) {
        throw new Error('Failed to assign practitioner');
      }

      this.server
        .to(`consultation:${consultationId}`)
        .emit('practitioner_assigned', {
          consultationId,
          practitionerId,
          message: 'Practitioner assigned to this consultation',
          status: updated.status,
        });

      this.server.to(`practitioner:${practitionerId}`).emit('new_assignment', {
        consultationId,
        message: 'You have been assigned a new consultation',
        status: updated.status,
      });
    } catch (error) {
      this.logger.error('Assign practitioner failed', error.stack);
      client.emit('error', {
        message: 'Failed to assign practitioner',
        details: error.message,
      });
    }
  }

  @SubscribeMessage('media_permission_status')
  async handleMediaPermissionStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      consultationId: number;
      userId: number;
      camera: 'enabled' | 'disabled' | 'blocked';
      microphone: 'enabled' | 'disabled' | 'blocked';
    },
  ) {
    try {
      const { consultationId, userId, camera, microphone } = data;
      const role = client.data.role as UserRole;

      this.server
        .to(`consultation:${consultationId}`)
        .emit('media_permission_status_update', {
          userId,
          role,
          camera,
          microphone,
          timestamp: new Date().toISOString(),
        });

      await this.consultationService.saveMediaPermissionStatus(
        consultationId,
        userId,
        { camera, microphone },
      );
    } catch (error) {
      this.logger.error(
        'Error handling media_permission_status event',
        error.stack,
      );
      client.emit('error', {
        message: 'Failed to update media permission status',
      });
    }
  }

  @SubscribeMessage('media_permission_denied')
  async handleMediaPermissionDenied(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      consultationId: number;
      userId: number;
      camera: 'denied' | 'blocked';
      microphone: 'denied' | 'blocked';
    },
  ) {
    try {
      const { consultationId, userId, camera, microphone } = data;
      const role = client.data.role as UserRole;

      this.logger.warn(
        `User ${userId} (${role}) denied media permissions: camera=${camera}, microphone=${microphone}`,
      );

      this.server
        .to(`consultation:${consultationId}`)
        .except(client.id) // exclude sender if you want
        .emit('media_permission_denied_notification', {
          userId,
          role,
          camera,
          microphone,
          timestamp: new Date().toISOString(),
          message: `User ${userId} has denied permission for ${
            camera === 'denied' || camera === 'blocked' ? 'camera ' : ''
          }${
            microphone === 'denied' || microphone === 'blocked'
              ? 'microphone'
              : ''
          }.`,
        });
    } catch (error) {
      this.logger.error(
        'Error handling media_permission_denied event',
        error.stack,
      );
      client.emit('error', {
        message: 'Failed to process media permission denial',
      });
    }
  }

  @SubscribeMessage('client_error')
  async handleClientError(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { consultationId: number; userId: number; errorMessage: string },
  ) {
    const { consultationId, userId, errorMessage } = data;
    this.logger.warn(
      `Client error reported by user ${userId} in consultation ${consultationId}: ${errorMessage}`,
    );
    this.server
      .to(`consultation:${consultationId}`)
      .emit('client_error_notification', {
        userId,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
  }

  @SubscribeMessage('client_reconnect')
  async handleClientReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: number; userId: number },
  ) {
    try {
      const { consultationId, userId } = data;
      await this.databaseService.participant.updateMany({
        where: { consultationId, userId },
        data: { isActive: true, lastActiveAt: new Date() },
      });
      this.logger.log(
        `Client successful reconnect: user ${userId} consultation ${consultationId}`,
      );

      this.server.to(`consultation:${consultationId}`).emit('system_message', {
        type: 'user_reconnected',
        userId,
        timestamp: new Date().toISOString(),
        message: `User ${userId} reconnected to consultation.`,
      });
    } catch (error) {
      this.logger.error('Handling client_reconnect failed', error.stack);
      client.emit('error', {
        message: 'Failed to process client reconnect',
        details: error.message,
      });
    }
  }
}
