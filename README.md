# Pure Schematic

> A local-first React diagramming template with visual editing and portable HTML, PNG, and JSON exports.

### 1. Prerequisites

---

**Viewing:** [open the synthetic demo](https://nader-najjar.github.io/pure-schematic/#diagram) or a supplied HTML viewer. No account, API key, backend, or installation is needed. The example is illustrative, not a verified architecture. See [verification limits](docs/VERIFICATION.md), including direct offline opening.

**Development:** install [Bazelisk](https://bazel.build/install/bazelisk). `.bazelversion` selects Bazel; `MODULE.bazel` pins Node and pnpm. Run commands from the repository root.

### 2. Build and Test

---

#### Everyday Commands

| Goal | Command |
| --- | --- |
| Build the site without checks | `bazel build //:site` |
| Unit tests with coverage | `bazel test //:unit_tests` |
| Type check | `bazel test //:typecheck` |
| Lint | `bazel test //:lint` |
| Dependency boundaries / unused code | `bazel test //:dependency_boundaries //:unused_code` |
| Validate diagram JSON | `bazel test //:validate_diagrams` |
| Full verification | `bazel build //... && bazel test //...` |
| Local development server | `bazel run //:dev` |
| Preview production output | `bazel run //:preview` |
| Clean outputs | `bazel clean` |

Full verification also checks the lockfile and built artifact, and enforces 80% coverage. Preview and artifact checks build the site automatically. Restart the development server after source edits to refresh its declared snapshot.

Run one file or named test without the whole-project coverage gate:

```sh
bazel test //:unit_tests --test_arg=tests/model.test.ts --test_arg=--coverage.enabled=false
bazel test //:unit_tests --test_arg=tests/model.test.ts --test_arg=-t --test_arg='roundtrip preserves IDs' --test_arg=--coverage.enabled=false
```

#### Outputs

- Self-contained site/viewer: `bazel-bin/dist/index.html`.
- JUnit and coverage reports: `bazel-testlogs/unit_tests/test.outputs/outputs.zip`.

Inspect the actual HTML output in a browser, including direct offline opening and hosting under a subpath. Structural tests do not replace visual review. These build commands do not publish the site.

### 3. Development Workflows

---

#### Editing and Sharing Diagrams

- `diagrams/*.json` is canonical source; keep it in Git. `project.json` supplies the project identity. Give new projects a distinct `recoveryName`.
- **Open JSON** changes only the browser workspace; it does not upload or commit the file. Browser recovery is not a portable save.
- **Edit diagram** supports visual changes; **Edit JSON** stages a source replacement. Apply commits the form; Cancel leaves the diagram unchanged.
- **Download JSON** saves editable source; **Download HTML** saves a self-contained viewer/editor; **Export PNG** captures the whole diagram.
- Before sharing changes, validate the JSON and inspect rendered labels, overlaps, clipping, and arrow meaning. Preserve before/after renders for meaningful visual changes.

#### Dependency Management

Use the pinned pnpm to update `package.json` and `pnpm-lock.yaml`:

```sh
bazel run @pnpm -- --dir "$PWD" add --save-exact <package>@<version>
bazel run @pnpm -- --dir "$PWD" add --save-dev --save-exact <package>@<version>
bazel run @pnpm -- --dir "$PWD" remove <package>
bazel mod deps --lockfile_mode=update
```

Use the add command with a new version to upgrade/pin. Update affected `BUILD.bazel` dependency lists, then build and test. Commit the manifest and lockfiles together. After the IDE install below, trace a dependency with `bazel run @pnpm -- --dir "$PWD" why <package>`.

#### Toolchain Changes

Change Bazel in `.bazelversion`; rules and Node/pnpm in `MODULE.bazel`. Keep `.node-version` and `package.json` declarations aligned. Refresh `MODULE.bazel.lock` with `bazel mod deps --lockfile_mode=update`, then run full verification and refresh IDE paths.

### 4. IDE Setup

---

Prepare editor dependencies and print toolchain paths:

```sh
bazel build @rules_nodejs//nodejs:current_node_runtime @pnpm//:pkg //:node_modules/typescript
bazel cquery 'set(@rules_nodejs//nodejs:current_node_runtime @pnpm//:pkg //:node_modules/typescript)' --output=files \
  | sed "s|^|$(bazel info execution_root)/|"
bazel run @pnpm//:pnpm -- --dir "$PWD" install --frozen-lockfile
```

Follow the [IntelliJ IDEA Ultimate](https://app.notion.com/p/f4c0a2b7875583b79fa5015d58412fea) or [VS Code](https://app.notion.com/p/4fd0a2b787558204a6c001d0b034f698) guide. Use the printed `node` and pnpm `package` paths for JavaScript Runtime, and the TypeScript package’s `lib` directory for the TypeScript SDK, not global installations. Reprint paths after toolchain changes or cache cleanup.

### 5. Concepts

---

- [Document format and source contract](docs/DOCUMENT_FORMAT.md)
- [Editing, undo, and browser recovery](docs/EDITOR_STATE.md)
- [Sharing, exports, and privacy](docs/EXPORTS.md)
- [Publishing and source-commit verification](docs/PUBLISHING.md)
- [Acceptance evidence and limitations](docs/VERIFICATION.md)

### License

---

All rights reserved. Use, modification, and redistribution require prior written permission, subject to [LICENSE](LICENSE). Dependency licenses remain applicable; they do not grant rights to this repository's material.
