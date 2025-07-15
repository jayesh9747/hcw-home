import { Module } from '@nestjs/common';
import { MediasoupServerService } from './mediasoup.service';
import { MediasoupSessionService } from './mediasoup-session.service';
import { MediasoupServerController } from './mediasoup.controller';
import { MediasoupGateway } from './mediasoup.gateway';
import { DatabaseModule } from 'src/database/database.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [DatabaseModule, UserModule, AuthModule],
  controllers: [MediasoupServerController],
  providers: [
    MediasoupServerService,
    MediasoupSessionService,
    MediasoupGateway,
  ],
  exports: [
    MediasoupServerService,
    MediasoupSessionService, 
  ],
})
export class MediasoupModule {}
