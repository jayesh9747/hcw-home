import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [OrganizationController],
  providers: [OrganizationService],
  imports:[AuthModule]
})
export class OrganizationModule {}
