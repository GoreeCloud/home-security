# Authentication and Role Form Validation Baseline — November 8, 2026

**Product:** GoreeCloud Home Security (unreleased, attributed Frigate source import)
**Base:** public main `f820b99380e48b0a96517afec929cbbec83f859b`
**Scope:** source-only validation regression coverage without a dependency upgrade or deployment.

## Why this isolated change is necessary

The imported frontend uses `zod@3.25.76` and `@hookform/resolvers@3.10.0`. A review of [draft PR #54](https://github.com/GoreeCloud/home-security/pull/54) identified that merely upgrading Zod to 4.x breaks the old form resolver's field-error mapping. Updating both libraries in that draft causes new input/output type incompatibilities in classification, camera setup and zone configuration. The draft's **ten focused resolver tests PASS**, but its full hosted TypeScript build **FAILS**. It is **not a merge candidate** or release.

Extracting these ten synthetic, camera-free form regression tests **against the existing Zod 3 baseline** makes the current form contract explicit and testable. This independent work does not claim to resolve the Zod 3 security advisory.

## Scoped implementation

- Keep the frontend's existing **Zod 3** and **resolver 3** dependency declarations and lockfile unchanged.
- Move the exact login, create-user, and create-role validation schemas into `web/src/lib/validation/authSchemas.ts` and reuse them from the corresponding three real UI forms. Preserve existing localized error messages, field constraints, password length, username character rules, confirmation validation, duplicate-role protection and camera-selection requirements.
- Add actual `zodResolver` unit tests using fabricated username/password/camera values in `authSchemas.test.ts`, covering both accepted inputs and field-specific errors. No live API, user, camera, recording, or credentials are used.
- Add a minimal `web/vitest.validation.config.ts` using the **Node-only environment**. The upstream Vite test configuration references an absent `web/__test__/test-setup.ts`; do not create a mock file to conceal that import, or execute the imported legacy incomplete UI harness.
- Extend the existing read-only frontend GitHub workflow with `npx --no-install vitest run --config vitest.validation.config.ts` before typechecking/building; the workflow retains disabled lifecycle scripts, limited permissions, and no publishing.
- Add source-integrity guard and three negative regression tests to reject missing actual schema tests, unexpected UI test harness and disabled validation step.

## Validation gates

Offline source-integrity regression suite and `scripts/verify_import.py` run locally. Merge **only** after new GitHub-hosted real validation tests and TypeScript/Vite build pass, documentation Node 20/24 builds pass, and source/provenance CI passes. No runtime browser acceptance or NVR deployment is claimed.

## Open release requirements

Upgrading Zod to v4 and resolver v5 remains **blocked** until all runtime forms and input/output type contracts have been migrated and tested with synthetic fixtures. In particular, review classifier state/object schemas, `z.coerce.number` changes, optional ONVIF port parsing, zone numeric inputs and form default values, and password/authorization behavior. See [security blocker history #41](https://github.com/GoreeCloud/home-security/issues/41) (currently closed with outstanding unchecked work) and [active release issue #1](https://github.com/GoreeCloud/home-security/issues/1).

The existing Zod 3 high advisory, six docs high advisories, unpinned OS/Python/wheels/native artifacts, full GoreeCloud UI/Identity/GoreeShield/Wardveil/Mesh contracts, and camera/runtime/backup acceptance remain open. This is a regression-test foundation, not a security clearance.
