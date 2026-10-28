// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps, ReactElement } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/App';
import type { DiagramCanvas } from '../src/DiagramCanvas';
import { captureDiagramPng } from '../src/export-png';
import { serialize, type Diagram } from '../src/model';

type CanvasProps = ComponentProps<typeof DiagramCanvas>;
const captured: { canvas?: CanvasProps } = {};
const downloads: string[] = [];
const createUrl = vi.fn<(blob: Blob) => string>();
const revokeUrl = vi.fn<(url: string) => void>();
vi.mock('../src/DiagramCanvas', () => ({
  DiagramCanvas: (props: CanvasProps): ReactElement => {
    captured.canvas = props;
    return (
      <div data-testid="canvas">
        {props.diagram.nodes.length}
        {' '}
        rendered nodes
      </div>
    );
  }
}));
vi.mock('../src/export-png', () => ({ captureDiagramPng: vi.fn() }));
const example: Diagram = {
  schemaVersion: 1,
  title: 'Example',
  nodes: [
    { id: 'a', position: { x: 0, y: 0 }, data: { label: 'Alpha' } },
    { id: 'b', position: { x: 400, y: 0 }, data: { label: 'Beta' } }
  ],
  edges: [{ id: 'edge', source: 'a', target: 'b', label: 'Link' }],
  viewport: { x: 0, y: 0, zoom: 1 }
};
const project = { name: 'Test project', tagline: 'Test diagram', description: 'A test example' };
function canvas(): CanvasProps {
  if (captured.canvas === undefined) throw new Error('Missing canvas');
  return captured.canvas;
}
function show(embedded = false, startupError = ''): ReturnType<typeof render> {
  return render(<App initial={example} embedded={embedded} startupError={startupError} project={project} />);
}
function click(name: string): void {
  fireEvent.click(screen.getByRole('button', { name }));
}
function upload(source: string, size = source.length): void {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error('Missing file input');
  const file = new File([source], 'diagram.json');
  Object.defineProperties(file, {
    text: { value: (): Promise<string> => Promise.resolve(source) },
    size: { value: size }
  });
  fireEvent.change(input, { target: { files: [file] } });
}
beforeEach(() => {
  localStorage.clear();
  downloads.length = 0;
  createUrl.mockReturnValue('blob:download');
  Object.defineProperties(URL, {
    createObjectURL: { configurable: true, value: createUrl },
    revokeObjectURL: { configurable: true, value: revokeUrl }
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement): void { this.open = true; } },
    close: { configurable: true, value: function (this: HTMLDialogElement): void { this.open = false; } }
  });
});
afterEach(() => {
  cleanup();
  document.head.querySelectorAll('script,style,link').forEach((element) => {
    element.remove();
  });
  vi.useRealTimers();
});

test('editing connects the canvas, inspector and history without modifying the bundled document', () => {
  show();
  click('Edit diagram');
  act(() => {
    canvas().onSelect?.({ kind: 'node', id: 'a' });
  });
  fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Renamed' } });
  click('Apply');
  expect(canvas().diagram.nodes[0]?.data.label).toBe('Renamed');
  act(() => {
    canvas().onMove?.('a', { x: 12.125, y: 20 });
  });
  expect(canvas().diagram.nodes[0]?.position.x).toBe(12.125);
  click('Undo');
  expect(canvas().diagram.nodes[0]?.position.x).toBe(0);
  click('Redo');
  expect(canvas().diagram.nodes[0]?.position.x).toBe(12.125);
  act(() => {
    canvas().onSelect?.({ kind: 'edge', id: 'edge' });
  });
  click('Apply');
  expect(screen.getByRole('status').textContent).toContain('No document change');
  fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Changed edge' } });
  click('Apply');
  expect(canvas().diagram.edges[0]?.label).toBe('Changed edge');
  click('Delete');
  expect(canvas().diagram.edges).toHaveLength(0);
  act(() => {
    canvas().onConnect?.('a', 'b');
  });
  expect(canvas().diagram.edges).toHaveLength(1);
  act(() => {
    canvas().onConnect?.('a', 'a');
  });
  expect(screen.getByRole('status').textContent).toContain('self-connection');
  click('Add component');
  expect(canvas().diagram.nodes).toHaveLength(3);
  click('Delete');
  expect(canvas().diagram.nodes).toHaveLength(2);
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Renamed diagram' } });
  click('Apply');
  expect(canvas().diagram.title).toBe('Renamed diagram');
  click('View only');
  expect(screen.queryByLabelText('Diagram inspector')).toBeNull();
  expect(example.title).toBe('Example');
});

