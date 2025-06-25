export interface ErrorResponseDto {
  error: {
    message: string;
    code?: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}
