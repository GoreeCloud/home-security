# Dependency Security Check — November 8, 2026

**Product:** GoreeCloud Home Security, a source-only, attributed Frigate NVR derivative under development.

**Baseline:** The initial November 8 audits used `main` commit `3a211dc868256091d577463db1b09cc44450ca36`. The web dependency remediation was subsequently merged at `1756fe4761779e207781a0387faa68e0e487205b` after all hosted builds passed. The separate documentation search-dependency change described below is a candidate until its own hosted checks pass. These are **time-sensitive npm advisory snapshots**, not proof of exploitable attack paths.

## Method and scope

On the authorized development laptop, from fresh clean Git source:

- `cd web && npm audit --package-lock-only --omit=dev --json`
- `cd docs && npm audit --package-lock-only --omit=dev --json`

Both used the canonical npm registry. The isolated review worktrees used **`npm install --package-lock-only --ignore-scripts --no-audit --no-fund`** and, for the web update, **`npm uninstall sort-by --package-lock-only --ignore-scripts --no-audit --no-fund`**, without installing dependencies locally, invoking package lifecycle scripts, or starting an NVR. npm advisory counts may differ from the number of individual CVEs, exploit paths, or direct dependencies.

| npm lockfile | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Docs on current main | 0 | 10 | 26 | 3 | 39 |
| Docs search dependency review candidate | 0 | 8 | 22 | 3 | 33 |
| Web before PR #50 | 0 | 4 | 3 | 1 | 8 |
| Web after merged PR #50 | 0 | 1 | 2 | 1 | 4 |

All four corresponding npm advisory queries reported no npm API error. The web improvements were merged after the protected source-integrity, frontend build, and docs Node 20/24 build checks passed in [PR #50](https://github.com/GoreeCloud/home-security/pull/50). The independent docs search-dependency improvement remains an **unmerged review candidate** pending its own hosted compilation checks.

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

## Remaining documentation dependency exposure

The **current main** docs lockfile had ten high advisory-package matches; the **review candidate** has eight, principally through Docusaurus/OpenAPI/Postman dependencies including `js-yaml`, serialization utilities, code generators and their transitive packages. Major-version migrations need isolated functional and compatibility tests. This change deliberately does **not** force an incompatible major upgrade of the HTTP client. No deployed documentation runtime or browser-level privacy result is claimed.

## Acceptance and remaining release gates

The local source-integrity guard and offline Python regression tests passed for this candidate, and direct + dev package-dependency maps match the updated lockfile. Hosted workflow jobs must still run `npm ci --ignore-scripts`, apply only reviewed Radix patches, perform TypeScript/Vite compilation, compile docs on supported Node 20 and 24, and pass the source guard without write permissions or deployment.

This npm-only analysis does **not** cover Python requirements, native libraries, CVE reachability, container/OS images, camera streams, video model artifacts, GoreeShield privacy acceptance, Wardveil runtime defenses, GoreeCloud Identity, GoreeCloud Mesh, branding, or backups. Retain [security issue #41](https://github.com/GoreeCloud/home-security/issues/41) and [release gate issue #1](https://github.com/GoreeCloud/home-security/issues/1) as **OPEN**.

For earlier baselines and previously merged fixes, see [November 7 dependency audit](DEPENDENCY_AUDIT_2026-11-07.md). No cameras, secrets, live network listeners, publishing workflows, or deployments were used in the current audit.
