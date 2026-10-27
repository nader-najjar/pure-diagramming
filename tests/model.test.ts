import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseDiagram, serialize, validateDiagram, MAX_JSON_BYTES, type Diagram } from '../src/model.ts';

function nodeAt(document: Diagram): Diagram['nodes'][number] {
  const item = document.nodes[0];
  assert.ok(item, 'Expected fixture nodes item');
  return item;
}

function edgeAt(document: Diagram): Diagram['edges'][number] {
  const item = document.edges[0];
  assert.ok(item, 'Expected fixture edges item');
  return item;
}

const sample = (): Diagram => ({
  schemaVersion: 1,
  title: 'Illustrative workflow',
  nodes: [
    {
      id: 'human',
      position: { x: 40.125, y: -20.5 },
      data: { label: 'Human', description: 'Keep the layout', color: 'blue' }
    },
    { id: 'ai', position: { x: 340, y: 120 }, data: { label: 'AI', color: 'purple' } }
  ],
  edges: [{ id: 'handoff', source: 'human', target: 'ai', label: 'Exact JSON' }],
  viewport: { x: 10.5, y: 30.25, zoom: 0.75 }
});

test('roundtrip preserves IDs, array order, fractional layout and unknown metadata at every level', () => {
  const doc = sample();
  doc['metadata'] = { owner: 'illustrative', nested: [null, true, { revision: 3 }] };
  nodeAt(doc)['metadata'] = { preserve: true };
  nodeAt(doc).position['note'] = 'Hand-positioned';
  nodeAt(doc).data['note'] = ['not renderer input'];
  edgeAt(doc)['metadata'] = { confidence: 0.7 };
  doc.viewport['note'] = 'Saved author view';
  assert.deepEqual(parseDiagram(serialize(doc)), doc);
  const canonical = serialize(doc);
  assert.equal(serialize(parseDiagram(canonical)), canonical);
});

test('targeted AI label edit preserves every unrelated field and source object', () => {
  const original = sample();
  nodeAt(original).data['metadata'] = { owner: 'human' };
  const before = serialize(original);
  const edited = parseDiagram(before);
  nodeAt(edited).data.label = 'Human review';
  const reopened = parseDiagram(serialize(edited));
  assert.equal(nodeAt(reopened).data.label, 'Human review');
  nodeAt(reopened).data.label = nodeAt(original).data.label;
  assert.deepEqual(reopened, original);
  assert.equal(serialize(original), before);
});

test('targeted connection edit retains layout, IDs and unknown metadata', () => {
  const original = sample();
  edgeAt(original)['notes'] = ['human handoff'];
  const edited = parseDiagram(serialize(original));
  edgeAt(edited).target = 'human';
  const reopened = parseDiagram(serialize(edited));
  assert.deepEqual(reopened.nodes, original.nodes);
  assert.deepEqual(reopened.viewport, original.viewport);
  assert.deepEqual(edgeAt(reopened), { ...edgeAt(original), target: 'human' });
});

test('unsupported versions, wrong fields and invalid references are rejected without mutating the input', () => {
  const cases: [string, (string | number)[], unknown, RegExp][] = [
    ['version', ['schemaVersion'], 2, /Unsupported schemaVersion/],
    ['node ID', ['nodes', 1, 'id'], 'human', /Node IDs/],
    ['edge ID', ['edges', 1], edgeAt(sample()), /Connection IDs/],
    ['source', ['edges', 0, 'source'], 'missing', /existing node IDs/],
    ['target', ['edges', 0, 'target'], null, /existing node IDs/],
    ['position', ['nodes', 0, 'position', 'x'], null, /finite x and y/],
    ['label', ['nodes', 0, 'data', 'label'], {}, /must be text/],
    ['description', ['nodes', 0, 'data', 'description'], 3, /must be text/],
    ['color', ['nodes', 0, 'data', 'color'], 'orange', /unsupported color/],
    ['color shape', ['nodes', 0, 'data', 'color'], ['blue'], /unsupported color/],
    ['zoom', ['viewport', 'zoom'], 0, /zoom between/]
  ];
  for (const [name, path, value, message] of cases) {
    const doc = sample();
    let target: unknown = doc;
    const parents = path.slice(0, -1);
    for (const key of parents) {
      assert.ok(typeof target === 'object' && target !== null);
      target = Reflect.get(target, key) as unknown;
    }
    assert.ok(typeof target === 'object' && target !== null);
    const last = path.at(-1);
    assert.ok(last !== undefined);
    Reflect.set(target, last, value);
    const before = JSON.stringify(doc);
    assert.throws(() => parseDiagram(before), message, name);
    assert.equal(JSON.stringify(doc), before, name);
  }
  for (const source of ['not json', '{"unfinished":', 'null', '[]']) assert.throws(() => parseDiagram(source));
});

