import { ApiProperty } from '@nestjs/swagger';

export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export class ApiResponseDto<T> {
  @ApiProperty({ enum: ResponseStatus, example: ResponseStatus.SUCCESS })
  status: ResponseStatus;

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ required: false, example: { id: '123', name: 'Example' } })
  data?: T;

  @ApiProperty({ required: false })
  error?: any;

  @ApiProperty({ example: '2023-04-22T12:34:56.789Z' })
  timestamp: string;

  @ApiProperty({ example: 'req-123-abc-456' })
  requestId?: string;

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }

  static success<T>(
    data?: T,
    message = 'Operation completed successfully',
    statusCode = 200,
  ): ApiResponseDto<T> {
    return new ApiResponseDto<T>({
      status: ResponseStatus.SUCCESS,
      message,
      statusCode,
      data,
    });
  }

  static error<T>(
    message = 'An error occurred',
    statusCode = 500,
    error?: any,
  ): ApiResponseDto<T> {
    return new ApiResponseDto<T>({
      status: ResponseStatus.ERROR,
      message,
      statusCode,
      error,
    });
  }

  static warning<T>(
    message: string,
    data?: T,
    statusCode = 200,
  ): ApiResponseDto<T> {
    return new ApiResponseDto<T>({
      status: ResponseStatus.WARNING,
      message,
      statusCode,
      data,
    });
  }

  static info<T>(
    message: string,
    data?: T,
    statusCode = 200,
  ): ApiResponseDto<T> {
    return new ApiResponseDto<T>({
      status: ResponseStatus.INFO,
      message,
      statusCode,
      data,
    });
  }
}

export class PaginatedApiResponseDto<T> extends ApiResponseDto<T[]> {
  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;

  static paginatedSuccess<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Items retrieved successfully',
  ): PaginatedApiResponseDto<T> {
    const response = new PaginatedApiResponseDto<T>({
      status: ResponseStatus.SUCCESS,
      message,
      statusCode: 200,
      data,
    });

    response.total = total;
    response.page = page;
    response.limit = limit;
    response.totalPages = Math.ceil(total / limit);

    return response;
  }
}
