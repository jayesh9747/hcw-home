import { Module } from '@nestjs/common';
import { MediasoupServerService } from './mediasoup.service';
import { MediasoupServerController } from './mediasoup.controller';

@Module({
  controllers: [MediasoupServerController],
  providers: [MediasoupServerService],
})
export class MediasoupModule {}
