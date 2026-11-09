# Zod 4 Form Validation Compatibility Review — November 8, 2026

**Product:** GoreeCloud Home Security (attributed Frigate NVR source import, unreleased)
**Current merge baseline:** public main `d0b64af4c78fe069cd5f52ffc57e409aee36989a` ([PR #57](https://github.com/GoreeCloud/home-security/pull/57) moved the ten working Zod 3 form tests into main; [PR #58](https://github.com/GoreeCloud/home-security/pull/58) added verified external wheel hash pins). The earlier isolated Zod 4 audit was first compared with `a40d4ae`; Zod dependency versions on main remain unchanged.
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
- Add eight new isolated synthetic numeric contract tests, alongside the ten existing form-resolver tests. The `vitest.validation.config.ts` explicitly lists both test files. The source-integrity guard also rejects missing numeric tests or incompatible Zod/resolver versions.

The draft was brought forward by local merges onto verified main, preserving the canonical regression baseline, original provenance and additional Zod 4 version checks. **Head `aeca472` passed 28 real Vitest tests, TypeScript/Vite and docs Node20/24 in hosted CI** ([web](https://github.com/GoreeCloud/home-security/actions/runs/42536368868), [docs](https://github.com/GoreeCloud/home-security/actions/runs/42536368867), [source](https://github.com/GoreeCloud/home-security/actions/runs/42536368875)). Merged current main's verified wheel pins at `0f7c9cb`; the newly added login DOM acceptance test requires fresh hosted evidence before completion. No camera stream, private credential, live service, browser or GPU was accessed to develop these changes. Typechecking and synthetic tests remain insufficient for full browser-level user authorization and camera setup acceptance.

## Expanded GoreeCloud Identity and camera authorization validation

The verified candidate `e4eb984` passed source integrity, 18 real Zod4/resolver5 tests, the full TypeScript/Vite frontend build, and docs builds on both Node 20 and 24. This cleared the previous TypeScript *compilation* blocker, **not** user-interface or production release acceptance.

The next isolated review adds two additional **real UI form schema builders** to `authSchemas.ts`, used directly by `SetPasswordDialog.tsx` and `EditRoleCamerasDialog.tsx`. This preserves existing translation keys and Zod rules while enabling **eight additional synthetic tests**: self-service current-password required, password strength minimum length, matching confirmation and localized error path, admin password reset without old password, role-to-camera selection required, valid synthetic camera selection, and rejection of invalid camera IDs. These checks increase the Node-only isolated Vitest suite from **18 to 26**. No password, camera access grant, network call, analytics or authentication response is sent to real services during tests.

The hosted `e25f5c1` candidate ran **26/26 runtime tests PASS**, source integrity and docs Node 20/24 PASS, but TypeScript failed on three test-only type errors: the conditional password-schema return union erases the `oldPassword` field's type. The candidate now exports separately typed `createPasswordChangeSchema` and `createPasswordResetSchema` builders, while `createSetPasswordSchema` delegates to them to preserve the conditional UI behavior. Both variants and the dispatcher are exercised directly, adding two synthetic tests (28 total). The corrected current head requires fresh hosted Vitest/TypeScript/Vite, source-integrity and docs checks before release acceptance. Even then, browser UI-level CSRF, role enforcement, password mutation and backend authorization need separate isolated end-to-end acceptance before production.

## Isolated login DOM accessibility and network-safety acceptance

The real `UserAuthForm` imports the reviewed shared Zod validation schema and React Hook Form resolver, but the imported login form did not render any `FormMessage` components. This prevented users and assistive technology from seeing why empty login submissions were rejected. The current draft adds `<FormMessage role="alert" />` for both username and password fields, so the existing form context can present localized validation messages and `aria-invalid` input semantics.

A new **isolated jsdom component test** mounts the real `UserAuthForm` using React DOM and submits two empty synthetic fields. It checks both readable error messages, both input `aria-invalid="true"` flags and **zero calls to the mocked login and profile HTTP handlers**. The test explicitly mocks axios, SWR, auth-context side effects, translation and toast notifications; it never uses a user account, real API, private camera or live server. A dedicated `vitest.dom-validation.config.ts` avoids the inherited missing upstream UI test harness and uses only already locked `jsdom`, Vitest, React and ReactDOM dependencies. The hosted, read-only frontend workflow must run this DOM test before the TypeScript/Vite build, in addition to the 28 pure resolver/numeric schema tests.

Three additional negative offline import guard regressions reject hidden login errors, the absent actual DOM test, or a bypassed DOM-CI step. The complete offline Python source-integrity suite has **63/63 PASS** on the isolated draft, and the Docker-independent manifest hygiene checker passes. **Current-hosted jsdom + frontend compilation is not yet verified**, and a jsdom-only negative validation test is **not** a genuine browser, CSRF enforcement, role permission, successful authentication, network or production acceptance. Those require isolated end-to-end fixtures and backend review.

## Release blockers and limits

This is a **semver-major change to input validation and form resolution** and affects approximately 22 tracked web component files importing `zod`. Shared schema tests, CI compilation, and lockfile review are necessary but **insufficient** to confirm that every camera, mask, zone, trigger, classifier, notification, user-management and authorization form preserves behavior.

Before merging, require all hosted source-integrity, actual validation tests and frontend builds to pass on the current branch. For release acceptance, verify browser-level form submission and error rendering with synthetic, isolated fixtures; test Zod 4 changed coercion behavior (especially missing ONVIF ports), optional/nullable defaults, localization, password-strength logic, React Hook Form integration and CSRF/auth/network behavior. Never submit synthetic test credentials to live services. Verify no sensitive input appears in error logs, alerts, analytics or telemetry. All such testing requires the authorized isolated runtime/harness and GoreeShield privacy review; none is implied by a passing compile.

The existing Dependabot Zod v4 PR #34 is older and separate; do not merge blindly or infer that earlier TypeScript compilation is adequate. Remaining docs/web advisories, Python/native/OS/container/model supply chain, GoreeCloud UI brand/trademark, GoreeCloud Identity/Mesh/GoreeShield/Wardveil contracts, backups and real NVR/hardware testing remain release blockers. [Security issue #41](https://github.com/GoreeCloud/home-security/issues/41) was manually closed with unchecked work; its closure is not security clearance. [Release gate #1](https://github.com/GoreeCloud/home-security/issues/1) remains open.
