import {
 ExceptionFilter,
 Catch,
 ArgumentsHost,
 HttpException,
 HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLoggerService } from 'src/logger/logger.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
 constructor(private readonly logger: CustomLoggerService) { }

 catch(exception: HttpException, host: ArgumentsHost) {
  const ctx = host.switchToHttp();
  const response = ctx.getResponse<Response>();
  const request = ctx.getRequest<Request>();
  const status = exception.getStatus();

  const errorResponse = exception.getResponse() as
   | string
   | { message: string | string[]; statusCode: number; error?: string };

  const errorMessage =
   typeof errorResponse === 'string'
    ? errorResponse
    : Array.isArray(errorResponse.message)
     ? errorResponse.message.join(', ')
     : errorResponse.message;

  const errorDetails = {
   statusCode: status,
   timestamp: new Date().toISOString(),
   path: request.url,
   method: request.method,
   message: errorMessage,
   ...(typeof errorResponse === 'object' && errorResponse.error && {
    error: errorResponse.error,
   }),
  };

  // Log error details
  this.logger.error(`HTTP Exception: ${errorMessage}`, JSON.stringify({
   statusCode: status,
   path: request.url,
   method: request.method,
   userAgent: request.get('User-Agent'),
   ip: request.ip,
   query: request.query,
   body: this.sanitizeBody(request.body),
  }));

  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  const responsePayload = isProduction && status >= 500
   ? {
    statusCode: status,
    timestamp: errorDetails.timestamp,
    path: errorDetails.path,
    message: 'Internal server error',
   }
   : errorDetails;

  response.status(status).json(responsePayload);
 }

 private sanitizeBody(body: any): any {
  if (!body) return body;

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...body };

  sensitiveFields.forEach(field => {
   if (sanitized[field]) {
    sanitized[field] = '[REDACTED]';
   }
  });

  return sanitized;
 }
}
