import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import './style.css';
import example from '../diagrams/example.json';
import project from '../project.json';
import { DiagramCanvas } from './DiagramCanvas';
import { MAX_JSON_BYTES, parseDiagram, serialize } from './model';

const initial = parseDiagram(JSON.stringify(example));

function App() {
  const [diagram, setDiagram] = useState(initial);
  const [revision, setRevision] = useState(0);
  const [source, setSource] = useState('Bundled example');
  const [status, setStatus] = useState('Read-only view. Pan to explore; use the controls to zoom or fit.');
  const fileInput = useRef<HTMLInputElement>(null);
  const importSequence = useRef(0);

  async function openFile(file: File) {
    const sequence = ++importSequence.current;
    try {
      if (file.size > MAX_JSON_BYTES) throw new Error('Choose a JSON file smaller than 5 MB.');
      const next = parseDiagram(await file.text());
      if (sequence !== importSequence.current) return;
      setDiagram(next);
      setRevision(value => value + 1);
      setSource(file.name);
      setStatus('File opened locally. Nothing was uploaded or written to the repository.');
    } catch (error) {
      if (sequence === importSequence.current) setStatus(`Could not open the file: ${(error as Error).message} Your previous diagram is unchanged.`);
    }
  }

  function downloadSource() {
    try {
      const url = URL.createObjectURL(new Blob([serialize(diagram)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'diagram.json';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setStatus('JSON download requested. Check your downloads for diagram.json — the editable source, not an image.');
    } catch (error) {
      setStatus(`Download failed: ${(error as Error).message} The diagram is still open.`);
    }
  }

  return <div className="app">
    <header className="site-header">
      <a className="brand" href="#diagram" aria-label={`${project.name} diagram`}><span className="brand-mark" aria-hidden="true">p<span>·</span></span><span>{project.name}</span></a>
      <span className="header-note">LOCAL-FIRST · NO ACCOUNT</span>
    </header>
    <main>
      <section className="intro" aria-labelledby="page-title">
        <div><span className="eyebrow">A CLEARER WAY TO WORK</span><h1 id="page-title">{project.tagline}</h1><p>{project.description}</p></div>
        <div className="file-actions"><button onClick={() => fileInput.current?.click()}>Open JSON</button><button className="primary" onClick={downloadSource}>Download JSON <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12"><path d="M2 10 10 2M3 2h7v7" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></button></div>
      </section>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void openFile(file); }} />
      <section id="diagram" className="diagram-panel" aria-labelledby="diagram-title">
        <div className="diagram-heading"><div><span className="eyebrow">{source}</span><h2 id="diagram-title">{diagram.title || 'Untitled diagram'}</h2></div><span className="view-badge">View only <span aria-hidden="true">·</span> {diagram.nodes.length} components</span></div>
        <div className="canvas">{diagram.nodes.length ? <DiagramCanvas key={revision} diagram={diagram} /> : <div className="empty-state"><h3>A clean canvas</h3><p>This document has no components yet.</p></div>}</div>
        <div className="status" role="status">{status}</div>
        <details className="text-outline"><summary>Read as text <span>All labels and connections, at any screen size</span></summary>
          <div className="outline-nodes">{diagram.nodes.map(node => <article key={node.id}><h3>{node.data.label || 'Untitled component'}</h3><p>{node.data.description}</p></article>)}</div>
          {diagram.edges.length > 0 && <ul>{diagram.edges.map(edge => <li key={edge.id}><b>{diagram.nodes.find(node => node.id === edge.source)?.data.label || 'Untitled component'}</b> → <b>{diagram.nodes.find(node => node.id === edge.target)?.data.label || 'Untitled component'}</b>{edge.label && <span> — {edge.label}</span>}</li>)}</ul>}
        </details>
      </section>
      <section className="guide" aria-label="About this diagram">
        <article><span className="guide-number">01</span><h3>Open anywhere</h3><p>This project site also builds into a single HTML file. Open that file in a browser — no server or installation.</p></article>
        <article><span className="guide-number">02</span><h3>Keep the source</h3><p>JSON holds the labels, connections and human layout. Download it for editing, review and version history.</p></article>
        <article><span className="guide-number">03</span><h3>Share deliberately</h3><p>Opened files stay on this device. A published link shows its bundled example, never your private local file.</p></article>
      </section>
    </main>
    <footer className="site-footer"><span>{project.name}</span><span>Illustrative example · Read-only foundation</span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
