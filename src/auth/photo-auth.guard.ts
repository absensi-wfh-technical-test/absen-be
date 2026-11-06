import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import type { AuthenticatedRequest } from './auth.guard.js';

// Multipart is parsed after guards. Its file digest is verified in the controller
// before any storage or TCP side effect.
@Injectable()
export class PhotoAuthGuard implements CanActivate {
  constructor(private readonly tokens: AuthTokenService, private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header || header.length > 4096 || !/^Bearer [^\s]+$/.test(header)) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Silakan masuk terlebih dahulu.' });
    }
    const claims = this.tokens.verify(header.slice(7));
    request.authUser = await this.auth.getActiveUser(claims);
    request.proofThumbprint = claims.cnf.jkt;
    return true;
  }
}
