
import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappTemplateService } from './whatsapp-template.service';
import { DatabaseService } from '../database/database.service';
import { DatabaseModule } from '../database/database.module';
import { TwilioWhatsappService } from './twilio-template.service';
// Mock TwilioWhatsappService to avoid real Twilio client instantiation
class MockTwilioWhatsappService {}
import { ConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';

describe('WhatsappTemplateService', () => {
  let service: WhatsappTemplateService;

  beforeEach(async () => {

    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, ConfigModule],
  providers: [WhatsappTemplateService, { provide: TwilioWhatsappService, useClass: MockTwilioWhatsappService }, ConfigService],
    }).compile();

    service = module.get<WhatsappTemplateService>(WhatsappTemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
