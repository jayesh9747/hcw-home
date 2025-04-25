// src/common/interceptors/api-response.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponseDto, ResponseStatus } from '../dto/api-response.dto';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();

    // Add requestId to request object for logging
    request['requestId'] = requestId;

    return next.handle().pipe(
      map((data) => {
        // If response is already an ApiResponseDto, just add the requestId
        if (data instanceof ApiResponseDto) {
          data.requestId = requestId;
          return data;
        }

        // Otherwise wrap the response in an ApiResponseDto
        return ApiResponseDto.success(
          data,
          'Operation completed successfully',
          HttpStatus.OK,
        );
      }),
      catchError((error) => {
        // Handle HttpExceptions
        if (error instanceof HttpException) {
          const response = error.getResponse();
          const statusCode = error.getStatus();

          let message = 'An error occurred';
          let errorDetails = null;

          if (typeof response === 'string') {
            message = response;
          } else if (typeof response === 'object') {
            message = response['message'] || message;
            errorDetails = response['error'] || response;
          }

          const errorResponse = ApiResponseDto.error(
            message,
            statusCode,
            errorDetails,
          );

          errorResponse.requestId = requestId;
          return throwError(() => new HttpException(errorResponse, statusCode));
        }

        // Handle unknown errors
        const errorResponse = ApiResponseDto.error(
          'Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR,
          error.message,
        );

        errorResponse.requestId = requestId;
        return throwError(
          () =>
            new HttpException(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR),
        );
      }),
    );
  }
}
