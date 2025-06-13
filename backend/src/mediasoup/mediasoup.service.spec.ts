import { Test, TestingModule } from '@nestjs/testing';
import { MediasoupServerService } from './mediasoup.service';

describe('MediasoupService', () => {
  let service: MediasoupServerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MediasoupServerService],
    }).compile();

    service = module.get<MediasoupServerService>(MediasoupServerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
