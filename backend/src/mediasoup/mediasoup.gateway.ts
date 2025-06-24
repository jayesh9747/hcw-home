import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DatabaseService } from '../database/database.service';
import { MediasoupSessionService } from './mediasoup-session.service';

@WebSocketGateway({ namespace: '/mediasoup', cors: true })
export class MediasoupGateway {
  @WebSocketServer() server: Server;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mediasoupService: MediasoupSessionService,
  ) {}

  @SubscribeMessage('getRouterCapabilities')
  async handleGetCapabilities(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: number },
  ) {
    const router = this.mediasoupService.getRouter(data.consultationId);
    return { rtpCapabilities: router?.rtpCapabilities };
  }

  @SubscribeMessage('createTransport')
  async handleCreateTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { consultationId: number; type: 'producer' | 'consumer' },
  ) {
    const router = this.mediasoupService.getRouter(data.consultationId);
    if (!router) throw new Error('No router found for consultation');

    const transport = await router.createWebRtcTransport({
      listenIps: [
        { ip: '0.0.0.0', announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }
}
