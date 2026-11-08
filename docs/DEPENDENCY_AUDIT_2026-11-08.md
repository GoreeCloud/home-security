# Dependency Security Check — November 8, 2026

**Product:** GoreeCloud Home Security, a source-only, attributed Frigate NVR derivative under development.

**Baseline:** The initial November 8 audits used `main` commit `3a211dc868256091d577463db1b09cc44450ca36`. The web dependency remediation was subsequently merged at `1756fe4761779e207781a0387faa68e0e487205b` after all hosted builds passed. The documentation DocSearch and OpenAPI YAML remediations subsequently merged with hosted Node 20/24 and frontend checks passing; the serialization change below remains an unmerged review candidate. These are **time-sensitive npm advisory snapshots**, not proof of exploitable attack paths.

## Method and scope

On the authorized development laptop, from fresh clean Git source:

- `cd web && npm audit --package-lock-only --omit=dev --json`
- `cd docs && npm audit --package-lock-only --omit=dev --json`

Both used the canonical npm registry. The isolated review worktrees used **`npm install --package-lock-only --ignore-scripts --no-audit --no-fund`** and, for the web update, **`npm uninstall sort-by --package-lock-only --ignore-scripts --no-audit --no-fund`**, without installing dependencies locally, invoking package lifecycle scripts, or starting an NVR. npm advisory counts may differ from the number of individual CVEs, exploit paths, or direct dependencies.

| npm lockfile | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Docs before PR #51 | 0 | 10 | 26 | 3 | 39 |
| Docs after merged PR #51 | 0 | 8 | 22 | 3 | 33 |
| Docs after merged PR #52 | 0 | 7 | 22 | 3 | 32 |
| Docs serialization security candidate | 0 | 6 | 20 | 3 | 29 |
| Web before PR #50 | 0 | 4 | 3 | 1 | 8 |
| Web after merged PR #50 | 0 | 1 | 2 | 1 | 4 |

