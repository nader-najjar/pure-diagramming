# Pure Schematic

A local-first React diagramming template. No account, API key, backend or paid service is needed to view a diagram.

**Included:** a project site with visual editing, undo/redo, opt-in browser recovery, self-contained HTML viewing exports, whole-diagram PNG and validated JSON source. Full-site CI and manual GitHub Pages publication are implemented; see [acceptance evidence and limits](docs/VERIFICATION.md).

## View — no terminal needed

[Open the synthetic demo](https://nader-najjar.github.io/pure-schematic/#diagram) — no account or installation. You can also double-click a supplied `index.html` portable viewer. The complete viewer is bundled into that one HTML file; it requires no local server, network connection or installation. The hosted demo is verified in Chromium. Direct offline opening remains unverified because the cloud browser blocks `file://`; see [verification limits](docs/VERIFICATION.md).

The initial view fits the complete diagram. Zoom in or expand **Read as text** to read a large diagram or use a small screen; drag the background to pan. **Open JSON** loads another diagram only in your browser. **Download JSON** requests a copy of the current editable document. **Download HTML** requests a standalone `diagram-view.html` containing the current diagram, all its metadata and the complete viewer/editor. **Export PNG** captures the entire rendered diagram at 2× resolution, regardless of pan/zoom. Opening a file does not upload it, update Git, or change what someone sees at a published link. The published page does not automatically load a private browser draft. Select **Edit diagram** to start a local workspace; if a recovery draft exists, choose whether to resume it or explicitly replace it with the current diagram. Browser recovery is not a portable file or repository save.

- `diagrams/*.json`: canonical editable source; keep these in Git.
- `bazel-bin/dist/index.html`: generated, self-contained viewing file and complete React project site. It contains the bundled diagram, not a private file you subsequently open.
- `project.json`: project name, tagline and introductory description. `recoveryName` keeps the existing browser-recovery namespace stable across display-name changes; choose a distinct value for a new project. With the required permission under [LICENSE](LICENSE), replace these and `diagrams/example.json` to reuse the example without editing the engine.

The example is illustrative, not a verified real-world architecture.

## Develop and build

Install [Bazelisk](https://bazel.build/install/bazelisk), which selects **Bazel 9.2.0** from `.bazelversion`. Bazel downloads the pinned **Node 24.22.1** toolchain and resolves the locked JavaScript dependencies; no separate system Node, npm or pnpm installation is needed for the build. Build tools are only for maintainers, never viewers.

```sh
bazel build //...
bazel test //...
```

Together these commands are the **full documented build**. Bazel owns the build graph, tools and dependencies rather than wrapping a package-manager build script. The test targets validate every `diagrams/*.json`, run all unit tests with 80% statements/branches/functions/lines coverage thresholds, enforce strict TypeScript, zero-warning ESLint, dependency boundaries, unused-code checks and frozen manifest/lockfile consistency, and verify the complete production artifact. Coverage excludes only the thin React startup/composition entrypoint; `App.tsx`, browser adapters and core logic are all measured.

The output is `bazel-bin/dist/index.html`. It remains a self-contained React project site, intentionally trading cache granularity for a file that can be shared independently and hosted at a subpath. The artifact-contract test checks inline JavaScript/styles, absence of external script/style imports, source provenance, and embedded-document roundtripping with the real production assets. Structural checks do not replace browser QA.

```sh
bazel run //:dev      # local development only
bazel run //:preview  # inspect the production site over HTTP
```

The Bazel run targets use declared source snapshots; restart `bazel run //:dev` after source edits to refresh that snapshot.

For offline QA, open the actual `bazel-bin/dist/index.html` directly in a supported browser. For project-subpath QA, serve a parent directory containing the build and visit that subdirectory; do not assume a dev-server pass proves production paths work. No deployment is performed by these commands.

### Build and source boundaries

- `//:core`: document model, editing operations, portable-source handling and view/image calculations; it cannot import browser adapters or the entrypoint.
- `//:browser`: React components, browser workspace recovery and PNG export adapters.
- `//:entrypoint`: browser startup and project/example composition.
- `//:site`: Vite's single-file production output, with explicitly declared sources and dependencies.
- `//:typecheck`, `//:lint`, `//:dependency_boundaries`, `//:unused_code`, `//:unit_tests`, `//:validate_diagrams`, `//:artifact_contract`, `//:lockfile_consistency`: independently addressable quality gates, all included in `bazel test //...`.

Vite/Rolldown and the test/unused-code resolvers use native filesystem paths. Small Node adapters materialize only declared inputs before invoking these tools, retaining sandboxing rather than running an ambient package-manager build. Knip’s `dependency-cruiser` exception identifies the executable used directly by the Bazel dependency-boundary target. TypeScript is pinned to 6.0.3, matching the legacy template’s supported typed-ESLint range.

### IDE toolchain paths

Bazel builds do not populate the source-root `node_modules` directory. For IDE module resolution on a fresh checkout, materialize the same locked dependencies with the Bazel-managed package manager first (this is an IDE preparation step, not a build prerequisite):

```sh
bazel run @pnpm -- --dir "$PWD" install --frozen-lockfile
bazel run //:print_node_and_tsdk_paths
```

Use the reported Node executable as your IDE's Node interpreter and the reported TypeScript SDK directory as its TypeScript installation. These paths come from the same Bazel-selected toolchain and locked TypeScript dependency used by the build, not a machine-global installation. Re-run the command after updating either toolchain or clearing Bazel's downloaded repositories. Keep your existing project/workspace settings; neither this command nor the build edits IDE settings.

### Dependency and toolchain updates

Use the Bazel-managed package manager, not hand-edited dependency entries or global package-manager installs. From the repository root:

```sh
bazel run @pnpm -- --dir "$PWD" add --save-exact <package>@<version>
bazel run @pnpm -- --dir "$PWD" add --save-dev --save-exact <package>@<version>
bazel run @pnpm -- --dir "$PWD" remove <package>
bazel mod deps --lockfile_mode=update
bazel build //...
bazel test //...
```

Review `package.json`, `pnpm-lock.yaml` and `MODULE.bazel.lock` together. Normal builds require the committed Bazel lockfile to remain current. Update Bazel in `.bazelversion`; update Bazel rules and Node/pnpm toolchain versions in `MODULE.bazel`, keeping the Node/package-manager declarations in `package.json` aligned. Toolchain or rules updates also require regenerating the Bazel lockfile and running the full build. The frontend stays browser-only: no server, container, Lambda or cloud SDK is added just to copy a service template.

## Source contract

See [document format](docs/DOCUMENT_FORMAT.md). Unknown JSON fields are retained as inert metadata, not passed into React Flow as renderer configuration. A malformed or unsupported import leaves the previous valid diagram intact. Opening fits the view without changing the source's saved viewport or human coordinates.

Before handing off a changed diagram: identify the exact JSON file, validate it, render it, inspect labels/overlaps/clipping/arrow meaning, and iterate. Schema validation alone is not visual review. Preserve before/after renders for meaningful visual changes. Use **Edit diagram** for visual changes or **Edit JSON** for a staged source replacement. Apply commits a form; Cancel leaves the document unchanged. Undo/Redo restore up to 50 changes within a 25 MB history budget in the current session; closing the page loses that history. Download JSON before handing work to another person or AI. See [editing and recovery](docs/EDITOR_STATE.md) for limits and failure behavior, and [sharing and exports](docs/EXPORTS.md) for viewing-file privacy, image limits and visual checks.

## CI and optional publication

GitHub Actions runs the full project build on pull requests and `main`, then makes the single HTML file available as a downloadable artifact. The separate Pages workflow is **manual-only, defaults to no publication, and does not enable hosting**. Review bundled content and obtain owner approval before enabling or dispatching Pages. See [publishing and source-commit verification](docs/PUBLISHING.md).

## Dependencies and licensing

Runtime: React and React DOM (MIT), React Flow / `@xyflow/react` (MIT), `html-to-image` 1.11.11 (MIT). Build: Vite (MIT), `vite-plugin-singlefile` (MIT), TypeScript (Apache-2.0) and the listed type packages (MIT). Exact versions and transitive dependencies are recorded in `pnpm-lock.yaml`; Bazel modules are locked in `MODULE.bazel.lock`; dependency license terms remain applicable.

**Repository terms: all rights reserved**, matching the owner's other Pure repositories. See [LICENSE](LICENSE): use, modification and redistribution require the copyright holder's prior written permission, subject to the exceptions stated there. This is not an open-source license; dependency licenses do not grant rights to the repository's own material. The hosted demo requires no paid service or API key.
