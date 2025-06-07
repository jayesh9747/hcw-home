// common/exceptions/http-exception.ts
import { HttpException } from '@nestjs/common';
import { ResponseStatus } from '../response/response-status.enum';

export class CustomHttpException extends HttpException {
  constructor(
    message: string,
    statusCode: number,
    error?: any,
    requestId?: string,
    path?: string,
  ) {
    super(
      {
        success: false,
        status: ResponseStatus.ERROR,
        statusCode,
        message,
        error,
        timestamp: new Date().toISOString(),
        requestId,
        path,
      },
      statusCode,
    );
  }
}
