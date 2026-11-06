import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { LoginRateLimitService } from './login-rate-limit.service.js';
import { RequestProofService } from './request-proof.service.js';
import { PhotoAuthGuard } from './photo-auth.guard.js';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthGuard, PhotoAuthGuard, AuthService, AuthTokenService, LoginRateLimitService, RequestProofService],
  exports: [AuthGuard, PhotoAuthGuard, AuthService, AuthTokenService, RequestProofService],
})
export class AuthModule {}
