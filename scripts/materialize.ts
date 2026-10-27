import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Copy declared runfiles as real files; patched fs.cp can preserve runfile symlinks. */
export function materialize(source: string, destination: string): void {
  if (statSync(source).isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const name of readdirSync(source)) materialize(join(source, name), join(destination, name));
  } else {
    writeFileSync(destination, readFileSync(source));
  }
}
