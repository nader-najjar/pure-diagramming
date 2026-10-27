# Verification record — viewer, editor and exports

Date: 2026-10-27. This records the viewer, local editor and export increments, **not a claim that all user stories pass**.

## Automated author checks

`npm run build` runs the exact Node/npm check, validates every bundled diagram, runs 36 unit tests, checks strict TypeScript, builds the complete React site, and asserts a single HTML output with inline JavaScript/styles and no external script/style imports. All passed.

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
- CI/CD remains a subsequent increment. Browser storage-denial/corrupt-entry/write-failure paths are covered by unit tests, not a forced browser configuration change. The 4.9 MB valid synthetic fixture saved successfully in Chromium, so it did not exercise an actual quota failure.
- Repository licensing remains an owner decision. No public reuse license or public deployment has been enabled.

## Story traceability at this increment

| Story | Evidence / remaining work |
| --- | --- |
| 1. Immediate viewing | Production HTTP view and fit tested; offline browser test blocked as above. |
| 2. Reuse template | Project identity/example separated from engine; pinned toolchain and dependency notices; repository license pending. |
| 3. Visual editing | Add, drag, connect (form and handles), label/style editing, deletion, Undo/Redo and staged Cancel checked in Chromium. |
| 4. Predictable saving | Explicit source downloads, non-destructive invalid input, replacement confirmation, recovery Cancel/Resume and reload separation checked; storage failures unit-tested. |
| 5. Share | Bundled viewer is self-contained; local file never silently becomes published example; changed-document HTML export and recipient JSON roundtrip checked over HTTP; offline browser check remains blocked. |
| 6. Image export | Actual whole-diagram PNGs visually inspected for example, zoomed/offscreen content and maximum-length labels; size-limit failure preserved source. |
| 7. Human–AI format | Model tests plus actual file/visual roundtrip passed. |
| 8. Visual review | Exact edited source rendered and visually compared; workflow documented. |
| 9. Git portability | Plain JSON source, stable serialization/order, generated output excluded from Git. |
| 10. Full-site CI/CD | Production subpath/hash entry tested locally; workflows and authorized deployment verification pending. |

## Local editor increment — actual Chromium checks

The full build passed after the editor changes and the adaptive connection-label fix. Browser QA used the unchanged production artifact through the same managed HTTP preview, not the development bundle.

- Entered Edit explicitly; initial published view did not open browser recovery. Staged a component edit and canceled it: label and history were unchanged. Applied label, description and color together, clicked Apply again, then one Undo restored all three original fields; Redo restored the edit.
- Renamed the diagram, added a component, connected it through the From/To form, and repeated that connection without creating another edge. Dragged the component; one Undo restored the complete gesture and Redo restored the fractional final coordinates. Downloaded the actual source and inspected its stable IDs, endpoints and coordinates.
- Renamed and deleted a connection, then restored it with Undo. Deleted a component with two incident edges; all three disappeared together and Undo restored them. Connected release to idea using the actual canvas handles and observed the new directed edge.
- Reset confirmation Cancel retained the current five-node document; Apply replaced it with the four-node example and Undo restored the prior title, content and edges. Invalid version-2 text in Edit JSON was rejected in the modal; Cancel retained the current document.
- Imported the synthetic metadata/fractional-coordinate fixture, canceled its replacement, imported the same file again and applied it. Edited its title visually, downloaded it, and compared complete JSON objects: exact equality except the requested title change. This preserves IDs, order, fractional positions, viewport and unknown metadata.
- Reload after a requested download showed the bundled example, never the private draft. Edit offered the named recovery draft; Cancel kept the example and a second Edit → Resume restored the named draft. The UI distinguished requested downloads, browser recovery and unchanged repository state.
- A maximum 160-character edge label initially extended beneath adjacent cards. After constraining forward-route labels to their available horizontal gap, rebuilt and inspected the actual render: the full label wrapped between the cards without being hidden. Canonical positions were unchanged. Arbitrary overlapping human layouts are not automatically rearranged; reverse/vertical routes retain the normal bounded label width.
- Narrow Chromium window (526 CSS pixels, 511-pixel document width): inspector stacked below the canvas, form controls and recovery text remained readable without horizontal document overflow, and a title edit applied successfully. Fit View remained available after resize. Physical touch interaction was not tested.

- Repeated-connection regression: imported a four-node document with no edges, chose Review → Idea, clicked Connect twice, and downloaded the result. Exactly one Review → Idea edge existed; no default-pair edge appeared. From/To retained their choices across the commit. Deleting Review cleared only the missing From endpoint and disabled Connect; staged property Cancel still retained the original label.

All QA fixtures and browser downloads were illustrative and remained outside tracked source. No public deployment or repository write-back happened through the editor.

## Portable export increment — actual Chromium checks

- Downloaded the production viewer's example PNG and opened the actual image. A first wrapper-based implementation produced a blank image; capturing the isolated viewport fixed it. The verified 2650 × 682 result contains all four complete cards, three labels and arrowheads, with readable text and styling.
- Imported the exact human-edited roundtrip source with a further illustrative title/label change, literal angle brackets, unknown closing-script markup and Unicode line separators. Downloaded HTML, checked its inert embedded payload against the source, and opened that exact file through the supported HTTP preview at a different path. The changed title and literal label rendered, browser recovery remained unopened, and its downloaded JSON exactly matched the source including metadata and layout.
- Exported PNG from the portable file under its network-blocking CSP. Zoomed until the first and last components were outside the visible canvas, exported again, then opened the actual PNG: all four components and arrows remained present. The live canvas transform string was unchanged before/after capture.
- Exported a 160-character edge label extending beyond the cards' vertical bounds. The actual 2650 × 874 image retained the entire wrapped label and all cards/arrows.
- A layout spanning x=-100,000 to x=100,000 produced an actionable PNG size-limit error rather than an unreadable downscale. Its subsequent JSON download exactly matched the imported source.
- Re-exported HTML from the recipient viewing file successfully. The complete inline production bundle is also exercised by the final build's artifact check; testing only tiny synthetic JavaScript strings would not catch bundler integration issues.

- A malformed version-2 embedded payload showed an explicit fallback/recovery error. Opening the valid source restored the intended diagram and cleared that error; PNG export then succeeded on the final capture implementation.

- After the independent review found narrow-screen action overflow, verified all four file actions at a 322 CSS-pixel document width (Chromium window resizing plus 175% browser zoom): two rows, every button inside the document, and no horizontal overflow. Export PNG was usable there.
- Browser zoom exposed short edge-label wrapping in the PNG despite a single live line. The isolated capture now allows two pixels of width-rounding slack, capped by the original label limit. Rebuilt and opened the actual PNG at 175% browser zoom: short labels stayed on one line; a separate 160-character label export retained its full text, cards and arrows. The live source/layout was not changed.

These are actual production-artifact HTTP browser checks. They do not remove the file:// verification limitation above. Firefox/Safari, physical devices and browser memory exhaustion are not claimed tested.
