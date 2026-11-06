import { describe, expect, it } from 'vitest';
import { PhotoStorageService, MAX_PHOTO_SIZE } from './photo-storage.service.js';

describe('photo validation', () => {
  const storage = new PhotoStorageService();
  it('accepts photo bytes matching the declared type', () => {
    expect(storage.validate({ buffer: Buffer.from([0xff, 0xd8, 0xff, 0x01]), mimetype: 'image/jpeg' }).ext).toBe('jpg');
  });
  it('rejects an extension/MIME disguise and oversize input', () => {
    expect(() => storage.validate({ buffer: Buffer.from('not a jpeg'), mimetype: 'image/jpeg' })).toThrow();
    expect(() => storage.validate({ buffer: Buffer.alloc(MAX_PHOTO_SIZE + 1), mimetype: 'image/png' })).toThrow();
  });
});
