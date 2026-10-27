# Pure Diagramming

A local-first React diagramming template. No account, API key, backend or paid service is needed to view a diagram.

**Included:** a project site with visual editing, undo/redo, opt-in browser recovery, self-contained HTML viewing exports, whole-diagram PNG and validated JSON source. Full-site CI and manual GitHub Pages publication are implemented; see [acceptance evidence and limits](docs/VERIFICATION.md).

## View — no terminal needed

[Open the synthetic demo](https://nader-najjar.github.io/pure-diagramming/#diagram) — no account or installation. You can also double-click a supplied `index.html` portable viewer. The complete viewer is bundled into that one HTML file; it requires no local server, network connection or installation. The hosted demo is verified in Chromium. Direct offline opening remains unverified because the cloud browser blocks `file://`; see [verification limits](docs/VERIFICATION.md).

The initial view fits the complete diagram. Zoom in or expand **Read as text** to read a large diagram or use a small screen; drag the background to pan. **Open JSON** loads another diagram only in your browser. **Download JSON** requests a copy of the current editable document. **Download HTML** requests a standalone `diagram-view.html` containing the current diagram, all its metadata and the complete viewer/editor. **Export PNG** captures the entire rendered diagram at 2× resolution, regardless of pan/zoom. Opening a file does not upload it, update Git, or change what someone sees at a published link. The published page does not automatically load a private browser draft. Select **Edit diagram** to start a local workspace; if a recovery draft exists, choose whether to resume it or explicitly replace it with the current diagram. Browser recovery is not a portable file or repository save.

- `diagrams/*.json`: canonical editable source; keep these in Git.
- `dist/index.html`: generated, self-contained viewing file and complete React project site. It contains the bundled diagram, not a private file you subsequently open.
- `project.json`: project name, tagline and introductory description. With the required permission under [LICENSE](LICENSE), replace these and `diagrams/example.json` to reuse the example without editing the engine.

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

Before handing off a changed diagram: identify the exact JSON file, validate it, render it, inspect labels/overlaps/clipping/arrow meaning, and iterate. Schema validation alone is not visual review. Preserve before/after renders for meaningful visual changes. Use **Edit diagram** for visual changes or **Edit JSON** for a staged source replacement. Apply commits a form; Cancel leaves the document unchanged. Undo/Redo restore up to 50 changes within a 25 MB history budget in the current session; closing the page loses that history. Download JSON before handing work to another person or AI. See [editing and recovery](docs/EDITOR_STATE.md) for limits and failure behavior, and [sharing and exports](docs/EXPORTS.md) for viewing-file privacy, image limits and visual checks.

## CI and optional publication

GitHub Actions runs the full project build on pull requests and `main`, then makes the single HTML file available as a downloadable artifact. The separate Pages workflow is **manual-only, defaults to no publication, and does not enable hosting**. Review bundled content and obtain owner approval before enabling or dispatching Pages. See [publishing and source-commit verification](docs/PUBLISHING.md).

## Dependencies and licensing

Runtime: React and React DOM (MIT), React Flow / `@xyflow/react` (MIT), `html-to-image` 1.11.11 (MIT). Build: Vite (MIT), `vite-plugin-singlefile` (MIT), TypeScript (Apache-2.0) and the listed type packages (MIT). Exact versions and transitive dependencies are recorded in `package-lock.json`; dependency license terms remain applicable.

**Repository terms: all rights reserved**, matching the owner's other Pure repositories. See [LICENSE](LICENSE): use, modification and redistribution require the copyright holder's prior written permission, subject to the exceptions stated there. This is not an open-source license; dependency licenses do not grant rights to the repository's own material. The hosted demo requires no paid service or API key.