test('JSON editing and reset are staged, validated and undoable', () => {
  show();
  click('Edit diagram');
  click('Edit JSON');
  fireEvent.change(screen.getByLabelText('Document JSON'), { target: { value: '{' } });
  click('Apply JSON');
  expect(screen.getByRole('alert').textContent).toContain('Invalid JSON');
  fireEvent.change(screen.getByLabelText('Document JSON'), {
    target: { value: serialize({ ...example, title: 'From JSON' }) }
  });
  click('Apply JSON');
  expect(canvas().diagram.title).toBe('From JSON');
  click('Reset example');
  const dialog = screen.getByRole('dialog');
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(canvas().diagram.title).toBe('From JSON');
  click('Reset example');
  click('Apply replacement');
  expect(canvas().diagram.title).toBe('Example');
  click('Edit JSON');
  fireEvent.change(screen.getByLabelText('Document JSON'), { target: { value: '{}' } });
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(screen.queryByLabelText('Document JSON')).toBeNull();
});

test('file import validates before replacement and preserves previous state on failure', async () => {
  show(true, 'Initial file failed');
  const inputClick = vi.spyOn(HTMLInputElement.prototype, 'click');
  click('Open JSON');
  expect(inputClick).toHaveBeenCalledOnce();
  upload('invalid');
  await waitFor(() => {
    expect(screen.getByRole('status').textContent).toContain('Could not open');
  });
  expect(canvas().diagram.title).toBe('Example');
  upload('{}', 5_000_001);
  await waitFor(() => {
    expect(screen.getByRole('status').textContent).toContain('smaller than 5 MB');
  });
  upload(serialize({ ...example, title: 'Imported' }));
  await screen.findByRole('button', { name: 'Apply replacement' });
  expect(canvas().diagram.title).toBe('Example');
  click('Apply replacement');
  expect(canvas().diagram.title).toBe('Imported');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('Current document matches the opened JSON file.')).toBeTruthy();
  click('Undo');
  expect(canvas().diagram.title).toBe('Example');
});

test('JSON and standalone HTML exports use current source and report download failures', () => {
  vi.useFakeTimers();
  show(true);
  expect(screen.getByText('Current document matches this viewing file.')).toBeTruthy();
  click('Download JSON');
  expect(downloads).toEqual(['diagram.json']);
  expect(createUrl.mock.calls[0]?.[0].type).toBe('application/json');
  expect(screen.getByRole('status').textContent).toContain('JSON download requested');
  act(() => {
    vi.advanceTimersByTime(30_000);
  });
  expect(revokeUrl).toHaveBeenCalledWith('blob:download');
  createUrl.mockImplementationOnce(() => {
    throw new Error('downloads denied');
  });
  click('Download JSON');
  expect(screen.getByRole('status').textContent).toContain('Download failed');
  const external = document.createElement('script');
  external.src = 'https://example.test/app.js';
  document.head.append(external);
  click('Download HTML');
  expect(screen.getByRole('status').textContent).toContain('development server');
  external.remove();
  click('Download HTML');
  expect(screen.getByRole('status').textContent).toContain('complete inline');
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = 'console.log("portable");';
  const style = document.createElement('style');
  style.textContent = 'body { color: black; }';
  document.head.append(script, style);
  click('Download HTML');
  expect(downloads.at(-1)).toBe('diagram-view.html');
  expect(screen.getByRole('status').textContent).toContain('HTML viewing file requested');
});

