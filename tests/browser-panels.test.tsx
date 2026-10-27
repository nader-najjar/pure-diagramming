// @vitest-environment jsdom
import type { ComponentProps } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi, type Mock } from 'vitest';
import { Inspector, Modal } from '../src/EditorPanels';
import type { Diagram } from '../src/model';

const diagram: Diagram = {
  schemaVersion: 1,
  title: 'Example',
  nodes: [
    { id: 'a', position: { x: 0, y: 0 }, data: { label: 'Alpha' } },
    { id: 'b', position: { x: 300, y: 0 }, data: { label: 'Beta', description: 'Note', color: 'green' } }
  ],
  edges: [{ id: 'a:b', source: 'a', target: 'b', label: 'Link' }],
  viewport: { x: 0, y: 0, zoom: 1 }
};
type InspectorProps = ComponentProps<typeof Inspector>;
interface Callbacks {
  onNode: Mock<InspectorProps['onNode']>;
  onEdge: Mock<InspectorProps['onEdge']>;
  onTitle: Mock<InspectorProps['onTitle']>;
  onDelete: Mock<InspectorProps['onDelete']>;
  onSelect: Mock<InspectorProps['onSelect']>;
  onConnect: Mock<InspectorProps['onConnect']>;
}
const callbacks = (): Callbacks => ({
  onNode: vi.fn<ComponentProps<typeof Inspector>['onNode']>(),
  onEdge: vi.fn<ComponentProps<typeof Inspector>['onEdge']>(),
  onTitle: vi.fn<ComponentProps<typeof Inspector>['onTitle']>(),
  onDelete: vi.fn<ComponentProps<typeof Inspector>['onDelete']>(),
  onSelect: vi.fn<ComponentProps<typeof Inspector>['onSelect']>(),
  onConnect: vi.fn<ComponentProps<typeof Inspector>['onConnect']>()
});
afterEach(() => {
  cleanup();
});

test('inspector stages edits and cancel restores fields before atomic apply', () => {
  const handlers = callbacks();
  render(<Inspector diagram={diagram} selection={{ kind: 'node', id: 'a' }} {...handlers} />);
  fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Staged' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Changed' } });
  fireEvent.change(screen.getByLabelText('Color'), { target: { value: 'purple' } });
  expect(handlers.onNode).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Cancel'));
  expect(screen.getByLabelText<HTMLInputElement>('Label').value).toBe('Alpha');
  fireEvent.click(screen.getByText('Apply'));
  expect(handlers.onNode).toHaveBeenLastCalledWith('a', { label: 'Alpha' });
  fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Updated' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Description' } });
  fireEvent.change(screen.getByLabelText('Color'), { target: { value: 'green' } });
  fireEvent.click(screen.getByText('Apply'));
  expect(handlers.onNode).toHaveBeenLastCalledWith('a', {
    label: 'Updated',
    description: 'Description',
    color: 'green'
  });
  fireEvent.click(screen.getByText('Delete'));
  expect(handlers.onDelete).toHaveBeenCalledOnce();
});

test('title, connection selection and endpoints remain independent and refresh on deletion', () => {
  const handlers = callbacks();
  const { rerender } = render(<Inspector diagram={diagram} selection={null} {...handlers} />);
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New title' } });
  fireEvent.click(screen.getByText('Apply'));
  expect(handlers.onTitle).toHaveBeenCalledWith('New title');
  fireEvent.change(screen.getByLabelText('Inspect'), { target: { value: 'edge:a:b' } });
  expect(handlers.onSelect).toHaveBeenCalledWith({ kind: 'edge', id: 'a:b' });
  fireEvent.change(screen.getByLabelText('Inspect'), { target: { value: '' } });
  expect(handlers.onSelect).toHaveBeenLastCalledWith(null);
  fireEvent.change(screen.getByLabelText('From'), { target: { value: 'b' } });
  fireEvent.change(screen.getByLabelText('To'), { target: { value: 'a' } });
  fireEvent.click(screen.getByText('Connect'));
  expect(handlers.onConnect).toHaveBeenCalledWith('b', 'a');
  rerender(<Inspector diagram={diagram} selection={{ kind: 'edge', id: 'a:b' }} {...handlers} />);
  fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Changed link' } });
  fireEvent.click(screen.getByText('Apply'));
  expect(handlers.onEdge).toHaveBeenCalledWith('a:b', 'Changed link');
  expect(screen.getByLabelText<HTMLSelectElement>('From').value).toBe('b');
  rerender(<Inspector diagram={{ ...diagram, nodes: [], edges: [] }} selection={null} {...handlers} />);
  expect(screen.getByText<HTMLButtonElement>('Connect').disabled).toBe(true);
});

test('modal opens, delegates cancel without default dismissal, and closes on unmount', () => {
  const open = vi.fn();
  const close = vi.fn();
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: open },
    close: { configurable: true, value: close }
  });
  const cancel = vi.fn();
  const { container, unmount } = render(
    <Modal title="Confirm" onCancel={cancel}>
      Contents
    </Modal>
  );
  expect(open).toHaveBeenCalledOnce();
  const dialog = container.querySelector('dialog');
  if (dialog === null) throw new Error('Missing dialog');
  const event = new Event('cancel', { bubbles: false, cancelable: true });
  fireEvent(dialog, event);
  expect(cancel).toHaveBeenCalledOnce();
  expect(event.defaultPrevented).toBe(true);
  unmount();
  expect(close).toHaveBeenCalledOnce();
});

test('unlabelled components and edges remain selectable by stable IDs', () => {
  const handlers = callbacks();
  const unlabelled = {
    ...diagram,
    nodes: diagram.nodes.map((node) => ({ ...node, data: { ...node.data, label: '' } })),
    edges: diagram.edges.map((edge) => ({ ...edge, label: '' }))
  };
  render(<Inspector diagram={unlabelled} selection={{ kind: 'node', id: 'b' }} {...handlers} />);
  expect(screen.getByRole('option', { name: 'Component: a' })).toBeTruthy();
  expect(screen.getByRole('option', { name: 'Connection: a:b' })).toBeTruthy();
  expect(screen.getByLabelText<HTMLTextAreaElement>('Description').value).toBe('Note');
  expect(screen.getByLabelText<HTMLSelectElement>('Color').value).toBe('green');
});
