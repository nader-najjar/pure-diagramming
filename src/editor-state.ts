import { parseDiagram, serialize, validateDiagram, type Diagram, type DiagramNode, type DiagramEdge } from './model.ts';

export const HISTORY_LIMIT = 50;
/** Conservative UTF-16 string-storage estimate, excluding the active document. */
export const HISTORY_BYTE_LIMIT = 25_000_000;

function boundedHistory(past: string[], future: string[]): { past: string[]; future: string[] } {
  let bytes = [...past, ...future].reduce((sum, snapshot) => sum + snapshot.length * 2, 0);
  while (past.length + future.length > HISTORY_LIMIT || bytes > HISTORY_BYTE_LIMIT) {
    // Keep the nearest undo and redo where possible; remove the most distant history.
    const removed = past.length > 1 || future.length === 0 ? past.shift() : future.shift();
    if (removed === undefined) break;
    bytes -= removed.length * 2;
  }
  return { past, future };
}
export interface EditorHistory {
  document: Diagram;
  past: string[];
  future: string[];
  /** Changes only for document mutations, including undo/redo, not download requests. */
  revision: number;
  /** Exact JSON passed to the download helper, not proof of a saved file. */
  downloadSnapshot: string | null;
}
export type HistoryAction =
  | { type: 'commit'; document: Diagram }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'download-requested'; snapshot: string };

export function createHistory(document: Diagram): EditorHistory {
  return { document: parseDiagram(serialize(document)), past: [], future: [], revision: 0, downloadSnapshot: null };
}

/** The caller catches rejected edits; the previous state remains unchanged. */
export function reduceHistory(state: EditorHistory, action: HistoryAction): EditorHistory {
  if (action.type === 'download-requested') {
    const snapshot = serialize(parseDiagram(action.snapshot));
    return snapshot === state.downloadSnapshot ? state : { ...state, downloadSnapshot: snapshot };
  }
  const current = serialize(state.document);
  if (action.type === 'commit') {
    const next = serialize(action.document);
    if (next === current) return state;
    return { ...state, document: parseDiagram(next), ...boundedHistory([...state.past, current], []), revision: state.revision + 1 };
  }
  if (action.type === 'undo') {
    const previous = state.past.at(-1);
    if (previous === undefined) return state;
    return { ...state, document: parseDiagram(previous), ...boundedHistory(state.past.slice(0, -1), [...state.future, current]), revision: state.revision + 1 };
  }
  const next = state.future.at(-1);
  if (next === undefined) return state;
  return { ...state, document: parseDiagram(next), ...boundedHistory([...state.past, current], state.future.slice(0, -1)), revision: state.revision + 1 };
}

export function hasUndownloadedChanges(state: EditorHistory): boolean {
  return state.downloadSnapshot !== serialize(state.document);
}

function requireNode(document: Diagram, id: string): void {
  if (!document.nodes.some(node => node.id === id)) throw new Error(`Node ${id} no longer exists; select an existing node.`);
}
export function addNode(document: Diagram, node: DiagramNode): Diagram {
  return validateDiagram({ ...document, nodes: [...document.nodes, node] });
}
export function moveNode(document: Diagram, id: string, position: { x: number; y: number }): Diagram {
  requireNode(document, id);
  return validateDiagram({ ...document, nodes: document.nodes.map(node => node.id === id
    ? { ...node, position: { ...node.position, x: position.x, y: position.y } } : node) });
}
export function editNode(document: Diagram, id: string, fields: Partial<Pick<DiagramNode['data'], 'label' | 'description' | 'color'>>): Diagram {
  requireNode(document, id);
  return validateDiagram({ ...document, nodes: document.nodes.map(node => node.id === id
    ? { ...node, data: { ...node.data, ...fields } } : node) });
}
export function renameDiagram(document: Diagram, title: string): Diagram {
  return validateDiagram({ ...document, title });
}
export function renameEdge(document: Diagram, id: string, label: string): Diagram {
  if (!document.edges.some(edge => edge.id === id)) throw new Error(`Connection ${id} no longer exists; select an existing connection.`);
  return validateDiagram({ ...document, edges: document.edges.map(edge => edge.id === id ? { ...edge, label } : edge) });
}
export function removeElement(document: Diagram, id: string, kind: 'node' | 'edge'): Diagram {
  return validateDiagram({ ...document,
    nodes: kind === 'node' ? document.nodes.filter(node => node.id !== id) : document.nodes,
    edges: document.edges.filter(edge => kind === 'edge' ? edge.id !== id : edge.source !== id && edge.target !== id),
  });
}
/** Suppress duplicate UI gestures without altering any already imported connections. */
export function connectNodes(document: Diagram, edge: DiagramEdge): Diagram {
  requireNode(document, edge.source);
  requireNode(document, edge.target);
  if (edge.source === edge.target) throw new Error('Connect two different nodes; creating a self-connection is not supported by this editor.');
  if (document.edges.some(existing => existing.source === edge.source && existing.target === edge.target)) return document;
  return validateDiagram({ ...document, edges: [...document.edges, edge] });
}

export interface RecoveryRead {
  document: Diagram | null;
  canWrite: boolean;
  message: string;
}
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unknown storage error.';

/** Read only. Bind the callback to an explicit, project-scoped storage key. */
export function readRecovery(read: () => string | null): RecoveryRead {
  try {
    const stored = read();
    if (stored === null) return { document: null, canWrite: true, message: 'No browser recovery draft. No portable file has been saved.' };
    return { document: parseDiagram(stored), canWrite: true, message: 'Browser recovery draft available. This is not a portable file or repository save.' };
  } catch (error) {
    return { document: null, canWrite: false, message: `Recovery unavailable: ${errorMessage(error)} Original browser storage left untouched; autosave paused. Download JSON to keep your work.` };
  }
}
export interface RecoveryWrite {
  saved: boolean;
  canWrite: boolean;
  message: string;
}
/** Call only after intentional workspace activation or a document change, never simply because the app booted. */
export function writeRecovery(write: (source: string) => void, document: Diagram, canWrite: boolean): RecoveryWrite {
  if (!canWrite) return { saved: false, canWrite: false, message: 'Browser recovery paused to protect prior data. Download JSON to keep your work.' };
  try {
    const source = serialize(document);
    write(source);
    return { saved: true, canWrite: true, message: 'Browser recovery updated. Download JSON for a portable copy; the repository is unchanged.' };
  } catch (error) {
    return { saved: false, canWrite: true, message: `Browser recovery failed: ${errorMessage(error)} Retry browser recovery or download JSON to keep your work.` };
  }
}
