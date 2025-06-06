import { ApiResponseDto, PaginatedApiResponseDto } from './api-response.dto';

export const attachResponseHelpers = (req: any, res: any, next: any) => {
  res.success = <T>(data?: T, message?: string, statusCode?: number) => {
    const response = ApiResponseDto.success(data, message, statusCode, {
      requestId: req.id,
      path: req.path,
    });
    return res.status(response.statusCode).json(response);
  };

  res.error = <T>(message?: string, statusCode?: number, error?: any) => {
    const response = ApiResponseDto.error(message, statusCode, error, {
      requestId: req.id,
      path: req.path,
    });
    return res.status(response.statusCode).json(response);
  };

  res.paginated = <T>(data: T[], total: number, page: number, limit: number, message?: string) => {
    const response = PaginatedApiResponseDto.paginatedSuccess(data, total, page, limit, message, {
      requestId: req.id,
      path: req.path,
    });
    return res.status(response.statusCode).json(response);
  };

  next();
};
