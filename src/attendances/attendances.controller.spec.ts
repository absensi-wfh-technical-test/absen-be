import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import type { RequestProofService } from '../auth/request-proof.service.js';
import type { AttendanceProxyService } from './attendance-proxy.service.js';
import type { PhotoStorageService } from './photo-storage.service.js';
import { AttendancesController } from './attendances.controller.js';

const file = { buffer: Buffer.from('photo'), mimetype: 'image/png' };
const request = { authUser: { employeeId: 7 }, proofThumbprint: 'bound-key' } as AuthenticatedRequest;
const record = { id: 11, employeeId: 7, attendanceDate: '2026-11-06', checkInAt: '2026-11-06T01:00:00.000Z', photoPath: 'photo.png' };

function fixture(send: ReturnType<typeof vi.fn>) {
  const storage = { validate: vi.fn(), save: vi.fn().mockResolvedValue('new.png'), remove: vi.fn() };
  const proofs = { verify: vi.fn().mockReturnValue('bound-key') };
  const controller = new AttendancesController(
    { send } as unknown as AttendanceProxyService,
    storage as unknown as PhotoStorageService,
    proofs as unknown as RequestProofService,
  );
  return { controller, storage };
}

describe('attendance photo compensation', () => {
  it('keeps a new photo after uncertain TCP failure because the row may already reference it', async () => {
    const send = vi.fn().mockRejectedValueOnce(new ServiceUnavailableException()).mockResolvedValueOnce(record);
    const { controller, storage } = fixture(send);
    await expect(controller.create(request, file)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(storage.remove).not.toHaveBeenCalled();
    await expect(controller.today(request)).resolves.toMatchObject({ id: 11, photoAvailable: true });
  });

  it('removes a new photo when the domain operation definitely rejects it', async () => {
    const send = vi.fn().mockRejectedValue(new ConflictException());
    const { controller, storage } = fixture(send);
    await expect(controller.create(request, file)).rejects.toBeInstanceOf(ConflictException);
    expect(storage.remove).toHaveBeenCalledWith('new.png');
  });

  it('keeps the replacement photo after uncertain TCP failure', async () => {
    const send = vi.fn().mockRejectedValue(new ServiceUnavailableException());
    const { controller, storage } = fixture(send);
    await expect(controller.replace('11', request, file)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
