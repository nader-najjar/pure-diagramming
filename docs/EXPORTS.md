# Share the view, keep the source

Use **Download JSON** for the canonical editable source and Git history. Use **Download HTML** for a no-server viewing file named `diagram-view.html`. It includes the current document—not just the original example—and the complete React viewer/editor. A recipient can open it, inspect it, select Edit, and download JSON or another HTML snapshot. No sender browser storage is needed. A file download is requested, not proof that the browser or recipient saved it.

The HTML includes **all document metadata**, even fields not visibly rendered. Review the source for private information before sharing. Creating an HTML file does not upload it or update the published project-site link; publishing still requires an explicit repository/deployment action. Do not share a browser recovery draft as though it were a saved file.

The production build bundles scripts/styles into one file. Portable export refuses a development page with external script or stylesheet assets. Diagram data is validated and escaped in an inert JSON block; titles/labels remain text. A document-contained content-security policy blocks network resources while permitting the embedded application and data/blob image processing. Encoded payloads can be up to 30 MB because safe HTML escaping expands characters; the decoded canonical document still has the normal 5 MB limit.

## Presentation images

**Export PNG** captures the complete diagram, including rendered edge labels and arrows outside the current visible area. Output uses two pixels per authored layout pixel, with background and padding. It captures an isolated snapshot, excludes edit handles/selection highlights, and does not pan or relayout your live canvas. Keep meaningful spacing and concise connection labels; export preserves your layout rather than solving overlaps for you.

The limit is **32 megapixels total and 16,384 pixels per side**. Oversized layouts report an error instead of silently shrinking text or clipping. Move distant components closer, or share HTML/JSON. Empty/unmeasured documents and capture failures also report errors while preserving editable source. A document change during capture cancels the download so an older snapshot is not mistaken for the latest revision.

The tested React Flow image path pins `html-to-image` to **1.11.11**, as required by the [official export example](https://reactflow.dev/examples/misc/download-image). Revalidate before changing it. The app uses system fonts; PNG export does not fetch remote fonts or images.

## Human–AI handoff and visual review

1. Download the latest JSON; identify its exact filename/revision and who holds it. Save it beside project documentation, for example `diagrams/example.json`.
2. Make only the requested semantic edits. Preserve stable IDs, array order, unknown metadata, coordinates and saved viewport. Place new components deliberately; do not automatically relayout existing work.
3. Validate with `bazel test //:validate_diagrams` (for repository diagrams), then open that exact JSON in the viewer. Inspect labels, connection meaning, arrow direction, overlap and clipping. Use Edit for visual refinement and download the revised JSON.
4. Export and open the **actual PNG**, checking all content rather than trusting a successful download. Keep before/after renders for meaningful changes. Download HTML and open the actual viewing file too; distinguish an HTTP check from a local-file/offline check.
5. Commit the reviewed JSON, not browser state. Generated HTML/PNG are presentation copies, not substitutes for the source. State browser/device or inspection limits explicitly.

See [verification evidence](VERIFICATION.md). The current cloud browser blocks file:// navigation, so offline double-click interaction remains unverified; structural bundling and actual exported-file HTTP rendering are verified separately.
