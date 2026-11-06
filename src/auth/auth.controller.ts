import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';
import { LoginRateLimitService } from './login-rate-limit.service.js';
import { RequestProofService } from './request-proof.service.js';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly rateLimit: LoginRateLimitService, private readonly proofs: RequestProofService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Req() request: Request) {
    const ip = request.ip ?? 'unknown';
    this.rateLimit.check(ip);
    const keyThumbprint = this.proofs.verify(request);
    const result = await this.auth.login(body, keyThumbprint);
    this.rateLimit.reset(ip);
    return result;
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.authUser;
  }

  // Stateless JWT: logout only confirms that the client should discard its token.
  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  logout(): void {}
}
