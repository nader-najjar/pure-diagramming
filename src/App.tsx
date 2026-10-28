import { useEffect, useRef, useState, type ReactElement } from 'react';
import { DiagramCanvas } from './DiagramCanvas';
import { MAX_JSON_BYTES, parseDiagram, serialize, type Diagram } from './model';
import {
  addNode,
  connectNodes,
  editNode,
  moveNode,
  removeElement,
  renameDiagram,
  renameEdge
} from './editor-state';
import { Inspector, Modal, type Selection } from './EditorPanels';
import { useWorkspace } from './useWorkspace';
import { createPortableHtml } from './portable';
import { captureDiagramPng } from './export-png';

function documentSource(revision: number, isPortableSnapshot: boolean): string {
  if (revision !== 0) return 'Local document · repository unchanged';
  return isPortableSnapshot ? 'Portable snapshot · editable source included' : 'Bundled example';
}

function portableStatus(
  pending: boolean,
  kind: 'bundled' | 'opened' | 'requested',
  isPortableSnapshot: boolean
): string {
  if (pending) return 'Changes not yet requested as a portable download.';
  if (kind === 'requested') return 'Current JSON download requested — verify the file in Downloads.';
  if (kind === 'opened') return 'Current document matches the opened JSON file.';
  return isPortableSnapshot
    ? 'Current document matches this viewing file.'
    : 'Current document matches the bundled source.';
}

function nodeLabel(diagram: Diagram, id: string): string {
  const label = diagram.nodes.find((node) => node.id === id)?.data.label;
  return label === undefined || label === '' ? 'Untitled component' : label;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 30_000);
  }
}

