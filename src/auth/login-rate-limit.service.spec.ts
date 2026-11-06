import { describe, expect, it, vi } from 'vitest';
import { LoginRateLimitService } from './login-rate-limit.service.js';

describe('LoginRateLimitService', () => {
  it('limits repeated attempts per IP and allows retry after the window', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-06T08:00:00Z'));
      const limiter = new LoginRateLimitService();
      for (let attempt = 0; attempt < 5; attempt += 1) limiter.check('127.0.0.1');
      expect(() => limiter.check('127.0.0.1')).toThrow();
      expect(() => limiter.check('127.0.0.2')).not.toThrow();
      vi.setSystemTime(new Date('2026-11-06T08:15:00Z'));
      expect(() => limiter.check('127.0.0.1')).not.toThrow();
    } finally { vi.useRealTimers(); }
  });
});
