import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { TermsService } from './terms/terms.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [OrganizationController],
  providers: [OrganizationService,TermsService],
  imports:[AuthModule]
})
export class OrganizationModule {}
