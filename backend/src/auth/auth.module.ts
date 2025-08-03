import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { AuthGuard } from './guards/auth.guard';
import { SessionSerializer } from './strategies/serialize';
import { AdminStrategy } from './strategies/admin.strategy';
import { PractitionerStrategy } from './strategies/practitionner.stretegy';
import { ConfigModule } from 'src/config/config.module';

@Module({
  imports: [ConfigModule, JwtModule, PassportModule.register({session:true})],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy, 
    AuthGuard,
    SessionSerializer,
    AdminStrategy,
    PractitionerStrategy
  ],
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}
