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
