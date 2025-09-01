import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from 'src/config/config.module';
import { MediasoupServerService } from './mediasoup.service';
import { MediasoupServerController } from './mediasoup.controller';
import { MediasoupGateway } from './mediasoup.gateway';
import { DatabaseModule } from 'src/database/database.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { MediaEventService } from './media-event.service';
import { ChatModule } from 'src/chat/chat.module';
import { CoreModule } from 'src/core/core.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UserModule,
    AuthModule,
    ChatModule,
    CoreModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
  ],
  controllers: [MediasoupServerController],
  providers: [
    MediasoupServerService,
    MediasoupGateway,
    MediaEventService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [MediasoupServerService, MediaEventService],
})
export class MediasoupModule {}
