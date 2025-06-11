import { ApiResponseDto, PaginatedApiResponseDto } from './api-response.dto';
import { ResponseStatus } from './response-status.enum';

export const ResponseHelpers = {
  successResponse: <T>(data: T, message?: string, statusCode?: number) =>
    ApiResponseDto.success(data, message, statusCode),
  createdResponse: <T>(data: T, message?: string) =>
    ApiResponseDto.created(data, message),
  badRequestResponse: (message?: string, error?: any) =>
    ApiResponseDto.badRequest(message, error),
  unauthorizedResponse: (message?: string, error?: any) =>
    ApiResponseDto.unauthorized(message, error),
  forbiddenResponse: (message?: string, error?: any) =>
    ApiResponseDto.forbidden(message, error),
  notFoundResponse: (message?: string, error?: any) =>
    ApiResponseDto.notFound(message, error),
  conflictResponse: (message?: string, error?: any) =>
    ApiResponseDto.conflict(message, error),
  validationErrorResponse: (
    errors: Record<string, string[]>,
    message?: string,
  ) => ApiResponseDto.validationError(errors, message),
  errorResponse: (message?: string, error?: any, statusCode?: number) =>
    ApiResponseDto.error(message, statusCode, error),
};

export const ResponseTypeGuards = {
  isSuccessResponse: <T>(response: ApiResponseDto<T>): boolean =>
    response.success && response.status === ResponseStatus.SUCCESS,
  isErrorResponse: <T>(response: ApiResponseDto<T>): boolean =>
    !response.success && response.status === ResponseStatus.ERROR,
  isPaginatedResponse: <T>(
    response: any,
  ): response is PaginatedApiResponseDto<T> =>
    response && typeof response.pagination === 'object',
};

export const HttpStatusCodes = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export class ResponseBuilder<T> {
  private response: Partial<ApiResponseDto<T>> = {};

  static create<T>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>();
  }

  withData(data: T): ResponseBuilder<T> {
    this.response.data = data;
    return this;
  }

  withMessage(message: string): ResponseBuilder<T> {
    this.response.message = message;
    return this;
  }

  withStatus(status: ResponseStatus): ResponseBuilder<T> {
    this.response.status = status;
    return this;
  }

  withStatusCode(statusCode: number): ResponseBuilder<T> {
    this.response.statusCode = statusCode;
    return this;
  }

  withError(error: any): ResponseBuilder<T> {
    this.response.error = error;
    return this;
  }

  withRequestId(requestId: string): ResponseBuilder<T> {
    this.response.requestId = requestId;
    return this;
  }

  withPath(path: string): ResponseBuilder<T> {
    this.response.path = path;
    return this;
  }

  build(): ApiResponseDto<T> {
    if (!this.response.status) this.response.status = ResponseStatus.SUCCESS;
    if (!this.response.statusCode) this.response.statusCode = 200;
    if (!this.response.message)
      this.response.message = 'Operation completed successfully';
    return new ApiResponseDto<T>(this.response);
  }
}
