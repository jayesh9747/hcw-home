import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
import { AuthService } from '../auth.service';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from 'src/user/dto/user-response.dto';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      throw HttpExceptionHelper.unauthorized('WebSocket token missing');
    }

    try {
      if (!process.env.JWT_SECRET) {
        throw HttpExceptionHelper.unauthorized('JWT secret not configured');
      }
      const payload = jwt.verify(token, process.env.JWT_SECRET as string);
      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('userEmail' in payload)
      ) {
        throw HttpExceptionHelper.unauthorized('Invalid token payload');
      }
      const userEmail = (payload as jwt.JwtPayload).userEmail as string;
      const user = await this.authService.findByEmail(userEmail);
      if (!user) {
        throw HttpExceptionHelper.unauthorized('No user found');
      }
      client.data.user = plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: false,
      });
      return true;
    } catch (error) {
      throw HttpExceptionHelper.unauthorized(
        'Invalid or expired WebSocket token',
      );
    }
  }
}
