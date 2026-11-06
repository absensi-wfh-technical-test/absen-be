import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readdir, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const directory = resolve(process.env.PHOTO_STORAGE_DIR ?? '.private-photos');
const deleteOrphans = process.argv.includes('--delete');
const graceMs = 24 * 60 * 60 * 1000;
const photoName = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;
const db = new PrismaClient();

try {
  const referenced = new Set((await db.attendance.findMany({ select: { photoPath: true } })).map(row => row.photoPath));
  const names = await readdir(directory).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  let candidates = 0;
  let removed = 0;
  for (const name of names) {
    if (!photoName.test(name) || referenced.has(name)) continue;
    const path = join(directory, name);
    const file = await stat(path).catch(() => null);
    if (!file?.isFile() || Date.now() - file.mtimeMs < graceMs) continue;
    candidates++;
    if (deleteOrphans) {
      // Recheck just before deletion in case a delayed attendance write committed.
      const row = await db.attendance.findFirst({ where: { photoPath: name }, select: { id: true } });
      if (!row) { await unlink(path); removed++; }
    }
  }
  console.log(`Photo reconciliation: ${candidates} orphan candidate(s) older than 24h; ${removed} removed. Mode: ${deleteOrphans ? 'delete' : 'report only'}.`);
} finally {
  await db.$disconnect();
}
