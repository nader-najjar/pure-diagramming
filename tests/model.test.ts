import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDiagram, serialize, validateDiagram, MAX_JSON_BYTES, type Diagram } from '../src/model.ts';

const sample = (): Diagram => ({
  schemaVersion: 1, title: 'Illustrative workflow',
  nodes: [
    { id: 'human', position: { x: 40.125, y: -20.5 }, data: { label: 'Human', description: 'Keep the layout', color: 'blue' } },
    { id: 'ai', position: { x: 340, y: 120 }, data: { label: 'AI', color: 'purple' } },
  ],
  edges: [{ id: 'handoff', source: 'human', target: 'ai', label: 'Exact JSON' }],
  viewport: { x: 10.5, y: 30.25, zoom: 0.75 },
});

test('roundtrip preserves IDs, array order, fractional layout and unknown metadata at every level', () => {
  const doc = sample();
  doc.metadata = { owner: 'illustrative', nested: [null, true, { revision: 3 }] };
  doc.nodes[0].metadata = { preserve: true };
  doc.nodes[0].position.note = 'Hand-positioned';
  doc.nodes[0].data.note = ['not renderer input'];
  doc.edges[0].metadata = { confidence: 0.7 };
  doc.viewport.note = 'Saved author view';
  assert.deepEqual(parseDiagram(serialize(doc)), doc);
  assert.equal(serialize(parseDiagram(serialize(doc))), serialize(doc));
});

test('targeted AI label edit preserves every unrelated field and source object', () => {
  const original = sample();
  original.nodes[0].data.metadata = { owner: 'human' };
  const before = serialize(original);
  const edited = parseDiagram(before);
  edited.nodes[0].data.label = 'Human review';
  const reopened = parseDiagram(serialize(edited));
  assert.equal(reopened.nodes[0].data.label, 'Human review');
  reopened.nodes[0].data.label = original.nodes[0].data.label;
  assert.deepEqual(reopened, original);
  assert.equal(serialize(original), before);
});

test('targeted connection edit retains layout, IDs and unknown metadata', () => {
  const original = sample();
  original.edges[0].notes = ['human handoff'];
  const edited = parseDiagram(serialize(original));
  edited.edges[0].target = 'human';
  const reopened = parseDiagram(serialize(edited));
  assert.deepEqual(reopened.nodes, original.nodes);
  assert.deepEqual(reopened.viewport, original.viewport);
  assert.deepEqual(reopened.edges[0], { ...original.edges[0], target: 'human' });
});

test('unsupported versions, wrong fields and invalid references are rejected without mutating the input', () => {
  const cases: Array<[string, (doc: any) => void, RegExp]> = [
    ['version', doc => doc.schemaVersion = 2, /Unsupported schemaVersion/],
    ['node ID', doc => doc.nodes[1].id = 'human', /Node IDs/],
    ['edge ID', doc => doc.edges.push({ ...doc.edges[0] }), /Connection IDs/],
    ['source', doc => doc.edges[0].source = 'missing', /existing node IDs/],
    ['target', doc => doc.edges[0].target = null, /existing node IDs/],
    ['position', doc => doc.nodes[0].position.x = null, /finite x and y/],
    ['label', doc => doc.nodes[0].data.label = {}, /must be text/],
    ['description', doc => doc.nodes[0].data.description = 3, /must be text/],
    ['color', doc => doc.nodes[0].data.color = 'orange', /unsupported color/],
    ['color shape', doc => doc.nodes[0].data.color = ['blue'], /unsupported color/],
    ['zoom', doc => doc.viewport.zoom = 0, /zoom between/],
  ];
  for (const [name, change, message] of cases) {
    const doc = sample(); change(doc);
    const before = JSON.stringify(doc);
    assert.throws(() => parseDiagram(before), message, name);
    assert.equal(JSON.stringify(doc), before, name);
  }
  for (const source of ['not json', '{"unfinished":', 'null', '[]']) assert.throws(() => parseDiagram(source));
});

