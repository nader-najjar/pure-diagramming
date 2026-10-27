# Verification record — document viewer foundation

Date: 2026-10-27. This is evidence for the first implementation slice, **not a claim that all user stories pass**.

## Automated author checks

`npm run build` runs the exact Node/npm check, validates every bundled diagram, runs 12 unit tests, checks strict TypeScript, builds the complete React site, and asserts a single HTML output with inline JavaScript/styles and no external script/style imports. All passed.

Tests include stable IDs/order, targeted AI label and connection edits, fractional human coordinates, unknown metadata at every JSON level, byte/count/text/depth limits, malformed data, unsupported versions/colors, invalid references, and wide-layout fitting bounds. Limits reject rather than truncate or clamp.

Vite reports that React Flow's `use client` directive is not preserved; this browser-only build does not use server components. The build completes successfully.

## Actual cloud Chromium checks

The production `dist/index.html` was copied unchanged to a local QA directory and served through the supported managed preview daemon. No public deployment was performed.

- Desktop render inspected: four complete cards, three labeled arrows, correct arrow direction and no overlapping example cards.
- Downloaded actual JSON through the UI; the downloaded document exactly matched `diagrams/example.json`.
- Edited that exact downloaded source with a label change, x=12.125, position metadata and root metadata. Imported through the real file chooser, rendered and inspected the change, downloaded again, and compared full JSON objects: exact semantic equality, including original IDs, order, viewport and unrelated content.
- Imported an unsupported `schemaVersion: 2` file. The UI reported the error while retaining the valid imported diagram.
- Opened the actual production site at `/project-subpath/#diagram`; the complete React UI and diagram rendered. Reload restored the bundled example, not a previously opened local file.
- Narrow browser window (approximately 512 CSS pixels): controls and page layout fit. Whole-diagram labels become small at fit zoom; the expandable **Read as text** outline was opened and visually checked for readable labels, descriptions and labeled source-to-target connections.
- A deliberately wide diagram with endpoint nodes at x=-100,000 and x=100,000 fit inside the 485 × 360 canvas. Browser-measured node rectangles were all inside canvas bounds both initially and after the Fit View action. The readable outline remains available at tiny visual zoom.

## Verification limits

- Direct `file://` opening was blocked by the cloud browser's URL security policy. No alternate route was used to bypass that restriction. The single-file structure is verified, but **offline double-click browser behavior remains unverified** and needs a supported local-file test before story 1 is closed.
- Firefox, Safari, physical mobile devices, high-node-count rendering performance and real public hosting have not been tested.
- This slice is read-only. Visual editing/history/recovery, portable export of a locally changed document, PNG export and CI/CD are subsequent increments.
- Repository licensing remains an owner decision. No public reuse license or public deployment has been enabled.

## Story traceability at this increment

| Story | Evidence / remaining work |
| --- | --- |
| 1. Immediate viewing | Production HTTP view and fit tested; offline browser test blocked as above. |
| 2. Reuse template | Project identity/example separated from engine; pinned toolchain and dependency notices; repository license pending. |
| 3. Visual editing | Not implemented in this slice. |
| 4. Predictable saving | Explicit source downloads and non-destructive invalid import tested; editing/recovery pending. |
| 5. Share | Bundled viewer is self-contained; local file never silently becomes published example; changed-document portable export pending. |
| 6. Image export | Not implemented in this slice. |
| 7. Human–AI format | Model tests plus actual file/visual roundtrip passed. |
| 8. Visual review | Exact edited source rendered and visually compared; workflow documented. |
| 9. Git portability | Plain JSON source, stable serialization/order, generated output excluded from Git. |
| 10. Full-site CI/CD | Production subpath/hash entry tested locally; workflows and authorized deployment verification pending. |
