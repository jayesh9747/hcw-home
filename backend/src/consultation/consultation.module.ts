import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { ConsultationController } from './consultation.controller';
import { DatabaseService } from 'src/database/database.service';
import { ConfigModule } from 'src/config/config.module';
import { ConsultationCleanupService } from './consultation-cleanup.service';
import { CoreModule } from 'src/core/core.module';

@Module({
  imports: [
    ConfigModule,
    CoreModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
  ],
  controllers: [ConsultationController],
  providers: [
    ConsultationCleanupService,
    DatabaseService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [],
})
export class ConsultationModule {}
