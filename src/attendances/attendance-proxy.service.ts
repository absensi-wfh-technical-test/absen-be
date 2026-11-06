import { HttpException, Injectable, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { AttendancePattern } from '../contracts/attendance.contract.js';

@Injectable()
export class AttendanceProxyService {
  private readonly logger = new Logger(AttendanceProxyService.name);
  constructor(@Inject('ATTENDANCE_CLIENT') private readonly client: ClientProxy) {}

  async send<T>(pattern: typeof AttendancePattern[keyof typeof AttendancePattern], payload: unknown): Promise<T> {
    const started = Date.now();
    const requestId = payload && typeof payload === 'object' && 'requestId' in payload ? String(payload.requestId) : 'unknown';
    try {
      const result = await firstValueFrom(this.client.send<T>(pattern, payload).pipe(timeout(3000)));
      this.logger.debug(`${pattern.cmd} requestId=${requestId} completed in ${Date.now() - started}ms`);
      return result;
    } catch (error) {
      this.logger.warn(`${pattern.cmd} requestId=${requestId} failed after ${Date.now() - started}ms`);
      if (error instanceof TimeoutError || (error && typeof error === 'object' && 'code' in error &&
        (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET'))) {
        throw new ServiceUnavailableException({ code: 'ATTENDANCE_SERVICE_UNAVAILABLE', message: 'Layanan absensi sementara tidak tersedia.' });
      }
      const detail = error && typeof error === 'object' ? error as Record<string, unknown> : {};
      const status = typeof detail.status === 'number' && detail.status >= 400 && detail.status < 500 ? detail.status : 503;
      const code = typeof detail.code === 'string' && /^[A-Z_]+$/.test(detail.code) ? detail.code : 'ATTENDANCE_SERVICE_UNAVAILABLE';
      const message = typeof detail.message === 'string' && status < 500 ? detail.message : 'Layanan absensi sementara tidak tersedia.';
      throw new HttpException({ code, message }, status);
    }
  }
}
