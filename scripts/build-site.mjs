import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { materialize } from './materialize.ts';
import { build } from 'vite';
import config from '../vite.config.ts';

// Rolldown resolves paths in native code, outside rules_js's filesystem patch.
// Materialize declared site inputs so native and JavaScript roots agree, without
// disabling Bazel's sandbox or exposing undeclared workspace files.
const root = mkdtempSync(join(tmpdir(), 'pure-diagramming-'));
try {
  for (const input of ['src', 'diagrams', 'project.json', 'index.html', 'tsconfig.json']) {
    materialize(resolve(input), join(root, input));
  }
  symlinkSync(resolve('node_modules'), join(root, 'node_modules'), 'junction');
  await build({ ...config, configFile: false, root, build: { outDir: resolve('dist'), emptyOutDir: true } });
} finally {
  rmSync(root, { recursive: true, force: true });
}
