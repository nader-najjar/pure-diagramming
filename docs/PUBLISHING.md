# Build and publish the complete project site

The synthetic example is published at [the project demo](https://nader-najjar.github.io/pure-schematic/#diagram). The renamed URL serves the existing release; the new branding is not deployed by this source change. Its deployment evidence is recorded in [VERIFICATION.md](VERIFICATION.md). Publication remains manual; merging source changes does not redeploy the site. Reusing repository material is subject to [LICENSE](../LICENSE).

## What becomes public

The project site bundles `project.json`, `diagrams/example.json`, and the React viewer/editor. **Every field in the bundled document, including unknown metadata, is public in the HTML.** Review those files for sensitive information before any publication. Other JSON files are validated during the build but are not automatically bundled. Imported local files and browser recovery drafts are not uploaded by either workflow.

The repository's source and Actions artifacts also follow the repository's visibility. Do not put secrets in source, diagrams, fixtures or generated artifacts. A private source repository does not necessarily make its Pages site private.

## CI without deployment

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and manual dispatch. It uses pinned Bazelisk/Bazel, the Bazel-managed Node toolchain and committed dependency locks to run **the full `bazel build //...` and `bazel test //...`**, including diagram validation, coverage-enforced tests, strict TypeScript, lint, dependency/unused-code checks and the complete single-file React artifact contract. It does not publish a website or change Pages settings.

Successful runs provide a `pure-schematic-<commit>` artifact containing `index.html`, retained for 14 days. Download/unzip it through the Actions run page and share the HTML file itself with a recipient; the recipient does not need an account, terminal or Node. Downloading an Actions artifact requires GitHub access, so the Actions page is not the no-account viewing link. Direct offline opening still needs the browser verification recorded in [VERIFICATION.md](VERIFICATION.md).

The workflow summary records the checked-out commit and HTML SHA-256. On pull requests this is GitHub's tested merge commit, not necessarily the feature branch's latest commit. The site's `pure-diagramming-source-commit` HTML meta tag records the same SHA. Local builds default to `local`. CI passes `--define=SOURCE_COMMIT="$SOURCE_COMMIT"` to both Bazel commands; this explicit action input prevents a cached artifact from silently retaining a different source label. For a labeled local build, pass a full 40-character SHA with the same flag to both commands. An ambient environment variable alone is not used. The label is not a signature or proof of a clean working tree.

## Explicitly authorized Pages publication

**The prepared workflow is manual-only and does not enable Pages.** Do not enable or dispatch it without the repository owner's approval of public hosting and the bundled content.

Once authorized:

1. A repository administrator enables GitHub Pages with **GitHub Actions** as the publishing source in the repository settings. Check the plan/organization constraints first. Public repositories support Pages on GitHub Free; private repositories have additional plan and visibility constraints. No personal access token is needed by these workflows.
2. Review the `github-pages` environment and its deployment branch/reviewer protection with the owner. This workflow is restricted to `main`; if a copied template uses a different default branch, update both workflows deliberately.
3. In Actions, choose **Publish project site (manual)**, select `main`, and explicitly check the **publish** input. Its default is false. A different branch or an unchecked input skips the build/deploy jobs.
4. The build repeats all normal checks, embeds the selected run's source SHA, and uploads the whole `bazel-bin/dist` site. The dependent deploy job alone receives `pages: write` and `id-token: write`. `configure-pages` has `enablement: false`; an unconfigured site fails rather than silently changing repository settings.
5. Follow the successful deployment's returned URL. Do not infer success from the upload step or assume a URL. Verify as below before sharing it.

Actions are pinned to full upstream release SHAs. When updating them or the toolchain, inspect the official release and rerun the full build and workflow checks. CI uses read-only repository permissions and does not persist checkout credentials; it does not run untrusted pull-request code via `pull_request_target`.

## Verify the deployed artifact, not only the build

- Record the deployment run's source commit and SHA-256 from its build summary. Fetch the returned site's HTML and compare its `pure-diagramming-source-commit` meta value and SHA-256 with those values. A source-SHA label alone is not byte equality.
- Open the returned project-subpath URL and its `#diagram` entry directly, then reload. Check the complete React UI, example labels, arrowheads, fit and readable outline, with no missing assets. Relative single-file assets are intentional; do not replace `base: './'` with an untested root-only assumption.
- Export an actual PNG and HTML/JSON roundtrip; inspect the image and confirm the source semantics. A successful deployment does not by itself validate image output or editing.
- Record which browser and exact artifact were tested. Public deployment is not claimed verified until these checks actually run. To roll back, restore the intended source in a reviewed commit on `main`, then explicitly dispatch and verify again; do not assume old browser drafts changed.

References: [GitHub's custom Pages workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [configure-pages inputs](https://github.com/actions/configure-pages/blob/v6.0.0/action.yml), [deploy-pages](https://github.com/actions/deploy-pages/tree/v5.0.1).
