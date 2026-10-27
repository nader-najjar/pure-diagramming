import assert from 'node:assert/strict';
import test from 'node:test';
import { imageBounds } from '../src/image-bounds.ts';

test('image bounds include negative coordinates and labels outside node bounds with arrow padding', () => {
  assert.deepEqual(imageBounds([{ x: -100.5, y: 0, width: 240, height: 140 }, { x: 200, y: -90.25, width: 84, height: 500 }]), { x: -133, y: -123, width: 449, height: 565 });
});
test('empty, unmeasured and excessive image layouts fail rather than silently clip or downscale', () => {
  assert.throws(() => imageBounds([]), /Add a component/);
  assert.throws(() => imageBounds([{ x: NaN, y: 0, width: 1, height: 1 }]), /not ready/);
  assert.throws(() => imageBounds([{ x: 0, y: 0, width: 200000, height: 100 }]), /limit/);
  assert.throws(() => imageBounds([{ x: 0, y: 0, width: 4000, height: 4000 }]), /limit/);
});
