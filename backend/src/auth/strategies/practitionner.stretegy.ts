import { PassportStrategy } from '@nestjs/passport';
import { Injectable, LoggerService } from '@nestjs/common';
import { Strategy as OpenIDConnectStrategy, Profile } from 'passport-openidconnect';
import { Request } from 'express';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
import { OidcUserDto } from '../dto/oidc-user.dto';
import { AuthService } from '../auth.service';
import { Role } from '../enums/role.enum';
import { ConfigService } from 'src/config/config.service';
import { CustomLoggerService } from 'src/logger/logger.service';

@Injectable()
export class PractitionerStrategy extends PassportStrategy(OpenIDConnectStrategy, 'openidconnect_practitioner') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly logger: CustomLoggerService
  ) {
    const data = configService.getPractitionerOidcConfig();

    // Provide default fallback configuration if OIDC is not configured
    const strategyConfig = data || {
      issuer: 'https://default-issuer.com',
      authorizationURL: 'https://default-issuer.com/auth',
      tokenURL: 'https://default-issuer.com/token',
      userInfoURL: 'https://default-issuer.com/userinfo',
      clientID: 'default-client-id',
      clientSecret: 'default-client-secret',
      callbackURL: `${configService.backendApiBaseUrl}/api/v1/auth/callback/openidconnect_practitioner?role=practitioner`,
      scope: 'openid profile email',
    };

    super({
      ...strategyConfig,
      passReqToCallback: true,
    });
  }
  async validate(
    req: Request,
    issuer: string,
    profile: Profile,
    done: Function,
  ): Promise<any> {
    try {
      if (!profile) {
        throw HttpExceptionHelper.notFound("profile data not found");
      }

      const [firstName, lastName] = profile.displayName?.split(' ') ?? ['', ''];
      const user: OidcUserDto = {
        email: profile.emails?.[0]?.value,
        firstName,
        lastName,
        role: Role.PRACTITIONER,
      };

      const data = await this.authService.loginUserValidate(user);
      this.logger.log('User validated:');
      return done(null, data);
    } catch (err) {
      return done(err, null);
    }
  }
}
