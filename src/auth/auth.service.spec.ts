import { describe, expect, it, vi } from 'vitest';
import { hash } from 'bcryptjs';
import { AuthService } from './auth.service.js';
import type { AuthTokenService } from './auth-token.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('AuthService', () => {
  async function setup(isActive = true, employeeActive = true) {
    const account = {
      id: 5, email: 'employee@example.test', passwordHash: await hash('correct-password', 4),
      isActive, role: { code: 'EMPLOYEE' }, employee: { id: 9, fullName: 'Demo Employee', isActive: employeeActive },
    };
    const findUnique = vi.fn().mockResolvedValue(account);
    const prisma = { user: { findUnique } } as unknown as PrismaService;
    const tokens = { sign: vi.fn().mockReturnValue('signed-token'), expiresIn: 1800 } as unknown as AuthTokenService;
    return { service: new AuthService(prisma, tokens), findUnique, tokens };
  }

  it('returns only public profile fields and token for an active employee', async () => {
    const { service, findUnique, tokens } = await setup();
    const result = await service.login({ email: ' EMPLOYEE@EXAMPLE.TEST ', password: 'correct-password' }, 'a'.repeat(43));
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'employee@example.test' } }));
    expect(result).toEqual({ accessToken: 'signed-token', expiresIn: 1800, user: {
      id: 5, email: 'employee@example.test', roleCode: 'EMPLOYEE', employeeId: 9, fullName: 'Demo Employee',
    } });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(tokens.sign).toHaveBeenCalledWith(5, 'EMPLOYEE', 'a'.repeat(43));
  });

  it('rejects wrong password and inactive account or profile', async () => {
    const wrong = await setup();
    await expect(wrong.service.login({ email: 'employee@example.test', password: 'wrong' }, 'a'.repeat(43))).rejects.toMatchObject({ status: 401 });
    const inactive = await setup(false);
    await expect(inactive.service.login({ email: 'employee@example.test', password: 'correct-password' }, 'a'.repeat(43))).rejects.toMatchObject({ status: 401 });
    const inactiveProfile = await setup(true, false);
    await expect(inactiveProfile.service.login({ email: 'employee@example.test', password: 'correct-password' }, 'a'.repeat(43))).rejects.toMatchObject({ status: 401 });
  });

  it('checks current active state for every protected request', async () => {
    const { service, findUnique } = await setup();
    const claims = { sub: 5, roleCode: 'EMPLOYEE' as const, cnf: { jkt: 'a'.repeat(43) }, iat: 1, exp: 2 };
    expect((await service.getActiveUser(claims)).employeeId).toBe(9);
    findUnique.mockResolvedValueOnce(null);
    await expect(service.getActiveUser(claims)).rejects.toMatchObject({ status: 401 });
  });
});
