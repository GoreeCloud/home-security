# Zod 4 Form Validation Compatibility Review — November 8, 2026

**Product:** GoreeCloud Home Security (attributed Frigate NVR source import, unreleased)
**Current merge baseline:** public main `06da62e7d5f17ac9cc90619c0b944de807c92f76` ([PR #57](https://github.com/GoreeCloud/home-security/pull/57) moved the ten working Zod 3 form tests into main). The earlier isolated Zod 4 audit was first compared with `a40d4ae`; dependency versions on main remain unchanged.
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

The read-only GitHub web CI is extended to execute these tests using the installed lockfile's Vitest binary, with `--no-install`, before TypeScript/Vite compilation. The first hosted attempt failed because the upstream Vite test configuration referenced an absent `web/__test__/test-setup.ts` file. Rather than masking that issue or constructing a fake setup, the candidate uses a separate `web/vitest.validation.config.ts` with a pure Node environment and the two reviewed auth/numeric schema test files. This configuration requires a fresh hosted CI run before the candidate can be accepted. The source import integrity guard pins both compatible package versions, requires schema tests and the CI step, and adds negative regression coverage for dependency and test-harness drift. All inputs in tests are artificial; no credentials, live users, camera streams or outbound API calls are involved.

## Reproduced advisory results

Using equivalent read-only npm audit flags with the official registry:

| Web dependency snapshot | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Merged main | 0 | 1 | 2 | 1 | 4 |
| Candidate Zod 4 + resolver 5 | 0 | 0 | 2 | 1 | 3 |

There were no advisory API errors. The documentation lockfile is unchanged at 29 matches (0 critical, 6 high, 20 moderate, 3 low). These are advisory-package matches, not counts of confirmed exploitable defects or a complete software bill of materials.

## Type-safe Zod 4 migration follow-up — separate unmerged draft

The first hosted Zod 4 build **failed**, even though ten authentication form tests passed: TypeScript reported about 40 diagnostics concentrated in `ClassificationModelEditDialog.tsx`, `ZoneEditPane.tsx`, and `Step1NameCamera.tsx`. Zod 4 makes `z.coerce.number()` input `unknown`, while the existing React Hook Form generics described only the parsed output. The first candidate also had an imported incomplete Vitest UI setup; that was fixed with the isolated Node-only harness before the type errors became visible.

The current **unmerged** follow-up reconciles the source type contract without bypass casts:

- Extend the shared React Hook Form `FormField` wrapper's generic signature to carry the actual transformed output type, preserving backward compatibility for ordinary forms.
- Use `useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>` for camera, zone, and classification forms so raw strings and parsed API values are separately represented.
- Make ONVIF ports, classification intervals, and zone numeric-or-empty inputs explicit and type-safe through **real shared schema functions** in `numericSchemas.ts`, used by the actual UI. The camera wizard's Continue action passes validated resolver output instead of reading uncoerced raw fields after triggering validation.
- Preserve blank or null classification intervals as omitted output; preserve zone zero, blank and minimum semantics. Remove nine old classifier `ReturnType<typeof useForm<...>>` casts rather than replacing them with `as unknown as` suppressions.
- Add seven new isolated synthetic numeric contract tests, alongside the ten existing form-resolver tests. The `vitest.validation.config.ts` explicitly lists both test files. The source-integrity guard also rejects missing numeric tests or incompatible Zod/resolver versions.

The branch is rebased by a local merge onto current main, with source conflicts reconciled in favor of the canonical merged regression baseline and the additional Zod 4 version checks retained. **The updated TypeScript/Vite build and 17 real Vitest tests still require a new hosted CI run before any compatibility claim.** No camera stream, private credential, live service, browser or GPU was accessed to develop these changes. Typechecking and synthetic tests remain insufficient for full browser-level user authorization and camera setup acceptance.

## Release blockers and limits

This is a **semver-major change to input validation and form resolution** and affects approximately 22 tracked web component files importing `zod`. Shared schema tests, CI compilation, and lockfile review are necessary but **insufficient** to confirm that every camera, mask, zone, trigger, classifier, notification, user-management and authorization form preserves behavior.

Before merging, require all hosted source-integrity, actual validation tests and frontend builds to pass on the current branch. For release acceptance, verify browser-level form submission and error rendering with synthetic, isolated fixtures; test Zod 4 changed coercion behavior (especially missing ONVIF ports), optional/nullable defaults, localization, password-strength logic, React Hook Form integration and CSRF/auth/network behavior. Never submit synthetic test credentials to live services. Verify no sensitive input appears in error logs, alerts, analytics or telemetry. All such testing requires the authorized isolated runtime/harness and GoreeShield privacy review; none is implied by a passing compile.

The existing Dependabot Zod v4 PR #34 is older and separate; do not merge blindly or infer that earlier TypeScript compilation is adequate. Remaining docs/web advisories, Python/native/OS/container/model supply chain, GoreeCloud UI brand/trademark, GoreeCloud Identity/Mesh/GoreeShield/Wardveil contracts, backups and real NVR/hardware testing remain release blockers. [Security issue #41](https://github.com/GoreeCloud/home-security/issues/41) was manually closed with unchecked work; its closure is not security clearance. [Release gate #1](https://github.com/GoreeCloud/home-security/issues/1) remains open.
