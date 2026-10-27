# Editor state and recovery contract

`src/editor-state.ts` keeps editable documents separate from transient canvas state and browser storage. Every committed document passes the same [version 1 validator](DOCUMENT_FORMAT.md) used by file imports.

## History API

- `createHistory(document)` starts with an isolated validated document, empty history, revision `0`, and no requested-download snapshot.
- `reduceHistory(state, { type: 'commit', document })` commits a complete document, including imports and resets. The previous document becomes one Undo entry. Identical serialized content returns the same state and preserves Redo. A real edit clears Redo.
- `{ type: 'undo' }` and `{ type: 'redo' }` restore the entire document, including IDs, metadata, layout and saved viewport. Empty stacks are no-ops.
- `{ type: 'download-requested', snapshot }` records the exact JSON submitted to the download helper; it does not change document history or revision. Dispatch this only after the helper successfully requests that download. It is **not** confirmation that a user saved a file.
- `hasUndownloadedChanges(state)` compares current canonical JSON with the last requested-download snapshot. It returns true before the first download request. Undoing back to the downloaded content returns false; a late download request for an older captured snapshot cannot mark newer changes as downloaded.

History retains **up to 50 changes and 25 MB across Undo and Redo combined** per browser session, whichever limit is reached first. The byte budget conservatively estimates snapshot string storage as two bytes per UTF-16 code unit; it is not a total browser-memory limit and excludes the active document and runtime overhead. Large diagrams therefore retain fewer changes. Oldest undo entries are dropped first, followed when necessary by the farthest redo entries. The immediately prior valid document is always retained on a commit, so a replacement can be undone. The same combined budget is applied after Undo and Redo, since exchanging a small active document for a large snapshot changes history storage. Redo contains only changes undone from that history. Reloading does not retain the history stacks. `revision` increases for every effective commit, Undo and Redo, not for download status. UI consumers must treat state as immutable.

Commit one completed gesture, not every pointer movement: keep the drag preview outside this reducer and commit its final coordinates once. Likewise, stage form input and commit only on Apply. Cancel discards staged input without dispatching a document change. Pan, zoom, selection, measurements and open dialogs are transient UI state, not automatic document edits. The saved document viewport is preserved unless an explicit operation changes it.

For asynchronous file imports, capture the revision and an import request token before reading; do not replace newer work with an obsolete completion. The UI must provide explicit replacement confirmation or the visible Undo recovery path. Reducer validation failures throw without modifying the previous state; catch and present the actionable error.

## Mutation helpers

`addNode(document, node)`, `moveNode(document, id, { x, y })`, `editNode(document, id, { label?, description?, color? })`, `renameDiagram(document, title)`, `renameEdge(document, id, label)`, `removeElement(document, id, 'node' | 'edge')`, and `connectNodes(document, edge)` return validated documents without mutating their inputs. New IDs come from the caller. Existing IDs, unknown metadata, array order, human positions and unrelated fields are retained.

Removing a node removes its incident edges in the same change. Removing an already absent element produces identical content and therefore no additional history entry. Updating a nonexistent selection throws an actionable error.

`connectNodes` suppresses repeated UI gestures for the same directed endpoints; it does not remove or change duplicates already present in imported documents. The reverse direction is distinct. New self-connections are rejected because the editor does not provide a dedicated self-loop shape; imported data remains subject to the source format, which permits those references. No helper silently truncates over-limit labels or coordinates.

## Recovery API

`readRecovery(read)` returns `{ document, canWrite, message }`. The callback reads one **explicit project-scoped storage key** chosen by the UI. Stored bytes are canonical versioned diagram JSON; no second schema wrapper is needed. A missing entry returns `document: null` and permits later writes. A malformed, unsupported, oversized or unreadable entry returns `document: null`, disables writes and leaves original storage untouched. Reading never writes or initializes storage. A valid recovery document is a local recovery candidate, not a repository update or portable save.

`writeRecovery(write, document, canWrite)` returns `{ saved, canWrite, message }`. Bind the write callback to the same storage key. Call it after intentional workspace activation or a document change, **not on boot merely because the example rendered**. It validates and serializes before writing. A storage/quota or validation failure reports the error, returns `saved: false`, and keeps `canWrite: true` so the UI can offer an explicit retry. It never claims the failed revision was recovered. The UI should avoid a tight automatic retry loop. A call disabled after a failed recovery read never invokes the write callback. With browser `localStorage.setItem`, a failed write retains the previous entry.

Keep the visible browser-recovery result separate from requested JSON downloads and repository state. A successful recovery write says only that browser-local recovery was updated. Always provide JSON download as the portable escape path. Re-enabling writes after an invalid recovery entry requires an explicit decision to replace the protected entry; do not retry by silently overwriting it with the example. Another tab may share the storage key: browser recovery is not concurrent collaboration or a conflict-free shared document store.
