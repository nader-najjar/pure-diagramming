# Verification record — viewer, editor and exports

Date: 2026-10-27. This records the viewer, editor, exports, CI and authorized public deployment, **not a claim that all user stories pass**.

## Automated author checks

`npm run build` runs the exact Node/npm check, validates every bundled diagram, runs 37 unit tests, checks strict TypeScript, builds the complete React site, and asserts a single HTML output with inline JavaScript/styles and no external script/style imports. All passed.

Tests include stable IDs/order, targeted AI label and connection edits, fractional human coordinates, unknown metadata at every JSON level, byte/count/text/depth limits, malformed data, unsupported versions/colors, invalid references, and wide-layout fitting bounds. Limits reject rather than truncate or clamp.

Vite reports that React Flow's `use client` directive is not preserved; this browser-only build does not use server components. The build completes successfully.

## Actual cloud Chromium checks

The production `dist/index.html` was copied unchanged to a local QA directory and served through the supported managed preview daemon. Those initial checks preceded the authorized public deployment recorded below.

- Desktop render inspected: four complete cards, three labeled arrows, correct arrow direction and no overlapping example cards.
- Downloaded actual JSON through the UI; the downloaded document exactly matched `diagrams/example.json`.
- Edited that exact downloaded source with a label change, x=12.125, position metadata and root metadata. Imported through the real file chooser, rendered and inspected the change, downloaded again, and compared full JSON objects: exact semantic equality, including original IDs, order, viewport and unrelated content.
- Imported an unsupported `schemaVersion: 2` file. The UI reported the error while retaining the valid imported diagram.
- Opened the actual production site at `/project-subpath/#diagram`; the complete React UI and diagram rendered. Reload restored the bundled example, not a previously opened local file.
- Narrow browser window (approximately 512 CSS pixels): controls and page layout fit. Whole-diagram labels become small at fit zoom; the expandable **Read as text** outline was opened and visually checked for readable labels, descriptions and labeled source-to-target connections.
- A deliberately wide diagram with endpoint nodes at x=-100,000 and x=100,000 fit inside the 485 × 360 canvas. Browser-measured node rectangles were all inside canvas bounds both initially and after the Fit View action. The readable outline remains available at tiny visual zoom.

## Verification limits

- Direct `file://` opening was blocked by the cloud browser's URL security policy. No alternate route was used to bypass that restriction. The single-file structure is verified, but **offline double-click browser behavior remains unverified** and needs a supported local-file test before story 1 is closed.
- Firefox, Safari, physical mobile devices and high-node-count rendering performance have not been tested.
- Full-site CI passed on both the pull request and merged main, as recorded below. The authorized public Pages deployment and exact deployed bytes were verified as recorded below. Browser storage-denial/corrupt-entry/write-failure paths are covered by unit tests, not a forced browser configuration change. The 4.9 MB valid synthetic fixture saved successfully in Chromium, so it did not exercise an actual quota failure.
- The owner chose the all-rights-reserved notice in [LICENSE](../LICENSE), copied unchanged from pure-java. This documents the terms but does not grant general public reuse permission.

## Story traceability at this increment

| Story | Evidence / remaining work |
| --- | --- |
| 1. Immediate viewing | Public no-account project-site view, fit and direct hash entry tested; offline browser test blocked as above. |
| 2. Reuse template | Project identity/example separated from engine; pinned toolchain and dependency notices; owner-selected all-rights-reserved terms documented (reuse requires permission). |
| 3. Visual editing | Add, drag, connect (form and handles), label/style editing, deletion, Undo/Redo and staged Cancel checked in Chromium. |
| 4. Predictable saving | Explicit source downloads, non-destructive invalid input, replacement confirmation, recovery Cancel/Resume and reload separation checked; storage failures unit-tested. |
| 5. Share | Bundled viewer is self-contained; local file never silently becomes published example; changed-document HTML export and recipient JSON roundtrip checked over HTTP; offline browser check remains blocked. |
| 6. Image export | Actual whole-diagram PNGs visually inspected for example, zoomed/offscreen content and maximum-length labels; size-limit failure preserved source. |
| 7. Human–AI format | Model tests plus actual file/visual roundtrip passed. |
| 8. Visual review | Exact edited source rendered and visually compared; workflow documented. |
| 9. Git portability | Plain JSON source, stable serialization/order, generated output excluded from Git. |
| 10. Full-site CI/CD | Full React CI passed on the PR and merged main; its actual artifact was visually checked over HTTP. Manual Pages deployment passed; deployed HTML exactly matches its artifact and source SHA, with actual public browser checks below. |

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

## CI/CD preparation increment

- Clean `npm ci` completed with the pinned Node/npm versions and lockfile. Full builds passed both without `SOURCE_COMMIT` (`local` metadata) and with a full SHA fixture; 37 tests, TypeScript, production bundling and artifact checks passed. Invalid provenance inputs are unit-tested.
- Both workflow files passed actionlint 1.7.12, downloaded from its official release with the release checksum verified. This checks workflow syntax/expressions, not GitHub runner execution.
- Served the unchanged production output at `/project-subpath/#diagram` in cloud Chromium. A fresh direct entry and reload now scroll to the mounted diagram, while a URL without the hash starts at the page introduction. Inspected all four cards, three labeled arrows and controls; the DOM metadata exactly matched the supplied test SHA. That fixture labels an uncommitted local QA build, not a deployed source revision.
- At the initial pre-publication review, remote Actions and Pages had not run. The completed CI results are recorded below. The manual publication input defaults to false, only `main` is eligible, and repository Pages enablement remains an owner-approved step. The subsequently authorized deployment and byte/SHA verification are recorded in the public release section below.


