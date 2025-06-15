import { Module } from '@nestjs/common';
import { SmsProviderService } from './sms_provider.service';
import { SmsProviderController } from './sms_provider.controller';

@Module({
  controllers: [SmsProviderController],
  providers: [SmsProviderService],
})
export class SmsProviderModule {}