test('label and description limits reject rather than truncate', () => {
  const doc = sample();
  nodeAt(doc).data.label = 'x'.repeat(160);
  nodeAt(doc).data.description = 'x'.repeat(500);
  assert.deepEqual(parseDiagram(serialize(doc)), doc);
  nodeAt(doc).data.label += 'x';
  assert.throws(() => validateDiagram(doc), /160 characters/);
  nodeAt(doc).data.label = 'Human';
  nodeAt(doc).data.description = (nodeAt(doc).data.description ?? '') + 'x';
  assert.throws(() => validateDiagram(doc), /500 characters/);
  nodeAt(doc).data.description = '';
  edgeAt(doc).label = 'x'.repeat(161);
  assert.throws(() => validateDiagram(doc), /160 characters/);
});

test('empty diagrams, HTML-like labels and unfamiliar fields are plain JSON', () => {
  const doc = sample();
  doc.title = '<script>alert(1)</script>';
  nodeAt(doc)['type'] = 'unknown-metadata';
  nodeAt(doc)['style'] = { future: true };
  const reopened = parseDiagram(serialize(doc));
  assert.deepEqual(reopened, doc);
  const withProto = parseDiagram(
    serialize(doc).replace('"schemaVersion": 1,', '"schemaVersion": 1, "__proto__": {"polluted": true},')
  );
  assert.ok(Object.hasOwn(withProto, '__proto__'));
  assert.equal(({} as Record<string, unknown>)['polluted'], undefined);
  assert.deepEqual(parseDiagram(serialize(withProto)), withProto);
  doc.nodes = [];
  doc.edges = [];
  assert.deepEqual(parseDiagram(serialize(doc)), doc);
});

test('node and connection IDs occupy separate namespaces', () => {
  const doc = sample();
  edgeAt(doc).id = nodeAt(doc).id;
  assert.deepEqual(parseDiagram(serialize(doc)), doc);
});

test('count limits accept their boundary and reject excess', () => {
  const doc = sample();
  doc.nodes = Array.from({ length: 1000 }, (_, i) => ({ ...nodeAt(doc), id: String(i) }));
  doc.edges = Array.from({ length: 3000 }, (_, i) => ({ id: String(i), source: '0', target: '1' }));
  assert.equal(validateDiagram(doc), doc);
  assert.throws(
    () => validateDiagram({ ...doc, nodes: [...doc.nodes, { ...nodeAt(doc), id: 'extra' }] }),
    /1,000/
  );
  assert.throws(
    () => validateDiagram({ ...doc, edges: [...doc.edges, { ...edgeAt(doc), id: 'extra' }] }),
    /3,000/
  );
});

test('limits count UTF-8 bytes and reserve room for canonical formatting', () => {
  const doc = sample();
  doc['extra'] = '😀'.repeat(1_300_000);
  const source = JSON.stringify(doc);
  assert.ok(source.length < MAX_JSON_BYTES);
  assert.throws(() => parseDiagram(source), /UTF-8/);
  doc['extra'] = Array.from({ length: 750_000 }, () => 0);
  assert.ok(Buffer.byteLength(JSON.stringify(doc)) < MAX_JSON_BYTES);
  assert.throws(() => parseDiagram(JSON.stringify(doc)), /Formatted JSON/);
});

test('non-finite metadata, non-JSON values, cycles and excessive depth cannot be silently lost', () => {
  const doc = sample();
  for (const value of [Infinity, NaN, undefined, (): number => 1, new Date(), 1n]) {
    doc['extra'] = value;
    assert.throws(() => validateDiagram(doc));
  }
  doc['extra'] = doc;
  assert.throws(() => validateDiagram(doc), /circular/);
  // Deliberately sparse: reject holes rather than silently serialize them as null.
  // eslint-disable-next-line unicorn/no-new-array
  doc['extra'] = new Array(1);
  assert.throws(() => validateDiagram(doc), /only JSON/);
  let nested: unknown = 'leaf';
  for (let i = 0; i < 101; i++) nested = { nested };
  doc['extra'] = nested;
  assert.throws(() => validateDiagram(doc), /100 levels/);
  delete doc['extra'];
  assert.throws(
    () => parseDiagram(JSON.stringify(doc).replace('"schemaVersion":1,', '"schemaVersion":1,"extra":1e400,')),
    /finite/
  );
});