test('PNG success and failure restore controls and reject capture of a changed revision', async () => {
  show();
  vi.mocked(captureDiagramPng).mockImplementationOnce((_canvas, ids, assertCurrent) => {
    expect(ids).toEqual(['a', 'b']);
    assertCurrent();
    return Promise.resolve({ blob: new Blob(['png']), width: 600, height: 400 });
  });
  click('Export PNG');
  await waitFor(() => {
    expect(screen.getByRole('status').textContent).toContain('600 × 400');
  });
  expect(downloads.at(-1)).toBe('diagram.png');
  vi.mocked(captureDiagramPng).mockRejectedValueOnce(new Error('image too large'));
  click('Export PNG');
  await waitFor(() => {
    expect(screen.getByRole('status').textContent).toContain('image too large');
  });
  click('Edit diagram');
  let finish: (() => void) | undefined;
  vi.mocked(captureDiagramPng).mockImplementationOnce(
    (_canvas, _ids, assertCurrent) =>
      new Promise((resolve, reject) => {
        finish = (): void => {
          try {
            assertCurrent();
            resolve({ blob: new Blob(['png']), width: 1, height: 1 });
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        };
      })
  );
  click('Export PNG');
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Exporting image…' }).disabled).toBe(true);
  click('Add component');
  await act(async () => {
    finish?.();
    await Promise.resolve();
  });
  expect(screen.getByRole('status').textContent).toContain('changed during image capture');
});

test('recovery requires explicit choice and empty diagrams retain a useful view', () => {
  const empty = { ...example, title: '', nodes: [], edges: [] };
  localStorage.setItem(`pure-diagramming:v1:${project.name}:${location.pathname}`, serialize(empty));
  show();
  click('Edit diagram');
  click('Cancel');
  expect(canvas().diagram.title).toBe('Example');
  click('Edit diagram');
  click('Resume recovery');
  expect(canvas().diagram.nodes).toHaveLength(0);
  expect(screen.getByText('A clean canvas — add a component to begin.')).toBeTruthy();
  click('View only');
  expect(screen.getByText('A clean canvas — select Edit diagram to begin.')).toBeTruthy();
});

test('replacing recovery and retrying failed browser writes keeps editing usable', () => {
  localStorage.setItem(
    `pure-diagramming:v1:${project.name}:${location.pathname}`,
    serialize({ ...example, title: 'Draft' })
  );
  show();
  click('Edit diagram');
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  click('Edit current · replace recovery');
  expect(canvas().diagram.title).toBe('Example');
  expect(screen.getByRole('button', { name: 'Retry browser recovery' })).toBeTruthy();
  write.mockRestore();
  click('Retry browser recovery');
  expect(screen.queryByRole('button', { name: 'Retry browser recovery' })).toBeNull();
});

test('display renaming preserves the explicit recovery flow under its stable name', () => {
  const key = `pure-diagramming:v1:Pure Diagramming:${location.pathname}`;
  const draft = serialize({ ...example, title: 'Existing draft' });
  localStorage.setItem(key, draft);
  render(
    <App
      initial={example}
      embedded={false}
      startupError=""
      project={{ ...project, name: 'Pure Schematic', recoveryName: 'Pure Diagramming' }}
    />
  );
  expect(canvas().diagram.title).toBe('Example');
  click('Edit diagram');
  click('Cancel');
  expect(canvas().diagram.title).toBe('Example');
  expect(localStorage.getItem(key)).toBe(draft);
  click('Edit diagram');
  click('Resume recovery');
  expect(canvas().diagram.title).toBe('Existing draft');
  expect(localStorage.getItem(key)).toBe(draft);
});
