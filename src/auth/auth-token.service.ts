import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AccessClaims {
  sub: number;
  roleCode: 'ADMIN' | 'EMPLOYEE';
  cnf: { jkt: string };
  iat: number;
  exp: number;
}

const EXPIRES_IN_SECONDS = 30 * 60;

@Injectable()
export class AuthTokenService {
  private readonly secret: string;

  constructor(private readonly jwt: JwtService) {
    const secret = process.env.JWT_SECRET;
    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
      throw new Error('JWT_SECRET must contain at least 32 bytes.');
    }
    this.secret = secret;
  }

  get expiresIn(): number {
    return EXPIRES_IN_SECONDS;
  }

  sign(userId: number, roleCode: AccessClaims['roleCode'], keyThumbprint: string): string {
    return this.jwt.sign({ sub: userId, roleCode, cnf: { jkt: keyThumbprint } }, {
      secret: this.secret,
      expiresIn: EXPIRES_IN_SECONDS,
      algorithm: 'HS256',
    });
  }

  verify(token: string): AccessClaims {
    try {
      const claims = this.jwt.verify<AccessClaims>(token, {
        secret: this.secret,
        algorithms: ['HS256'],
      });
      if (!Number.isSafeInteger(claims.sub) || claims.sub < 1 ||
        (claims.roleCode !== 'ADMIN' && claims.roleCode !== 'EMPLOYEE') ||
        typeof claims.cnf?.jkt !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(claims.cnf.jkt) ||
        !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
        claims.iat > Math.floor(Date.now() / 1000)) {
        throw new Error('Invalid claims');
      }
      return claims;
    } catch {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Sesi tidak valid atau telah berakhir.' });
    }
  }
}
