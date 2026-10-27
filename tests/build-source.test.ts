import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buildSourceCommit } from '../scripts/build-source.ts';

test('build provenance distinguishes local output from an exact source commit', () => {
  assert.equal(buildSourceCommit(undefined), 'local');
  assert.equal(buildSourceCommit('local'), 'local');
  assert.equal(buildSourceCommit('Ab'.repeat(20)), 'ab'.repeat(20));
  for (const value of ['', 'main', 'abc1234', 'a'.repeat(41), '<script>alert(1)</script>']) {
    assert.throws(() => buildSourceCommit(value), /full 40-character/);
  }
});
