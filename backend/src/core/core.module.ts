import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ConfigModule } from 'src/config/config.module';
import { AvailabilityModule } from 'src/availability/availability.module';
import { UserModule } from 'src/user/user.module';
import { ReminderModule } from 'src/reminder/reminder.module';
import { StorageModule } from 'src/storage/storage.module';
import { EmailService } from 'src/common/email/email.service';

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
    EmailService,
  ],
  exports: [
    EmailService,
    DatabaseModule,
    ConfigModule,
    StorageModule,
    ReminderModule,
  ],
})
export class CoreModule { }
