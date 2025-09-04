import { Module } from '@nestjs/common';
import { ConsultationInvitationService } from './consultation-invitation.service';
import { DatabaseModule } from 'src/database/database.module';
import { ConfigModule } from 'src/config/config.module';
import { CoreModule } from 'src/core/core.module';

@Module({
 imports: [DatabaseModule, ConfigModule, CoreModule],
 providers: [ConsultationInvitationService],
 exports: [ConsultationInvitationService],
})
export class ConsultationInvitationModule { }
