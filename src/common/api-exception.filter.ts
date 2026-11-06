import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const detail = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    const code = typeof detail.code === 'string' ? detail.code :
      status === 404 ? 'NOT_FOUND' : status === 429 ? 'LOGIN_RATE_LIMITED' :
      status === 400 ? 'VALIDATION_ERROR' : status === 401 ? 'UNAUTHENTICATED' :
      status === 403 ? 'FORBIDDEN' : status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
    const safeServiceMessage = code === 'ATTENDANCE_SERVICE_UNAVAILABLE' ? 'Layanan absensi sementara tidak tersedia. Coba beberapa saat lagi.' :
      code === 'SIGNATURE_CACHE_UNAVAILABLE' ? 'Permintaan belum dapat diverifikasi. Coba lagi.' : null;
    const message = safeServiceMessage ?? (typeof detail.message === 'string' && status < 500
      ? detail.message : status >= 500 ? 'Terjadi kendala. Coba lagi.' : 'Permintaan tidak dapat diproses.');
    const requestId = typeof request.headers['x-request-id'] === 'string' && /^[\w-]{1,64}$/.test(request.headers['x-request-id'])
      ? request.headers['x-request-id'] : randomUUID();
    if (status >= 500) this.logger.error(`${request.method} ${request.url} ${requestId}`);
    response.status(status).json({ error: { code, message, details: {} }, requestId });
  }
}
