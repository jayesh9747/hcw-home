import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ConsultationModule } from './consultation/consultation.module';
import { UserModule } from './user/user.module';
import { OrganizationModule } from './organization/organization.module';
import { GroupModule } from './group/group.module';


@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    ConsultationModule,
    UserModule,
    OrganizationModule,
    GroupModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}