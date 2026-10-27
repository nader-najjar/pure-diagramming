import { useEffect, useMemo, useRef, useState } from 'react';
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Node, type NodeProps } from '@xyflow/react';
import type { Diagram } from './model';
import { minimumFitZoom } from './view';

function DiagramCard({ data }: NodeProps<Node<{ label: string; description?: string; color?: string }>>) {
  return <article className={`diagram-card ${data.color ?? 'blue'}`}>
    <Handle type="target" position={Position.Left} />
    <span className="card-accent" />
    <strong>{data.label || 'Untitled component'}</strong>
    {data.description && <p>{data.description}</p>}
    <Handle type="source" position={Position.Right} />
  </article>;
}
const nodeTypes = { card: DiagramCard };

/** Project only supported semantic fields, never arbitrary renderer props. */
export function DiagramCanvas({ diagram }: { diagram: Diagram }) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const minZoom = minimumFitZoom(diagram, size.width, size.height);
  const nodes = useMemo(() => diagram.nodes.map(node => ({
    id: node.id, position: node.position, data: node.data, type: 'card',
  })), [diagram.nodes]);
  const edges = useMemo(() => diagram.edges.map(edge => ({
    id: edge.id, source: edge.source, target: edge.target, label: edge.label,
    type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed },
  })), [diagram.edges]);
  return <div ref={container} className="flow-container"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
    fitView fitViewOptions={{ padding: 0.15, maxZoom: 1 }} minZoom={minZoom} maxZoom={3}
    nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
    deleteKeyCode={null} aria-label={`Diagram: ${diagram.title}`}>
    <Background gap={24} size={1} color="#d6dcd8" />
    <Controls showInteractive={false} />
  </ReactFlow></div>;
}
