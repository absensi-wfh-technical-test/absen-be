import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Employee } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';

type Input = Record<string, unknown>;
const bad = (message: string) => new BadRequestException({ code: 'VALIDATION_ERROR', message });
const isObject = (value: unknown): value is Input => !!value && typeof value === 'object' && !Array.isArray(value);
const str = (value: unknown, max: number, label: string) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw bad(`${label} wajib diisi (maksimal ${max} karakter).`);
  return value.trim();
};
const positiveId = (value: unknown, label: string) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw bad(`${label} tidak valid.`);
  return id;
};
const dateValue = (value: unknown) => {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw bad('Tanggal bergabung tidak valid.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw bad('Tanggal bergabung tidak valid.');
  return date;
};
const phoneValue = (value: unknown) => {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 20 || !/^[+\d\s()-]+$/.test(value)) throw bad('Nomor telepon tidak valid.');
  return value.trim();
};
const emailValue = (value: unknown) => {
  const email = str(value, 191, 'Email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('Email tidak valid.');
  return email;
};

const relation = { user: { select: { id: true, email: true, isActive: true } }, department: { select: { id: true, code: true, name: true } }, position: { select: { id: true, code: true, name: true } } } as const;

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async departments() { return this.prisma.department.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } }); }
  async positions() { return this.prisma.position.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } }); }

  async list(query: Input) {
    const page = query.page === undefined ? 1 : positiveId(query.page, 'Halaman');
    const pageSize = query.pageSize === undefined ? 10 : positiveId(query.pageSize, 'Ukuran halaman');
    if (pageSize > 50) throw bad('Ukuran halaman maksimal 50.');
    const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '';
    const status = query.status;
    if (status !== undefined && status !== 'active' && status !== 'inactive') throw bad('Filter status tidak valid.');
    const departmentId = query.departmentId === undefined ? undefined : positiveId(query.departmentId, 'Departemen');
    const where: Prisma.EmployeeWhereInput = {
      ...(search ? { OR: [{ fullName: { contains: search } }, { employeeCode: { contains: search } }, { user: { email: { contains: search } } }] } : {}),
      ...(status ? { isActive: status === 'active' } : {}),
      ...(departmentId ? { departmentId } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({ where, include: relation, orderBy: [{ fullName: 'asc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.employee.count({ where }),
    ]);
    return { data: rows.map(row => this.publicRow(row)), meta: { page, pageSize, total } };
  }

  async get(id: number) {
    const row = await this.prisma.employee.findUnique({ where: { id }, include: relation });
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Karyawan tidak ditemukan.' });
    return this.publicRow(row);
  }

  async create(body: unknown) {
    if (!isObject(body)) throw bad('Data karyawan tidak valid.');
    const employeeCode = str(body.employeeCode, 30, 'Kode karyawan').toUpperCase();
    const fullName = str(body.fullName, 150, 'Nama lengkap');
    const email = emailValue(body.email);
    const password = str(body.initialPassword, 72, 'Kata sandi awal');
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) throw bad('Kata sandi awal minimal 8 karakter dan maksimal 72 byte.');
    const departmentId = positiveId(body.departmentId, 'Departemen');
    const positionId = positiveId(body.positionId, 'Jabatan');
    await this.ensureMasters(departmentId, positionId);
    const role = await this.prisma.role.findUnique({ where: { code: 'EMPLOYEE' } });
    if (!role) throw bad('Role karyawan belum tersedia. Jalankan seed.');
    try {
      const row = await this.prisma.$transaction(async db => {
        const user = await db.user.create({ data: { email, passwordHash: await hash(password, 12), roleId: role.id } });
        return db.employee.create({ data: { userId: user.id, employeeCode, fullName, departmentId, positionId,
          phoneNumber: body.phoneNumber === undefined ? null : phoneValue(body.phoneNumber), hireDate: body.hireDate === undefined ? null : dateValue(body.hireDate) }, include: relation });
      });
      return this.publicRow(row);
    } catch (error) { throw this.mapConflict(error); }
  }

  async update(id: number, body: unknown) {
    if (!isObject(body)) throw bad('Data karyawan tidak valid.');
    const current = await this.get(id);
    const departmentId = body.departmentId === undefined ? current.department.id : positiveId(body.departmentId, 'Departemen');
    const positionId = body.positionId === undefined ? current.position.id : positiveId(body.positionId, 'Jabatan');
    await this.ensureMasters(departmentId, positionId);
    try {
      const row = await this.prisma.$transaction(async db => {
        if (body.email !== undefined) await db.user.update({ where: { id: current.user.id }, data: { email: emailValue(body.email) } });
        return db.employee.update({ where: { id }, data: {
          ...(body.employeeCode !== undefined ? { employeeCode: str(body.employeeCode, 30, 'Kode karyawan').toUpperCase() } : {}),
          ...(body.fullName !== undefined ? { fullName: str(body.fullName, 150, 'Nama lengkap') } : {}),
          departmentId, positionId,
          ...(body.phoneNumber !== undefined ? { phoneNumber: phoneValue(body.phoneNumber) } : {}),
          ...(body.hireDate !== undefined ? { hireDate: dateValue(body.hireDate) } : {}),
        }, include: relation });
      });
      return this.publicRow(row);
    } catch (error) { throw this.mapConflict(error); }
  }

  async setStatus(id: number, body: unknown) {
    if (!isObject(body) || typeof body.isActive !== 'boolean') throw bad('Status aktif tidak valid.');
    const current = await this.get(id);
    const row = await this.prisma.$transaction(async db => {
      await db.user.update({ where: { id: current.user.id }, data: { isActive: body.isActive as boolean } });
      return db.employee.update({ where: { id }, data: { isActive: body.isActive as boolean }, include: relation });
    });
    return this.publicRow(row);
  }

  private async ensureMasters(departmentId: number, positionId: number) {
    const [department, position] = await Promise.all([
      this.prisma.department.findFirst({ where: { id: departmentId, isActive: true } }),
      this.prisma.position.findFirst({ where: { id: positionId, isActive: true } }),
    ]);
    if (!department || !position) throw bad('Departemen atau jabatan tidak tersedia.');
  }

  private mapConflict(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      return new ConflictException({ code: target.includes('email') ? 'DUPLICATE_EMAIL' : 'DUPLICATE_EMPLOYEE_CODE', message: 'Email atau kode karyawan sudah digunakan.' });
    }
    return error;
  }

  private publicRow(row: Employee & { user: { id: number; email: string; isActive: boolean }; department: { id: number; code: string; name: string }; position: { id: number; code: string; name: string } }) {
    return { id: row.id, employeeCode: row.employeeCode, fullName: row.fullName, email: row.user.email,
      user: { id: row.user.id, isActive: row.user.isActive }, department: row.department, position: row.position,
      phoneNumber: row.phoneNumber, hireDate: row.hireDate?.toISOString().slice(0, 10) ?? null, isActive: row.isActive };
  }
}
