# GoreeCloud Home Security — Rebranded Import provenance

Import date: 2026-11-07
Source: https://github.com/blakeblackshear/frigate
Source branch: master, not upstream default dev; upstream main is absent
Source commit: c60843cc24d3f08c132ec06eb581aa55e969065f
Source license: MIT, original root LICENSE retained exactly
Destination: https://github.com/GoreeCloud/home-security
Method: Independent source snapshot and one new root commit, not a mirror, fork, or full Git-history transplant

## Deliberate import changes

1. GoreeCloud product README and provenance record; historic upstream README archived as docs/UPSTREAM-README.md.
2. Removed proprietary upstream bird-logo branding from the UI logo component and brand asset directories; replaced with newly authored, visually neutral camera-themed temporary icons. These are not approved GoreeCloud UI design specifications.
3. Removed active .github/workflows definitions. Upstream workflows build and publish images, and some can trigger from pushes, releases, and schedules. Destination Actions disabled before pushing.
4. Preserved upstream internals, config names, API surface, dependencies, technical docs, and LICENSE to avoid unreviewed compatibility regressions. Original upstream trademark policy remains at TRADEMARK.md.
5. Retained all other source from the pinned master snapshot except the documented changes.

## Gates before a production claim

- Review third-party licenses and residual branding, docs, screenshots, metadata, and translations.
- Review security advisories, dependencies, privileged workflows, authentication, data collection, camera networking, and container default privileges.
- Verify build, tests, accessibility, and browser UI with the actual build environment.
- Implement GoreeCloud UI, GoreeCloud Identity, GoreeShield privacy, Wardveil cybersecurity, and GoreeCloud Mesh integrations based on their respective authorities.
- Require explicit safe deployment and rollback planning. No runtime package or deployment is implied.
