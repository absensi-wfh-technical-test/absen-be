import { afterEach, describe, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenService } from './auth-token.service.js';

describe('AuthTokenService', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('rejects an expired JWT even when its signature and claims are otherwise valid', () => {
    const secret = 'test-only-jwt-secret-with-at-least-32-bytes';
    vi.stubEnv('JWT_SECRET', secret);
    const jwt = new JwtService();
    const tokens = new AuthTokenService(jwt);
    const expired = jwt.sign({ sub: 7, roleCode: 'EMPLOYEE', cnf: { jkt: 'a'.repeat(43) } },
      { secret, algorithm: 'HS256', expiresIn: -1 });
    expect(() => tokens.verify(expired)).toThrowError(expect.objectContaining({ status: 401 }));
  });
});
