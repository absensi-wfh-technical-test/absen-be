import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AttendanceService, businessDate } from './attendance.service.js';

describe('attendance business rules', () => {
  it('changes business date at midnight Asia/Jakarta', () => {
    expect(businessDate(new Date('2026-11-06T16:59:59.999Z'))).toBe('2026-11-06');
    expect(businessDate(new Date('2026-11-06T17:00:00.000Z'))).toBe('2026-11-07');
  });

  it('does not let another employee replace the photo or delete the row', async () => {
    const row = { id: 4, employeeId: 8, attendanceDate: new Date(`${businessDate(new Date())}T00:00:00Z`), photoPath: 'old.jpg' };
    const updateMany = vi.fn(); const transaction = vi.fn();
    const db = { attendance: { findUnique: vi.fn().mockResolvedValue(row), updateMany, deleteMany: vi.fn() }, $transaction: transaction };
    const service = new AttendanceService(db as unknown as PrismaService);
    await expect(service.replacePhoto({ attendanceId: 4, employeeId: 9, photoPath: '00000000-0000-4000-8000-000000000000.jpg' })).rejects.toMatchObject({ error: expect.objectContaining({ code: 'FORBIDDEN' }) });
    expect(updateMany).not.toHaveBeenCalled();
    transaction.mockImplementation((fn: (client: typeof db) => unknown) => fn(db));
    await expect(service.deleteOwn({ attendanceId: 4, employeeId: 9 })).rejects.toMatchObject({ error: expect.objectContaining({ code: 'FORBIDDEN' }) });
    expect(db.attendance.deleteMany).not.toHaveBeenCalled();
  });

  it('keeps an old attendance immutable', async () => {
    const db = { attendance: { findUnique: vi.fn().mockResolvedValue({ id: 4, employeeId: 8, attendanceDate: new Date('2020-01-01T00:00:00Z'), photoPath: 'old.jpg' }), updateMany: vi.fn() } };
    const service = new AttendanceService(db as unknown as PrismaService);
    await expect(service.replacePhoto({ attendanceId: 4, employeeId: 8, photoPath: '00000000-0000-4000-8000-000000000000.jpg' })).rejects.toMatchObject({ error: expect.objectContaining({ code: 'ATTENDANCE_EDIT_WINDOW_CLOSED' }) });
    expect(db.attendance.updateMany).not.toHaveBeenCalled();
  });
});
