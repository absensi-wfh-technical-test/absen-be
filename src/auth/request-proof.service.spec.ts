import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { RequestProofService } from './request-proof.service.js';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const keyHeader = Buffer.from(JSON.stringify(publicKey.export({ format: 'jwk' }))).toString('base64url');

function signedRequest(body = '{"email":"user@example.test"}', timestamp = Date.now().toString(), nonce = randomUUID()): Request {
  const method = 'POST';
  const target = '/api/auth/login';
  const rawBody = Buffer.from(body);
  const digest = createHash('sha256').update(rawBody).digest('base64url');
  const base = `v1\n${method}\n${target}\n${timestamp}\n${nonce}\n${digest}`;
  const signature = sign('sha256', Buffer.from(base), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return { method, originalUrl: target, rawBody, headers: {
    'x-request-timestamp': timestamp,
    'x-request-nonce': nonce,
    'x-request-key': keyHeader,
    'x-request-signature': signature,
  } } as unknown as Request;
}

describe('RequestProofService', () => {
  it('accepts a valid proof once and rejects replay', () => {
    const proofs = new RequestProofService();
    const request = signedRequest();
    expect(proofs.verify(request)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(() => proofs.verify(request)).toThrowError(expect.objectContaining({ status: 401 }));
  });

  it('rejects changed body, method, and stale timestamp', () => {
    const proofs = new RequestProofService();
    const bodyChanged = signedRequest();
    (bodyChanged as Request & { rawBody: Buffer }).rawBody = Buffer.from('changed');
    expect(() => proofs.verify(bodyChanged)).toThrow();
    const methodChanged = signedRequest();
    methodChanged.method = 'GET';
    expect(() => proofs.verify(methodChanged)).toThrow();
    expect(() => proofs.verify(signedRequest(undefined, (Date.now() - 121_000).toString()))).toThrow();
  });

  it('rejects missing headers', () => {
    const proofs = new RequestProofService();
    expect(() => proofs.verify({ method: 'GET', originalUrl: '/api/auth/me', headers: {} } as Request)).toThrow();
  });

  it('binds a multipart photo proof to the exact file bytes', () => {
    const proofs = new RequestProofService();
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3]);
    const timestamp = Date.now().toString();
    const nonce = randomUUID();
    const target = '/api/attendances';
    const digest = createHash('sha256').update(bytes).digest('base64url');
    const base = `v2\nPOST\n${target}\n${timestamp}\n${nonce}\n${digest}`;
    const request = { method: 'POST', originalUrl: target, headers: {
      'x-request-timestamp': timestamp, 'x-request-nonce': nonce, 'x-request-key': keyHeader,
      'x-request-signature': sign('sha256', Buffer.from(base), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url'),
    } } as unknown as Request;
    expect(() => proofs.verify(request, Buffer.from([0xff, 0xd8, 0xff, 9]))).toThrow();
    expect(proofs.verify(request, bytes)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
