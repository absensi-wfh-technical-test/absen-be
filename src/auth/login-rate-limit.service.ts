import { HttpException, Injectable } from '@nestjs/common';

@Injectable()
export class LoginRateLimitService {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  check(ip: string): void {
    const now = Date.now();
    const current = this.attempts.get(ip);
    if (current && current.resetAt > now && current.count >= 5) {
      throw new HttpException({ code: 'LOGIN_RATE_LIMITED', message: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' }, 429);
    }
    if (!current || current.resetAt <= now) this.attempts.set(ip, { count: 1, resetAt: now + 15 * 60_000 });
    else current.count += 1;
  }

  reset(ip: string): void {
    this.attempts.delete(ip);
  }
}
