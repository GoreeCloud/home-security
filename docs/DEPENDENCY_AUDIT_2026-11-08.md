# Dependency Security Check — November 8, 2026

**Product:** GoreeCloud Home Security, a source-only, attributed Frigate NVR derivative under development.

**Baseline verified:** public `GoreeCloud/home-security` `main` commit `3a211dc868256091d577463db1b09cc44450ca36`, which previously passed read-only source-integrity CI and isolated web/docs builds. The November 8 local audit is a **time-sensitive npm advisory snapshot**, not proof that any exploit is reachable.

## Method and scope

On the authorized development laptop, from fresh clean Git source:

- `cd web && npm audit --package-lock-only --omit=dev --json`
- `cd docs && npm audit --package-lock-only --omit=dev --json`

Both used the canonical npm registry. The separate remediation branch used **`npm install --package-lock-only --ignore-scripts --no-audit --no-fund`** and **`npm uninstall sort-by --package-lock-only --ignore-scripts --no-audit --no-fund`**, without installing dependencies locally, invoking package lifecycle scripts, or starting an NVR. npm advisory counts may differ from the number of individual CVEs, exploit paths, or direct dependencies.

| npm lockfile | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Docs on current main | 0 | 10 | 26 | 3 | 39 |
| Web on current main | 0 | 4 | 3 | 1 | 8 |
| Web reviewed lockfile candidate | 0 | 1 | 2 | 1 | 4 |

Neither audit command reported an npm advisory API error. The **candidate** web result is not a released or merged fix until its dedicated GitHub-hosted frontend, documentation, and source-integrity checks pass. The docs lockfile is unchanged in this candidate.

## Targeted web dependency remediation

The original web lockfile retained `brace-expansion@1.1.11` and `picomatch@2.3.1` as root transitive dependencies. The reviewed release versions `brace-expansion@1.1.21` and `picomatch@2.3.2` are MIT-licensed and available through the official npm registry with SHA-512 integrity.

Exact-version npm overrides were added instead of global overrides:

- `brace-expansion@1.1.11` → `1.1.21`
- `picomatch@2.3.1` → `2.3.2`

This preserves independent `brace-expansion` major 2/5 consumers and `picomatch` major 4 copies used by Vite and Vitest. A source-integrity guard and regression tests reject reintroduction of vulnerable root versions and unreviewed replacement of the Vite major.

`sort-by@1.2.0` was found in the package manifest/lockfile but **no application source imports or other references were found using Git search over tracked web source**. It was removed from the manifest and lockfile using npm's lockfile-only uninstall. Its sole transitive `object-path@0.6.0` dependency disappeared. The guard rejects reintroduction of this unused, advisory-flagged dependency chain. Source search does not prove behavior in dynamically loaded code or third-party consumers; the hosted frontend build is required.

The resulting web advisory view contains one high match, `zod@3.25.76`, for which npm currently proposes a semver-major v4 remediation. The remaining three findings are moderate or low. These must be evaluated separately rather than forced through a blind major-version upgrade.

## Remaining documentation dependency exposure

The documentation lockfile still reports ten high advisory-package matches. Several are inherited through Docusaurus/OpenAPI/Postman dependencies and require reviewed major upgrades. The `@docsearch/react` dependency chain also brings in AI SDK/provider utilities and an older `undici` version, despite the upstream AI search widget having been removed from GoreeCloud's active docs configuration. `undici@5.29.0` and its inherited `@fastify/busboy` dependency require separate security and compatibility assessment; **do not assume changing a transitive major in isolation preserves caller behavior**. The documentation AI/DocSearch dependency presence does not itself prove an active network call or privacy disclosure. No public docs site is deployed.

## Acceptance and remaining release gates

The local source-integrity guard and offline Python regression tests passed for this candidate, and direct + dev package-dependency maps match the updated lockfile. Hosted workflow jobs must still run `npm ci --ignore-scripts`, apply only reviewed Radix patches, perform TypeScript/Vite compilation, compile docs on supported Node 20 and 24, and pass the source guard without write permissions or deployment.

This npm-only analysis does **not** cover Python requirements, native libraries, CVE reachability, container/OS images, camera streams, video model artifacts, GoreeShield privacy acceptance, Wardveil runtime defenses, GoreeCloud Identity, GoreeCloud Mesh, branding, or backups. Retain [security issue #41](https://github.com/GoreeCloud/home-security/issues/41) and [release gate issue #1](https://github.com/GoreeCloud/home-security/issues/1) as **OPEN**.

For earlier baselines and previously merged fixes, see [November 7 dependency audit](DEPENDENCY_AUDIT_2026-11-07.md). No cameras, secrets, live network listeners, publishing workflows, or deployments were used in the current audit.
