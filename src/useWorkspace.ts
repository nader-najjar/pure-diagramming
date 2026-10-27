import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { serialize, type Diagram } from './model';
import {
  createHistory,
  reduceHistory,
  readRecovery,
  writeRecovery,
  type HistoryAction,
  type EditorHistory
} from './editor-state';

interface Workspace {
  history: EditorHistory;
  current: RefObject<EditorHistory>;
  active: boolean;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<boolean>>;
  recovery: string;
  status: string;
  setStatus: Dispatch<SetStateAction<string>>;
  candidate: Diagram | null;
  setCandidate: Dispatch<SetStateAction<Diagram | null>>;
  portablePending: boolean;
  portableKind: 'bundled' | 'opened' | 'requested';
  retryable: boolean;
  markOpened: (document: Diagram) => void;
  beginEditing: () => void;
  activate: (document?: Diagram) => void;
  apply: (action: HistoryAction) => boolean;
  retry: () => void;
  commit: (document: Diagram) => boolean;
}

/**
Browser recovery is deliberately opt-in, never the published page's startup source.
*/
export function useWorkspace(initial: Diagram, storageKey: string): Workspace {
  const [history, setHistory] = useState(() => createHistory(initial));
  const current = useRef(history);
  const [active, setActive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [recovery, setRecovery] = useState('Browser recovery not opened.');
  const [status, setStatus] = useState('Read-only view. Pan to explore; use the controls to zoom or fit.');
  const [candidate, setCandidate] = useState<Diagram | null>(null);
  const writable = useRef(true);
  const paused = useRef(false);
  const [retryable, setRetryable] = useState(false);
  const protectedEntry = useRef(false);
  const [portable, setPortable] = useState({
    snapshot: serialize(initial),
    kind: 'bundled' as 'bundled' | 'opened' | 'requested'
  });
  const portablePending = serialize(history.document) !== portable.snapshot;
  useEffect(() => {
    if (!portablePending) return;
    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      // Legacy browser support still requires returnValue alongside preventDefault.
      // eslint-disable-next-line sonarjs/deprecation, @typescript-eslint/no-deprecated
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return (): void => {
      window.removeEventListener('beforeunload', warn);
    };
  }, [portablePending]);
  function save(document: Diagram, retry = false): void {
    if (protectedEntry.current) return;
    if (!retry && paused.current) return;
    const result = writeRecovery(
      (text) => {
        localStorage.setItem(storageKey, text);
      },
      document,
      writable.current
    );
    setRecovery(result.message);
    paused.current = !result.saved;
    setRetryable(!result.saved && result.canWrite);
  }
  function apply(action: HistoryAction): boolean {
    try {
      const next = reduceHistory(current.current, action);
      if (action.type === 'download-requested') setPortable({ snapshot: action.snapshot, kind: 'requested' });
      if (next === current.current) return true;
      const changed = next.revision !== current.current.revision;
      current.current = next;
      setHistory(next);
      if (changed && active) save(next.document);
      return true;
    } catch (error) {
      setStatus(`Change not applied: ${(error as Error).message} The current document is intact.`);
      return false;
    }
  }
  function activate(document?: Diagram): void {
    if (document && !apply({ type: 'commit', document })) return;
    setCandidate(null);
    setActive(true);
    setEditing(true);
    save(current.current.document);
    setStatus(
      'Editing locally. Apply staged forms; drag components or connect their handles. Nothing is uploaded.'
    );
  }
  function beginEditing(): void {
    if (active) {
      setEditing(true);
      return;
    }
    const result = readRecovery(() => localStorage.getItem(storageKey));
    writable.current = result.canWrite;
    protectedEntry.current = !result.canWrite;
    setRecovery(result.message);
    if (result.document && serialize(result.document) !== serialize(current.current.document))
      setCandidate(result.document);
    else activate();
  }
  return {
    history,
    current,
    active,
    editing,
    setEditing,
    recovery,
    status,
    setStatus,
    candidate,
    setCandidate,
    portablePending,
    portableKind: portable.kind,
    retryable,
    markOpened: (document: Diagram): void => {
      setPortable({ snapshot: serialize(document), kind: 'opened' });
    },
    beginEditing,
    activate,
    apply,
    retry: (): void => {
      save(current.current.document, true);
    },
    commit: (document: Diagram) => apply({ type: 'commit', document })
  };
}
