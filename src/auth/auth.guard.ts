import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type PublicUser } from './auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { RequestProofService } from './request-proof.service.js';

export type AuthenticatedRequest = Request & { authUser: PublicUser; proofThumbprint: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokens: AuthTokenService, private readonly auth: AuthService, private readonly proofs: RequestProofService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization || authorization.length > 4096 || !/^Bearer [^\s]+$/.test(authorization)) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Silakan masuk terlebih dahulu.' });
    }
    const claims = this.tokens.verify(authorization.slice(7));
    const thumbprint = this.proofs.verify(request);
    if (claims.cnf.jkt !== thumbprint) {
      throw new UnauthorizedException({ code: 'SIGNATURE_INVALID', message: 'Signature permintaan tidak sesuai dengan sesi.' });
    }
    request.authUser = await this.auth.getActiveUser(claims);
    request.proofThumbprint = thumbprint;
    return true;
  }
}
