import { forwardRef, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { ConsultationService } from './consultation.service';
import { ConsultationController } from './consultation.controller';
import { ConsultationGateway } from './consultation.gateway';
import { ConsultationInvitationService } from './consultation-invitation.service';
import { DatabaseService } from 'src/database/database.service';
import { ConfigModule } from 'src/config/config.module';
import { ConsultationCleanupService } from './consultation-cleanup.service';
import { EmailService } from '../common/email/email.service';
import { AvailabilityModule } from 'src/availability/availability.module';
import { MediasoupModule } from 'src/mediasoup/mediasoup.module';
import { ReminderModule } from 'src/reminder/reminder.module';

@Module({
  imports: [
    ConfigModule,
    AvailabilityModule,
    forwardRef(() => MediasoupModule),
    ReminderModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
  ],
  controllers: [ConsultationController],
  providers: [
    ConsultationService,
    ConsultationGateway,
    ConsultationInvitationService,
    ConsultationCleanupService,
    DatabaseService,
    EmailService,
    {
      provide: 'CONSULTATION_GATEWAY',
      useExisting: ConsultationGateway,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ConsultationService, ConsultationInvitationService],
})
export class ConsultationModule {}
