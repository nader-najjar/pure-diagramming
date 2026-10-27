import type { Diagram } from './model';

/** Conservative bounds include the largest supported wrapped card and edge label. */
export function minimumFitZoom(diagram: Diagram, width: number, height: number): number {
  if (!diagram.nodes.length) return 0.02;
  const xs = diagram.nodes.map(node => node.position.x);
  const ys = diagram.nodes.map(node => node.position.y);
  const spanX = Math.max(...xs) - Math.min(...xs) + 2400;
  const spanY = Math.max(...ys) - Math.min(...ys) + 2400;
  return Math.min(0.02, Math.max(1, width) / spanX / 2, Math.max(1, height) / spanY / 2);
}

/** Right-to-left handles on forward routes share the clear horizontal gap.
 * Keep a readable minimum for nearly touching nodes; arbitrary overlaps still
 * need a human layout change. Reverse/vertical routes retain the normal width.
 */
export function edgeLabelMaxWidth(sourceX: number, targetX: number): number {
  const gap = targetX - sourceX;
  return gap > 0 ? Math.min(160, Math.max(24, gap - 16)) : 160;
}
