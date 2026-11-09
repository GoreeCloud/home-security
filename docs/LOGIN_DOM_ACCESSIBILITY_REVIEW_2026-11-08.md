# Login Error Visibility and Isolated DOM Regression Gate — November 8, 2026

**Product:** GoreeCloud Home Security (Frigate-attributed public source snapshot, not released)

**Baseline:** merged main `d0b64af4c78fe069cd5f52ffc57e409aee36989a` with existing `zod@3.25.76` and `@hookform/resolvers@3.10.0`. This source change deliberately **does not** upgrade, replace or loosen either dependency.

## Verified user-facing defect

The real `web/src/components/auth/AuthForm.tsx` already validated required username and password through the shared `createLoginSchema` and React Hook Form. It did **not** render field-specific `FormMessage` nodes, so a rejected empty login could leave a user without visible reasons for the rejection. This is a usability and accessibility defect, especially for assistive-technology announcements and understanding rejected form submissions.

The source fix adds two normal `<FormMessage role="alert" />` nodes, one beneath each existing field. It preserves the existing input schema, translations, UI layout, authentication request code, CSRF header, credentials submission path and role/account behavior. The existing `FormControl` already binds `aria-invalid` and `aria-describedby` to React Hook Form state; the new error messages are now available to users when validation fails. This is not a replacement for full WCAG/accessibility certification.

## Actual component test with no private account or service

The new `web/src/components/auth/AuthForm.dom.test.tsx` mounts the *real* `UserAuthForm` via React and ReactDOM in **jsdom**, triggers an empty synthetic submission and verifies:

- Two appropriate localized-message keys appear in visible `role=alert` error nodes.
- Username and password inputs each have `aria-invalid="true"`.
- Neither the mocked login POST nor the mocked profile GET handler was called.

Axios, SWR, auth-context, translation, documentation-link handling and notification portals are stubbed within the isolated test. The test does **not** create a real account, start a browser/server, contact authentication APIs, use cookies, touch a camera or access production secrets.

A dedicated `web/vitest.dom-validation.config.ts` runs only this jsdom component test; it is separate from the inherited legacy Vite config that references a missing UI test setup. No new npm dependencies: the current web lockfile already includes React, ReactDOM, Vitest and jsdom. The read-only web CI runs this DOM test **after the existing ten schema-resolver tests and before the TypeScript/Vite build**, using `npx --no-install` and locked `npm ci --ignore-scripts`. Workflow permissions remain read-only; no publishing.

The offline import guard now requires the real DOM test, jsdom config, both visible `FormMessage` nodes and the CI step. Three additional tamper regressions reject a hidden login message, an inert test or a bypassed job. The combined Python source integrity suite contains **60** offline cases. The npm source/lockfile and original MIT/trademark/provenance documents remain unchanged.

## Validation and release limits

Before merging require all exact-head GitHub-hosted checks: ten real auth resolver tests, the new real DOM negative-submission test, TypeScript/Vite build, source-integrity regressions and docs Node 20/24 builds. Passing jsdom is stronger than static schema inspection but **not** real browser-level end-to-end acceptance; successful login and bad-credential flows, CSRF, session cookies, role authorization, localization, keyboard navigation and assistive-technology behavior still require isolated browser and backend acceptance.

This change is intentionally independent of the [Zod 4 and resolver 5 draft migration #54](https://github.com/GoreeCloud/home-security/pull/54). The high advisory in the existing Zod 3 main lockfile is **not** fixed here; the draft migration is subject to its own unmerged release checks. Actual camera services, firmware, security/Wardveil, GoreeShield privacy, Identity, Mesh, official UI branding and backup/recovery have not been tested or deployed. See [release gate #1](https://github.com/GoreeCloud/home-security/issues/1).
