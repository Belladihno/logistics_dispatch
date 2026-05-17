import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

const TOO_MANY_REQUESTS_STATUS_CODE = 429;

interface ErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  code?: string;
  retryAfter?: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : typeof exceptionResponse === 'object' &&
            exceptionResponse !== null &&
            'message' in exceptionResponse
          ? (exceptionResponse.message as string | string[])
          : 'Internal server error';

    const responseBody: ErrorResponseBody = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    if (statusCode === TOO_MANY_REQUESTS_STATUS_CODE) {
      responseBody.code = 'RATE_LIMITED';

      const retryAfterHeader = response.getHeader('Retry-After');
      const retryAfter = normalizeRetryAfterSeconds(retryAfterHeader);

      if (retryAfter !== undefined) {
        responseBody.retryAfter = retryAfter;
      }
    }

    response.status(statusCode).json(responseBody);
  }
}

const normalizeRetryAfterSeconds = (
  value: string | number | string[] | undefined,
): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.ceil(value);
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.ceil(parsed);
    }
  }

  if (Array.isArray(value) && value.length > 0) {
    const parsed = Number(value[0]);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.ceil(parsed);
    }
  }

  return undefined;
};
