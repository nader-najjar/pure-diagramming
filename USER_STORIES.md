# User stories and acceptance criteria

## Goal

Make a free, polished diagramming starter that can be reused like other Pure templates: easy for a person to open, edit, share and export, and reliable for an AI to update without destroying human work. The diagram should be a useful project artifact, not an exercise in running a development environment.

**Non-goals for the first version:** Real-time multiplayer, accounts, a hosted database, paid services, an embedded AI agent, or a general-purpose design suite. Reading or editing a diagram must not depend on these services.

## User stories and acceptance criteria

### 1. Open and understand a diagram immediately

**As a reader, I want to open a shared diagram without installing tools or starting a development server.**

- A shared project-site link opens a complete, legible diagram in a supported browser, with no terminal, package install or account required to view it.
- The initial view fits the diagram; labels are readable and no content is clipped.
- Opening the portable viewing artifact also requires no local server. If it differs from the editable document, both are clearly named and their purposes explained.

### 2. Start another project from the template

**As a project owner, I want to reuse the starter without rebuilding its diagram workflow.**

- A clean copy includes a working example, concise getting-started instructions and an obvious place for project diagrams.
- Replacing the example and project identity does not require editing the diagramming engine.
- The template documents its license and dependencies; the core workflow requires no paid service or API key.

### 3. Edit visually and recover from mistakes

**As a human editor, I want to move, connect and label things directly.**

- I can add, move, connect, rename and delete nodes and connections using the visible editor.
- Undo and redo restore diagram changes, including moves, deletions and replacements; any history limits are visible or documented.
- Canceling an edit leaves the document unchanged. Repeated actions do not create accidental duplicates or corrupt connections.

### 4. Know what is saved

**As an editor, I want predictable saving and reopening, with no silent loss.**

- The interface distinguishes unsaved work, browser-local recovery and a portable saved document; it never implies a repository was updated when it was not.
- Saving, closing and reopening preserves labels, connections, positions and supported styling.
- Storage failures, malformed files and unsupported versions produce actionable errors without overwriting the last valid document.
- Replacing work requires a clear recovery path or explicit confirmation; interruption and retry are tested.

### 5. Share a link or portable file

**As a collaborator, I want someone else to view my diagram and, when intended, continue editing it.**

- A recipient can view the shared link or portable viewing file without the sender's browser storage.
- The editable file opens on another supported browser/device with the same diagram and layout.
- Instructions clearly distinguish a published example from a private local draft. Local edits are not silently uploaded or implied to appear at a shared link.

### 6. Export a presentation-quality image

**As an author, I want a crisp image for documents and presentations.**

- Export includes the whole diagram, regardless of current pan/zoom, with complete labels, arrowheads and styling.
- Output resolution or vector support keeps the agreed representative diagrams readable at their intended presentation size.
- The image is visually compared with the editor. Export failure is reported, and the editable source remains intact.

### 7. Let AI edit without erasing human decisions

**As a human–AI collaborator, I want a stable, inspectable document format.**

- A versioned JSON document uses stable node/connection IDs and explicit layout coordinates, separate from transient editor state.
- A targeted AI label or connection edit preserves unrelated IDs, human positioning and metadata, including unknown fields that can safely be retained.
- Invalid references and unsupported changes are rejected clearly, not silently dropped. Read–save–reopen round trips preserve the agreed document semantics.

### 8. Judge AI changes visually, not just as code

**As a reviewer, I want AI to render and inspect its changes before handing them back.**

- The documented workflow is edit → validate → render → inspect → iterate, with the exact document under review identified.
- Review covers clipping, overlap, label readability and connection meaning; a passing schema check alone is not called a visual pass.
- Before/after renders accompany meaningful visual changes, or any inability to inspect is stated explicitly.

### 9. Keep diagrams portable and reviewable in Git

**As a maintainer, I want normal version history without vendor lock-in.**

- Editable diagrams and template source can live in the project repository; meaningful content changes produce understandable diffs rather than regenerated IDs or editor-state noise.
- Restoring a prior document revision restores its content and layout.
- Browser storage is not the only copy, and generated viewing/image artifacts are clearly distinguished from the editable source of truth.

### 10. Publish the full project site through normal CI/CD

**As a project owner, I want diagrams to belong to the project site and its existing delivery workflow.**

- GitHub Actions builds and, when authorized, deploys the complete React project site to GitHub Pages—not just generated diagram images.
- Diagram validation and applicable tests run alongside the project's normal checks; a diagram-only pipeline does not replace them.
- Project-subpath assets and direct entry links work on the deployed site. Deployment identifies the source commit and is verified against it.
- Publishing instructions identify which bundled diagrams become accessible and any hosting/account constraints before deployment is enabled.
