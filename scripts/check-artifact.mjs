import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createPortableHtml, parsePortableDocument, PORTABLE_DOCUMENT_ID } from '../src/portable.ts';
import { parseDiagram } from '../src/model.ts';
import { buildSourceCommit } from './build-source.ts';
const directory = new URL('../dist/', import.meta.url);
assert.deepEqual(readdirSync(directory), ['index.html'], 'The viewing artifact must be one self-contained HTML file.');
const html = readFileSync(new URL('index.html', directory), 'utf8');
assert.ok(html.includes(`<meta name="pure-diagramming-source-commit" content="${buildSourceCommit(process.env.SOURCE_COMMIT)}">`), 'The built site must identify its source commit, or explicitly say local.');
assert.ok(html.includes('<script'), 'The React site must be bundled.');
assert.ok(html.includes('<style'), 'Styles must be bundled.');
assert.ok(!/<script\b[^>]*\bsrc\s*=/i.test(html), 'No external scripts may be required.');
assert.ok(!/<link\b[^>]*\brel=["'](?:stylesheet|modulepreload)["']/i.test(html), 'No external style or module assets may be required.');
assert.ok(!/@import\s/i.test(html), 'CSS must not import remote resources.');
console.log('Standalone structure verified: dist/index.html. This is not a file:// browser test.');

// Exercise the real production bundle, not only tiny synthetic script fixtures.
const diagram = parseDiagram(readFileSync(new URL('../diagrams/example.json', import.meta.url), 'utf8'));
const portable = createPortableHtml(diagram, {
  scripts: [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]),
  styles: [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]),
});
const payload = portable.match(new RegExp(`<script type="application/json" id="${PORTABLE_DOCUMENT_ID}">([\\s\\S]*?)<\\/script>`));
assert.ok(payload, 'Portable export must embed its document.');
assert.deepEqual(parsePortableDocument(payload[1]), diagram);
console.log('Production assets accepted for portable export; embedded source roundtrip verified.');
