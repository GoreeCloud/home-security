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

The initial baseline was read-only; the subsequent web remediation used a lockfile-only npm audit fix with lifecycle scripts disabled. No local package installation, lifecycle scripts, application runtime, production deployments, camera configuration or network exposure occurred. The proposed isolated hosted frontend build remains a separate verification step. Raw npm results were not copied into this public source repository because fix availability and advisory fields are time-sensitive and must be rechecked during remediation.

See [Initial Security Baseline](SECURITY_BASELINE.md), [Import Provenance](IMPORT_PROVENANCE.md), and [release issue #1](https://github.com/GoreeCloud/home-security/issues/1).
