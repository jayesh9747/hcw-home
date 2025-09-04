import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ConfigModule } from 'src/config/config.module';
import { MediasoupSessionService } from 'src/mediasoup/mediasoup-session.service';
import { ConsultationInvitationService } from 'src/consultation/consultation-invitation.service';
import { EmailService } from 'src/common/email/email.service';
import { ConsultationService } from 'src/consultation/consultation.service';
import { ConsultationUtilityService } from 'src/consultation/consultation-utility.service';
import { ConsultationMediaSoupService } from 'src/consultation/consultation-mediasoup.service';
import { ConsultationGateway } from 'src/consultation/consultation.gateway';
import { AvailabilityModule } from 'src/availability/availability.module';
import { UserModule } from 'src/user/user.module';
import { ReminderModule } from 'src/reminder/reminder.module';
import { StorageModule } from 'src/storage/storage.module';
import { CONSULTATION_GATEWAY_TOKEN } from 'src/consultation/interfaces/consultation-gateway.interface';
import { ChatService } from 'src/chat/chat.service';

/**
 * Core module that provides ALL shared services used across multiple modules
 * This completely eliminates circular dependencies by centralizing all services
 */
@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    AvailabilityModule,
    UserModule,
    ReminderModule,
    StorageModule,
  ],
  providers: [
    MediasoupSessionService,
    ConsultationInvitationService,
    EmailService,
    ConsultationGateway,
    ConsultationService,
    ConsultationUtilityService,
    ConsultationMediaSoupService,
    ChatService,
    // Provide the token mapping for dependency injection
    {
      provide: CONSULTATION_GATEWAY_TOKEN,
      useExisting: ConsultationGateway,
    },
  ],
  exports: [
    MediasoupSessionService,
    ConsultationInvitationService,
    EmailService,
    ConsultationService,
    ConsultationUtilityService,
    ConsultationMediaSoupService,
    ConsultationGateway,
    ChatService,
    CONSULTATION_GATEWAY_TOKEN,
    UserModule,
  ],
})
export class CoreModule { }
