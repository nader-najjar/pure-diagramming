import { test } from 'vitest';
import assert from 'node:assert/strict';
import { MAX_JSON_BYTES, serialize, type Diagram } from '../src/model.ts';
import {
  createPortableHtml,
  parsePortableDocument,
  PORTABLE_DOCUMENT_ID,
  type PortableAssets
} from '../src/portable.ts';

function nodeAt(document: Diagram, index: number): Diagram['nodes'][number] {
  const item = document.nodes[index];
  assert.ok(item, 'Expected fixture nodes item');
  return item;
}

const assets: PortableAssets = {
  scripts: ['const e=document.getElementById("root");e.textContent="Illustrative bundled application";'],
  styles: ['html,body,#root{margin:0;min-height:100%}.card{color:#124;background:#fff}']
};
const sample = (): Diagram => ({
  schemaVersion: 1,
  title: 'Portable example',
  nodes: [
    {
      id: 'human',
      position: { x: 19.125, y: -5.75, author: 'human' },
      data: { label: 'Review', color: 'purple', extra: { retained: true } }
    }
  ],
  edges: [],
  viewport: { x: 10, y: 20, zoom: 0.75, custom: ['saved view'] },
  metadata: { owner: 'illustrative', revision: 4 }
});
function payloadOf(html: string): string {
  const pattern = `<script type="application/json" id="${PORTABLE_DOCUMENT_ID}">([\\s\\S]*?)</script>`;
  const match = new RegExp(pattern).exec(html);
  assert.ok(match, 'contains one inert document payload');
  const payload = match[1];
  assert.ok(payload !== undefined);
  return payload;
}

test('portable HTML keeps the exact source semantics, order, viewport and unknown fields', () => {
  const document = sample();
  const before = serialize(document);
  const html = createPortableHtml(document, assets);
  assert.deepEqual(parsePortableDocument(payloadOf(html)), document);
  assert.equal(serialize(document), before);
  assert.equal((html.match(/type="application\/json"/g) ?? []).length, 1);
  assert.ok(assets.scripts[0] !== undefined && assets.styles[0] !== undefined);
  assert.ok(html.includes(`<script type="module" data-pure-diagram-bundle>${assets.scripts[0]}</script>`));
  assert.ok(html.includes(`<style data-pure-diagram-style>${assets.styles[0]}</style>`));
  assert.ok(html.indexOf(`id="${PORTABLE_DOCUMENT_ID}"`) < html.indexOf('data-pure-diagram-bundle'));
  assert.ok(!/<script\b[^>]*\bsrc=|<link\b/i.test(html));
});

test('hostile text remains data and cannot close its script or HTML title', () => {
  const document = sample();
  document.title = '</title><script>alert("x")</script>&\'"';
  nodeAt(document, 0).data.label = '</script><script>alert(1)</script><style>body{display:none}</style>';
  document['metadata'] = { tricky: '<!--<script> </ScRiPt > & > \u{2028} \u{2029}', entity: '&lt;script&gt;' };
  const html = createPortableHtml(document, assets);
  const payload = payloadOf(html);
  assert.ok(!/[<>&\u{2028}\u{2029}]/u.test(payload));
  assert.match(payload, /\\u003c\/script\\u003e/);
  assert.match(payload, /\\u2028/);
  assert.match(payload, /\\u2029/);
  assert.deepEqual(parsePortableDocument(payload), document);
  assert.equal((html.match(/<script\b/g) ?? []).length, 2);
  assert.equal((html.match(/<style\b/g) ?? []).length, 1);
  assert.ok(html.includes('&lt;/title&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;&quot;'));
});

