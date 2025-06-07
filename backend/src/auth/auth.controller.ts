import { Body, Controller, Post, HttpStatus, HttpCode, NotImplementedException, Req, Get, UseGuards, HttpException } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';
import { ApiRequestTimeoutResponse } from '@nestjs/swagger';
import { ApiResponseDto } from 'src/common/helpers/response/api-response.dto';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

import { UserService } from 'src/user/user.service';
import { Role } from './enums/role.enum';
import { ResponseStatus } from 'src/common/helpers/response/response-status.enum';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { loginSchema } from './validation/auth.validation';


@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private UserService: UserService,
    ) { }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(@Body(new ZodValidationPipe(loginSchema)) loginUserDto: LoginUserDto, @Req() req: Request) {
        const result = await this.authService.authenticateUser(loginUserDto, req['id'], req.url);
        return ApiResponseDto.success(result, 'User logged-in successfully', 200, {
            requestId: req['id'],
            path: req.url,
        });
    }

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN,Role.PATIENT,Role.PRACTITIONER)
    @HttpCode(HttpStatus.OK)
    @Get('me')
    async getMe(@Req() req: Request): Promise<any> {
        const user = await this.UserService.findOne(req['user'].id);
        if (!user) {
            throw HttpExceptionHelper.notFound("user not found", req['id'], req.url)
        }
        return ApiResponseDto.success(user, 'User retrieved successfully', 200, {
            requestId: req['id'],
            path: req.url,
        });
    }








}