import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';

const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
const demoPassword = process.env.SEED_DEMO_PASSWORD;
if (!demoPassword) throw new Error('Set SEED_DEMO_PASSWORD to the password used for local demo seed.');

function createSessionKey() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return { privateKey, publicHeader: Buffer.from(JSON.stringify(publicKey.export({ format: 'jwk' }))).toString('base64url') };
}

function proof(method, target, body, key, timestamp = Date.now().toString()) {
  const nonce = randomUUID();
  const digest = createHash('sha256').update(body ?? '').digest('base64url');
  const base = `v1\n${method}\n${target}\n${timestamp}\n${nonce}\n${digest}`;
  return {
    'X-Request-Timestamp': timestamp,
    'X-Request-Nonce': nonce,
    'X-Request-Key': key.publicHeader,
    'X-Request-Signature': sign('sha256', Buffer.from(base), { key: key.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url'),
  };
}

async function send(method, target, key, body, token, headersOverride) {
  const rawBody = body === undefined ? undefined : JSON.stringify(body);
  const headers = { ...proof(method, target, rawBody, key), ...(rawBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headersOverride };
  const response = await fetch(`${baseUrl}${target}`, { method, headers, body: rawBody });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

for (const [email, role] of [['admin.hr@sample.com', 'ADMIN'], ['developer@sample.com', 'EMPLOYEE']]) {
  const key = createSessionKey();
  const login = await send('POST', '/api/auth/login', key, { email, password: demoPassword });
  assert.equal(login.status, 200, `${role} login`);
  assert.equal(login.data.user.roleCode, role);
  const token = login.data.accessToken;
  const me = await send('GET', '/api/auth/me', key, undefined, token);
  assert.equal(me.status, 200, `${role} me`);
  assert.equal(me.data.email, email);

  const wrongKey = await send('GET', '/api/auth/me', createSessionKey(), undefined, token);
  assert.equal(wrongKey.status, 401, `${role} key binding`);
  assert.equal(wrongKey.data.error.code, 'SIGNATURE_INVALID');

  const replayHeaders = { ...proof('GET', '/api/auth/me', undefined, key), Authorization: `Bearer ${token}` };
  const first = await fetch(`${baseUrl}/api/auth/me`, { headers: replayHeaders });
  const second = await fetch(`${baseUrl}/api/auth/me`, { headers: replayHeaders });
  assert.equal(first.status, 200, `${role} first proof`);
  assert.equal(second.status, 401, `${role} replay`);
  assert.equal((await second.json()).error.code, 'SIGNATURE_REPLAYED');

  const logout = await send('POST', '/api/auth/logout', key, undefined, token);
  assert.equal(logout.status, 204, `${role} logout`);
  console.log(`${role}: login, me, key binding, replay rejection, logout passed`);
}

const key = createSessionKey();
const missing = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin.hr@sample.com', password: demoPassword }) });
assert.equal(missing.status, 401, 'missing signature');

const staleBody = JSON.stringify({ email: 'admin.hr@sample.com', password: demoPassword });
const stale = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST',
  headers: { ...proof('POST', '/api/auth/login', staleBody, key, (Date.now() - 121_000).toString()), 'Content-Type': 'application/json' },
  body: staleBody });
assert.equal(stale.status, 401, 'expired signature');
console.log('Missing and expired signatures rejected');
