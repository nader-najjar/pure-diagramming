import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import './style.css';
import example from '../diagrams/example.json';
import project from '../project.json';
import { App } from './App';
import { parseDiagram, type Diagram } from './model';
import { parsePortableDocument, PORTABLE_DOCUMENT_ID } from './portable';

const embedded = document.querySelector(`#${PORTABLE_DOCUMENT_ID}`);
const startup = ((): { diagram: Diagram; error: string } => {
  try {
    const diagram = embedded
      ? parsePortableDocument(embedded.textContent)
      : parseDiagram(JSON.stringify(example));
    return { diagram, error: '' };
  } catch (error) {
    return {
      diagram: parseDiagram(JSON.stringify(example)),
      error:
        `This viewing file could not be opened: ${(error as Error).message} `
        + 'Showing the illustrative example instead; open the original JSON to recover.'
    };
  }
})();

const root = document.querySelector('#root');
if (root === null) throw new Error('The page is missing its application root.');
createRoot(root).render(
  <StrictMode>
    <App
      initial={startup.diagram}
      startupError={startup.error}
      embedded={embedded !== null}
      project={project}
    />
  </StrictMode>
);
