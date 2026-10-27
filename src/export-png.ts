import { toBlob } from 'html-to-image';
import { imageBounds, PNG_PIXEL_RATIO } from './image-bounds';

/** Capture an isolated DOM snapshot. Never pan, relayout or restyle the live diagram. */
export async function captureDiagramPng(canvas: HTMLElement, nodeIds: string[], assertCurrent: () => void) {
  await document.fonts.ready;
  assertCurrent();
  const viewport = canvas.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewport || !nodeIds.length) throw new Error('Add a component before exporting an image.');
  const nodes = Array.from(viewport.querySelectorAll<HTMLElement>('.react-flow__node'));
  if (nodes.length !== nodeIds.length || nodes.some(node => !nodeIds.includes(node.dataset.id ?? '') || !node.offsetWidth || !node.offsetHeight)) throw new Error('Components are still rendering. Try exporting again.');
  const transform = new DOMMatrixReadOnly(getComputedStyle(viewport).transform);
  const zoom = transform.a;
  if (!Number.isFinite(zoom) || zoom <= 0) throw new Error('The canvas view is not ready to capture.');
  const origin = viewport.getBoundingClientRect();
  // Edge paths and HTML labels can extend beyond the node-only bounding box.
  const elements = [...nodes, ...viewport.querySelectorAll('.react-flow__edge-path, .edge-label')];
  const bounds = imageBounds(elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { x: (rect.left - origin.left) / zoom, y: (rect.top - origin.top) / zoom, width: rect.width / zoom, height: rect.height / zoom };
  }));
  const snapshot = viewport.cloneNode(true) as HTMLElement;
  snapshot.querySelectorAll('.react-flow__handle').forEach(element => element.remove());
  snapshot.querySelectorAll('.selected').forEach(element => element.classList.remove('selected'));
  Object.assign(snapshot.style, { width: `${bounds.width}px`, height: `${bounds.height}px`, transform: `translate(${-bounds.x}px, ${-bounds.y}px) scale(1)` });
  const stage = document.createElement('div');
  stage.className = 'react-flow';
  stage.setAttribute('aria-hidden', 'true');
  stage.inert = true;
  Object.assign(stage.style, { position: 'fixed', left: '-100000px', top: '0', width: `${bounds.width}px`, height: `${bounds.height}px`, pointerEvents: 'none', overflow: 'hidden', background: '#f9fbf7' });
  stage.append(snapshot);
  document.body.append(stage);
  // Fractional browser zoom can round shrink-to-fit text widths down during
  // SVG serialization. Leave two pixels of slack, still capped by max-width.
  snapshot.querySelectorAll<HTMLElement>('.edge-label').forEach(label => {
    label.style.width = `${Math.ceil(parseFloat(getComputedStyle(label).width)) + 2}px`;
  });
  try {
    const blob = await toBlob(snapshot, { width: bounds.width, height: bounds.height, pixelRatio: PNG_PIXEL_RATIO, backgroundColor: '#f9fbf7', skipFonts: true, style: { position: 'relative', left: '0', top: '0' } });
    if (!blob?.size) throw new Error('The browser could not create the image. Try a smaller diagram or use HTML/JSON.');
    assertCurrent();
    return { blob, width: bounds.width * PNG_PIXEL_RATIO, height: bounds.height * PNG_PIXEL_RATIO };
  } finally { stage.remove(); }
}
