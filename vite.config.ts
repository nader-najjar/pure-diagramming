import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained file works at a project subpath and directly from disk.
export default defineConfig({ base: './', plugins: [viteSingleFile()] });
