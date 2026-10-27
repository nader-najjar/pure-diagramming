import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { materialize } from './materialize.ts';

// Native resolvers used by Vitest and Knip need real input files, not Bazel's
// sandbox/runfiles symlinks. Only declared inputs are copied into this directory.
const check = process.argv[2];
if (check !== 'vitest' && check !== 'knip') throw new Error('Expected vitest or knip.');
const executable = resolve(check === 'vitest' ? 'node_modules/vitest/vitest.mjs' : 'node_modules/knip/bin/knip.js');
const root = mkdtempSync(join(tmpdir(), 'pure-diagramming-check-'));
try {
  for (const input of [
    'src', 'tests', 'scripts', 'diagrams', 'project.json', 'index.html',
    'package.json', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts', 'eslint.config.js', 'knip.json'
  ]) {
    materialize(resolve(input), join(root, input));
  }
  symlinkSync(resolve('node_modules'), join(root, 'node_modules'), 'junction');
  const result = spawnSync(process.execPath, [executable, ...process.argv.slice(3)], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(root, { recursive: true, force: true });
}
