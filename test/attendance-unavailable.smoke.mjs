import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();
const base = process.env.API_BASE_URL ?? 'http://localhost:3100';
const email = `${randomUUID()}@example.test`;
const password = randomBytes(20).toString('base64url');
const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publicHeader = Buffer.from(JSON.stringify(pair.publicKey.export({ format: 'jwk' }))).toString('base64url');
let userId;

async function send(method, target, body, token) {
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const raw = body ? JSON.stringify(body) : '';
  const digest = createHash('sha256').update(raw).digest('base64url');
  const signature = sign('sha256', Buffer.from(`v1\n${method}\n${target}\n${timestamp}\n${nonce}\n${digest}`),
    { key: pair.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return fetch(`${base}${target}`, { method, headers: {
    'X-Request-Timestamp': timestamp, 'X-Request-Nonce': nonce,
    'X-Request-Key': publicHeader, 'X-Request-Signature': signature,
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }, ...(body ? { body: raw } : {}) });
}

try {
  const role = await db.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
  userId = (await db.user.create({ data: { email, passwordHash: await hash(password, 12), roleId: role.id } })).id;
  const login = await send('POST', '/api/auth/login', { email, password });
  assert.equal(login.status, 200, 'login must work without attendance service');
  const token = (await login.json()).accessToken;
  const unavailable = await send('GET', '/api/attendances', null, token);
  assert.equal(unavailable.status, 503, 'attendance should return 503');
  assert.equal((await unavailable.json()).error.code, 'ATTENDANCE_SERVICE_UNAVAILABLE');
  const master = await send('GET', '/api/employees', null, token);
  assert.equal(master.status, 200, 'master must remain available');
  console.log('Attendance unavailable smoke passed: 503 is structured; auth and master remain available.');
} finally {
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
