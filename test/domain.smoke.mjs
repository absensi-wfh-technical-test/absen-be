import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { access, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();
const base = process.env.API_BASE_URL ?? 'http://localhost:3100';
const marker = `CX${randomBytes(5).toString('hex').toUpperCase()}`;
const adminEmail = `${marker.toLowerCase()}-admin@example.test`;
const employeeEmail = `${marker.toLowerCase()}-employee@example.test`;
const otherEmail = `${marker.toLowerCase()}-other@example.test`;
const adminPassword = randomBytes(18).toString('base64url');
const employeePassword = randomBytes(18).toString('base64url');
const photo1 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const photo2 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 5, 6, 7, 8]);
const key = () => {
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return { privateKey: pair.privateKey, header: Buffer.from(JSON.stringify(pair.publicKey.export({ format: 'jwk' }))).toString('base64url') };
};
const adminKey = key(); const employeeKey = key();

async function send(method, target, sessionKey, token, body, photoBytes) {
  const timestamp = String(Date.now()); const nonce = randomUUID();
  const bytes = photoBytes ?? (typeof body === 'string' ? Buffer.from(body) : Buffer.alloc(0));
  const digest = createHash('sha256').update(bytes).digest('base64url');
  const version = photoBytes ? 'v2' : 'v1';
  const signature = sign('sha256', Buffer.from(`${version}\n${method}\n${target}\n${timestamp}\n${nonce}\n${digest}`),
    { key: sessionKey.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  const headers = { 'X-Request-Timestamp': timestamp, 'X-Request-Nonce': nonce, 'X-Request-Key': sessionKey.header,
    'X-Request-Signature': signature, ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}) };
  const response = await fetch(`${base}${target}`, { method, headers, body });
  const payload = response.status === 204 ? null : response.headers.get('content-type')?.includes('image/') ? await response.arrayBuffer() : await response.json().catch(() => null);
  return { status: response.status, payload };
}
const json = value => JSON.stringify(value);
const form = bytes => { const data = new FormData(); data.append('photo', new Blob([bytes], { type: 'image/jpeg' }), 'evidence.jpg'); return data; };
const expectStatus = (response, status, label) => assert.equal(response.status, status, `${label}: ${JSON.stringify(response.payload)}`);

