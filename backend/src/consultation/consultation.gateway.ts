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
import { DatabaseService } from 'src/database/database.service';

@WebSocketGateway({ namespace: '/consultation', cors: true })
export class ConsultationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * On socket connection:
   * - Expects ?consultationId=123&userId=456&role=PRACTITIONER|PATIENT in the query.
   * - Joins user to the consultation room.
   * - If practitioner, also joins their practitioner notification room.
   * - Marks participant as active in the DB.
   */
  async handleConnection(client: Socket) {
    try {
      const cId = Number(client.handshake.query.consultationId);
      const uId = Number(client.handshake.query.userId);
      const role = client.handshake.query.role as string | undefined;

      if (!cId || !uId || !['PRACTITIONER', 'PATIENT'].includes(role || '')) {
        console.error(
          `[ConsultationGateway][handleConnection] Invalid connection params: consultationId=${cId}, userId=${uId}, role=${role}`,
        );
        client.disconnect();
        return;
      }

      client.join(`consultation:${cId}`);
      client.data.consultationId = cId;
      client.data.userId = uId;
      client.data.role = role;

      if (role === 'PRACTITIONER') {
        client.join(`practitioner:${uId}`);
      }

      await this.databaseService.participant.upsert({
        where: { consultationId_userId: { consultationId: cId, userId: uId } },
        create: {
          consultationId: cId,
          userId: uId,
          isActive: true,
          joinedAt: new Date(),
        },
        update: { isActive: true, joinedAt: new Date() },
      });

      console.log(
        `[ConsultationGateway][handleConnection] User ${uId} (${role}) connected to consultation ${cId}`,
      );
    } catch (error) {
      console.error(`[ConsultationGateway][handleConnection] Error:`, error);
      client.disconnect();
    }
  }

  /**
   * On disconnect:
   * - Marks participant as inactive.
   * - If all patients have left and status is WAITING, reverts consultation to SCHEDULED.
   */
  async handleDisconnect(client: Socket) {
    try {
      const { consultationId, userId } = client.data;
      if (!consultationId || !userId) return;

      await this.databaseService.participant.updateMany({
        where: { consultationId, userId },
        data: { isActive: false },
      });

      const activePatients = await this.databaseService.participant.findMany({
        where: {
          consultationId,
          isActive: true,
          user: { role: 'PATIENT' },
        },
      });

      const consultation = await this.databaseService.consultation.findUnique({
        where: { id: consultationId },
      });

      if (activePatients.length === 0 && consultation?.status === 'WAITING') {
        await this.databaseService.consultation.update({
          where: { id: consultationId },
          data: { status: 'SCHEDULED' },
        });
      }

      console.log(
        `[ConsultationGateway][handleDisconnect] User ${userId} disconnected from consultation ${consultationId}`,
      );
    } catch (error) {
      console.error(`[ConsultationGateway][handleDisconnect] Error:`, error);
    }
  }

  /**
   * Practitioner can explicitly admit a patient (optional real-time event).
   */
  @SubscribeMessage('admit_patient')
  async handleAdmitPatient(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: number },
  ) {
    try {
      const { consultationId } = data;
      await this.databaseService.consultation.update({
        where: { id: consultationId },
        data: { status: 'ACTIVE' },
      });
      this.server
        .to(`consultation:${consultationId}`)
        .emit('consultation_status', {
          status: 'ACTIVE',
          initiatedBy: 'PRACTITIONER',
        });

      console.log(
        `[ConsultationGateway][handleAdmitPatient] Consultation ${consultationId} set to ACTIVE by practitioner`,
      );
      // Optionally, trigger mediasoup session setup here
    } catch (error) {
      console.error(`[ConsultationGateway][handleAdmitPatient] Error:`, error);
    }
  }

  /**
   * Real-time messaging between patient and practitioner.
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { consultationId: number; userId: number; content: string },
  ) {
    try {
      if (
        !data.content ||
        typeof data.content !== 'string' ||
        data.content.trim().length === 0 ||
        data.content.length > 2000
      ) {
        console.warn(
          `[ConsultationGateway][send_message] Invalid message content from user ${data.userId} in consultation ${data.consultationId}`,
        );
        return;
      }

      await this.databaseService.message.create({
        data: {
          consultationId: data.consultationId,
          userId: data.userId,
          content: data.content,
        },
      });

      this.server
        .to(`consultation:${data.consultationId}`)
        .emit('new_message', {
          userId: data.userId,
          content: data.content,
          timestamp: new Date().toISOString(),
          role: client.data.role,
        });

      console.log(
        `[ConsultationGateway][send_message] User ${data.userId} sent message in consultation ${data.consultationId}`,
      );
    } catch (error) {
      console.error(`[ConsultationGateway][send_message] Error:`, error);
      client.emit('error', {
        message: 'Failed to send message',
        details: error?.message ?? error,
      });
    }
  }
}
