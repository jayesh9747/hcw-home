// Chayan Das <01chayandas@gmail.com>

import { Request } from 'express';
import { UserResponseDto } from 'src/user/dto/user-response.dto';

export interface ExtendedRequest extends Omit<Request, 'user'> {
  id?: string; // request ID, typically set by a middleware
  user?: UserResponseDto | null; // user information, can be null if not authenticated
  // Add any other properties , if you need to extend the Request object
}
