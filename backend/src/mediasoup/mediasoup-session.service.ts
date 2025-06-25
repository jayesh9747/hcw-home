import { Injectable, Logger } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class MediasoupSessionService {
  private readonly logger = new Logger(MediasoupSessionService.name);
  private workers: mediasoup.types.Worker[] = [];
  private routers: Map<number, mediasoup.types.Router> = new Map();

  constructor(private readonly databaseService: DatabaseService) {
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    const numWorkers = 3;
    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: 'warn',
        rtcMinPort: 40000,
        rtcMaxPort: 49999,
      });
      this.workers.push(worker);
      this.logger.log(`Mediasoup worker ${worker.pid} created`);
    }
  }

  async createRouterForConsultation(consultationId: number) {
    const worker = this.workers[consultationId % this.workers.length];
    const router = await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    });

    // Store in database
    const server = await this.getAvailableServer();
    if (!server) {
      throw new Error('No available mediasoup server found');
    }
    const serverId = server.id;

    // Use serverId in your create call:
    await this.databaseService.mediasoupRouter.create({
      data: {
        consultationId,
        routerId: router.id,
        serverId: serverId,
      },
    });
    

    this.routers.set(consultationId, router);
    return router;
  }

  private async getAvailableServer() {
    return this.databaseService.mediasoupServer.findFirst({
      where: { active: true },
    });
  }

  getRouter(consultationId: number) {
    return this.routers.get(consultationId);
  }
}
