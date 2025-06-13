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
    private UserService: UserService,
    private JwtService: JwtService,
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
    const { token: accessToken, refreshToken } =
      await this.generateToken(UserResponseDto);

    return new LoginResponseDto({
      accessToken,
      refreshToken,
      userId: UserResponseDto.id,
      email: UserResponseDto.email,
    });
  }

  async generateToken(
    user: UserResponseDto,
  ): Promise<{ token: string; refreshToken: string }> {
    this.logger.log(`Generating JWT tokens for user ${user.id}`);

    const token = this.JwtService.sign(
      { id: user.id },
      {
        secret: 'default_secret',
        expiresIn: '15m',
      },
    );

    const refreshToken = this.JwtService.sign(
      { id: user.id },
      {
        secret: 'default_refresh_secret',
        expiresIn: '7d',
      },
    );

    this.logger.log(`JWT tokens generated successfully for user ${user.id}`);

    return { token, refreshToken };
  }

  async VerifyToken(token: string, isRefreshToken = false): Promise<any> {
    const secret = isRefreshToken ? 'default_refresh_secret' : 'default_secret';

    this.logger.log('Verifying JWT token');

    try {
      const decoded = this.JwtService.verify(token, { secret });
      this.logger.log('JWT token verified successfully');
      return decoded;
    } catch (error) {
      this.logger.error('Error verifying JWT token', error?.message || error);
      throw HttpExceptionHelper.unauthorized('Invalid or expired token');
    }
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      this.logger.warn('Refresh token is required for token refresh');
      throw HttpExceptionHelper.badRequest('Refresh token is required');
    }

    try {
      const decoded = await this.VerifyToken(refreshToken, true);

      const user = await this.UserService.findOne(decoded.id);

      if (!user || user.status !== 'APPROVED') {
        this.logger.warn(`User with ID ${decoded.id} not found or unapproved`);

        throw HttpExceptionHelper.unauthorized('User not found or unapproved');
      }

      return this.generateToken(user);
    } catch (error) {
      throw HttpExceptionHelper.unauthorized('Invalid refresh token');
    }
  }
  async verifyRefreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw HttpExceptionHelper.badRequest('Refresh token is required');
    }

    try {
      this.VerifyToken(refreshToken, true);
      return { message: 'Token is valid' };
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
