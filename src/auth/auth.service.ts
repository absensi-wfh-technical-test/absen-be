import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { compare, hash } from 'bcryptjs';
import { AuthTokenService, type AccessClaims } from './auth-token.service.js';

const INVALID_CREDENTIALS = 'Kredensial tidak sesuai, atau akun tidak aktif.';
type RoleCode = AccessClaims['roleCode'];

export interface PublicUser {
  id: number;
  email: string;
  roleCode: RoleCode;
  employeeId?: number;
  fullName?: string;
}

@Injectable()
export class AuthService {
  private readonly dummyHash = hash('not-a-real-password', 12);

  constructor(private readonly prisma: PrismaService, private readonly tokens: AuthTokenService) {}

  async login(body: unknown, keyThumbprint: string): Promise<{ accessToken: string; expiresIn: number; user: PublicUser }> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw this.validationError();
    }
    const input = body as Record<string, unknown>;
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = input.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191 ||
      typeof password !== 'string' || password.length === 0 || Buffer.byteLength(password, 'utf8') > 72) {
      throw this.validationError();
    }

    const account = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true, employee: true },
    });
    const matches = await compare(password, account?.passwordHash ?? await this.dummyHash);
    const roleCode = account?.role.code;
    if (!matches || !account?.isActive || (roleCode !== 'ADMIN' && roleCode !== 'EMPLOYEE') ||
      (roleCode === 'EMPLOYEE' && (!account.employee || !account.employee.isActive))) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: INVALID_CREDENTIALS });
    }

    const user = this.toPublicUser(account, roleCode);
    return { accessToken: this.tokens.sign(account.id, roleCode, keyThumbprint), expiresIn: this.tokens.expiresIn, user };
  }

  async getActiveUser(claims: AccessClaims): Promise<PublicUser> {
    const account = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      include: { role: true, employee: true },
    });
    if (!account?.isActive || account.role.code !== claims.roleCode ||
      (claims.roleCode === 'EMPLOYEE' && (!account.employee || !account.employee.isActive))) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Sesi tidak valid atau telah berakhir.' });
    }
    return this.toPublicUser(account, claims.roleCode);
  }

  private toPublicUser(account: { id: number; email: string; employee: { id: number; fullName: string } | null }, roleCode: RoleCode): PublicUser {
    return {
      id: account.id,
      email: account.email,
      roleCode,
      ...(roleCode === 'EMPLOYEE' && account.employee
        ? { employeeId: account.employee.id, fullName: account.employee.fullName }
        : {}),
    };
  }

  private validationError(): BadRequestException {
    return new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Masukkan email yang valid dan kata sandi.' });
  }
}
