import {
  Controller,
  Post,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  Body,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportLocalGuard } from './guards/passport-local.guard';
import { LoginResponseDto, LoginUserDto } from './dto/login-user.dto';
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
import { ApiTags, ApiBody, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { string } from 'zod';
import { RefreshTokenDto, TokenDto } from './dto/token.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly UserService: UserService,
  ) {}

  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({
    status: 200,
    description: 'User logged-in successfully',
    type: LoginResponseDto,
  })
  @UseGuards(PassportLocalGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Req() req: ExtendedRequest,
    @Body() LoginDto: LoginUserDto,
  ): Promise<ApiResponseDto<LoginResponseDto>> {
    const requestId = req['id'] as string;
    const user = req.user as any;
    const result = await this.authService.loginUser(user, requestId, req.url);
    return ApiResponseDto.success(result, 'User logged-in successfully', 200, {
      requestId,
      path: req.url,
    });
  }

  @ApiOperation({ summary: 'Register a user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: CreateUserDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists' })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterUserDto,
    @Req() req: ExtendedRequest,
  ) {
    const user = await this.authService.registerUser(registerDto);

    return ApiResponseDto.success(user, 'User registered successfully', 201, {
      requestId: req['id'],
      path: req.url,
    });
  }
  @ApiOperation({ summary: 'Get the user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrive successfully',
    type: UserResponseDto,
  })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PATIENT, Role.PRACTITIONER)
  @HttpCode(HttpStatus.OK)
  @Get('me')
  async getMe(
    @Req() req: ExtendedRequest,
  ): Promise<ApiResponseDto<UserResponseDto>> {
    const requestId = req.id as string;
    const userId = req.user?.id as Number;
    const user = await this.UserService.findOne(Number(userId));
    this.logger.log(`user ${userId} started retrieving`);
    if (!user) {
      this.logger.warn(`${userId}:User not found`);
      throw HttpExceptionHelper.notFound('user not found', requestId, req.url);
    }
    this.logger.log(`user ${userId} retrieved successfully`);
    this.logger.log(`user ${userId} role is ${user.role}`);
    return ApiResponseDto.success(user, 'User retrieved successfully', 200, {
      requestId,
      path: req.url,
    });
  }

  @ApiOperation({ summary: 'Get a new access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrive successfully',
    type: LoginResponseDto,
  })
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() refreshToken: RefreshTokenDto,
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
