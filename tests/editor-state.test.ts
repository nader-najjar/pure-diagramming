import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDiagram, serialize, type Diagram } from '../src/model.ts';
import {
  HISTORY_LIMIT, HISTORY_BYTE_LIMIT, createHistory, reduceHistory, hasUndownloadedChanges,
  addNode, moveNode, editNode, renameDiagram, renameEdge, removeElement, connectNodes,
  readRecovery, writeRecovery,
} from '../src/editor-state.ts';

const sample = (): Diagram => ({
  schemaVersion: 1, title: 'Illustrative history', extra: { owner: 'human' },
  nodes: [
    { id: 'a', position: { x: 15.125, y: -2.75, note: 'manual' }, data: { label: 'A', color: 'blue', extra: [1, 2] }, extra: { owner: 'human' } },
    { id: 'b', position: { x: 320, y: 0 }, data: { label: 'B' } },
    { id: 'c', position: { x: 640, y: 0 }, data: { label: 'C' } },
  ],
  edges: [{ id: 'ab', source: 'a', target: 'b', label: 'handoff', extra: { direction: 'human choice' } }],
  viewport: { x: 10, y: 20, zoom: 0.7, extra: true },
});

test('every document mutation and replacement restores exactly through undo and redo', () => {
  const original = sample();
  let state = createHistory(original);
  const snapshots = [serialize(original)];
  const commit = (document: Diagram) => {
    state = reduceHistory(state, { type: 'commit', document });
    snapshots.push(serialize(state.document));
  };
  commit(addNode(state.document, { id: 'new', position: { x: 400, y: 300 }, data: { label: 'New' } }));
  commit(moveNode(state.document, 'a', { x: 20.875, y: 18.5 }));
  commit(editNode(state.document, 'a', { label: 'Renamed', description: 'Changed', color: 'green' }));
  commit(renameEdge(state.document, 'ab', 'Edited edge'));
  commit(renameDiagram(state.document, 'Changed title'));
  commit(connectNodes(state.document, { id: 'bc', source: 'b', target: 'c', label: 'connect' }));
  commit(removeElement(state.document, 'a', 'node'));
  commit(removeElement(state.document, 'bc', 'edge'));
  commit({ ...sample(), title: 'Imported replacement', nodes: [], edges: [], viewport: { x: 3, y: 4, zoom: 1.2 } });
  for (let i = snapshots.length - 2; i >= 0; i--) {
    state = reduceHistory(state, { type: 'undo' });
    assert.equal(serialize(state.document), snapshots[i]);
  }
  assert.equal(reduceHistory(state, { type: 'undo' }), state);
  for (let i = 1; i < snapshots.length; i++) {
    state = reduceHistory(state, { type: 'redo' });
    assert.equal(serialize(state.document), snapshots[i]);
  }
  assert.equal(reduceHistory(state, { type: 'redo' }), state);
  assert.deepEqual(original, sample());
});

test('identical commits are no-ops and do not erase redo; new changes do', () => {
  const initial = createHistory(sample());
  assert.equal(reduceHistory(initial, { type: 'commit', document: parseDiagram(serialize(initial.document)) }), initial);
  let state = reduceHistory(initial, { type: 'commit', document: renameDiagram(initial.document, 'Changed') });
  state = reduceHistory(state, { type: 'undo' });
  assert.equal(state.future.length, 1);
  const unchanged = reduceHistory(state, { type: 'commit', document: state.document });
  assert.equal(unchanged, state);
  state = reduceHistory(state, { type: 'commit', document: renameDiagram(state.document, 'Different') });
  assert.equal(state.future.length, 0);
  assert.equal(state.revision, 3);
});

test('history retains exactly the latest 50 commits and isolates external document references', () => {
  const source = sample();
  let state = createHistory(source);
  source.title = 'External mutation';
  assert.equal(state.document.title, 'Illustrative history');
  for (let i = 1; i <= 55; i++) {
    const next = renameDiagram(state.document, String(i));
    state = reduceHistory(state, { type: 'commit', document: next });
    next.title = 'External mutation';
  }
  assert.equal(state.document.title, '55');
  assert.equal(state.past.length, HISTORY_LIMIT);
  for (let i = 0; i < HISTORY_LIMIT; i++) state = reduceHistory(state, { type: 'undo' });
  assert.equal(state.document.title, '5');
  assert.equal(state.past.length, 0);
  assert.equal(state.future.length, HISTORY_LIMIT);
  for (let i = 0; i < HISTORY_LIMIT; i++) state = reduceHistory(state, { type: 'redo' });
  assert.equal(state.document.title, '55');
});

