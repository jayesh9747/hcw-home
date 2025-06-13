// Chayan Das <01chayandas@gmail.com>

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
import { ExtendedRequest } from 'src/types/request';
import { UserService } from 'src/user/user.service';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly UserService: UserService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ExtendedRequest>();
    const authHeader = request.headers.authorization;
    const requestId = request.id;
    const path = request.url;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw HttpExceptionHelper.unauthorized(
        'Authorization header missing or malformed',
        requestId,
        path,
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.authService.VerifyToken(token);
      // Check if the user exists in the database
      const user = await this.UserService.findOne(payload.id);
      if (!user) {
        throw HttpExceptionHelper.unauthorized(
          'no user found',
          requestId,
          path,
        );
      }
      request.user = user;
      return true;
    } catch (error) {
      throw HttpExceptionHelper.unauthorized(
        'Invalid or expired token',
        requestId,
        path,
      );
    }
  }
}