export function App({
  initial,
  startupError,
  embedded,
  project
}: Readonly<{
  initial: Diagram;
  startupError: string;
  embedded: boolean;
  project: { name: string; recoveryName?: string; tagline: string; description: string };
}>): ReactElement {
  const isPortableSnapshot = embedded && startupError === '';
  // The anchor does not exist until React mounts the single-file app.
  useEffect(() => {
    if (location.hash === '#diagram') document.querySelector('#diagram')?.scrollIntoView();
  }, []);
  // Keep existing browser drafts reachable when only display branding changes.
  const recoveryName = project.recoveryName ?? project.name;
  const workspace = useWorkspace(initial, `pure-diagramming:v1:${recoveryName}:${location.pathname}`);
  const { history, editing, status, setStatus } = workspace;
  const diagram = history.document;
  const [selection, setSelection] = useState<Selection>(null);
  const [fitRevision, setFitRevision] = useState(0);
  const [replacement, setReplacement] = useState<{
    document: Diagram;
    name: string;
    portable?: boolean;
  } | null>(null);
  const [jsonDraft, setJsonDraft] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState('');
  const [openingError, setOpeningError] = useState(startupError);
  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const exportBusy = useRef(false);
  const importSequence = useRef(0);
  const centerRef = useRef<(() => { x: number; y: number }) | null>(null);
  const source = documentSource(history.revision, isPortableSnapshot);

  function mutate(operation: (document: Diagram) => Diagram): boolean {
    try {
      const before = workspace.current.current;
      if (!workspace.commit(operation(before.document))) return false;
      setStatus(
        workspace.current.current.revision === before.revision
          ? 'No document change needed.'
          : 'Change applied locally. Undo is available. Download JSON to keep a portable copy.'
      );
      return workspace.current.current.revision !== before.revision;
    } catch (error) {
      setStatus(`Change not applied: ${(error as Error).message} Your current diagram is unchanged.`);
      return false;
    }
  }
  function connect(source: string, target: string): void {
    mutate((document) => connectNodes(document, { id: crypto.randomUUID(), source, target }));
  }
  function addComponent(): void {
    const changed = mutate((document) => {
      const center = centerRef.current?.() ?? { x: 0, y: 0 };
      let position = center;
      for (
        let i = 0;
        document.nodes.some(
          (node) =>
            Math.abs(node.position.x - position.x) < 260 && Math.abs(node.position.y - position.y) < 180
        ) && i <= document.nodes.length;
        i++
      )
        position = { x: center.x + (i + 1) * 280, y: center.y };
      const id = crypto.randomUUID();
      const next = addNode(document, { id, position, data: { label: 'New component', color: 'blue' } });
      setSelection({ kind: 'node', id });
      return next;
    });
    if (changed) setFitRevision((value) => value + 1);
  }
  function cancelReplacement(): void {
    ++importSequence.current;
    setReplacement(null);
    setJsonDraft(null);
    setDialogError('');
  }
  async function openFile(file: File): Promise<void> {
    const sequence = ++importSequence.current;
    const revision = workspace.current.current.revision;
    try {
      if (file.size > MAX_JSON_BYTES) throw new Error('Choose a JSON file smaller than 5 MB.');
      const next = parseDiagram(await file.text());
      if (sequence !== importSequence.current) return;
      if (revision !== workspace.current.current.revision) {
        setStatus(
          'The document changed while the file was reading. Open the file again to review its replacement.'
        );
        return;
      }
      setReplacement({ document: next, name: file.name, portable: true });
      setDialogError('');
    } catch (error) {
      if (sequence === importSequence.current)
        setStatus(`Could not open the file: ${(error as Error).message} Your previous diagram is unchanged.`);
    }
  }
  function replace(document: Diagram, portable = false): void {
    if (!workspace.commit(document)) return;
    setOpeningError('');
    if (portable) workspace.markOpened(document);
    setSelection(null);
    setFitRevision((value) => value + 1);
    cancelReplacement();
    setStatus(
      'Replacement applied locally. Undo restores the previous document. '
      + 'Nothing was uploaded or written to the repository.'
    );
  }

  function downloadSource(): void {
    try {
      const snapshot = serialize(diagram);
      downloadBlob(new Blob([snapshot], { type: 'application/json' }), 'diagram.json');
      workspace.apply({ type: 'download-requested', snapshot });
      setStatus(
        'JSON download requested. Check your downloads for diagram.json — the editable source, not an image.'
      );
    } catch (error) {
      setStatus(`Download failed: ${(error as Error).message} The diagram is still open.`);
    }
  }

  function downloadHtml(): void {
    try {
      if (document.querySelector('script[src],link[rel="stylesheet"],link[rel="modulepreload"]'))
        throw new Error(
          'Open the single-file production build to export HTML; the development server uses external assets.'
        );
      const html = createPortableHtml(diagram, {
        scripts: Array.from(
          document.querySelectorAll('script[type="module"]'),
          (script) => script.textContent
        ),
        styles: Array.from(document.querySelectorAll('head > style'), (style) => style.textContent)
      });
      downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), 'diagram-view.html');
      setStatus(
        'HTML viewing file requested. It includes this diagram and all its metadata, independent of browser recovery. '
        + 'Verify the file before sharing; keep JSON for Git.'
      );
    } catch (error) {
      setStatus(`HTML export failed: ${(error as Error).message} Your editable document is unchanged.`);
    }
  }
  async function downloadPng(): Promise<void> {
    if (exportBusy.current) return;
    exportBusy.current = true;
    setExporting(true);
    const revision = workspace.current.current.revision;
    const assertCurrent = (): void => {
      if (workspace.current.current.revision !== revision)
        throw new Error(
          'The document changed during image capture. Try exporting the current version again.'
        );
    };
    try {
      if (!canvasRef.current) throw new Error('The canvas is not ready.');
      const result = await captureDiagramPng(
        canvasRef.current,
        diagram.nodes.map((node) => node.id),
        assertCurrent
      );
      downloadBlob(result.blob, 'diagram.png');
      setStatus(
        `Whole-diagram PNG requested · ${String(result.width)} × ${String(result.height)} pixels. `
        + 'Inspect the image before sharing; JSON remains the editable source.'
      );
    } catch (error) {
      setStatus(`PNG export failed: ${(error as Error).message} Your editable document is unchanged.`);
    } finally {
      exportBusy.current = false;
      setExporting(false);
    }
  }

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="#diagram" aria-label={`${project.name} diagram`}>
          <span className="brand-mark" aria-hidden="true">
            p
            <span>·</span>
          </span>
          <span>{project.name}</span>
        </a>
        <span className="header-note">LOCAL-FIRST · NO ACCOUNT</span>
      </header>
      <main>
        {openingError && (
          <p className="startup-error" role="alert">
            {openingError}
          </p>
        )}
        <section className="intro" aria-labelledby="page-title">
          <div>
            <span className="eyebrow">A CLEARER WAY TO WORK</span>
            <h1 id="page-title">{embedded ? 'A diagram, ready to share.' : project.tagline}</h1>
            <p>
              {embedded
                ? 'This portable snapshot includes its editable JSON. Local changes stay on this device.'
                : project.description}
            </p>
          </div>
          <div className="file-actions">
            <button onClick={() => fileInput.current?.click()}>Open JSON</button>
            <button className="primary" onClick={downloadSource}>
              Download JSON
              {' '}
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
                <path d="M2 10 10 2M3 2h7v7" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <button onClick={downloadHtml}>Download HTML</button>
            <button disabled={exporting} onClick={() => void downloadPng()}>
              {exporting ? 'Exporting image…' : 'Export PNG'}
            </button>
          </div>
        </section>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void openFile(file);
          }}
        />
        <section id="diagram" className="diagram-panel" aria-labelledby="diagram-title">
          <div className="diagram-heading">
            <div>
              <span className="eyebrow">{source}</span>
              <h2 id="diagram-title">{diagram.title || 'Untitled diagram'}</h2>
            </div>
            <span className="view-badge">
              {editing ? 'Editing locally' : 'View only'}
              {' '}
              <span aria-hidden="true">·</span>
              {' '}
              {diagram.nodes.length}
              {' '}
              components
            </span>
          </div>
          <div className="editor-toolbar" aria-label="Editor controls">
            <button
              className={editing ? '' : 'primary'}
              onClick={() => {
                ++importSequence.current;
                if (editing) {
                  workspace.setEditing(false);
                  setSelection(null);
                } else workspace.beginEditing();
              }}
            >
              {editing ? 'View only' : 'Edit diagram'}
            </button>
            <button
              disabled={history.past.length === 0}
              onClick={() => {
                if (!workspace.apply({ type: 'undo' })) {
                  return;
                }

                setSelection(null);
                setFitRevision((value) => value + 1);
              }}
            >
              Undo
            </button>
            <button
              disabled={history.future.length === 0}
              onClick={() => {
                if (!workspace.apply({ type: 'redo' })) {
                  return;
                }

                setSelection(null);
                setFitRevision((value) => value + 1);
              }}
            >
              Redo
            </button>
            {editing && (
              <>
                <button onClick={addComponent}>Add component</button>
                <button
                  onClick={() => {
                    ++importSequence.current;
                    setJsonDraft(serialize(diagram));
                    setDialogError('');
                  }}
                >
                  Edit JSON
                </button>
                <button
                  onClick={() => {
                    ++importSequence.current;
                    setReplacement({ document: initial, name: 'bundled example' });
                  }}
                >
                  Reset example
                </button>
              </>
            )}
            <span className="hint">Undo: up to 50 changes / 25 MB this session</span>
          </div>
          <div className={`editor-layout ${editing ? 'editing' : ''}`}>
            <div className="canvas" ref={canvasRef}>
              <DiagramCanvas
                key={`${String(fitRevision)}:${String(editing)}`}
                diagram={diagram}
                editing={editing}
                selection={selection}
                onSelect={setSelection}
                onMove={(id, position) => mutate((document) => moveNode(document, id, position))}
                onConnect={connect}
                centerRef={centerRef}
              />
              {diagram.nodes.length === 0 && (
                <div className="canvas-empty">
                  A clean canvas
                  {editing ? ' — add a component to begin.' : ' — select Edit diagram to begin.'}
                </div>
              )}
            </div>
            {editing && (
              <Inspector
                diagram={diagram}
                selection={selection}
                onSelect={setSelection}
                onNode={(id, data) => mutate((document) => editNode(document, id, data))}
                onEdge={(id, label) =>
                  mutate((document) =>
                    (document.edges.find((edge) => edge.id === id)?.label ?? '') === label
                      ? document
                      : renameEdge(document, id, label)
                  )}
                onTitle={(title) => mutate((document) => renameDiagram(document, title))}
                onDelete={() => {
                  if (!selection) {
                    return;
                  }

                  mutate((document) => removeElement(document, selection.id, selection.kind));
                  setSelection(null);
                }}
                onConnect={connect}
              />
            )}
          </div>
          <div className="save-state">
            <strong>
              {portableStatus(workspace.portablePending, workspace.portableKind, isPortableSnapshot)}
            </strong>
            <span>{workspace.recovery}</span>
            {workspace.retryable && <button onClick={workspace.retry}>Retry browser recovery</button>}
            <span>
              Browser recovery stays on this browser, not in Git. Download JSON, then save it to your project
              yourself. One editing tab at a time.
            </span>
          </div>
          <div className="status" role="status">
            {status}
          </div>
          <details className="text-outline">
            <summary>
              Read as text
              {' '}
              <span>All labels and connections, at any screen size</span>
            </summary>
            <div className="outline-nodes">
              {diagram.nodes.map((node) => (
                <article key={node.id}>
                  <h3>{node.data.label || 'Untitled component'}</h3>
                  <p>{node.data.description}</p>
                </article>
              ))}
            </div>
            {diagram.edges.length > 0 && (
              <ul>
                {diagram.edges.map((edge) => (
                  <li key={edge.id}>
                    <b>{nodeLabel(diagram, edge.source)}</b>
                    {' '}
                    →
                    <b>{nodeLabel(diagram, edge.target)}</b>
                    {edge.label !== undefined && edge.label !== '' && (
                      <span>
                        {' '}
                        —
                        {edge.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </details>
        </section>
        <section className="guide" aria-label="About this diagram">
          <article>
            <span className="guide-number">01</span>
            <h3>Open anywhere</h3>
            <p>
              This project site also builds into a single HTML file. Open that file in a browser — no server
              or installation.
            </p>
          </article>
          <article>
            <span className="guide-number">02</span>
            <h3>Keep the source</h3>
            <p>
              JSON holds the labels, connections and human layout. Download it for editing, review and version
              history.
            </p>
          </article>
          <article>
            <span className="guide-number">03</span>
            <h3>Share deliberately</h3>
            <p>
              Opened files stay on this device. A published link shows its bundled example, never your private
              local file.
            </p>
          </article>
        </section>
      </main>
      {workspace.candidate && (
        <Modal
          title="A browser recovery draft is available"
          onCancel={() => {
            workspace.setCandidate(null);
          }}
        >
          <p>
            Resume “
            {workspace.candidate.title || 'Untitled diagram'}
            ”, or edit the current document and replace that recovery draft. Neither option saves a portable
            file or changes the repository.
          </p>
          <div className="button-row">
            <button
              className="primary"
              onClick={() => {
                if (workspace.candidate !== null) workspace.activate(workspace.candidate);
                setFitRevision((value) => value + 1);
              }}
            >
              Resume recovery
            </button>
            <button
              onClick={() => {
                workspace.activate();
              }}
            >
              Edit current · replace recovery
            </button>
            <button
              onClick={() => {
                workspace.setCandidate(null);
              }}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
      {replacement && (
        <Modal title="Replace the current diagram?" onCancel={cancelReplacement}>
          <p>
            Apply
            {' '}
            {replacement.name}
            : “
            {replacement.document.title || 'Untitled diagram'}
            ” (
            {replacement.document.nodes.length}
            {' '}
            components). The current document stays unchanged until Apply.
            Undo can restore it afterwards; history lasts only this session.
          </p>
          <div className="button-row">
            <button
              className="primary"
              onClick={() => {
                replace(replacement.document, replacement.portable);
              }}
            >
              Apply replacement
            </button>
            <button onClick={cancelReplacement}>Cancel</button>
          </div>
        </Modal>
      )}
      {jsonDraft !== null && (
        <Modal title="Edit document JSON" onCancel={cancelReplacement}>
          <p>
            Stage a complete replacement. IDs, layout and metadata are yours to preserve. Apply validates
            before changing anything; Undo restores the previous document.
          </p>
          <textarea
            className="json-editor"
            aria-label="Document JSON"
            value={jsonDraft}
            onChange={(event) => {
              setJsonDraft(event.target.value);
            }}
            spellCheck={false}
          />
          <p role="alert">{dialogError}</p>
          <div className="button-row">
            <button
              className="primary"
              onClick={() => {
                try {
                  replace(parseDiagram(jsonDraft));
                } catch (error) {
                  setDialogError((error as Error).message);
                }
              }}
            >
              Apply JSON
            </button>
            <button onClick={cancelReplacement}>Cancel</button>
          </div>
        </Modal>
      )}
      <footer className="site-footer">
        <span>{project.name}</span>
        <span>
          {embedded ? 'Portable snapshot' : 'Illustrative example'}
          {' '}
          · Local-first editing
        </span>
      </footer>
    </div>
  );
}
