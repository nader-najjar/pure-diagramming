import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minimumFitZoom } from '../src/view.ts';
import { parseDiagram } from '../src/model.ts';
const document = (xs: number[], ys = xs.map(() => 0)) => parseDiagram(JSON.stringify({ schemaVersion: 1, title: 'Wide diagram', viewport: { x: 0, y: 0, zoom: 1 }, nodes: xs.map((x, i) => ({ id: String(i), position: { x, y: ys[i] }, data: { label: 'Node' } })), edges: [] }));
test('minimum fit zoom accommodates widely separated accepted nodes and narrow canvases', () => {
  for (const [width, height] of [[1100, 450], [320, 360], [1, 1]]) {
    for (const xs of [[0, 100_000], [-1_000_000, 1_000_000]]) {
      const doc = document(xs, xs);
      const zoom = minimumFitZoom(doc, width, height);
      assert.ok(zoom > 0 && Number.isFinite(zoom));
      assert.ok((xs[1] - xs[0] + 2400) * zoom <= Math.min(width, height));
    }
  }
});
test('unrenderable coordinates are rejected rather than silently clamped', () => {
  assert.throws(() => document([1_000_001]), /1,000,000/);
  assert.throws(() => document([-1_000_001]), /1,000,000/);
  assert.throws(() => document([1e300]), /1,000,000/);
  assert.equal(minimumFitZoom(document([]), 320, 360), 0.02);
});
