import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          this.logger.log(
            `${request.method} ${request.originalUrl} ${response.statusCode} - ${durationMs}ms`,
          );
        },
        error: () => {
          const durationMs = Date.now() - startTime;
          this.logger.warn(
            `${request.method} ${request.originalUrl} ${response.statusCode} - ${durationMs}ms`,
          );
        },
      }),
    );
  }
}
