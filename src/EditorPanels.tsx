import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Diagram, DiagramNode } from './model';
export type Selection = { kind: 'node' | 'edge'; id: string } | null;

export function Modal({ title, children, onCancel }: { title: string; children: ReactNode; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="editor-dialog" onCancel={event => { event.preventDefault(); onCancel(); }}><h2>{title}</h2>{children}</dialog>;
}

export function Inspector({ diagram, selection, onNode, onEdge, onTitle, onDelete, onSelect, onConnect }: {
  diagram: Diagram; selection: Selection;
  onNode: (id: string, data: { label: string; description?: string; color?: DiagramNode['data']['color'] }) => void;
  onEdge: (id: string, label: string) => void; onTitle: (title: string) => void;
  onDelete: () => void; onSelect: (selection: Selection) => void; onConnect: (source: string, target: string) => void;
}) {
  const node = selection?.kind === 'node' ? diagram.nodes.find(item => item.id === selection.id) : undefined;
  const edge = selection?.kind === 'edge' ? diagram.edges.find(item => item.id === selection.id) : undefined;
  const [label, setLabel] = useState(node?.data.label ?? edge?.label ?? diagram.title);
  const [description, setDescription] = useState(node?.data.description ?? '');
  const [color, setColor] = useState(node?.data.color ?? 'blue');
  const [source, setSource] = useState(diagram.nodes[0]?.id ?? '');
  const [target, setTarget] = useState(diagram.nodes[1]?.id ?? '');
  function cancel() { setLabel(node?.data.label ?? edge?.label ?? diagram.title); setDescription(node?.data.description ?? ''); setColor(node?.data.color ?? 'blue'); }
  // Refresh staged properties without resetting the independently chosen endpoints.
  useEffect(() => { cancel(); }, [diagram, selection]);
  useEffect(() => {
    setSource(current => diagram.nodes.some(item => item.id === current) ? current : '');
    setTarget(current => diagram.nodes.some(item => item.id === current) ? current : '');
  }, [diagram.nodes]);
  return <aside className="inspector" aria-label="Diagram inspector">
    <h3>{node ? 'Component' : edge ? 'Connection' : 'Diagram title'}</h3>
    <p className="hint">Edits are staged until Apply. Selecting another item discards this form.</p>
    <label>Inspect<select value={selection ? `${selection.kind}:${selection.id}` : ''} onChange={event => { const value = event.target.value; const colon = value.indexOf(':'); onSelect(value ? { kind: value.slice(0, colon) as 'node' | 'edge', id: value.slice(colon + 1) } : null); }}>
      <option value="">Diagram title</option>{diagram.nodes.map(item => <option key={`node:${item.id}`} value={`node:${item.id}`}>Component: {item.data.label || item.id}</option>)}{diagram.edges.map(item => <option key={`edge:${item.id}`} value={`edge:${item.id}`}>Connection: {item.label || item.id}</option>)}
    </select></label>
    <form onSubmit={event => { event.preventDefault(); if (node) onNode(node.id, { label, ...(description !== (node.data.description ?? '') ? { description } : {}), ...(color !== (node.data.color ?? 'blue') ? { color } : {}) }); else if (edge) onEdge(edge.id, label); else onTitle(label); }}>
      <label>{node || edge ? 'Label' : 'Title'}<input maxLength={160} value={label} onChange={event => setLabel(event.target.value)} /></label>
      {node && <><label>Description<textarea maxLength={500} value={description} onChange={event => setDescription(event.target.value)} /></label><label>Color<select value={color} onChange={event => setColor(event.target.value as typeof color)}><option value="blue">Blue</option><option value="purple">Purple</option><option value="green">Green</option></select></label></>}
      <div className="button-row"><button className="primary" type="submit">Apply</button><button type="button" onClick={cancel}>Cancel</button>{(node || edge) && <button type="button" className="danger" onClick={onDelete}>Delete</button>}</div>
      {node && <p className="hint">Deleting also removes its connections. Undo restores both.</p>}
    </form>
    <hr /><h3>Connect components</h3>
    <form onSubmit={event => { event.preventDefault(); onConnect(source, target); }}><label>From<select value={source} onChange={event => setSource(event.target.value)}><option value="">Choose component</option>{diagram.nodes.map(item => <option key={item.id} value={item.id}>{item.data.label || item.id}</option>)}</select></label><label>To<select value={target} onChange={event => setTarget(event.target.value)}><option value="">Choose component</option>{diagram.nodes.map(item => <option key={item.id} value={item.id}>{item.data.label || item.id}</option>)}</select></label><button disabled={!source || !target}>Connect</button></form>
  </aside>;
}
