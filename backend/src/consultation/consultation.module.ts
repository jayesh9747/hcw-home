import { Module } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { ConsultationController } from './consultation.controller';
import { ConsultationGateway } from './consultation.gateway';
import { DatabaseService } from 'src/database/database.service';

@Module({
  controllers: [ConsultationController],
  providers: [
    ConsultationService,
    ConsultationGateway,
    DatabaseService,
    {
      provide: 'CONSULTATION_GATEWAY',
      useExisting: ConsultationGateway,
    },
  ],
  exports: [ConsultationService],
})
export class ConsultationModule {}
