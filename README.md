# Pure Diagramming

A local-first React diagramming template. No account, API key, backend or paid service is needed to view a diagram.

**Current increment:** a read-only project site, portable offline viewer and validated JSON source. Visual editing, recovery, image export and deployment automation are still being implemented against [USER_STORIES.md](USER_STORIES.md).

## View — no terminal needed

Open the project-site link supplied by its owner, or double-click a supplied `index.html` portable viewer. The complete viewer is bundled into that one HTML file; it requires no local server, network connection or installation. This repository does not yet publish a hosted site or prebuilt release.

The initial view fits the complete diagram. Zoom in or expand **Read as text** to read a large diagram or use a small screen; drag the background to pan. **Open JSON** loads another diagram only in your browser. **Download JSON** requests a copy of the current editable document. Opening a file does not upload it, update Git, or change what someone sees at a published link. This read-only increment does not use browser storage.

- `diagrams/*.json`: canonical editable source; keep these in Git.
- `dist/index.html`: generated, self-contained viewing file and complete React project site. It contains the bundled diagram, not a private file you subsequently open.
- `project.json`: project name, tagline and introductory description. Replace these and `diagrams/example.json` to reuse the example without editing the engine.

The example is illustrative, not a verified real-world architecture.

## Develop and build

Use **Node 24.22.1 and npm 11.9.0**, pinned by `.node-version`, `package.json` and the build's toolchain check. Provision that exact Node release with your version manager rather than relying on a machine's incidental default; it includes npm 11.9.0. For example, with an existing `nvm` installation: `nvm install 24.22.1 && nvm use 24.22.1`. Installing a toolchain is only for maintainers, never viewers.

```sh
npm ci
npm run build
```

`npm run build` is the **full documented build**: exact-toolchain check, validation of every `diagrams/*.json`, all unit tests, strict TypeScript checking, the complete production site, and a structural single-file artifact check. It produces `dist/index.html`. The single-file build deliberately trades cache granularity for an artifact that opens directly from disk and works at a hosting subpath.

```sh
npm run dev      # local development only
npm run preview  # inspect the production site over HTTP
```

For offline QA, open the actual `dist/index.html` directly in a browser. For project-subpath QA, serve a parent directory containing the build and visit that subdirectory; don't assume a dev-server pass proves production paths work. No deployment is performed by these commands.

## Source contract

See [document format](docs/DOCUMENT_FORMAT.md). Unknown JSON fields are retained as inert metadata, not passed into React Flow as renderer configuration. A malformed or unsupported import leaves the previous valid diagram intact. Opening fits the view without changing the source's saved viewport or human coordinates.

Before handing off a changed diagram: identify the exact JSON file, validate it, render it, inspect labels/overlaps/clipping/arrow meaning, and iterate. Schema validation alone is not visual review. Preserve before/after renders for meaningful visual changes. The current UI is view-only; edit the source in an editor, then reopen it.

## Dependencies and licensing

Runtime: React and React DOM (MIT), React Flow / `@xyflow/react` (MIT). Build: Vite (MIT), `vite-plugin-singlefile` (MIT), TypeScript (Apache-2.0) and the listed type packages (MIT). Exact versions and transitive dependencies are recorded in `package-lock.json`; dependency license terms remain applicable.

**Repository license: owner decision pending.** No new public license grant is made by this implementation. Do not assume dependency licenses grant rights to this repository's own material.
