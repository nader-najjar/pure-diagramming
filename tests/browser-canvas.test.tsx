// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentType, MouseEvent as ReactMouseEvent, ReactNode, ReactElement } from 'react';
import type * as ReactFlowModule from '@xyflow/react';
import { Position } from '@xyflow/react';
import type { EdgeProps, Node, NodeProps, ReactFlowInstance, ReactFlowProps } from '@xyflow/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { DiagramCanvas } from '../src/DiagramCanvas';
import type { Diagram } from '../src/model';

const captured: { flow?: ReactFlowProps; resize?: ResizeObserverCallback } = {};
const disconnect = vi.fn();
const observe = vi.fn();

vi.mock('@xyflow/react', async (original) => {
  const actual = await original<typeof ReactFlowModule>();
  return {
    ...actual,
    ReactFlow: (props: ReactFlowProps): ReactElement => {
      captured.flow = props;
      return <div>{props.children}</div>;
    },
    Background: (): null => null,
    Controls: (): null => null,
    Handle: (): null => null,
    BaseEdge: (): null => null,
    EdgeLabelRenderer: ({ children }: { children: ReactNode }): ReactElement => <div>{children}</div>
  };
});
const diagram: Diagram = {
  schemaVersion: 1,
  title: 'Example',
  nodes: [{ id: 'a', position: { x: 0, y: 0 }, data: { label: 'Alpha' } }],
  edges: [{ id: 'edge', source: 'a', target: 'a', label: 'Link' }],
  viewport: { x: 0, y: 0, zoom: 1 }
};
function currentFlow(): ReactFlowProps {
  if (captured.flow === undefined) throw new Error('Flow was not rendered');
  return captured.flow;
}
function mouse(): ReactMouseEvent {
  return new MouseEvent('click') as unknown as ReactMouseEvent;
}
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      public constructor(callback: ResizeObserverCallback) {
        captured.resize = callback;
      }

      public observe(): void {
        observe();
      }

      public disconnect(): void {
        disconnect();
      }
    }
  );
});
afterEach(() => {
  cleanup();
});

test('canvas gates selection, resets drag previews, forwards connections and computes insertion center', () => {
  const select = vi.fn();
  const move = vi.fn();
  const connect = vi.fn();
  const center = { current: null as (() => { x: number; y: number }) | null };
  const { rerender, unmount } = render(
    <DiagramCanvas diagram={diagram} centerRef={center} onSelect={select} onMove={move} onConnect={connect} />
  );
  const node: Node = { id: 'a', position: { x: 10.5, y: 20.25 }, data: {} };
  currentFlow().onNodeClick?.(mouse(), node);
  currentFlow().onEdgeClick?.(mouse(), { id: 'edge', source: 'a', target: 'a' });
  currentFlow().onPaneClick?.(mouse());
  expect(select).not.toHaveBeenCalled();
  expect(center.current?.()).toEqual({ x: 0, y: 0 });
  rerender(
    <DiagramCanvas
      diagram={diagram}
      editing
      selection={{ kind: 'node', id: 'a' }}
      centerRef={center}
      onSelect={select}
      onMove={move}
      onConnect={connect}
    />
  );
  expect(currentFlow().nodes?.[0]?.selected).toBe(true);
  currentFlow().onNodeClick?.(mouse(), node);
  expect(select).toHaveBeenLastCalledWith({ kind: 'node', id: 'a' });
  currentFlow().onEdgeClick?.(mouse(), { id: 'edge', source: 'a', target: 'a' });
  expect(select).toHaveBeenLastCalledWith({ kind: 'edge', id: 'edge' });
  currentFlow().onPaneClick?.(mouse());
  expect(select).toHaveBeenLastCalledWith(null);
  act(() => {
    currentFlow().onNodesChange?.([{ id: 'a', type: 'position', position: node.position }]);
  });
  expect(currentFlow().nodes?.[0]?.position).toEqual(node.position);
  act(() => {
    currentFlow().onNodeDragStop?.(new MouseEvent('mouseup'), node, [node]);
  });
  expect(move).toHaveBeenCalledWith('a', node.position);
  expect(currentFlow().nodes?.[0]?.position).toEqual({ x: 0, y: 0 });
  currentFlow().onConnect?.({ source: 'a', target: 'b', sourceHandle: null, targetHandle: null });
  expect(connect).toHaveBeenCalledWith('a', 'b');
  currentFlow().onConnect?.({ source: '', target: 'b', sourceHandle: null, targetHandle: null });
  expect(connect).toHaveBeenCalledTimes(1);
  const screenToFlowPosition = vi.fn().mockReturnValue({ x: 8, y: 9 });
  currentFlow().onInit?.({ screenToFlowPosition } as unknown as ReactFlowInstance);
  expect(center.current?.()).toEqual({ x: 8, y: 9 });
  act(() => {
    captured.resize?.([{ contentRect: { width: 600, height: 400 } } as ResizeObserverEntry], {} as ResizeObserver);
  });
  expect(currentFlow().minZoom).toBeGreaterThan(0);
  unmount();
  expect(center.current).toBeNull();
  expect(disconnect).toHaveBeenCalled();
});

test('custom cards and edge labels preserve display and editing affordances', () => {
  const select = vi.fn();
  render(<DiagramCanvas diagram={diagram} editing selection={{ kind: 'edge', id: 'edge' }} onSelect={select} />);
  const Card = currentFlow().nodeTypes?.['card'] as ComponentType<Pick<NodeProps, 'data'>>;
  const Edge = currentFlow().edgeTypes?.['wrapped'] as ComponentType<EdgeProps>;
  expect(currentFlow().edges?.[0]?.selected).toBe(true);
  const edgeSelection = currentFlow().edges?.[0]?.data?.['select'];
  if (typeof edgeSelection !== 'function') throw new TypeError('Missing edge callback');
  (edgeSelection as () => void)();
  expect(select).toHaveBeenCalledWith({ kind: 'edge', id: 'edge' });
  const { rerender } = render(<Card data={{ label: 'Card', description: 'Details', color: 'green' }} />);
  expect(screen.getByText('Details')).toBeTruthy();
  rerender(<Card data={{ label: '' }} />);
  expect(screen.getByText('Untitled component')).toBeTruthy();
  const edgeProps: EdgeProps = {
    id: 'edge',
    source: 'a',
    target: 'a',
    sourceX: 0,
    sourceY: 0,
    targetX: 200,
    targetY: 0,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    label: 'Link',
    selected: true,
    data: { editing: true, select }
  };
  const rendered = render(<Edge {...edgeProps} />);
  fireEvent.click(screen.getByRole('button', { name: 'Select connection: Link' }));
  expect(select).toHaveBeenCalledTimes(2);
  rendered.rerender(<Edge {...edgeProps} data={{ editing: false, select }} />);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Select connection: Link' }).disabled).toBe(
    true
  );
  rendered.rerender(<Edge {...edgeProps} label="" />);
  expect(screen.queryByRole('button', { name: 'Select connection: Link' })).toBeNull();
});
