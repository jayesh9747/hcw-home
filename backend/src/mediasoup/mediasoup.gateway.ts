import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WsException,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DatabaseService } from 'src/database/database.service';
import { MediasoupSessionService } from './mediasoup-session.service';

@WebSocketGateway({ namespace: '/mediasoup', cors: true })
export class MediasoupGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MediasoupGateway.name);

  constructor(
    private readonly mediasoupService: MediasoupSessionService,
  ) {}

  afterInit() {
    this.logger.log('Mediasoup WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(
      `Client connected: ${client.id} [${client.handshake.address}]`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `Client disconnected: ${client.id} [${client.handshake.address}]`,
    );
  }

  @SubscribeMessage('getRouterCapabilities')
  async handleGetCapabilities(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: number },
  ) {
    try {
      this.logger.log(
        `getRouterCapabilities requested by client ${client.id} for consultation ${data.consultationId}`,
      );
      const router = this.mediasoupService.getRouter(data.consultationId);
      if (!router) {
        this.logger.warn(
          `No router found for consultation ${data.consultationId}`,
        );
        throw new WsException('No router found for this consultation');
      }
      return { rtpCapabilities: router.rtpCapabilities };
    } catch (error) {
      this.logger.error(
        `Error in getRouterCapabilities for client ${client.id} (consultation ${data.consultationId}): ${error.message}`,
        error.stack,
      );
      client.emit('error', {
        event: 'getRouterCapabilities',
        message: error.message,
      });
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('createTransport')
  async handleCreateTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { consultationId: number; type: 'producer' | 'consumer' },
  ) {
    try {
      this.logger.log(
        `createTransport requested by client ${client.id} for consultation ${data.consultationId}, type: ${data.type}`,
      );
      const router = this.mediasoupService.getRouter(data.consultationId);
      if (!router) {
        this.logger.warn(
          `No router found for consultation ${data.consultationId}`,
        );
        throw new WsException('No router found for this consultation');
      }

      const transport = await router.createWebRtcTransport({
        listenIps: [
          { ip: '0.0.0.0', announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      this.logger.log(
        `Transport created for client ${client.id} [consultation ${data.consultationId}], transportId: ${transport.id}`,
      );

      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      };
    } catch (error) {
      this.logger.error(
        `Error in createTransport for client ${client.id} (consultation ${data.consultationId}): ${error.message}`,
        error.stack,
      );
      client.emit('error', {
        event: 'createTransport',
        message: error.message,
      });
      throw new WsException(error.message);
    }
  }
}
