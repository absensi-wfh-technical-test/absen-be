import { BadRequestException, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { PhotoAuthGuard } from '../auth/photo-auth.guard.js';
import { RequestProofService } from '../auth/request-proof.service.js';
import { AdminGuard, EmployeeGuard } from '../common/role.guard.js';
import { AttendancePattern, type AttendanceRecord } from '../contracts/attendance.contract.js';
import { AttendanceProxyService } from './attendance-proxy.service.js';
import { MAX_PHOTO_SIZE, PhotoStorageService } from './photo-storage.service.js';

type Upload = { buffer: Buffer; mimetype: string };
const fileOptions = { limits: { fileSize: MAX_PHOTO_SIZE, files: 1, fields: 0, parts: 1 } };
const numberId = (raw: string) => {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'ID tidak valid.' });
  return id;
};
const queryValues = (query: Record<string, unknown>) => {
  const result: Record<string, unknown> = {};
  for (const key of ['page', 'pageSize', 'employeeId', 'departmentId']) if (query[key] !== undefined) result[key] = Number(query[key]);
  for (const key of ['from', 'to', 'search']) if (query[key] !== undefined) result[key] = query[key];
  return result;
};
const publicRecord = (record: AttendanceRecord) => {
  const { photoPath: _path, ...safe } = record;
  void _path;
  return { ...safe, photoAvailable: true };
};

@Controller('api/attendances')
export class AttendancesController {
  constructor(private readonly proxy: AttendanceProxyService, private readonly storage: PhotoStorageService, private readonly proofs: RequestProofService) {}

  private verifyPhoto(request: AuthenticatedRequest, file?: Upload) {
    this.storage.validate(file);
    const thumbprint = this.proofs.verify(request, file!.buffer);
    if (thumbprint !== request.proofThumbprint) throw new UnauthorizedException({ code: 'SIGNATURE_INVALID', message: 'Signature permintaan tidak sesuai dengan sesi.' });
  }

  @Get('me/today') @UseGuards(AuthGuard, EmployeeGuard)
  async today(@Req() req: AuthenticatedRequest) {
    const row = await this.proxy.send<AttendanceRecord | null>(AttendancePattern.today, { employeeId: req.authUser.employeeId, requestId: randomUUID() });
    return row ? publicRecord(row) : null;
  }

  @Get('me') @UseGuards(AuthGuard, EmployeeGuard)
  async mine(@Req() req: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    const list = await this.proxy.send<{ data: AttendanceRecord[]; meta: unknown }>(AttendancePattern.listByEmployee,
      { ...queryValues(query), employeeId: req.authUser.employeeId, requestId: randomUUID() });
    return { data: list.data.map(publicRecord), meta: list.meta };
  }

  @Get() @UseGuards(AuthGuard, AdminGuard)
  async list(@Query() query: Record<string, unknown>) {
    const list = await this.proxy.send<{ data: AttendanceRecord[]; meta: unknown }>(AttendancePattern.list,
      { ...queryValues(query), requestId: randomUUID() });
    return { data: list.data.map(publicRecord), meta: list.meta };
  }

  @Post() @UseGuards(PhotoAuthGuard, EmployeeGuard) @UseInterceptors(FileInterceptor('photo', fileOptions))
  async create(@Req() req: AuthenticatedRequest, @UploadedFile() file?: Upload) {
    this.verifyPhoto(req, file);
    const photoPath = await this.storage.save(file!);
    try {
      const row = await this.proxy.send<AttendanceRecord>(AttendancePattern.create, { employeeId: req.authUser.employeeId, photoPath, requestId: randomUUID() });
      return publicRecord(row);
    } catch (error) {
      if (!(error instanceof Error && 'status' in error && error.status === 503)) await this.storage.remove(photoPath);
      throw error;
    }
  }

  @Get(':id/photo') @UseGuards(AuthGuard)
  async photo(@Param('id') raw: string, @Req() req: AuthenticatedRequest, @Res() res: Response) {
    const row = await this.detailRecord(numberId(raw), req);
    const file = await this.storage.read(row.photoPath);
    res.setHeader('Cache-Control', 'private, no-store');
    res.type(file.mime).send(file.bytes);
  }

  @Get(':id') @UseGuards(AuthGuard)
  async detail(@Param('id') raw: string, @Req() req: AuthenticatedRequest) {
    return publicRecord(await this.detailRecord(numberId(raw), req));
  }

  @Patch(':id/photo') @UseGuards(PhotoAuthGuard, EmployeeGuard) @UseInterceptors(FileInterceptor('photo', fileOptions))
  async replace(@Param('id') raw: string, @Req() req: AuthenticatedRequest, @UploadedFile() file?: Upload) {
    this.verifyPhoto(req, file);
    const attendanceId = numberId(raw);
    const photoPath = await this.storage.save(file!);
    try {
      const result = await this.proxy.send<{ record: AttendanceRecord; previousPhotoPath: string }>(AttendancePattern.replacePhoto,
        { attendanceId, employeeId: req.authUser.employeeId, photoPath, requestId: randomUUID() });
      await this.storage.remove(result.previousPhotoPath);
      return publicRecord(result.record);
    } catch (error) {
      if (!(error instanceof Error && 'status' in error && error.status === 503)) await this.storage.remove(photoPath);
      throw error;
    }
  }

  @Delete(':id') @UseGuards(AuthGuard, EmployeeGuard) @HttpCode(204)
  async delete(@Param('id') raw: string, @Req() req: AuthenticatedRequest) {
    const result = await this.proxy.send<{ previousPhotoPath: string }>(AttendancePattern.deleteOwn,
      { attendanceId: numberId(raw), employeeId: req.authUser.employeeId, requestId: randomUUID() });
    await this.storage.remove(result.previousPhotoPath);
  }

  private detailRecord(attendanceId: number, req: AuthenticatedRequest) {
    return this.proxy.send<AttendanceRecord>(AttendancePattern.getById,
      { attendanceId, ...(req.authUser.roleCode === 'EMPLOYEE' ? { employeeId: req.authUser.employeeId } : {}), requestId: randomUUID() });
  }
}
