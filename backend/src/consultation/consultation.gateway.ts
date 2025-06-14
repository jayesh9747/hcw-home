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
    const cId = Number(client.handshake.query.consultationId);
    const uId = Number(client.handshake.query.userId);
    const role = client.handshake.query.role as string | undefined;

    if (!cId || !uId) return;

    client.join(`consultation:${cId}`);
    client.data.consultationId = cId;
    client.data.userId = uId;

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
  }

  /**
   * On disconnect:
   * - Marks participant as inactive.
   * - If all patients have left and status is WAITING, reverts consultation to SCHEDULED.
   */
  async handleDisconnect(client: Socket) {
    const { consultationId, userId } = client.data;
    if (!consultationId || !userId) return;

    await this.databaseService.participant.updateMany({
      where: { consultationId, userId },
      data: { isActive: false },
    });

    // Check if any active patients remain
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
  }

  /**
   * Practitioner can explicitly admit a patient (optional real-time event).
   */
  @SubscribeMessage('admit_patient')
  async handleAdmitPatient(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: number },
  ) {
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
  }
}
