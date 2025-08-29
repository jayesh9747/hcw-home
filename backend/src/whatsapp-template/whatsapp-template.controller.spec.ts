
import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappTemplateController } from './whatsapp-template.controller';
import { WhatsappTemplateService } from './whatsapp-template.service';
import { DatabaseService } from '../database/database.service';
import { DatabaseModule } from '../database/database.module';
// Mock TwilioWhatsappService to avoid real Twilio client instantiation
import { TwilioWhatsappService } from './twilio-template.service';
class MockTwilioWhatsappService {}
import { ConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';

describe('WhatsappTemplateController', () => {
  let controller: WhatsappTemplateController;

  beforeEach(async () => {

    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, ConfigModule],
      controllers: [WhatsappTemplateController],
  providers: [WhatsappTemplateService, { provide: TwilioWhatsappService, useClass: MockTwilioWhatsappService }, ConfigService],
    }).compile();

    controller = module.get<WhatsappTemplateController>(WhatsappTemplateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
