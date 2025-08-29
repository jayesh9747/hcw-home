import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { ReminderProcessor } from './reminder.processor';
import { DatabaseModule } from 'src/database/database.module';
import { ConfigModule } from 'src/config/config.module';
import { SmsProviderModule } from 'src/sms_provider/sms_provider.module';
import { UserModule } from 'src/user/user.module';
import { WhatsappTemplateModule } from 'src/whatsapp-template/whatsapp-template.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    SmsProviderModule,
    UserModule,
    WhatsappTemplateModule,
  ],
  providers: [
    ReminderService,
    ReminderProcessor,
  ],
  exports: [ReminderService],
})
export class ReminderModule {}
