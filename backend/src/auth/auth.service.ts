import { Injectable, Logger } from '@nestjs/common';
import { LoginResponseDto, LoginUserDto } from './dto/login-user.dto';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
import { UserResponseDto } from 'src/user/dto/user-response.dto';
import { Role } from './enums/role.enum';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { TokenDto } from './dto/token.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * AuthService constructor
   * @param UserService - Service to handle user-related operations
   * @param JwtService - Service to handle JWT operations
   * @returns AuthService instance
   */

  constructor(
    private readonly UserService: UserService,
    private readonly JwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(
    loginUserDto: LoginUserDto,
    requestId: string,
    path: string,
  ): Promise<{ userId: number; userEmail: string }> {
    const user = await this.UserService.findByEmail(loginUserDto.email);

    if (!user) {
      throw HttpExceptionHelper.notFound('user not found', requestId, path);
    }

    const passwordMatch = await bcrypt.compare(
      loginUserDto.password,
      user.password,
    );

    if (!passwordMatch) {
      throw HttpExceptionHelper.unauthorized(
        'password or email is incorrect',
        requestId,
        path,
      );
    }
    return {
      userId: user.id,
      userEmail: user.email,
    };
  }

  async loginUser(
    UserResponseDto: UserResponseDto,
    requestId: string,
    path: string,
  ): Promise<LoginResponseDto> {
    const result = await this.generateToken(UserResponseDto);
    return result;
  }

  async generateToken(user: UserResponseDto): Promise<LoginResponseDto> {
    this.logger.log(`Generating JWT tokens for user ${user.id}`);
    const accessToken = this.JwtService.sign(
      { userId: user.id, userEmail: user.email },
      {
        secret: await this.configService.get<string>('jwt.accessSecret'),
        expiresIn:
          (await this.configService.get<string>('jwt.accessExpiresIn')) ||
          '24h',
      },
    );
    this.logger.log(`Access token generated successfully for user ${user.id}`);

    const refreshToken = this.JwtService.sign(
      { userId: user.id, userEmail: user.email },
      {
        secret: await this.configService.get<string>('jwt.refreshSecret'),
        expiresIn:
          (await this.configService.get<string>('jwt.refreshExpiresIn')) ||
          '7d',
      },
    );

    this.logger.log(`Refresh token generated successfully for user ${user.id}`);

    return { accessToken, refreshToken, userId: user.id, email: user.email };
  }

  async verifyToken(
    tokenDto: TokenDto,
    isRefreshToken = false,
  ): Promise<{ userId: number; userEmail: string }> {
    const secret = isRefreshToken
      ? this.configService.get<string>('jwt.refreshSecret')
      : this.configService.get<string>('jwt.accessSecret');

    const token = isRefreshToken ? tokenDto.refreshToken : tokenDto.accessToken;

    if (!token) {
      this.logger.warn('Token not provided');
      throw HttpExceptionHelper.badRequest('Token is required');
    }

    this.logger.log('Verifying JWT token');

    try {
      const decoded = await this.JwtService.verify(token, { secret });
      this.logger.log('JWT token verified successfully');
      return decoded;
    } catch (error) {
      this.logger.error('Error verifying JWT token', error?.message || error);
      throw HttpExceptionHelper.unauthorized('Invalid or expired token');
    }
  }

  async refreshToken(tokenDto: TokenDto): Promise<LoginResponseDto> {
    if (!tokenDto?.refreshToken) {
      this.logger.warn('Refresh token is required for token refresh');
      throw HttpExceptionHelper.badRequest('Refresh token is required');
    }

    try {
      const { userId } = await this.verifyRefreshToken(tokenDto);

      const user = await this.UserService.findOne(userId);

      if (!user || user.status !== 'APPROVED') {
        this.logger.warn(`User with ID ${userId} not found or unapproved`);
        throw HttpExceptionHelper.unauthorized('User not found or unapproved');
      }

      return this.generateToken(user);
    } catch (error) {
      this.logger.error('Invalid refresh token', error?.message || error);
      throw HttpExceptionHelper.unauthorized('Invalid refresh token');
    }
  }

  async verifyRefreshToken(
    tokenDto: TokenDto,
  ): Promise<{ userId: number; userEmail: string }> {
    if (!tokenDto.refreshToken) {
      throw HttpExceptionHelper.badRequest('Refresh token is required');
    }

    try {
      return await this.verifyToken(tokenDto, true);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw HttpExceptionHelper.unauthorized('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw HttpExceptionHelper.unauthorized('Invalid refresh token');
      } else {
        throw HttpExceptionHelper.internalServerError(
          'Server error while verifying refresh token',
        );
      }
    }
  }

  //registerUser
  async registerUser(registerDto: RegisterUserDto): Promise<UserResponseDto> {
    this.logger.log('Registering new user');
    const createUserData: CreateUserDto = {
      ...registerDto,
      role: Role.PATIENT, // Default role
      status: UserStatus.NOT_APPROVED,
      temporaryAccount: false,
      phoneNumber: undefined,
      country: undefined,
      sex: undefined,
    };
    return await this.UserService.create(createUserData);
  }
}
