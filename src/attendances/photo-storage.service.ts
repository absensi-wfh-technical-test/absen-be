import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
type Photo = { buffer: Buffer; mimetype?: string };

@Injectable()
export class PhotoStorageService {
  private readonly directory = resolve(process.env.PHOTO_STORAGE_DIR ?? '.private-photos');
  private readonly logger = new Logger(PhotoStorageService.name);

  validate(file: Photo | undefined): { ext: string; mime: string } {
    if (!file?.buffer?.length) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Pilih foto bukti WFH.' });
    if (file.buffer.length > MAX_PHOTO_SIZE) throw new HttpPhotoError(413, 'PHOTO_TOO_LARGE', 'Foto maksimal 5 MB.');
    const b = file.buffer;
    const jpeg = b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const png = b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
    const type = jpeg ? { ext: 'jpg', mime: 'image/jpeg' } : png ? { ext: 'png', mime: 'image/png' } : webp ? { ext: 'webp', mime: 'image/webp' } : null;
    if (!type || (file.mimetype && file.mimetype !== type.mime)) throw new HttpPhotoError(415, 'UNSUPPORTED_PHOTO_TYPE', 'Gunakan foto JPEG, PNG, atau WebP.');
    return type;
  }

  async save(file: Photo): Promise<string> {
    const { ext } = this.validate(file);
    await mkdir(this.directory, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    await writeFile(join(this.directory, name), file.buffer, { flag: 'wx' });
    return name;
  }

  async read(name: string): Promise<{ bytes: Buffer; mime: string }> {
    const mime = this.mime(name);
    try { return { bytes: await readFile(join(this.directory, name)), mime }; }
    catch { throw new NotFoundException({ code: 'NOT_FOUND', message: 'Foto belum dapat dimuat.' }); }
  }

  async remove(name: string): Promise<void> {
    this.mime(name);
    try { await unlink(join(this.directory, name)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') this.logger.error('Gagal membersihkan berkas foto; rekonsiliasi diperlukan.');
    }
  }

  private mime(name: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(name)) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Foto tidak ditemukan.' });
    }
    return name.endsWith('.jpg') ? 'image/jpeg' : name.endsWith('.png') ? 'image/png' : 'image/webp';
  }
}

import { HttpException } from '@nestjs/common';
class HttpPhotoError extends HttpException {
  constructor(status: number, code: string, message: string) { super({ code, message }, status); }
}
