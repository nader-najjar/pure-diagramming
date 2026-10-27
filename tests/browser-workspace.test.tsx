// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { Diagram } from '../src/model';
import { serialize } from '../src/model';
import { useWorkspace } from '../src/useWorkspace';

const initial: Diagram = {
  schemaVersion: 1,
  title: 'Example',
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 }
};

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
});

test('published startup does not read recovery; explicit editing resumes or replaces it', () => {
  const draft = { ...initial, title: 'Draft' };
  localStorage.setItem('workspace', serialize(draft));
  const { result } = renderHook(() => useWorkspace(initial, 'workspace'));
  expect(result.current.history.document.title).toBe('Example');
  expect(result.current.active).toBe(false);
  act(() => {
    result.current.beginEditing();
  });
  expect(result.current.candidate).toEqual(draft);
  expect(result.current.editing).toBe(false);
  act(() => {
    result.current.activate(draft);
  });
  expect(result.current.candidate).toBeNull();
  expect(result.current.editing).toBe(true);
  expect(result.current.history.document).toEqual(draft);
  expect(result.current.portablePending).toBe(true);
  act(() => {
    result.current.setEditing(false);
    result.current.beginEditing();
  });
  expect(result.current.editing).toBe(true);
});

test('edits save only active workspaces and download requests track exact snapshots', () => {
  const { result } = renderHook(() => useWorkspace(initial, 'workspace'));
  const edited = { ...initial, title: 'Changed' };
  act(() => {
    result.current.commit(edited);
  });
  expect(localStorage.getItem('workspace')).toBeNull();
  const warning = new Event('beforeunload', { cancelable: true });
  dispatchEvent(warning);
  expect(warning.defaultPrevented).toBe(true);
  act(() => {
    result.current.beginEditing();
  });
  expect(localStorage.getItem('workspace')).toBe(serialize(edited));
  act(() => {
    result.current.apply({ type: 'undo' });
  });
  expect(localStorage.getItem('workspace')).toBe(serialize(initial));
  act(() => {
    result.current.apply({ type: 'redo' });
  });
  act(() => {
    result.current.apply({ type: 'download-requested', snapshot: serialize(edited) });
  });
  expect(result.current.portableKind).toBe('requested');
  expect(result.current.portablePending).toBe(false);
  const noWarning = new Event('beforeunload', { cancelable: true });
  dispatchEvent(noWarning);
  expect(noWarning.defaultPrevented).toBe(false);
  act(() => {
    result.current.apply({ type: 'download-requested', snapshot: serialize(edited) });
  });
  act(() => {
    result.current.markOpened(initial);
  });
  expect(result.current.portableKind).toBe('opened');
  expect(result.current.portablePending).toBe(true);
});

test('invalid edits leave document intact and corrupt recovery remains protected', () => {
  localStorage.setItem('workspace', 'not json');
  const { result } = renderHook(() => useWorkspace(initial, 'workspace'));
  act(() => {
    result.current.beginEditing();
  });
  expect(result.current.editing).toBe(true);
  expect(result.current.recovery).toContain('Original browser storage left untouched');
  act(() => {
    result.current.commit({ ...initial, title: 'Valid change' });
    result.current.retry();
  });
  expect(localStorage.getItem('workspace')).toBe('not json');
  let accepted = true;
  act(() => {
    accepted = result.current.commit({ ...initial, title: 'x'.repeat(161) });
  });
  expect(accepted).toBe(false);
  expect(result.current.history.document.title).toBe('Valid change');
  expect(result.current.status).toContain('current document is intact');
  act(() => {
    result.current.activate({ ...initial, title: 'x'.repeat(161) });
  });
  expect(result.current.history.document.title).toBe('Valid change');
});

test('failed autosave pauses repeated writes and explicit retry restores recovery', () => {
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  const { result } = renderHook(() => useWorkspace(initial, 'workspace'));
  act(() => {
    result.current.beginEditing();
  });
  expect(result.current.retryable).toBe(true);
  expect(write).toHaveBeenCalledTimes(1);
  act(() => {
    result.current.commit({ ...initial, title: 'Changed' });
  });
  expect(write).toHaveBeenCalledTimes(1);
  write.mockRestore();
  act(() => {
    result.current.retry();
  });
  expect(result.current.retryable).toBe(false);
  expect(localStorage.getItem('workspace')).toBe(serialize(result.current.history.document));
});

test('storage access denial still permits local editing without overwriting recovery', () => {
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
  const write = vi.spyOn(Storage.prototype, 'setItem');
  const { result } = renderHook(() => useWorkspace(initial, 'workspace'));
  act(() => {
    result.current.beginEditing();
  });
  expect(result.current.recovery).toContain('denied');
  expect(result.current.editing).toBe(true);
  act(() => {
    result.current.commit({ ...initial, title: 'Local only' });
  });
  expect(result.current.history.document.title).toBe('Local only');
  expect(write).not.toHaveBeenCalled();
  read.mockRestore();
});
