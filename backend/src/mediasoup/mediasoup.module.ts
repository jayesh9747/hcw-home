import { forwardRef, Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from 'src/config/config.module';
import { MediasoupServerService } from './mediasoup.service';
import { MediasoupSessionService } from './mediasoup-session.service';
import { MediasoupServerController } from './mediasoup.controller';
import { MediasoupGateway } from './mediasoup.gateway';
import { DatabaseModule } from 'src/database/database.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { ConsultationModule } from 'src/consultation/consultation.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UserModule,
    AuthModule,
    forwardRef(() => ConsultationModule),
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
    MediasoupSessionService,
    MediasoupGateway,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [MediasoupServerService, MediasoupSessionService],
})
export class MediasoupModule {}
