# Zod 4 Form Validation Compatibility Review — November 8, 2026

**Product:** GoreeCloud Home Security (attributed Frigate NVR source import, unreleased)
**Source baseline:** public main `a40d4ae73add93e2ad68f164e11c39b8022aa9b9`
**Status:** isolated review branch only; no production acceptance or deployment

## Security motivation and compatibility risk

Read-only `npm audit --package-lock-only --omit=dev --json` on the existing web lockfile reports four advisory-package matches: one high (`zod@3.25.76`), two moderate (`react-router` and `react-router-dom`), and one low (`i18next-http-backend`).

An initial lockfile-only test of `zod@4.6.7` removed the high advisory match, but **upgrading Zod alone would break form error handling**: the imported `@hookform/resolvers@3.10.0` bundled resolver reads `ZodError.errors`, while Zod 4 uses `ZodError.issues`. The latter library's current `5.9.2` package declares peer compatibility with both Zod 3.25+ and 4.x and `react-hook-form@^7.55.0`. Its inspected compiled Zod resolver includes a dedicated v4 implementation that translates `issues` to field-specific React Hook Form errors. Do not merge an isolated Zod-only update.

The candidate uses exact direct pins `zod@4.6.7` and `@hookform/resolvers@5.9.2` with `react-hook-form@7.72.0` unchanged. The package source, metadata, licenses and official registry SHA-512 lock entries were inspected before adoption; no package scripts or local node installs were executed. The changed lockfile retains official registry origins.

## Focused actual-form regression coverage

For testing the exact schemas used by the UI, the original login, create-user and create-role schemas were moved without loosening their field constraints into `web/src/lib/validation/authSchemas.ts`, and each corresponding component now imports its builder and passes the same already-localized error messages. The new `authSchemas.test.ts` exercises real `zodResolver` code on synthetic values:

- Login: empty username/password return expected field errors; valid dummy values return no error.
- Create user: valid input; forbidden characters; all-dot usernames; short password; empty confirmation; mismatched confirmation with the error attached to `confirmPassword`.
- Create role: valid assigned camera; duplicate role; invalid role name; missing assigned camera.

The read-only GitHub web CI is extended to execute these tests using the installed lockfile's Vitest binary, with `--no-install`, before TypeScript/Vite compilation. The first hosted attempt failed because the upstream Vite test configuration referenced an absent `web/__test__/test-setup.ts` file. Rather than masking that issue or constructing a fake setup, the candidate now uses a separate `web/vitest.validation.config.ts` with a pure Node environment and only the reviewed schema test file. This new configuration requires a fresh hosted CI run before the candidate can be accepted. The source import integrity guard pins both compatible package versions, requires these schema-test files and the CI step, and has four new negative regression cases. All inputs in tests are artificial; no credentials, live users, camera streams or outbound API calls are involved.

## Reproduced advisory results

Using equivalent read-only npm audit flags with the official registry:

| Web dependency snapshot | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Merged main | 0 | 1 | 2 | 1 | 4 |
| Candidate Zod 4 + resolver 5 | 0 | 0 | 2 | 1 | 3 |

There were no advisory API errors. The documentation lockfile is unchanged at 29 matches (0 critical, 6 high, 20 moderate, 3 low). These are advisory-package matches, not counts of confirmed exploitable defects or a complete software bill of materials.

## Release blockers and limits

This is a **semver-major change to input validation and form resolution** and affects approximately 22 tracked web component files importing `zod`. Shared schema tests, CI compilation, and lockfile review are necessary but **insufficient** to confirm that every camera, mask, zone, trigger, classifier, notification, user-management and authorization form preserves behavior.

Before merging, require all hosted source-integrity, actual validation tests and frontend builds to pass on the current branch. For release acceptance, verify browser-level form submission and error rendering with synthetic, isolated fixtures; test Zod 4 changed coercion behavior (especially missing ONVIF ports), optional/nullable defaults, localization, password-strength logic, React Hook Form integration and CSRF/auth/network behavior. Never submit synthetic test credentials to live services. Verify no sensitive input appears in error logs, alerts, analytics or telemetry. All such testing requires the authorized isolated runtime/harness and GoreeShield privacy review; none is implied by a passing compile.

The existing Dependabot Zod v4 PR #34 is older and separate; do not merge blindly or infer that earlier TypeScript compilation is adequate. Remaining docs/web advisories, Python/native/OS/container/model supply chain, GoreeCloud UI brand/trademark, GoreeCloud Identity/Mesh/GoreeShield/Wardveil contracts, backups and real NVR/hardware testing remain release blockers. [Security issue #41](https://github.com/GoreeCloud/home-security/issues/41) and [release gate issue #1](https://github.com/GoreeCloud/home-security/issues/1) stay open.
