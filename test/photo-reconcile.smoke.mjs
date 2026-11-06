import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { access, mkdir, unlink, utimes, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const directory = resolve(process.env.PHOTO_STORAGE_DIR ?? '.private-photos');
const path = join(directory, `${randomUUID()}.png`);
const run = args => {
  const result = spawnSync(process.execPath, ['scripts/reconcile-photos.mjs', ...args], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(result.status, 0, 'reconciliation command should succeed');
  return result.stdout;
};

assert.match(run([]), /0 orphan candidate\(s\)/, 'refuse destructive check if older unrelated orphans already exist');
try {
  await mkdir(directory, { recursive: true });
  await writeFile(path, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), { flag: 'wx' });
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
  await utimes(path, old, old);
  assert.match(run([]), /1 orphan candidate\(s\).*0 removed/);
  await access(path);
  assert.match(run(['--delete']), /1 orphan candidate\(s\).*1 removed/);
  await assert.rejects(access(path));
  console.log('Photo reconciliation smoke passed: report-only preserves orphan; delete removes only the synthetic orphan.');
} finally {
  await unlink(path).catch(error => { if (error.code !== 'ENOENT') throw error; });
}
