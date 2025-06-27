import { Module } from '@nestjs/common';
import { TermService } from './term.service';
import { TermController } from './term.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  providers: [TermService],
  controllers: [TermController],
  imports:[AuthModule]
})
export class TermModule {}