let adminId; let employeeId; let employeeUserId; let otherId; let otherUserId; let departmentId; let positionId;
try {
  const adminRole = await db.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
  departmentId = (await db.department.create({ data: { code: marker, name: `Test ${marker}` } })).id;
  positionId = (await db.position.create({ data: { code: marker, name: `Test ${marker}` } })).id;
  adminId = (await db.user.create({ data: { email: adminEmail, passwordHash: await hash(adminPassword, 12), roleId: adminRole.id } })).id;

  const adminLogin = await send('POST', '/api/auth/login', adminKey, null, json({ email: adminEmail, password: adminPassword }));
  expectStatus(adminLogin, 200, 'admin login'); const adminToken = adminLogin.payload.accessToken;
  const create = await send('POST', '/api/employees', adminKey, adminToken, json({ employeeCode: marker, fullName: `Test ${marker}`,
    email: employeeEmail, initialPassword: employeePassword, departmentId, positionId, phoneNumber: null, hireDate: null }));
  expectStatus(create, 201, 'employee create'); employeeId = create.payload.id; employeeUserId = create.payload.user.id;
  assert.equal(create.payload.passwordHash, undefined);
  expectStatus(await send('GET', `/api/employees/${employeeId}`, adminKey, adminToken), 200, 'employee read');
  expectStatus(await send('PATCH', `/api/employees/${employeeId}`, adminKey, adminToken, json({ fullName: `Updated ${marker}` })), 200, 'employee update');
  const filteredEmployees = await send('GET', `/api/employees?search=${marker}&status=active&departmentId=${departmentId}&page=1&pageSize=1`, adminKey, adminToken);
  expectStatus(filteredEmployees, 200, 'employee filters and pagination'); assert.equal(filteredEmployees.payload.meta.pageSize, 1);
  expectStatus(await send('POST', '/api/employees', adminKey, adminToken, json({ employeeCode: `${marker}X`, fullName: 'Duplikat',
    email: employeeEmail, initialPassword: employeePassword, departmentId, positionId })), 409, 'duplicate email');
  const rollbackEmail = `${marker.toLowerCase()}-rollback@example.test`;
  expectStatus(await send('POST', '/api/employees', adminKey, adminToken, json({ employeeCode: marker, fullName: 'Duplikat kode',
    email: rollbackEmail, initialPassword: employeePassword, departmentId, positionId })), 409, 'duplicate employee code');
  assert.equal(await db.user.count({ where: { email: rollbackEmail } }), 0, 'employee create transaction must roll back user');
  expectStatus(await send('POST', '/api/employees', adminKey, adminToken, json({ employeeCode: `${marker}X`, fullName: 'Relasi invalid',
    email: `${marker.toLowerCase()}-invalid@example.test`, initialPassword: employeePassword, departmentId: 99999999, positionId })), 400, 'invalid department');

  const employeeLogin = await send('POST', '/api/auth/login', employeeKey, null, json({ email: employeeEmail, password: employeePassword }));
  expectStatus(employeeLogin, 200, 'employee login'); const employeeToken = employeeLogin.payload.accessToken;
  expectStatus(await send('POST', '/api/auth/login', key(), null, json({ email: employeeEmail, password: 'incorrect-test-password' })), 401, 'wrong credentials rejected');
  const otherKey = key();
  const other = await send('POST', '/api/employees', adminKey, adminToken, json({ employeeCode: `${marker}B`, fullName: `Other ${marker}`,
    email: otherEmail, initialPassword: employeePassword, departmentId, positionId }));
  expectStatus(other, 201, 'other employee create'); otherId = other.payload.id; otherUserId = other.payload.user.id;
  const otherLogin = await send('POST', '/api/auth/login', otherKey, null, json({ email: otherEmail, password: employeePassword }));
  expectStatus(otherLogin, 200, 'other login'); const otherToken = otherLogin.payload.accessToken;
  expectStatus(await send('GET', '/api/employees', employeeKey, employeeToken), 403, 'employee cannot read HRD master');
  const todayBefore = await send('GET', '/api/attendances/me/today', employeeKey, employeeToken);
  expectStatus(todayBefore, 200, 'today before'); assert.equal(todayBefore.payload, null);
  expectStatus(await send('POST', '/api/attendances', employeeKey, employeeToken, form(Buffer.from('invalid image')), Buffer.from('invalid image')), 415, 'invalid photo');
  expectStatus(await send('POST', '/api/attendances', employeeKey, employeeToken, form(Buffer.concat([photo1, Buffer.alloc(5 * 1024 * 1024)])), Buffer.concat([photo1, Buffer.alloc(5 * 1024 * 1024)])), 413, 'oversized photo');
  expectStatus(await send('POST', '/api/attendances', employeeKey, employeeToken, form(photo2), photo1), 401, 'changed photo bytes reject signature');
  const checkIn = await send('POST', '/api/attendances', employeeKey, employeeToken, form(photo1), photo1);
  expectStatus(checkIn, 201, 'check in'); const attendanceId = checkIn.payload.id;
  assert.equal(checkIn.payload.photoPath, undefined);
  const originalPhotoPath = (await db.attendance.findUniqueOrThrow({ where: { id: attendanceId } })).photoPath;
  const photoDirectory = resolve(process.env.PHOTO_STORAGE_DIR ?? '.private-photos');
  await access(join(photoDirectory, originalPhotoPath));
  const originalTime = checkIn.payload.checkInAt;
  const duplicate = await send('POST', '/api/attendances', employeeKey, employeeToken, form(photo1), photo1);
  expectStatus(duplicate, 409, 'duplicate check in');
  expectStatus(await send('GET', `/api/attendances/${attendanceId}`, employeeKey, employeeToken), 200, 'own detail');
  expectStatus(await send('GET', `/api/attendances/${attendanceId}/photo`, employeeKey, employeeToken), 200, 'own photo');
  expectStatus(await send('GET', `/api/attendances/${attendanceId}/photo`, otherKey, otherToken), 403, 'other employee photo forbidden');
  expectStatus(await send('GET', `/api/attendances/${attendanceId}`, otherKey, otherToken), 403, 'other employee detail forbidden');
  expectStatus(await send('PATCH', `/api/attendances/${attendanceId}/photo`, otherKey, otherToken, form(photo2), photo2), 403, 'other employee replace forbidden');
  expectStatus(await send('DELETE', `/api/attendances/${attendanceId}`, otherKey, otherToken), 403, 'other employee delete forbidden');
  const monitoring = await send('GET', `/api/attendances?employeeId=${employeeId}&departmentId=${departmentId}&search=${marker}&page=1&pageSize=1`, adminKey, adminToken);
  expectStatus(monitoring, 200, 'admin monitoring filters and pagination'); assert.equal(monitoring.payload.meta.total, 1);
  expectStatus(await send('GET', `/api/attendances/${attendanceId}`, adminKey, adminToken), 200, 'admin attendance detail');
  expectStatus(await send('GET', `/api/attendances/${attendanceId}/photo`, adminKey, adminToken), 200, 'admin authorized photo');
  const noMatch = await send('GET', '/api/attendances?search=NO_SUCH_EMPLOYEE_9999', adminKey, adminToken);
  expectStatus(noMatch, 200, 'admin monitoring empty filter'); assert.equal(noMatch.payload.meta.total, 0);
  expectStatus(await send('PATCH', `/api/attendances/${attendanceId}/photo`, adminKey, adminToken, form(photo2), photo2), 403, 'admin cannot edit');
  expectStatus(await send('DELETE', `/api/attendances/${attendanceId}`, adminKey, adminToken), 403, 'admin cannot delete');
  const replaced = await send('PATCH', `/api/attendances/${attendanceId}/photo`, employeeKey, employeeToken, form(photo2), photo2);
  expectStatus(replaced, 200, 'replace photo'); assert.equal(replaced.payload.checkInAt, originalTime);
  const replacementPhotoPath = (await db.attendance.findUniqueOrThrow({ where: { id: attendanceId } })).photoPath;
  await access(join(photoDirectory, replacementPhotoPath));
  await assert.rejects(access(join(photoDirectory, originalPhotoPath)), 'old photo should be removed after replacement');
  expectStatus(await send('DELETE', `/api/attendances/${attendanceId}`, employeeKey, employeeToken), 204, 'delete own');
  await assert.rejects(access(join(photoDirectory, replacementPhotoPath)), 'photo should be removed after attendance delete');
  const todayAfter = await send('GET', '/api/attendances/me/today', employeeKey, employeeToken);
  expectStatus(todayAfter, 200, 'today after delete'); assert.equal(todayAfter.payload, null);
  const concurrent = await Promise.all([
    send('POST', '/api/attendances', employeeKey, employeeToken, form(photo1), photo1),
    send('POST', '/api/attendances', employeeKey, employeeToken, form(photo2), photo2),
  ]);
  assert.deepEqual(concurrent.map(result => result.status).sort(), [201, 409], 'parallel check-in creates one row');
  const second = concurrent.find(result => result.status === 201);
  expectStatus(await send('DELETE', `/api/attendances/${second.payload.id}`, employeeKey, employeeToken), 204, 'cleanup recheck in');
  const old = await db.attendance.create({ data: { employeeId, attendanceDate: new Date('2020-01-01T00:00:00Z'),
    checkInAt: new Date('2020-01-01T08:00:00Z'), photoPath: '00000000-0000-4000-8000-000000000000.jpg' } });
  const filteredMine = await send('GET', '/api/attendances/me?from=2026-01-01&page=1&pageSize=10', employeeKey, employeeToken);
  expectStatus(filteredMine, 200, 'personal date filter'); assert.equal(filteredMine.payload.meta.total, 0);
  expectStatus(await send('PATCH', `/api/attendances/${old.id}/photo`, employeeKey, employeeToken, form(photo2), photo2), 409, 'old photo immutable');
  expectStatus(await send('DELETE', `/api/attendances/${old.id}`, employeeKey, employeeToken), 409, 'old attendance immutable');
  expectStatus(await send('PATCH', `/api/employees/${employeeId}/status`, adminKey, adminToken, json({ isActive: false })), 200, 'deactivate');
  expectStatus(await send('GET', `/api/attendances/${old.id}`, adminKey, adminToken), 200, 'HRD can still read inactive employee history');
  expectStatus(await send('GET', '/api/attendances/me', employeeKey, employeeToken), 401, 'inactive token rejected');
  expectStatus(await send('POST', '/api/auth/login', key(), null, json({ email: employeeEmail, password: employeePassword })), 401, 'inactive login rejected');
  console.log('Domain smoke passed: master CRUD without delete, filters/constraints, TCP attendance CRUD, photo proof/size, role and owner boundaries, race/recheck-in.');
} finally {
  if (employeeId) {
    const rows = await db.attendance.findMany({ where: { employeeId }, select: { photoPath: true } });
    await db.attendance.deleteMany({ where: { employeeId } });
    for (const row of rows) await unlink(join(resolve(process.env.PHOTO_STORAGE_DIR ?? '.private-photos'), row.photoPath)).catch(() => {});
    await db.employee.deleteMany({ where: { id: employeeId } });
  }
  if (otherId) await db.employee.deleteMany({ where: { id: otherId } });
  if (otherUserId) await db.user.deleteMany({ where: { id: otherUserId } });
  if (employeeUserId) await db.user.deleteMany({ where: { id: employeeUserId } });
  if (adminId) await db.user.deleteMany({ where: { id: adminId } });
  if (departmentId) await db.department.deleteMany({ where: { id: departmentId } });
  if (positionId) await db.position.deleteMany({ where: { id: positionId } });
  await db.$disconnect();
}
