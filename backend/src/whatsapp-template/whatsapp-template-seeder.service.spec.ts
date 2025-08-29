import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappTemplateSeederService } from './whatsapp-template-seeder.service';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../config/config.service';

enum ApprovalStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
}
import * as fs from 'fs';

jest.mock('fs');

describe('WhatsappTemplateSeederService', () => {
  let service: WhatsappTemplateSeederService;
  let db: any;
  let config: any;

  beforeEach(async () => {
    db = {
      whatsapp_Template: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    config = {
      whatsappTemplatesPathFromEnv: undefined,
      whatsappTemplatesPath: 'src/json/whatsapp-templates.json',
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappTemplateSeederService,
        { provide: DatabaseService, useValue: db },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get(WhatsappTemplateSeederService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should create new templates from JSON', async () => {
    const json = JSON.stringify({
      requiredTemplates: [
        { key: 'new', category: 'UTILITY', contentType: 'text' },
      ],
    });
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(json);
    db.whatsapp_Template.findFirst.mockResolvedValue(null);
    db.whatsapp_Template.create.mockResolvedValue({});
    await service['seedTemplates']();
    expect(db.whatsapp_Template.create).toHaveBeenCalled();
  });

  it('should update existing draft templates', async () => {
    const json = JSON.stringify({
      requiredTemplates: [
        { key: 'draft', category: 'UTILITY', contentType: 'text' },
      ],
    });
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(json);
    db.whatsapp_Template.findFirst.mockResolvedValue({ id: 1, approvalStatus: ApprovalStatus.DRAFT });
    db.whatsapp_Template.update.mockResolvedValue({});
    await service['seedTemplates']();
    expect(db.whatsapp_Template.update).toHaveBeenCalled();
  });

  it('should not update approved templates', async () => {
    const json = JSON.stringify({
      requiredTemplates: [
        { key: 'approved', category: 'UTILITY', contentType: 'text' },
      ],
    });
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(json);
    db.whatsapp_Template.findFirst.mockResolvedValue({ id: 2, approvalStatus: ApprovalStatus.APPROVED });
    await service['seedTemplates']();
    expect(db.whatsapp_Template.update).not.toHaveBeenCalled();
    expect(db.whatsapp_Template.create).not.toHaveBeenCalled();
  });

  it('should handle malformed JSON', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('not-json');
    const logSpy = jest.spyOn(service['logger'], 'error');
    await service['seedTemplates']();
    expect(logSpy).toHaveBeenCalledWith('Invalid JSON format in template file', expect.anything());
  });

  it('should handle missing JSON file', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const logSpy = jest.spyOn(service['logger'], 'warn');
    await service['seedTemplates']();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Template file not found'));
  });
});