test('mutations preserve metadata, viewport, unrelated arrays and stable IDs', () => {
  const original = sample();
  const moved = moveNode(original, 'a', { x: 1.125, y: -9.5 });
  assert.deepEqual(moved.nodes[0].position, { x: 1.125, y: -9.5, note: 'manual' });
  assert.deepEqual(moved.nodes.slice(1), original.nodes.slice(1));
  assert.deepEqual(moved.edges, original.edges);
  assert.deepEqual(moved.viewport, original.viewport);
  const edited = editNode(moved, 'a', { label: 'New label' });
  assert.deepEqual(edited.nodes[0].data, { ...original.nodes[0].data, label: 'New label' });
  assert.deepEqual(edited.nodes[0].extra, original.nodes[0].extra);
  assert.deepEqual(renameEdge(edited, 'ab', 'new').edges[0], { ...original.edges[0], label: 'new' });
  assert.deepEqual(original, sample());
});

test('node deletion removes incident connections only; repeated deletion is a history no-op', () => {
  const doc = connectNodes(sample(), { id: 'bc', source: 'b', target: 'c' });
  const next = removeElement(doc, 'a', 'node');
  assert.deepEqual(next.edges, [{ id: 'bc', source: 'b', target: 'c' }]);
  assert.deepEqual(next.nodes, doc.nodes.slice(1));
  const state = createHistory(next);
  assert.equal(reduceHistory(state, { type: 'commit', document: removeElement(state.document, 'a', 'node') }), state);
});

test('duplicate connection gestures are no-ops; imported duplicates remain intact', () => {
  const doc = sample();
  assert.equal(connectNodes(doc, { id: 'another', source: 'a', target: 'b' }), doc);
  doc.edges.push({ id: 'imported-duplicate', source: 'a', target: 'b', extra: true });
  assert.equal(connectNodes(doc, { id: 'another', source: 'a', target: 'b' }), doc);
  assert.equal(doc.edges.length, 2);
  assert.throws(() => connectNodes(doc, { id: 'self', source: 'a', target: 'a' }), /self-connection/);
  assert.throws(() => connectNodes(doc, { id: 'missing', source: 'a', target: 'unknown' }), /no longer exists/);
  const reverse = connectNodes(doc, { id: 'reverse', source: 'b', target: 'a' });
  assert.equal(reverse.edges.length, 3);
});

test('invalid edits throw without mutating valid history or source', () => {
  const state = createHistory(sample());
  const before = JSON.stringify(state);
  const invalid = { ...state.document, schemaVersion: 2 } as unknown as Diagram;
  assert.throws(() => reduceHistory(state, { type: 'commit', document: invalid }), /schemaVersion/);
  assert.throws(() => moveNode(state.document, 'a', { x: Infinity, y: 0 }), /finite/);
  assert.throws(() => editNode(state.document, 'a', { label: 'x'.repeat(161) }), /160/);
  assert.throws(() => renameEdge(state.document, 'missing', 'changed'), /no longer exists/);
  assert.throws(() => moveNode(state.document, 'missing', { x: 0, y: 0 }), /no longer exists/);
  assert.throws(() => addNode(state.document, state.document.nodes[0]), /unique/);
  assert.equal(JSON.stringify(state), before);
});

test('download snapshots describe the requested bytes, not later edits or file delivery', () => {
  let state = createHistory(sample());
  assert.equal(hasUndownloadedChanges(state), true);
  const snapshot = serialize(state.document);
  state = reduceHistory(state, { type: 'download-requested', snapshot });
  assert.equal(state.revision, 0);
  assert.equal(hasUndownloadedChanges(state), false);
  state = reduceHistory(state, { type: 'commit', document: renameDiagram(state.document, 'New change') });
  assert.equal(hasUndownloadedChanges(state), true);
  state = reduceHistory(state, { type: 'download-requested', snapshot });
  assert.equal(hasUndownloadedChanges(state), true);
  state = reduceHistory(state, { type: 'undo' });
  assert.equal(hasUndownloadedChanges(state), false);
  state = reduceHistory(state, { type: 'redo' });
  assert.equal(hasUndownloadedChanges(state), true);
});

