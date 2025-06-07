// Chayan Das <01chayandas@gmail.com>


import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly UserService: UserService,

    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        const requestId = request['id']; // assuming set via middleware
        const path = request.url;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw HttpExceptionHelper.unauthorized("Authorization header missing or malformed", requestId, path)
        }

        const token = authHeader.split(' ')[1];

        try {
            const payload = await this.jwtService.verifyAsync(token);
            // Check if the user exists in the database
            const user = await this.UserService.findOne(payload.sub);
            if (!user) {
                throw HttpExceptionHelper.unauthorized("no user found", requestId, path)
            }
            (request as any).user = user;
            return true;
        } catch (error) {
            throw HttpExceptionHelper.unauthorized("Invalid or expired token", requestId, path)
        }
    }
}
