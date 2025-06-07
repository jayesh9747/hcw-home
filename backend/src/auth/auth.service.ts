import { Injectable,UnauthorizedException, NotFoundException } from '@nestjs/common';
import { LoginResponseDto, LoginUserDto } from './dto/login-user.dto';
import { UserService } from 'src/user/user.service';
import { UserResponseDto } from 'src/user/dto/user-response.dto';
import { ApiResponseDto } from 'src/common/helpers/response/api-response.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ResponseStatus } from 'src/common/helpers/response/response-status.enum';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';
@Injectable()
export class AuthService {
    constructor(
        private UserService: UserService,
        private JwtService: JwtService,
    ) { }

    async validateUser(
        loginUserDto: LoginUserDto,
        requestId: string,
        path: string,
    ): Promise<{ userId: number; email: string }> {
        const user = await this.UserService.findByEmail(loginUserDto.email);
      
        if (!user) {
            throw HttpExceptionHelper.notFound("user not found",requestId,path)
        }
      
        const passwordMatch = await bcrypt.compare(loginUserDto.password, user.password);
      
        if (!passwordMatch) {
            throw HttpExceptionHelper.unauthorized("password or email is incorrect",requestId,path)
        }
      
  return {
    userId: user.id,
    email: user.email,
  };
      }
      
      async authenticateUser(
        loginUserDto: LoginUserDto,
        requestId: string,
        path: string,

      ): Promise<LoginResponseDto> {
        const result = await this.validateUser(loginUserDto,requestId,path);
     
        const { userId, email } = result;
        const payload = { email, sub: userId };
        const accessToken = this.JwtService.sign(payload);
      
        return  new LoginResponseDto(
          { 
            accessToken,
            userId,
            email 
          }
        );
      }
      
      





  





}