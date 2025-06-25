import { Module } from '@nestjs/common';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';
import { AuthService } from 'src/auth/auth.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [TermsController],
  providers: [TermsService],
  imports:[AuthModule]
})
export class TermsModule {}