All listed npm advisory queries reported no npm API error. The web improvements were merged after the protected source-integrity, frontend build, and docs Node 20/24 build checks passed in [PR #50](https://github.com/GoreeCloud/home-security/pull/50). The docs search-dependency change in [PR #51](https://github.com/GoreeCloud/home-security/pull/51) has since merged after Node 20/24 compilation and other hosted checks passed. The scoped OpenAPI YAML correction in [PR #52](https://github.com/GoreeCloud/home-security/pull/52) subsequently merged after the corrected parent-scoped override passed Node 20/24 docs compilation, frontend build and source-integrity checks.

## Targeted web dependency remediation

The original web lockfile retained `brace-expansion@1.1.11` and `picomatch@2.3.1` as root transitive dependencies. The reviewed release versions `brace-expansion@1.1.21` and `picomatch@2.3.2` are MIT-licensed and available through the official npm registry with SHA-512 integrity.

Exact-version npm overrides were added instead of global overrides:

- `brace-expansion@1.1.11` → `1.1.21`
- `picomatch@2.3.1` → `2.3.2`

This preserves independent `brace-expansion` major 2/5 consumers and `picomatch` major 4 copies used by Vite and Vitest. A source-integrity guard and regression tests reject reintroduction of vulnerable root versions and unreviewed replacement of the Vite major.

`sort-by@1.2.0` was found in the package manifest/lockfile but **no application source imports or other references were found using Git search over tracked web source**. It was removed from the manifest and lockfile using npm's lockfile-only uninstall. Its sole transitive `object-path@0.6.0` dependency disappeared. The guard rejects reintroduction of this unused, advisory-flagged dependency chain. Source search does not prove behavior in dynamically loaded code or third-party consumers; the hosted frontend build is required.

The resulting web advisory view contains one high match, `zod@3.25.76`, for which npm currently proposes a semver-major v4 remediation. The remaining three findings are moderate or low. These must be evaluated separately rather than forced through a blind major-version upgrade.

## Documentation search dependency minimization candidate

The imported Docusaurus `@docusaurus/theme-search-algolia@3.9.2` declares `@docsearch/react: ^3.9.0 || ^4.1.0`. Its imported lockfile chose DocSearch 4.3.2, whose dependencies include `ai` and `@ai-sdk/react`, which transitively bring in `@ai-sdk/provider-utils`, `undici@5.29.0`, and `@fastify/busboy@2.1.1`. Those older HTTP packages contributed two high-severity npm advisory-package matches despite the upstream Inkeep chat/search widget already being disabled in the GoreeCloud docs configuration.

The isolated candidate applies a **parent-scoped override** `@docusaurus/theme-search-algolia > @docsearch/react: 3.9.0`, choosing a version explicitly accepted by Docusaurus. The published v3 package is MIT-licensed and uses the official npm registry with SHA-512 integrity. Its source tarball was inspected without running install scripts. Its manifest depends on Algolia Autocomplete and DocSearch CSS, **not** the AI SDK. The candidate lockfile drops DocSearch v4, the indirect `ai` and `@ai-sdk/*` modules, `undici`, and `@fastify/busboy` while retaining the same direct docs dependencies. No active production documents site exists.

The read-only npm query reports **33** docs matches (**0 critical, 8 high, 22 moderate, 3 low**) versus **39** on merged main (**0 critical, 10 high, 26 moderate, 3 low**). This is a dependency-reachability reduction by lockfile resolution, **not** an assertion that an external DocSearch or Algolia network call is impossible in a future configuration; the search theme is still present. A new source-integrity regression check rejects enabling an `algolia:` configuration without an explicit GoreeShield review, alongside checks that reject the removed AI/HTTP client dependency chain. The inherited Docusaurus/OpenAPI/Postman chain still produces high findings and may need major-version upgrades.

## Targeted OpenAPI YAML pin security remediation — merged PR #52

The imported `openapi-to-postmanv2@5.8.0` package declares **exactly `js-yaml@4.1.0`** rather than an open patch range. The existing docs lockfile separately includes `js-yaml@4.3.2` at root, and the older nested `4.1.0` copy is one high-severity npm advisory-package match. The latest v6 OpenAPI generator publishes newer YAML dependencies but would require a major generator migration.

An isolated review branch uses a parent-scoped override `openapi-to-postmanv2 > js-yaml: 4.3.2` to replace the imported exact-old-version pin. An earlier global `js-yaml@4.1.0` override passed Node 24 compilation but **failed the Node 20 npm 10 `npm ci` gate** (`Missing: js-yaml@4.1.0 from lock file`), so it was replaced before merge. The corrected parent-scoped alternative **passed** both Node 20 and 24 hosted clean-install/documentation builds. It does **not** override the distinct `gray-matter` YAML 3.x dependency, change direct OpenAPI generator versions, or execute install scripts. npm lockfile-only resolution removes the older nested copy and preserves official registry SHA-512 integrity. This override changes a version that the generator explicitly pinned; even though the replacement is within YAML major 4, API/behavior compatibility must be validated rather than presumed.

A fresh read-only `npm audit --package-lock-only --omit=dev --json` returned **32** documentation advisory-package matches (**0 critical, 7 high, 22 moderate, 3 low**), down from **33** (**0 critical, 8 high, 22 moderate, 3 low**) after merged PR #51. [PR #52](https://github.com/GoreeCloud/home-security/pull/52) passed the import guard/regressions, docs Node 20/24 installs/compilation, and the separate frontend build prior to merge. Remaining vulnerabilities and full runtime security acceptance are **OPEN**.

## Scoped docs build serialization security review candidate

The inherited docs build toolchain includes `copy-webpack-plugin@11.0.0` and `css-minimizer-webpack-plugin@5.0.1`. Both declare `serialize-javascript` major 6, leading to vulnerable `serialize-javascript@6.0.2`. The inspected published `serialize-javascript@7.1.3` source is BSD-3-Clause, CommonJS-compatible, requires Node 20+, has no npm runtime dependencies or install-time scripts, and is delivered through the official npm registry with SHA-512 integrity. The major version **may change behavior** and cannot be presumed compatible merely because it shares a CommonJS export.

In an isolated candidate, only those two parent packages have npm scoped overrides selecting `serialize-javascript@7.1.3`. The locked graph removes the vulnerable v6 root package and includes two nested v7.1.3 copies, retaining unrelated webpack and app dependencies. The latest read-only `npm audit --package-lock-only --omit=dev --json` reports **29** docs advisory-package matches (**0 critical, 6 high, 20 moderate, 3 low**) compared with **32** (**0 critical, 7 high, 22 moderate, 3 low**) on merged main. The `serialize-javascript` advisory-package match is no longer present; other high advisories remain.

This candidate requires source-integrity/regression checks and isolated hosted `npm ci --ignore-scripts` builds for docs on Node 20 and Node 24, plus the separate web TypeScript/Vite build, before any merge. No publishing workflow, docs deployment, cameras or production credentials are involved. It is **not** a runtime vulnerability clearance.

## Remaining documentation dependency exposure

The **baseline** docs lockfile had ten high advisory-package matches; the merged search-dependency fix reduced this to eight, the merged YAML fix to seven, and the **serialization review candidate** to six. The remaining findings are principally inherited through Docusaurus/OpenAPI/Postman dependencies including OpenAPI/Postman code generators and their transitive packages. Major-version migrations need isolated functional and compatibility tests. This change deliberately does **not** force an incompatible major upgrade of the HTTP client. No deployed documentation runtime or browser-level privacy result is claimed.

## Acceptance and remaining release gates

The local source-integrity guard and offline Python regression tests passed for this candidate, and direct + dev package-dependency maps match the updated lockfile. Hosted workflow jobs must still run `npm ci --ignore-scripts`, apply only reviewed Radix patches, perform TypeScript/Vite compilation, compile docs on supported Node 20 and 24, and pass the source guard without write permissions or deployment.

This npm-only analysis does **not** cover Python requirements, native libraries, CVE reachability, container/OS images, camera streams, video model artifacts, GoreeShield privacy acceptance, Wardveil runtime defenses, GoreeCloud Identity, GoreeCloud Mesh, branding, or backups. Retain [security issue #41](https://github.com/GoreeCloud/home-security/issues/41) and [release gate issue #1](https://github.com/GoreeCloud/home-security/issues/1) as **OPEN**.

For earlier baselines and previously merged fixes, see [November 7 dependency audit](DEPENDENCY_AUDIT_2026-11-07.md). No cameras, secrets, live network listeners, publishing workflows, or deployments were used in the current audit.
