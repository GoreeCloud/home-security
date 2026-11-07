# Dependency Audit — November 7, 2026

**Source:** GoreeCloud Home Security main 79a9e1c7a42bb49d2e707db080ff4b2ae83d43f3, after the initial security-baseline merge.

**Status:** Open security remediation. These are npm lockfile advisory matches, **not proof of exploitation, runtime exposure, or a complete SBOM/vulnerability assessment**.

## Method

Read-only npm advisory queries were run on the connected authorized development laptop, without installing dependencies or invoking application scripts:

- web: npm audit --package-lock-only --omit=dev --json
- docs: npm audit --package-lock-only --omit=dev --json

The commands query the current npm advisory service. This is a point-in-time assessment based on imported repository lockfiles. The omit-dev option requests the non-development dependency view; dependency chains can be transitive, and actual usage/reachability still requires review.

## Results

| Lockfile | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| web/package-lock.json | 0 | 12 | 9 | 0 | 21 |
| docs/package-lock.json | 19 | 38 | 16 | 11 | 84 |

The npm audit JSON did not report an API error for either query. These are dependency/advisory findings, not exploit reproductions or counts of direct dependencies. High-severity web findings include axios, zod, postcss, js-yaml, form-data, nanoid, object-path and additional parsing/matching dependencies. The docs findings include critical-severity dependency chains involving Docusaurus and documentation tooling.

## Scoped documentation lockfile remediation candidate (November 7, 2026)

An isolated development worktree ran `npm audit fix --package-lock-only --ignore-scripts --no-fund --no-progress` using the official npm registry. The candidate preserves the declared direct dependency ranges; npm changed **169 locked package versions**, removed **146** package entries and added **36** entries in the transitive dependency graph. No package installation, postinstall script or application code execution occurred during this lockfile resolution.

A follow-up `npm audit --package-lock-only --omit=dev --json` against the candidate returned **42 matches** — **16 critical, 12 high, 11 moderate, 3 low** — compared with the previous **84** (**19 critical, 38 high, 16 moderate, 11 low**). These counts are advisory matches, not exploit proof or an all-clear. The unresolved 28 critical/high matches remain release blockers, and the 21 web matches were not remediated by this docs-only update.

One inherited `@types/js-yaml` tarball resolution pointed to an alternative npm mirror. Its SHA-512 integrity was independently compared with the official npm registry's metadata for the exact version (4.0.9); the candidate switches the URL to the canonical `registry.npmjs.org` tarball without changing the hash. The repository import guard now rejects noncanonical lockfile tarball origins and missing SHA-512 hashes for both web and documentation packages.

**Build-compatibility validation:** Offline source-integrity and regression checks passed. The first [read-only hosted docs build](https://github.com/GoreeCloud/home-security/actions/runs/42417609880) successfully installed the pinned lockfile with lifecycle scripts disabled, but the documentation compile failed: `webpack@5.112.2` rejects deprecated `ProgressPlugin` options passed through `webpackbar@6.0.1` (`name`, `color`, `reporters`, `reporter`). This is a [documented Docusaurus/webpackbar compatibility failure](https://github.com/facebook/docusaurus/issues/11923), not a lockfile resolution or installer failure. The follow-up keeps the existing Docusaurus app version and pins the `webpackbar` override to `7.0.0` in docs/package.json, resolving that particular API mismatch without rolling back to older Webpack. The regenerated lockfile pins `webpackbar@7.0.0`. The second [hosted build attempt](https://github.com/GoreeCloud/home-security/actions/runs/42417937715) verified successful dependency installation and proceeded beyond the previous webpackbar failure, but compilation found another inherited browser-bundling issue: Postman code generators referenced Node's `path` module without a browser fallback. The follow-up adds a small reviewed browser-only Webpack compatibility plugin and the MIT-licensed `path-browserify@1.0.1` dependency (zero runtime npm dependencies) to resolve `path` only. The plugin intentionally does not provide `fs`, `crypto`, `process`, or other privileged Node polyfills. A new hosted build must validate this correction before merging. Remaining critical/high advisories still require separate remediation.

## Release blockers and remediation sequence

1. Treat web and documentation lockfile findings as **open release blockers**. Determine each affected package version, direct/transitive dependency chain, patch release, reachability and compatibility risk before changes.
2. Prioritize critical documentation-toolchain advisories before running unreviewed builds or deploying documentation; separately prioritize high-severity runtime-relevant web advisories.
3. Apply minimal compatible fixes in isolated review branches and test them in disposable build environments. Do not blindly apply major-version upgrades that npm reports as semver-major.
4. Validate actual frontend and documentation builds, lint/tests and smoke flows without production credentials, live camera devices or service exposure.
5. Audit Python dependencies, container base images, platform-specific build files, native libraries and model artifacts separately. The npm audit does not cover them.
6. Re-query security advisories against updated lockfiles and preserve verification evidence before declaring release readiness.

## Dependabot follow-up

The first Docker ecosystem update failed because the inherited /docker directory contains no Dockerfile. Actual Dockerfiles are under docker/main and architecture-specific subdirectories. A follow-up adjusts the Docker updater to /docker/main and adds regression coverage. The first enabled update cycle opened 37 Dependabot version-update PRs; the follow-up reduces the cap to two open version-update PRs per ecosystem to prevent a repeat flood. The already-open PRs remain unmerged and require prioritization; changing the cap is not an automatic security fix. Security update limits are independent from version-update caps. Other architecture-specific Dockerfiles need their own future review.

## Evidence limits

The initial audit did not install packages or execute application scripts. The follow-up used lockfile-only `npm audit fix` with lifecycle scripts disabled, without locally installing packages; its effect is a transitive dependency resolution update and **not** proof of safety. No local npm ci, production deployments, camera configuration or new service exposure occurred. Raw npm results were not copied into this public source repository because fix availability and advisory fields are time-sensitive and must be rechecked during remediation.

See [Initial Security Baseline](SECURITY_BASELINE.md), [Import Provenance](IMPORT_PROVENANCE.md), and [release issue #1](https://github.com/GoreeCloud/home-security/issues/1).
