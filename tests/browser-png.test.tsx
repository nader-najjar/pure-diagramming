// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { toBlob } from 'html-to-image';
import { captureDiagramPng } from '../src/export-png';

vi.mock('html-to-image', () => ({ toBlob: vi.fn() }));

function rectangle(x: number, y: number, width: number, height: number): DOMRect {
  return new DOMRect(x, y, width, height);
}
function canvas(): HTMLElement {
  const element = document.createElement('section');
  element.innerHTML
    = '<div class="react-flow__viewport"><div class="react-flow__node selected" data-id="a">'
      + '<i class="react-flow__handle"></i></div><span class="edge-label" style="width: 50.2px">Link</span></div>';
  const viewport = element.querySelector<HTMLElement>('.react-flow__viewport');
  const node = element.querySelector<HTMLElement>('.react-flow__node');
  const label = element.querySelector<HTMLElement>('.edge-label');
  if (viewport === null || node === null || label === null) throw new Error('Incomplete test fixture');
  vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(rectangle(100, 200, 400, 200));
  vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(rectangle(120, 220, 200, 100));
  vi.spyOn(label, 'getBoundingClientRect').mockReturnValue(rectangle(330, 250, 70, 20));
  Object.defineProperties(node, { offsetWidth: { value: 200 }, offsetHeight: { value: 100 } });
  document.body.append(element);
  return element;
}

beforeEach(() => {
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } });
  vi.stubGlobal(
    'DOMMatrixReadOnly',
    class {
      public a = 2;
    }
  );
});
afterEach(() => {
  document.body.replaceChildren();
});

test('PNG captures an isolated whole-diagram snapshot and always removes its staging element', async () => {
  const element = canvas();
  const blob = new Blob(['png'], { type: 'image/png' });
  const current = vi.fn();
  vi.mocked(toBlob).mockImplementation((snapshot, options) => {
    expect(snapshot.querySelector('.react-flow__handle')).toBeNull();
    expect(snapshot.querySelector('.selected')).toBeNull();
    expect(snapshot.querySelector<HTMLElement>('.edge-label')?.style.width).toBe('53px');
    expect(options).toMatchObject({ pixelRatio: 2, skipFonts: true, width: 204, height: 114 });
    expect(document.querySelector('[aria-hidden="true"]')).not.toBeNull();
    return Promise.resolve(blob);
  });
  await expect(captureDiagramPng(element, ['a'], current)).resolves.toEqual({ blob, width: 408, height: 228 });
  expect(current).toHaveBeenCalledTimes(2);
  expect(element.querySelector('.selected')).not.toBeNull();
  expect(element.querySelector('.react-flow__handle')).not.toBeNull();
  expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
});

test('PNG rejects absent or unfinished nodes and invalid viewport zoom', async () => {
  const element = canvas();
  const current = vi.fn();
  await expect(captureDiagramPng(document.createElement('div'), ['a'], current)).rejects.toThrow(
    'Add a component'
  );
  await expect(captureDiagramPng(element, [], current)).rejects.toThrow('Add a component');
  await expect(captureDiagramPng(element, ['a', 'b'], current)).rejects.toThrow('still rendering');
  await expect(captureDiagramPng(element, ['other'], current)).rejects.toThrow('still rendering');
  vi.stubGlobal(
    'DOMMatrixReadOnly',
    class {
      public a = 0;
    }
  );
  await expect(captureDiagramPng(element, ['a'], current)).rejects.toThrow('view is not ready');
});

test('PNG cleanup survives encoder failures, empty output and a changed document', async () => {
  const element = canvas();
  vi.mocked(toBlob).mockRejectedValueOnce(new Error('encoder failed'));
  await expect(captureDiagramPng(element, ['a'], vi.fn())).rejects.toThrow('encoder failed');
  expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
  vi.mocked(toBlob).mockResolvedValueOnce(null);
  await expect(captureDiagramPng(element, ['a'], vi.fn())).rejects.toThrow('could not create');
  vi.mocked(toBlob).mockResolvedValueOnce(new Blob([]));
  await expect(captureDiagramPng(element, ['a'], vi.fn())).rejects.toThrow('could not create');
  vi.mocked(toBlob).mockResolvedValueOnce(new Blob(['png']));
  const current = vi
    .fn()
    .mockImplementationOnce(() => { /* Initial document check succeeds. */ })
    .mockImplementationOnce(() => {
      throw new Error('document changed');
    });
  await expect(captureDiagramPng(element, ['a'], current)).rejects.toThrow('document changed');
  expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
});
