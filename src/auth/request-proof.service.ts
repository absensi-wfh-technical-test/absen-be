import { Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { createHash, createPublicKey, verify as verifySignature, type JsonWebKey } from 'node:crypto';
import type { Request } from 'express';

type ProofRequest = Request & { rawBody?: Buffer };
const MAX_SKEW_MS = 120_000;
const MAX_NONCES = 10_000;

@Injectable()
export class RequestProofService {
  private readonly usedNonces = new Map<string, number>();

  verify(request: ProofRequest, photoBytes?: Buffer): string {
    const timestamp = this.header(request, 'x-request-timestamp', 16);
    const nonce = this.header(request, 'x-request-nonce', 64);
    const encodedKey = this.header(request, 'x-request-key', 2048);
    const encodedSignature = this.header(request, 'x-request-signature', 128);

    if (!/^\d{13}$/.test(timestamp) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce)) {
      throw this.invalid();
    }
    const now = Date.now();
    if (Math.abs(now - Number(timestamp)) > MAX_SKEW_MS) {
      throw new UnauthorizedException({ code: 'SIGNATURE_EXPIRED', message: 'Waktu permintaan tidak valid. Periksa jam perangkat lalu coba lagi.' });
    }

    let jwk: Record<string, unknown>;
    try {
      jwk = JSON.parse(Buffer.from(encodedKey, 'base64url').toString('utf8')) as Record<string, unknown>;
    } catch { throw this.invalid(); }
    if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256' ||
      typeof jwk.x !== 'string' || typeof jwk.y !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(jwk.x) || !/^[A-Za-z0-9_-]{43}$/.test(jwk.y) ||
      'd' in jwk || !/^[A-Za-z0-9_-]+$/.test(encodedKey) || !/^[A-Za-z0-9_-]+$/.test(encodedSignature)) {
      throw this.invalid();
    }

    const body = photoBytes ?? request.rawBody ?? Buffer.alloc(0);
    const bodyHash = createHash('sha256').update(body).digest('base64url');
    const target = request.originalUrl;
    const version = photoBytes === undefined ? 'v1' : 'v2';
    const base = `${version}\n${request.method.toUpperCase()}\n${target}\n${timestamp}\n${nonce}\n${bodyHash}`;
    const signature = Buffer.from(encodedSignature, 'base64url');
    if (signature.length !== 64) throw this.invalid();

    try {
      const key = createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' });
      if (!verifySignature('sha256', Buffer.from(base, 'utf8'), { key, dsaEncoding: 'ieee-p1363' }, signature)) {
        throw this.invalid();
      }
    } catch { throw this.invalid(); }

    const thumbprint = createHash('sha256').update(JSON.stringify({ crv: 'P-256', kty: 'EC', x: jwk.x, y: jwk.y })).digest('base64url');
    for (const [key, expiresAt] of this.usedNonces) if (expiresAt <= now) this.usedNonces.delete(key);
    if (this.usedNonces.size >= MAX_NONCES) {
      throw new ServiceUnavailableException({ code: 'SIGNATURE_CACHE_UNAVAILABLE', message: 'Permintaan belum dapat diverifikasi. Coba lagi.' });
    }
    const replayKey = `${thumbprint}:${nonce}`;
    if (this.usedNonces.has(replayKey)) {
      throw new UnauthorizedException({ code: 'SIGNATURE_REPLAYED', message: 'Permintaan sudah pernah dikirim. Buat permintaan baru.' });
    }
    this.usedNonces.set(replayKey, Number(timestamp) + MAX_SKEW_MS + 1);
    return thumbprint;
  }

  private header(request: Request, name: string, maxLength: number): string {
    const value = request.headers[name];
    if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) throw this.invalid();
    return value;
  }

  private invalid(): UnauthorizedException {
    return new UnauthorizedException({ code: 'SIGNATURE_INVALID', message: 'Signature permintaan tidak valid.' });
  }
}
