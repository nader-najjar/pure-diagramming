import { useEffect, useMemo, useRef, useState } from 'react';
import { applyNodeChanges, Background, BaseEdge, Controls, EdgeLabelRenderer, getSmoothStepPath, Handle, MarkerType, Position, ReactFlow, type Edge, type EdgeProps, type Node, type NodeProps, type ReactFlowInstance } from '@xyflow/react';
import type { Diagram } from './model';
import type { Selection } from './EditorPanels';
import { edgeLabelMaxWidth, minimumFitZoom } from './view';

function DiagramCard({ data }: NodeProps<Node<{ label: string; description?: string; color?: string }>>) {
  return <article className={`diagram-card ${data.color ?? 'blue'}`}><Handle type="target" position={Position.Left} /><span className="card-accent" /><strong>{data.label || 'Untitled component'}</strong>{data.description && <p>{data.description}</p>}<Handle type="source" position={Position.Right} /></article>;
}
const nodeTypes = { card: DiagramCard };
type LabeledEdge = Edge<{ editing: boolean; select: () => void }>;
/** HTML labels wrap at a bounded width instead of extending an unbounded SVG line. */
function WrappedEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, label, data, selected }: EdgeProps<LabeledEdge>) {
  const [path, x, y] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return <><BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
    {label && <EdgeLabelRenderer><button type="button" className={`edge-label nodrag nopan ${selected ? 'selected' : ''}`} style={{ maxWidth: edgeLabelMaxWidth(sourceX, targetX), transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }} disabled={!data?.editing} aria-label={`Select connection: ${label}`} onClick={event => { event.stopPropagation(); data?.select(); }}>{label}</button></EdgeLabelRenderer>}
  </>;
}
const edgeTypes = { wrapped: WrappedEdge };
const projectNodes = (diagram: Diagram) => diagram.nodes.map(node => ({ id: node.id, position: node.position, data: node.data, type: 'card' }));

/** Drag previews stay here; only a completed gesture changes the document. */
export function DiagramCanvas({ diagram, editing = false, selection = null, onSelect, onMove, onConnect, centerRef }: {
  diagram: Diagram; editing?: boolean; selection?: Selection; onSelect?: (selection: Selection) => void;
  onMove?: (id: string, position: { x: number; y: number }) => void;
  onConnect?: (source: string, target: string) => void;
  centerRef?: { current: (() => { x: number; y: number }) | null };
}) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<Pick<ReactFlowInstance, 'screenToFlowPosition'> | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [nodes, setNodes] = useState<Node[]>(() => projectNodes(diagram));
  useEffect(() => { setNodes(projectNodes(diagram)); }, [diagram]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(container.current); return () => observer.disconnect();
  }, []);
  useEffect(() => { if (centerRef) centerRef.current = () => { const rect = container.current!.getBoundingClientRect(); return instance.current?.screenToFlowPosition({ x: rect.left + rect.width / 2 - 120, y: rect.top + rect.height / 2 - 70 }) ?? { x: 0, y: 0 }; }; return () => { if (centerRef) centerRef.current = null; }; }, [centerRef]);
  const edges = useMemo(() => diagram.edges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target, label: edge.label, selected: selection?.kind === 'edge' && selection.id === edge.id, type: 'wrapped', data: { editing, select: () => onSelect?.({ kind: 'edge', id: edge.id }) }, markerEnd: { type: MarkerType.ArrowClosed } })), [diagram.edges, selection, editing, onSelect]);
  return <div ref={container} className={`flow-container ${editing ? 'is-editing' : ''}`}><ReactFlow nodes={nodes.map(node => ({ ...node, selected: selection?.kind === 'node' && selection.id === node.id }))} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
    onInit={value => { instance.current = value; }} onNodesChange={changes => setNodes(current => applyNodeChanges(changes, current))}
    onNodeClick={(_, node) => { if (editing) onSelect?.({ kind: 'node', id: node.id }); }} onEdgeClick={(_, edge) => { if (editing) onSelect?.({ kind: 'edge', id: edge.id }); }} onPaneClick={() => { if (editing) onSelect?.(null); }}
    onNodeDragStop={(_, node) => { onMove?.(node.id, node.position); setNodes(projectNodes(diagram)); }}
    onConnect={connection => { if (connection.source && connection.target) onConnect?.(connection.source, connection.target); }}
    fitView fitViewOptions={{ padding: 0.15, maxZoom: 1 }} minZoom={minimumFitZoom(diagram, size.width, size.height)} maxZoom={3}
    nodesDraggable={editing} nodesConnectable={editing} elementsSelectable={editing} multiSelectionKeyCode={null} selectionOnDrag={false} nodesFocusable={false} edgesFocusable={false}
    deleteKeyCode={null} aria-label={`Diagram: ${diagram.title}`}><Background gap={24} size={1} color="#d6dcd8" /><Controls showInteractive={false} /></ReactFlow></div>;
}
