// src/types/request.ts

import { Request } from 'express';
import { UserResponseDto } from 'src/user/dto/user-response.dto';

export interface ExtendedRequest extends Request {
  id?: string;
  user?: UserResponseDto
}
