import { Controller, Get } from '@nestjs/common';
import { ConfigService } from './config.service';
ConfigService
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getFrontendConfig() {
    return this.configService.frontendConfig;
  }
  
}
