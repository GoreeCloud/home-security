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

## Scoped web lockfile remediation candidate (November 7, 2026)

A separate isolated web worktree used the official npm registry to run `npm audit fix --package-lock-only --ignore-scripts --no-fund --no-progress`. This refreshes **94 locked transitive package versions**, removes **50** previous lockfile package entries and adds **56** entries, while preserving the declared direct dependency ranges in web/package.json. No application dependencies or package lifecycle scripts were installed or executed during lockfile remediation.

A comparable read-only `npm audit --package-lock-only --omit=dev --json` reduced web advisories from **21 (12 high, 9 moderate)** to **8 (4 high, 3 moderate, 1 low)**, with no critical findings and no audit API errors. The remaining findings include high-severity matches involving `zod`, `object-path`, `brace-expansion`, and `picomatch`. Some advertised fixes require semver-major changes and cannot be accepted without separately testing API/component compatibility.

The proposed read-only, no-publish web CI installs the locked packages using `npm ci --ignore-scripts`, explicitly applies only the two inspected inherited Radix compatibility patches with local `patch-package`, and runs TypeScript/Vite build in an ephemeral hosted runner. The source-only import guard and regression suite must pass before this candidate can be merged. A passing build does not certify runtime camera behavior or security clearance.

## Scoped documentation lockfile remediation candidate (November 7, 2026)

An isolated development worktree ran `npm audit fix --package-lock-only --ignore-scripts --no-fund --no-progress` using the official npm registry. The candidate preserves the declared direct dependency ranges; npm changed **169 locked package versions**, removed **146** package entries and added **36** entries in the transitive dependency graph. No package installation, postinstall script or application code execution occurred during this lockfile resolution.

A follow-up `npm audit --package-lock-only --omit=dev --json` against the candidate returned **42 matches** — **16 critical, 12 high, 11 moderate, 3 low** — compared with the previous **84** (**19 critical, 38 high, 16 moderate, 11 low**). These counts are advisory matches, not exploit proof or an all-clear. The unresolved 28 critical/high matches remain release blockers, and the 21 web matches were not remediated by this docs-only update.

One inherited `@types/js-yaml` tarball resolution pointed to an alternative npm mirror. Its SHA-512 integrity was independently compared with the official npm registry's metadata for the exact version (4.0.9); the candidate switches the URL to the canonical `registry.npmjs.org` tarball without changing the hash. The repository import guard now rejects noncanonical lockfile tarball origins and missing SHA-512 hashes for both web and documentation packages.

**Build-compatibility validation:** Offline source-integrity and regression checks passed. The first [read-only hosted docs build](https://github.com/GoreeCloud/home-security/actions/runs/42417609880) successfully installed the pinned lockfile with lifecycle scripts disabled, but the documentation compile failed: `webpack@5.112.2` rejects deprecated `ProgressPlugin` options passed through `webpackbar@6.0.1` (`name`, `color`, `reporters`, `reporter`). This is a [documented Docusaurus/webpackbar compatibility failure](https://github.com/facebook/docusaurus/issues/11923), not a lockfile resolution or installer failure. The follow-up keeps the existing Docusaurus app version and pins the `webpackbar` override to `7.0.0` in docs/package.json, resolving that particular API mismatch without rolling back to older Webpack. The regenerated lockfile pins `webpackbar@7.0.0`. The second [hosted build attempt](https://github.com/GoreeCloud/home-security/actions/runs/42417937715) verified successful dependency installation and proceeded beyond the previous webpackbar failure, but compilation found another inherited browser-bundling issue: Postman code generators referenced Node's `path` module without a browser fallback. The follow-up adds a small reviewed browser-only Webpack compatibility plugin and the MIT-licensed `path-browserify@1.0.1` dependency (zero runtime npm dependencies) to resolve `path` only. The plugin intentionally does not provide `fs`, `crypto`, `process`, or other privileged Node polyfills. A new hosted build must validate this correction before merging. Remaining critical/high advisories still require separate remediation.

## Targeted docs critical-advisory remediation candidate (November 7, 2026)

The original docs lockfile contained `tinypool@1.1.1` via Docusaurus Core's `^1.0.2` dependency range. The npm advisory report identified two critical remote-code-execution issues, [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) and [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr). These advisories also raised the reported severity of multiple upstream Docusaurus dependency chains. No exploitation or reachable application attack path was verified.

An isolated review worktree explicitly overrides the Tinypool dependency to its fixed official npm version **2.1.2**. This is a **major-version override** beyond Docusaurus' declared range, not a routine within-range patch. The MIT-licensed dependency has zero package dependencies, uses SHA-512 integrity from the official npm registry and retains the principal Tinypool constructor, run and destroy TypeScript signatures; its Node engine support now starts at 20. The docs package engine is accordingly raised to `>=20.0.0`. API compatibility and worker behavior are *not* presumed solely from matching type signatures.

The same read-only `npm audit --package-lock-only --omit=dev --json` check reported **41** advisory matches on the candidate (0 critical, 12 high, 26 moderate, 3 low), down from **42** before the Tinypool change (16 critical, 12 high, 11 moderate, 3 low). The 15 prior critical-severity Docusaurus chains are still present as lower-severity findings; remaining 12 high and 26 moderate findings remain **OPEN**. This change requires a passing isolated hosted docs installation/compilation and source-integrity regression check before any merge; no camera or production service is involved.

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

The initial advisory baseline was read-only. Both the web and documentation follow-ups resolved lockfiles with npm audit fix in package-lock-only mode and lifecycle scripts disabled, without installing packages locally. Hosted GitHub CI ran isolated installs and compilation with read-only permissions: the web build passed, while the documentation build is still under targeted compatibility validation. Neither the advisories nor the successful compilation represent runtime security clearance. No production deployments, camera configuration, exposed services or live credentials were used. Raw npm advisory responses were not copied into this public repository because they are time-sensitive and must be rechecked during remediation.

See [Initial Security Baseline](SECURITY_BASELINE.md), [Import Provenance](IMPORT_PROVENANCE.md), and [release issue #1](https://github.com/GoreeCloud/home-security/issues/1).