## Verified remote CI results

- [PR 5 build run 40500674025](https://github.com/nader-najjar/pure-diagramming/actions/runs/40500674025) completed successfully for feature head `35ddac1235345e28db575a143c8cf68e7f1f76b6`, testing merge commit `80cea4add8eb45f9baeb611dd653a977b8e1e6c3`. Clean install, all 37 tests, TypeScript, full React build, artifact checks and upload passed.
- Downloaded artifact `12732616560` and verified its ZIP SHA-256 against GitHub's reported digest: `70ef83fa68097094be3a5ca2101dd39c81dd30caf192c1353c108dedbe17d740`. It contained exactly `index.html`; its embedded source matched the tested merge commit. HTML SHA-256: `08888732f1a9558e34fab6bd62303a084eb87a0f526d7b1b5e6aaef3f55f1c77`. After normalizing only that provenance meta value, its bytes matched the locally tested production artifact.
- Opened that exact CI-produced HTML through the supported HTTP preview with `#diagram`. Confirmed the intended anchor position, four complete cards, three labeled arrows and editor controls. Exported and opened its actual PNG: all components, labels, arrowheads and styling were present and readable.
- [Merged-main build run 40500978133](https://github.com/nader-najjar/pure-diagramming/actions/runs/40500978133) completed successfully for `8d14aac88fdacbfa2fb52553f98cc2e785b4220c`; every install/build/upload step passed and artifact `12732562185` was created. No Pages workflow was dispatched by that CI run. Artifacts have 14-day retention; these IDs are historical evidence, not permanent distribution links.

## Acceptance gates after public release

1. **Offline viewing (stories 1 and 5):** the HTML is structurally self-contained and its HTTP behavior is verified, but the cloud browser blocks `file://` navigation. A supported local-file opening test is still required; no alternate route was used to bypass that policy. Firefox/Safari and a second physical device are not claimed tested.
2. **Reuse rights (story 2), resolved:** the owner selected the all-rights-reserved notice in `LICENSE`. Dependency licenses and the absence of paid services do not independently grant rights to this project's source.
3. **Public site (stories 1, 5 and 10), verified:** owner approval, Pages enablement, full-site deployment and deployed URL/source/byte/browser checks are recorded below. The offline criterion remains unverified, as stated in item 1.

The editor, recovery, whole-image export and human–AI JSON workflow have the automated and actual Chromium evidence above, with the stated storage-failure/performance/browser limits. This record does not silently convert untested or unauthorized gates into passes.

## Authorized public release — 2026-10-27

The owner approved public Pages hosting of the synthetic example and selected the same all-rights-reserved notice as [pure-java](https://github.com/nader-najjar/pure-java/blob/main/LICENSE). `LICENSE` copies that notice unchanged, including Copyright © 2026 Nader Najjar. Dependency terms remain separate; this does not make the repository open source.

- Enabled Pages with GitHub Actions as its source and explicitly dispatched the existing manual workflow on `main`. [Run 40525157570](https://github.com/nader-najjar/pure-diagramming/actions/runs/40525157570) passed its full build and deployment jobs. No automatic deployment trigger or custom domain was added.
- Source: `8d14aac88fdacbfa2fb52553f98cc2e785b4220c`. The later acceptance/license documentation does not change the deployed application. Published URL returned by the deployment: <https://nader-najjar.github.io/pure-diagramming/>.
- Downloaded the run's `github-pages` artifact (ID `12742853049`), checked ZIP SHA-256 `2bcc97b7f9155dac16c0cdae277d47a6508f984774c666d8d6c566a822344287`, and inspected its tar: only `index.html`. The deployed HTTPS response is byte-for-byte identical to that HTML. Its SHA-256 is `7e4ab96bd4ab89e83172bea6bcf8aacc7630462e049e9c4620a1172428ede857`, matching the workflow summary, and its source meta tag is the exact SHA above.
- Actual cloud Chromium opened the public project-subpath URL without an application login. Inspected all four cards, three labeled directed arrows, styling and controls. Direct `#diagram` reload placed the diagram at approximately 16 CSS pixels from the viewport top. The page did not auto-open browser recovery.
- Downloaded JSON from the public UI and compared its complete semantics with `diagrams/example.json`: exact equality. Entered Edit, applied an illustrative title change, undid it to restore the example, and returned to view-only mode. No diagram edits were uploaded.
- Downloaded the public page's actual 2650 × 682 PNG and opened the image: complete cards, labels and arrowheads, matching the rendered example. Downloaded its HTML, checked the embedded document exactly against source, opened that exact file through the supported private HTTP preview at a separate path, and downloaded its JSON: exact semantic equality again. The recipient view started without browser recovery.

These checks close the public deployment gate, not the blocked local-file gate. No private diagrams were published. Offline `file://`, other browser engines and physical-device verification retain the limitations above.
