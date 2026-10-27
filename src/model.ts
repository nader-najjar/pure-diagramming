/** The document is plain JSON, never a React Flow instance or its measured state. */
export interface DiagramNode {
  id: string;
  position: { x: number; y: number; [key: string]: unknown };
  data: {
    label: string;
    description?: string;
    color?: 'blue' | 'purple' | 'green';
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  [key: string]: unknown;
}
export interface Diagram {
  schemaVersion: 1;
  title: string;
  description?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: { x: number; y: number; zoom: number; [key: string]: unknown };
  [key: string]: unknown;
}

export const MAX_COORDINATE = 1_000_000;
export const MAX_JSON_BYTES = 5_000_000;
export const MAX_NODES = 1000;
export const MAX_EDGES = 3000;
export const MAX_LABEL_LENGTH = 160;
export const MAX_DESCRIPTION_LENGTH = 500;
const bytes = (text: string) => new TextEncoder().encode(text).byteLength;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function text(value: unknown, name: string, max?: number): asserts value is string {
  requireValue(typeof value === 'string', `${name} must be text.`);
  requireValue(max === undefined || value.length <= max, `${name} must be at most ${max} characters; shorten it before importing.`);
}

/** Reject values JSON.stringify would silently lose, including in unknown metadata. */
function requireJson(value: unknown, depth = 0, ancestors = new Set<object>()): void {
  requireValue(depth <= 100, 'JSON nesting exceeds 100 levels; simplify nested metadata.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    requireValue(Number.isFinite(value), 'All JSON numbers, including metadata, must be finite.');
    return;
  }
  requireValue(typeof value === 'object' && value !== null, 'Document and metadata must contain only JSON values.');
  requireValue(!ancestors.has(value), 'Document metadata must not contain circular references.');
  requireValue(Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null,
    'Document metadata must use plain JSON objects, not class instances.');
  ancestors.add(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) requireJson(value[i], depth + 1, ancestors);
  } else {
    for (const entry of Object.values(value)) requireJson(entry, depth + 1, ancestors);
  }
  ancestors.delete(value);
}
const formatted = (value: unknown) => JSON.stringify(value, null, 2) + '\n';

/** Validate without coercing, sorting, generating IDs, or removing extra fields. */
export function validateDiagram(value: unknown): Diagram {
  requireJson(value);
  requireValue(object(value), 'Expected a diagram object.');
  requireValue(value.schemaVersion === 1, 'Unsupported schemaVersion; this viewer accepts version 1. Keep the original file and use a compatible version.');
  text(value.title, 'Diagram title', MAX_LABEL_LENGTH);
  if (value.description !== undefined) text(value.description, 'Diagram description');
  requireValue(Array.isArray(value.nodes) && value.nodes.length <= MAX_NODES, 'Expected a nodes array with at most 1,000 nodes.');
  requireValue(Array.isArray(value.edges) && value.edges.length <= MAX_EDGES, 'Expected an edges array with at most 3,000 connections.');
  const ids = new Set<string>();
  for (const node of value.nodes) {
    requireValue(object(node), 'Each node must be an object.');
    requireValue(typeof node.id === 'string' && node.id.length > 0 && !ids.has(node.id), 'Node IDs must be unique nonempty strings.');
    ids.add(node.id);
    requireValue(object(node.position) && finite(node.position.x) && finite(node.position.y) && Math.abs(node.position.x) <= MAX_COORDINATE && Math.abs(node.position.y) <= MAX_COORDINATE, `Node ${node.id}: position must contain finite x and y coordinates between -1,000,000 and 1,000,000.`);
    requireValue(object(node.data), `Node ${node.id}: data must be an object.`);
    text(node.data.label, `Node ${node.id}: label`, MAX_LABEL_LENGTH);
    if (node.data.description !== undefined) text(node.data.description, `Node ${node.id}: description`, MAX_DESCRIPTION_LENGTH);
    requireValue(node.data.color === undefined || (typeof node.data.color === 'string' && ['blue', 'purple', 'green'].includes(node.data.color)),
      `Node ${node.id}: unsupported color; use blue, purple or green, or omit color for blue.`);
  }
  const edgeIds = new Set<string>();
  for (const edge of value.edges) {
    requireValue(object(edge), 'Each connection must be an object.');
    requireValue(typeof edge.id === 'string' && edge.id.length > 0 && !edgeIds.has(edge.id), 'Connection IDs must be unique nonempty strings.');
    edgeIds.add(edge.id);
    requireValue(typeof edge.source === 'string' && typeof edge.target === 'string' && ids.has(edge.source) && ids.has(edge.target),
      `Connection ${edge.id}: source and target must refer to existing node IDs.`);
    if (edge.label !== undefined) text(edge.label, `Connection ${edge.id}: label`, MAX_LABEL_LENGTH);
  }
  requireValue(object(value.viewport) && finite(value.viewport.x) && finite(value.viewport.y) && finite(value.viewport.zoom)
    && value.viewport.zoom >= 0.1 && value.viewport.zoom <= 4,
  'Viewport must have finite x and y, and zoom between 0.1 and 4.');
  requireValue(bytes(formatted(value)) <= MAX_JSON_BYTES, 'Formatted JSON exceeds 5 MB; reduce the document or metadata before importing.');
  return value as unknown as Diagram;
}

export function parseDiagram(source: string): Diagram {
  requireValue(bytes(source) <= MAX_JSON_BYTES, 'JSON exceeds 5 MB (UTF-8); choose a smaller document.');
  let value: unknown;
  try { value = JSON.parse(source); }
  catch { throw new Error('Invalid JSON; check commas, quotes and brackets. The current document has not been replaced.'); }
  return validateDiagram(value);
}

/** Stable indentation and array order make targeted edits reviewable in Git. */
export function serialize(document: Diagram): string {
  return formatted(validateDiagram(document));
}
