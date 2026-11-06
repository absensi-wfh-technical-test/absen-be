import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';

if (!process.env.DATABASE_URL || !process.env.SHADOW_DATABASE_URL) throw new Error('DATABASE_URL and SHADOW_DATABASE_URL are required.');
const provisionedName = process.env.SETUP_TEST_DATABASE_NAME;
if (provisionedName && !/^absensi_wfh_codex_[a-z0-9_]+$/.test(provisionedName)) {
  throw new Error('SETUP_TEST_DATABASE_NAME must start with absensi_wfh_codex_ and contain only lowercase letters, digits, or underscores.');
}
const name = provisionedName ?? `absensi_wfh_codex_${randomBytes(5).toString('hex')}`;
const url = new URL(process.env.DATABASE_URL);
url.pathname = `/${name}`;
const testUrl = url.toString();
const password = randomBytes(20).toString('base64url');
const admin = new PrismaClient();
let created = false;

function run(args, env) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env, encoding: 'utf8', timeout: 90_000 });
  if (result.error || result.status !== 0) throw new Error(`Setup command failed (${args[0]} ${args[1] ?? ''}, exit ${result.status}). Check local MySQL permissions and environment.`);
}

try {
  if (provisionedName) {
    const schemas = await admin.$queryRawUnsafe('SELECT COUNT(*) AS count FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', name);
    if (Number(schemas[0].count) !== 1) throw new Error('The provisioned test database does not exist or is not visible to this MySQL account.');
    const rows = await admin.$queryRawUnsafe('SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', name);
    if (Number(rows[0].count) !== 0) throw new Error('The provisioned test database is not empty; refusing to run migration or seed.');
  } else {
    try { await admin.$executeRawUnsafe(`CREATE DATABASE \`${name}\``); }
    catch (error) {
      if (error?.meta?.code === '1044') throw new Error('MySQL application account has no CREATE DATABASE permission. Set SETUP_TEST_DATABASE_NAME to a preprovisioned empty database or grant CREATE/DROP temporarily.');
      throw new Error('Could not create an isolated MySQL test database. Check local MySQL permissions.');
    }
    created = true;
  }
  const env = { ...process.env, DATABASE_URL: testUrl, SEED_DEMO_PASSWORD: password };
  run(['node_modules/prisma/build/index.js', 'migrate', 'deploy'], env);
  run(['--import', 'tsx', 'prisma/seed.ts'], env);
  run(['--import', 'tsx', 'prisma/seed.ts'], env);
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  try {
    assert.equal(await db.role.count(), 2);
    assert.equal(await db.department.count(), 3);
    assert.equal(await db.position.count(), 4);
    assert.equal(await db.user.count(), 2);
    assert.equal(await db.employee.count(), 1);
    const seeded = await db.user.findUniqueOrThrow({ where: { email: 'developer@sample.com' } });
    assert.notEqual(seeded.passwordHash, password);
    assert.equal(await compare(password, seeded.passwordHash), true);
    console.log(`Clean setup smoke passed: migration and idempotent seed on isolated MySQL database${provisionedName ? ' (preprovisioned database retained)' : ' (temporary database removed)'}.`);
  } finally { await db.$disconnect(); }
} finally {
  if (created) await admin.$executeRawUnsafe(`DROP DATABASE \`${name}\``);
  await admin.$disconnect();
}
