# Build and publish the complete project site

The public demo is unpublished. Earlier [deployment evidence](VERIFICATION.md) is retained as history. This repository has no check or publishing workflows, and merges do not redeploy the site. Reusing repository material is subject to [LICENSE](../LICENSE).

## What becomes public

The project site bundles `project.json`, `diagrams/example.json`, and the React viewer/editor. **Every field in the bundled document, including unknown metadata, is public in the HTML.** Review those files for sensitive information before any publication. Other JSON files are validated during the build but are not automatically bundled. Imported local files and browser recovery drafts stay local.

The repository's source follows the repository's visibility. Do not put secrets in source, diagrams, fixtures or generated artifacts. A private source repository does not necessarily make its Pages site private.

## Build and share an artifact

Run `bazel build //... && bazel test //...` for full local verification. The complete site is `bazel-bin/dist/index.html`. Share that HTML file with a recipient; viewing it does not require an account, terminal or Node. Direct offline opening still needs the browser verification recorded in [VERIFICATION.md](VERIFICATION.md).

The site's `pure-diagramming-source-commit` HTML meta tag defaults to `local`. For a labeled build, pass `--define=SOURCE_COMMIT=<full-40-character-SHA>` to both Bazel commands. This explicit action input prevents a cached artifact from silently retaining a different source label. An ambient environment variable alone is not used. The label is not a signature or proof of a clean working tree.

Publishing requires a separately configured delivery process and the repository owner's approval of public hosting and the bundled content. No publishing action is supplied here.

## Verify the deployed artifact, not only the build

- Record the built artifact's source commit and SHA-256 before deployment. Fetch the returned site's HTML and compare its `pure-diagramming-source-commit` meta value and SHA-256 with those values. A source-SHA label alone is not byte equality.
- Open the returned project-subpath URL and its `#diagram` entry directly, then reload. Check the complete React UI, example labels, arrowheads, fit and readable outline, with no missing assets. Relative single-file assets are intentional; do not replace `base: './'` with an untested root-only assumption.
- Export an actual PNG and HTML/JSON roundtrip; inspect the image and confirm the source semantics. A successful deployment does not by itself validate image output or editing.
- Record which browser and exact artifact were tested. Public deployment is not claimed verified until these checks actually run. To roll back, restore the intended source in a reviewed commit on `main`, then rebuild, publish through the authorized delivery process, and verify again; do not assume old browser drafts changed.
