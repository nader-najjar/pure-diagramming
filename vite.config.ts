import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { buildSourceCommit } from './scripts/build-source';

// One self-contained file works at a project subpath and directly from disk.
export default defineConfig({ base: './', plugins: [viteSingleFile(), {
  name: 'source-provenance',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'pure-diagramming-source-commit', content: buildSourceCommit(process.env.SOURCE_COMMIT) }, injectTo: 'head' }],
}] });
