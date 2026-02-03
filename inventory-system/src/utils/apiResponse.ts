import { Response } from 'express';

/**
 * Standardized API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Send success response with data
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  res.status(statusCode).json(response);
};

/**
 * Send success response with pagination
 */
export const sendSuccessWithPagination = <T>(
  res: Response,
  data: T,
  pagination: {
    total: number;
    page: number;
    limit: number;
  },
  message?: string
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
    ...(message && { message }),
  };
  res.status(200).json(response);
};

/**
 * Send error response
 * Note: This is a fallback. Prefer throwing AppError and letting errorHandler middleware handle it
 */
export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 500
): void => {
  const response: ApiResponse = {
    success: false,
    error,
  };
  res.status(statusCode).json(response);
};
