import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { materialize } from './materialize.ts';

const launcher = process.argv[2];
if (launcher === undefined || launcher === '') throw new Error('The pinned pnpm launcher is required.');
const root = mkdtempSync(join(tmpdir(), 'pure-diagramming-lock-'));
try {
  for (const input of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '.npmrc']) {
    materialize(resolve(input), join(root, input));
  }
  const result = spawnSync(resolve(launcher), [
    '--dir', root, 'install', '--lockfile-only', '--frozen-lockfile', '--offline', '--ignore-scripts'
  ], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(root, { recursive: true, force: true });
}
