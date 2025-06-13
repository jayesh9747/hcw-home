import {
  Controller,
  Post,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportLocalGuard } from './guards/passport-local.guard';
import { LoginResponseDto } from './dto/login-user.dto';
import { ExtendedRequest } from 'src/types/request';
import { ApiResponseDto } from 'src/common/helpers/response/api-response.dto';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from './enums/role.enum';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
import { UserService } from 'src/user/user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserResponseDto } from 'src/user/dto/user-response.dto';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly UserService: UserService,
  ) {}

  @UseGuards(PassportLocalGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Req() req: ExtendedRequest,
  ): Promise<ApiResponseDto<LoginResponseDto>> {
    const requestId = req['id'] as string;
    const user = req.user as any;
    const result = await this.authService.loginUser(user, requestId, req.url);
    return ApiResponseDto.success(result, 'User logged-in successfully', 200, {
      requestId,
      path: req.url,
    });
  }



@Post('register')
@HttpCode(HttpStatus.CREATED)
async register(
  @Body() registerDto: RegisterUserDto,
  @Req() req: ExtendedRequest
) {
  const user = await this.authService.registerUser(registerDto);

  return ApiResponseDto.success(user, 'User registered successfully', 201, {
    requestId: req["id"],
    path: req.url,
  });
}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PATIENT, Role.PRACTITIONER)
  @HttpCode(HttpStatus.OK)
  @Get('me')
  async getMe(@Req() req: ExtendedRequest): Promise<ApiResponseDto<UserResponseDto>> {
    const requestId = req.id as string;
    const userId = req.user?.id as Number;
    const user = await this.UserService.findOne(Number(userId));
    if (!user) {
      throw HttpExceptionHelper.notFound('user not found', requestId, req.url);
    }
    return ApiResponseDto.success(user, 'User retrieved successfully', 200, {
      requestId,
      path: req.url,
    });
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
    @Req() req: ExtendedRequest,
  ) {
    const requestId = req.id as string;
    if (!refreshToken) {
      throw HttpExceptionHelper.badRequest('Refresh token is required');
    }
    const result = await this.authService.refreshToken(refreshToken);
    return ApiResponseDto.success(result, 'tokens created successfully', 200, {
      requestId,
      path: req.url,
    });
  }
}
