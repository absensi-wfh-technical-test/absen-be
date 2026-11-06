import { Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Prisma, type Attendance } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AttendanceQuery, AttendanceRecord } from '../contracts/attendance.contract.js';

type Payload = Record<string, unknown>;
const rpc = (status: number, code: string, message: string): never => { throw new RpcException({ status, code, message }); };
const object = (value: unknown): Payload => value && typeof value === 'object' && !Array.isArray(value) ? value as Payload : rpc(400, 'VALIDATION_ERROR', 'Payload attendance tidak valid.');
const id = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : rpc(400, 'VALIDATION_ERROR', 'ID tidak valid.');
const path = (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(value) ? value : rpc(400, 'VALIDATION_ERROR', 'Referensi foto tidak valid.');
const date = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value ? parsed : undefined;
};

export function businessDate(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const include = { employee: { select: { employeeCode: true, fullName: true,
  department: { select: { id: true, name: true } }, position: { select: { id: true, name: true } } } } } as const;

@Injectable()
export class AttendanceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: unknown) {
    const p = object(input); const employeeId = id(p.employeeId); const photoPath = path(p.photoPath);
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, include: { user: true } });
    if (!employee?.isActive || !employee.user.isActive) rpc(403, 'FORBIDDEN', 'Akun karyawan tidak aktif.');
    const instant = new Date(); const today = new Date(`${businessDate(instant)}T00:00:00.000Z`);
    try {
      const row = await this.prisma.attendance.create({ data: { employeeId, photoPath, attendanceDate: today, checkInAt: instant }, include });
      return this.toRecord(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') rpc(409, 'ATTENDANCE_ALREADY_EXISTS', 'Anda sudah absen hari ini.');
      throw error;
    }
  }

  async today(input: unknown) {
    const p = object(input); const employeeId = id(p.employeeId);
    const row = await this.prisma.attendance.findUnique({ where: { employeeId_attendanceDate: { employeeId,
      attendanceDate: new Date(`${businessDate(new Date())}T00:00:00.000Z`) } }, include });
    return row ? this.toRecord(row) : null;
  }

  async listByEmployee(input: unknown) {
    const p = object(input); const employeeId = id(p.employeeId);
    const q = this.query(p);
    return this.page({ employeeId, ...(q.from || q.to ? { attendanceDate: {
      ...(q.from ? { gte: date(q.from) } : {}), ...(q.to ? { lte: date(q.to) } : {}),
    } } : {}) }, q);
  }

  async list(input: unknown) {
    const p = object(input); const q = this.query(p);
    const where: Prisma.AttendanceWhereInput = {
      ...(q.from || q.to ? { attendanceDate: { ...(q.from ? { gte: date(q.from) } : {}), ...(q.to ? { lte: date(q.to) } : {}) } } : {}),
      ...(q.employeeId ? { employeeId: q.employeeId } : {}),
      ...(q.departmentId || q.search ? { employee: {
        ...(q.departmentId ? { departmentId: q.departmentId } : {}),
        ...(q.search ? { OR: [{ fullName: { contains: q.search } }, { employeeCode: { contains: q.search } }] } : {}),
      } } : {}),
    };
    return this.page(where, q);
  }

  async getById(input: unknown) {
    const p = object(input); const attendanceId = id(p.attendanceId);
    const row = await this.prisma.attendance.findUnique({ where: { id: attendanceId }, include });
    if (!row) throw new RpcException({ status: 404, code: 'NOT_FOUND', message: 'Absensi tidak ditemukan.' });
    if (p.employeeId !== undefined && row.employeeId !== id(p.employeeId)) rpc(403, 'FORBIDDEN', 'Anda tidak memiliki akses.');
    return this.toRecord(row);
  }

  async replacePhoto(input: unknown) {
    const p = object(input); const attendanceId = id(p.attendanceId); const employeeId = id(p.employeeId); const photoPath = path(p.photoPath);
    const row = await this.ownToday(attendanceId, employeeId);
    const updated = await this.prisma.attendance.updateMany({ where: { id: attendanceId, employeeId, photoPath: row.photoPath,
      attendanceDate: new Date(`${businessDate(new Date())}T00:00:00.000Z`) }, data: { photoPath } });
    if (updated.count !== 1) rpc(409, 'ATTENDANCE_CHANGED', 'Absensi berubah. Muat ulang sebelum mencoba lagi.');
    const current = await this.prisma.attendance.findUniqueOrThrow({ where: { id: attendanceId }, include });
    return { record: this.toRecord(current), previousPhotoPath: row.photoPath };
  }

  async deleteOwn(input: unknown) {
    const p = object(input); const attendanceId = id(p.attendanceId); const employeeId = id(p.employeeId);
    return this.prisma.$transaction(async db => {
      const row = await db.attendance.findUnique({ where: { id: attendanceId } });
      if (!row) throw new RpcException({ status: 404, code: 'NOT_FOUND', message: 'Absensi tidak ditemukan.' });
      if (row.employeeId !== employeeId) rpc(403, 'FORBIDDEN', 'Anda tidak memiliki akses.');
      if (row.attendanceDate.toISOString().slice(0, 10) !== businessDate(new Date())) rpc(409, 'ATTENDANCE_EDIT_WINDOW_CLOSED', 'Absensi hari lampau tidak dapat diubah.');
      const deleted = await db.attendance.deleteMany({ where: { id: attendanceId, employeeId, photoPath: row.photoPath } });
      if (deleted.count !== 1) rpc(409, 'ATTENDANCE_CHANGED', 'Absensi berubah. Muat ulang sebelum mencoba lagi.');
      return { previousPhotoPath: row.photoPath };
    });
  }

  private async ownToday(attendanceId: number, employeeId: number): Promise<Attendance> {
    const row = await this.prisma.attendance.findUnique({ where: { id: attendanceId } });
    if (!row) throw new RpcException({ status: 404, code: 'NOT_FOUND', message: 'Absensi tidak ditemukan.' });
    if (row.employeeId !== employeeId) rpc(403, 'FORBIDDEN', 'Anda tidak memiliki akses.');
    if (row.attendanceDate.toISOString().slice(0, 10) !== businessDate(new Date())) rpc(409, 'ATTENDANCE_EDIT_WINDOW_CLOSED', 'Absensi hari lampau tidak dapat diubah.');
    return row;
  }

  private query(p: Payload): AttendanceQuery {
    const page = p.page === undefined ? 1 : id(p.page);
    const pageSize = p.pageSize === undefined ? 10 : id(p.pageSize);
    if (pageSize > 50) rpc(400, 'VALIDATION_ERROR', 'Ukuran halaman maksimal 50.');
    for (const value of [p.from, p.to]) if (value !== undefined && !date(value)) rpc(400, 'VALIDATION_ERROR', 'Tanggal filter tidak valid.');
    if (p.from && p.to && String(p.from) > String(p.to)) rpc(400, 'VALIDATION_ERROR', 'Rentang tanggal tidak valid.');
    return { page, pageSize, ...(p.from ? { from: String(p.from) } : {}), ...(p.to ? { to: String(p.to) } : {}),
      ...(p.employeeId ? { employeeId: id(p.employeeId) } : {}), ...(p.departmentId ? { departmentId: id(p.departmentId) } : {}),
      ...(typeof p.search === 'string' ? { search: p.search.slice(0, 100) } : {}) };
  }

  private async page(where: Prisma.AttendanceWhereInput, q: AttendanceQuery) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({ where, include, orderBy: [{ checkInAt: 'desc' }, { id: 'desc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.attendance.count({ where }),
    ]);
    return { data: rows.map(row => this.toRecord(row)), meta: { page: q.page, pageSize: q.pageSize, total } };
  }

  private toRecord(row: Attendance & { employee: { employeeCode: string; fullName: string; department: { id: number; name: string }; position: { id: number; name: string } } }): AttendanceRecord {
    return { id: row.id, employeeId: row.employeeId, attendanceDate: row.attendanceDate.toISOString().slice(0, 10),
      checkInAt: row.checkInAt.toISOString(), photoPath: row.photoPath, employee: row.employee };
  }
}