test('recovery reads never write and preserve exact valid document semantics', () => {
  let stored: string | null = null;
  let boot = readRecovery(() => stored);
  assert.equal(boot.document, null);
  assert.equal(boot.canWrite, true);
  assert.equal(stored, null);
  stored = serialize(sample());
  boot = readRecovery(() => stored);
  assert.deepEqual(boot.document, sample());
  assert.equal(stored, serialize(sample()));
  assert.match(boot.message, /not a portable file/);
});

test('malformed, unsupported and unavailable recovery data disables writes without replacement', () => {
  for (const stored of ['not JSON', '', JSON.stringify({ ...sample(), schemaVersion: 2 })]) {
    let storage = stored;
    const boot = readRecovery(() => storage);
    assert.equal(boot.document, null);
    assert.equal(boot.canWrite, false);
    assert.match(boot.message, /left untouched/);
    const result = writeRecovery(source => { storage = source; }, sample(), boot.canWrite);
    assert.equal(result.saved, false);
    assert.equal(storage, stored);
  }
  const denied = readRecovery(() => { throw new Error('Storage access denied'); });
  assert.equal(denied.canWrite, false);
  assert.match(denied.message, /Storage access denied/);
});

test('successful recovery writes reopen exactly; quota failures retain prior bytes and allow an explicit retry', () => {
  let storage = serialize(sample());
  const edited = editNode(sample(), 'a', { label: 'Changed' });
  let result = writeRecovery(source => { storage = source; }, edited, true);
  assert.equal(result.saved, true);
  assert.equal(result.canWrite, true);
  assert.deepEqual(readRecovery(() => storage).document, edited);
  const previous = storage;
  result = writeRecovery(() => { throw new Error('Quota exceeded'); }, sample(), true);
  assert.equal(result.saved, false);
  assert.equal(result.canWrite, true);
  assert.match(result.message, /Quota exceeded/);
  assert.equal(storage, previous);
  result = writeRecovery(source => { storage = source; }, sample(), result.canWrite);
  assert.equal(result.saved, true);
  assert.deepEqual(parseDiagram(storage), sample());
  result = writeRecovery(() => assert.fail('paused writes must not run'), sample(), false);
  assert.equal(result.saved, false);
  const invalid = { ...sample(), schemaVersion: 2 } as unknown as Diagram;
  result = writeRecovery(() => assert.fail('invalid source must not be written'), invalid, true);
  assert.equal(result.saved, false);
});


test('large histories respect a combined byte budget and retain immediate replacement undo', () => {
  let state = createHistory(sample());
  const withinBudget = () => {
    assert.ok(state.past.length + state.future.length <= HISTORY_LIMIT);
    assert.ok([...state.past, ...state.future].reduce((sum, entry) => sum + entry.length * 2, 0) <= HISTORY_BYTE_LIMIT);
  };
  for (let i = 0; i < 15; i++) {
    state = reduceHistory(state, { type: 'commit', document: { ...sample(), title: String(i), largeMetadata: 'x'.repeat(1_000_000) } });
    withinBudget();
  }
  assert.ok(state.past.length < 15, 'byte cap trims before count cap for large documents');
  const previous = serialize(state.document);
  state = reduceHistory(state, { type: 'commit', document: { ...sample(), title: 'Large replacement', largeMetadata: 'y'.repeat(4_000_000) } });
  withinBudget();
  assert.equal(state.past.at(-1), previous);
  state = reduceHistory(state, { type: 'undo' });
  withinBudget();
  assert.equal(serialize(state.document), previous);
  assert.equal(parseDiagram(state.future.at(-1)!).title, 'Large replacement');
  state = reduceHistory(state, { type: 'redo' });
  withinBudget();
  assert.equal(state.document.title, 'Large replacement');
  while (state.past.length) {
    state = reduceHistory(state, { type: 'undo' });
    withinBudget();
  }
  assert.ok(state.future.length > 0);
  while (state.future.length) {
    state = reduceHistory(state, { type: 'redo' });
    withinBudget();
  }
});