test('label and description limits reject rather than truncate', () => {
  const doc = sample();
  doc.nodes[0].data.label = 'x'.repeat(160);
  doc.nodes[0].data.description = 'x'.repeat(500);
  assert.deepEqual(parseDiagram(serialize(doc)), doc);
  doc.nodes[0].data.label += 'x';
  assert.throws(() => validateDiagram(doc), /160 characters/);
  doc.nodes[0].data.label = 'Human'; doc.nodes[0].data.description += 'x';
  assert.throws(() => validateDiagram(doc), /500 characters/);
  doc.nodes[0].data.description = ''; doc.edges[0].label = 'x'.repeat(161);
  assert.throws(() => validateDiagram(doc), /160 characters/);
});

test('empty diagrams, HTML-like labels and unfamiliar fields are plain JSON', () => {
  const doc = sample();
  doc.title = '<script>alert(1)</script>';
  doc.nodes[0].type = 'unknown-metadata';
  doc.nodes[0].style = { future: true };
  const reopened = parseDiagram(serialize(doc));
  assert.deepEqual(reopened, doc);
  const withProto = parseDiagram(serialize(doc).replace('"schemaVersion": 1,', '"schemaVersion": 1, "__proto__": {"polluted": true},'));
  assert.ok(Object.hasOwn(withProto, '__proto__'));
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.deepEqual(parseDiagram(serialize(withProto)), withProto);
  doc.nodes = []; doc.edges = [];
  assert.deepEqual(parseDiagram(serialize(doc)), doc);
});

test('node and connection IDs occupy separate namespaces', () => {
  const doc = sample(); doc.edges[0].id = doc.nodes[0].id;
  assert.deepEqual(parseDiagram(serialize(doc)), doc);
});

test('count limits accept their boundary and reject excess', () => {
  const doc = sample();
  doc.nodes = Array.from({ length: 1000 }, (_, i) => ({ ...doc.nodes[0], id: String(i) }));
  doc.edges = Array.from({ length: 3000 }, (_, i) => ({ id: String(i), source: '0', target: '1' }));
  assert.equal(validateDiagram(doc), doc);
  assert.throws(() => validateDiagram({ ...doc, nodes: [...doc.nodes, { ...doc.nodes[0], id: 'extra' }] }), /1,000/);
  assert.throws(() => validateDiagram({ ...doc, edges: [...doc.edges, { ...doc.edges[0], id: 'extra' }] }), /3,000/);
});

test('limits count UTF-8 bytes and reserve room for canonical formatting', () => {
  const doc = sample(); doc.extra = '😀'.repeat(1_300_000);
  const source = JSON.stringify(doc);
  assert.ok(source.length < MAX_JSON_BYTES);
  assert.throws(() => parseDiagram(source), /UTF-8/);
  doc.extra = Array(750_000).fill(0);
  assert.ok(Buffer.byteLength(JSON.stringify(doc)) < MAX_JSON_BYTES);
  assert.throws(() => parseDiagram(JSON.stringify(doc)), /Formatted JSON/);
});

test('non-finite metadata, non-JSON values, cycles and excessive depth cannot be silently lost', () => {
  const doc = sample();
  for (const value of [Infinity, NaN, undefined, () => 1, new Date(), 1n]) {
    doc.extra = value;
    assert.throws(() => validateDiagram(doc));
  }
  doc.extra = doc;
  assert.throws(() => validateDiagram(doc), /circular/);
  doc.extra = Array(1);
  assert.throws(() => validateDiagram(doc), /only JSON/);
  let nested: unknown = 'leaf';
  for (let i = 0; i < 101; i++) nested = { nested };
  doc.extra = nested;
  assert.throws(() => validateDiagram(doc), /100 levels/);
  delete doc.extra;
  assert.throws(() => parseDiagram(JSON.stringify(doc).replace('"schemaVersion":1,', '"schemaVersion":1,"extra":1e400,')), /finite/);
});
