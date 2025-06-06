import { ResponseStatus } from './response-status.enum';

export interface IApiResponse<T = any> {
  success: boolean;
  status: ResponseStatus;
  statusCode: number;
  message: string;
  data?: T;
  error?: any;
  timestamp: string;
  requestId?: string;
  path?: string;
}

export interface IPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  pagination: IPaginationMeta;
}
