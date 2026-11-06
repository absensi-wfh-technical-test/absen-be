import assert from 'node:assert/strict';
import { createHash, createPublicKey, verify, webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const collection = JSON.parse(await readFile('../postman/Absensi_WFH_Domain.postman_collection.json', 'utf8'));
const script = new Script(`(async () => { ${collection.event[0].script.exec.join('\n')} })()`);
const variables = new Map(collection.variable.map(item => [item.key, item.value]));
const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

async function proof(method, target, mode, raw = '') {
  const headers = new Map();
  const pm = {
    collectionVariables: { get: key => variables.get(key), set: (key, value) => variables.set(key, value) },
    variables: { replaceIn: value => value.replace(/{{(\w+)}}/g, (_, key) => variables.get(key) ?? '') },
    request: { method, url: { toString: () => `http://localhost:3000${target}` }, body: { mode, raw },
      headers: { upsert: ({ key, value }) => headers.set(key, value) } },
  };
  await script.runInNewContext({ pm, crypto: webcrypto, btoa, TextEncoder, URL, Date, Uint8Array, JSON, Buffer });
  const version = mode === 'formdata' ? 'v2' : 'v1';
  const digest = createHash('sha256').update(mode === 'formdata' ? bytes : raw).digest('base64url');
  const base = `${version}\n${method}\n${target}\n${headers.get('X-Request-Timestamp')}\n${headers.get('X-Request-Nonce')}\n${digest}`;
  const key = createPublicKey({ key: JSON.parse(Buffer.from(headers.get('X-Request-Key'), 'base64url').toString()), format: 'jwk' });
  assert.equal(verify('sha256', Buffer.from(base), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(headers.get('X-Request-Signature'), 'base64url')), true);
}

await proof('POST', '/api/auth/login', 'raw', '{"email":"test@example.test","password":"test"}');
variables.set('photoSha256', createHash('sha256').update(bytes).digest('base64url'));
await proof('POST', '/api/attendances', 'formdata');
console.log('Postman pre-request smoke passed: v1 JSON and v2 photo proofs verify against the canonical contract.');