test('portable CSP permits inline/data resources but no network or eval', () => {
  const html = createPortableHtml(sample(), assets);
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /default-src &#39;none&#39;/);
  assert.match(html, /script-src &#39;unsafe-inline&#39;/);
  assert.match(html, /style-src &#39;unsafe-inline&#39;/);
  assert.match(html, /connect-src data: blob:/);
  assert.match(html, /base-uri &#39;none&#39;; form-action &#39;none&#39;/);
  assert.ok(!html.includes('unsafe-eval'));
});

test('missing production bundles fail actionably', () => {
  for (const bad of [
    { scripts: [], styles: assets.styles },
    { scripts: ['  '], styles: assets.styles },
    { scripts: assets.scripts, styles: [] },
    { scripts: assets.scripts, styles: [''] }
  ])
    assert.throws(() => createPortableHtml(sample(), bad), /inline production/);
});

test('unbundled CSS resources and unsafe raw-text delimiters are rejected', () => {
  for (const style of [
    '@import "https://example.invalid/font.css";',
    '@import url("style.css");',
    '.x{background:url("https://example.invalid/image.png")}',
    '.x{background:url(/asset.png)}',
    '.x{background:url(./asset.png)}',
    '.x{background:url(blob:temporary)}'
  ])
    assert.throws(
      () => createPortableHtml(sample(), { ...assets, styles: [style] }),
      /stylesheets|embedded CSS resources/
    );
  assert.throws(
    () => createPortableHtml(sample(), { ...assets, styles: ['.x:after{content:"</STYLE >"}'] }),
    /closing style/
  );
  assert.throws(
    () => createPortableHtml(sample(), { ...assets, scripts: ['const x="</sCrIpT >";'] }),
    /inline HTML delimiters/
  );
  assert.throws(
    () => createPortableHtml(sample(), { ...assets, scripts: ['const x="<!--<script>";'] }),
    /inline HTML delimiters/
  );
});

test('trusted inline assets preserve code order and accept self-contained resource data', () => {
  const trusted: PortableAssets = {
    scripts: [
      'const first="https://react.dev/errors/1";const load=(data)=>fetch(data);',
      'const message=`Please import \'@xyflow/${name}/dist/style.css\'`;const second=2;'
    ],
    styles: ['.a{background:url("data:image/png;base64,AAAA")}', '.b{filter:url(#local-filter)}']
  };
  const html = createPortableHtml(sample(), trusted);
  const [firstScript, secondScript] = trusted.scripts;
  const [firstStyle, secondStyle] = trusted.styles;
  assert.ok(firstScript !== undefined && secondScript !== undefined);
  assert.ok(firstStyle !== undefined && secondStyle !== undefined);
  assert.ok(html.indexOf(firstScript) < html.indexOf(secondScript));
  assert.ok(html.indexOf(firstStyle) < html.indexOf(secondStyle));
  assert.equal((html.match(/data-pure-diagram-bundle/g) ?? []).length, 2);
  assert.equal((html.match(/data-pure-diagram-style/g) ?? []).length, 2);
});

test('safe escaping can exceed the JSON input limit without changing canonical semantics', () => {
  const document = sample();
  document['metadata'] = '<'.repeat(900_000);
  const source = serialize(document);
  const payload = payloadOf(createPortableHtml(document, assets));
  assert.ok(new TextEncoder().encode(payload).byteLength > MAX_JSON_BYTES);
  assert.deepEqual(parsePortableDocument(payload), document);
  assert.equal(serialize(document), source);
});

test('portable parsing retains source validation and bounds encoded expansion', () => {
  const invalid = { ...sample(), schemaVersion: 2 } as unknown as Diagram;
  assert.throws(() => createPortableHtml(invalid, assets), /schemaVersion/);
  assert.throws(() => parsePortableDocument(JSON.stringify(invalid)), /schemaVersion/);
  assert.throws(() => parsePortableDocument('not JSON'), /Invalid portable document JSON/);
  assert.throws(() => parsePortableDocument(' '.repeat(MAX_JSON_BYTES * 6 + 1)), /30 MB/);
  const oversized = { ...sample(), metadata: 'x'.repeat(MAX_JSON_BYTES) };
  assert.throws(() => parsePortableDocument(JSON.stringify(oversized)), /Formatted JSON exceeds 5 MB/);
});
