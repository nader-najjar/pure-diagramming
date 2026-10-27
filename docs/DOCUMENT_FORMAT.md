# Diagram document format (version 1)

A diagram's editable source is its UTF-8 JSON file, not a screenshot, generated HTML, browser recovery draft, or React Flow instance. Both people and AI work with the same file. Never regenerate stable IDs or automatically rearrange an existing diagram unless asked.

## Supported fields

| Location | Field | Contract |
| --- | --- | --- |
| Root | `schemaVersion` | Exactly `1`; other versions are rejected, not migrated silently. |
| Root | `title` | Text, up to 160 UTF-16 code units. |
| Root | `description` | Optional plain text. |
| Root | `nodes`, `edges` | Ordered arrays; at most 1,000 nodes and 3,000 edges. These are validation ceilings, not performance promises. |
| Node | `id` | Nonempty string, unique among nodes. Keep it when editing. |
| Node | `position` | Object with finite numeric `x` and `y`; fractional and negative coordinates are preserved. |
| Node | `data.label` | Plain text, up to 160 UTF-16 code units. |
| Node | `data.description` | Optional plain text, up to 500 UTF-16 code units. |
| Node | `data.color` | Optional `blue`, `purple`, or `green`; omission means blue. Other colors are rejected, not substituted. |
| Edge | `id` | Nonempty string, unique among edges. A node may have the same ID. |
| Edge | `source`, `target` | IDs of existing nodes. Direction is source → target. |
| Edge | `label` | Optional plain text, up to 160 UTF-16 code units. |
| Root | `viewport` | Object with finite `x`, `y` and `zoom` between 0.1 and 4. This is the author's saved view, not transient selection or measurements. |

Unknown fields at **every level** are inert metadata and survive read–save–reopen. In particular, a field named `type`, `style`, or `hidden` does not configure the rendering engine. Only the fields above have supported meaning in version 1; arbitrary React Flow documents are not this format. A format change that needs new rendering semantics must introduce a supported schema version rather than rely on ignored fields. Labels are text, never executable HTML.

All values, including metadata, must be JSON values. Non-finite numbers, functions, `undefined`, class instances, cyclic references and nesting beyond 100 levels are rejected. Both the original UTF-8 input and its canonical pretty-printed form must fit within 5,000,000 bytes. Limits reject with an error; they never truncate content. The legacy experiment accepted arbitrary color strings; convert those explicitly to a supported color before using this template.

## Stable serialization and human layout

`src/model.ts` is the executable validator. `parseDiagram(text)` returns the validated document without sorting arrays or generating IDs. `serialize(document)` validates and uses two-space indentation plus a final newline. JSON formatting is normalized; property insertion order and array order are retained (JavaScript's standard numeric object-key ordering applies). JSON numbers follow JavaScript's numeric precision; do not encode precision-sensitive identifiers as numbers. Use strings instead.

A viewer may fit the document to its window without rewriting `viewport`. Transient hover, selection, node measurements and pan/zoom belong to the UI, not the canonical source. Changing a label must preserve node coordinates, saved viewport, IDs, array order, all unrelated supported fields and unknown metadata.

For a targeted AI change: start with the latest human-exported file, make only the requested edit, validate that exact file, render it, inspect label readability, overlaps, clipping and arrow meaning, then iterate. A validation pass is not a visual pass. Save the final JSON and review its Git diff; preserve before/after renders for meaningful visual changes. Generated views and images are presentation copies, not replacements for the editable JSON.

Node x/y coordinates must lie within -1,000,000 through 1,000,000. This explicit rendering limit prevents browser geometry overflow; imports beyond it are rejected, never clamped. Wide supported diagrams can fit at very small zoom; use zoom controls or Read as text for readable labels.
