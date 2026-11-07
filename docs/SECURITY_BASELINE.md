# GoreeCloud Home Security — Initial Security and Release Baseline

**Status:** Development source import only. This is a scoped review of publicly imported source on November 7, 2026, **not** a completed dependency scan, penetration test, runtime certification, or deployment approval.

## Verified facts

- The source snapshot is an independently committed derivative of Frigate NVR upstream master at c60843cc24d3f08c132ec06eb581aa55e969065f. The MIT LICENSE and upstream TRADEMARK.md are preserved.
- The root docker-compose.yml is an upstream **development** configuration, not a hardened production deployment manifest. It builds a devcontainer, mounts source/config/debug directories, and configures a Mosquitto development broker using /mosquitto-no-auth.conf.
- The imported upstream Compose manifest exposed MQTT on all host interfaces using "1883:1883". The GoreeCloud review branch changes it to "127.0.0.1:1883:1883" to prevent inadvertent remote host-interface access in this development configuration. The internal broker remains unauthenticated; **do not reuse this configuration for production**.
- The GoreeCloud GitHub Actions setting was enabled after workflow review. Only GitHub-owned actions are permitted (`allowed_actions: selected`, `github_owned_allowed: true`, `verified_allowed: false`, no additional patterns); the default workflow token is read-only and cannot approve pull requests. The sole proposed import-integrity workflow runs no application containers, installs no third-party dependencies, uses no repository secrets, and explicitly holds contents:read permissions. Its hosted result must be checked separately. It is not a vulnerability scan.
- Upstream automated container publication workflows are not present in the GoreeCloud source snapshot. No package is built or published by the import.

## Trust boundaries and risks needing real assessment

| Area | Risk | Release gate |
| --- | --- | --- |
| Cameras / RTSP / go2rtc | Camera credentials, network access, inbound feeds and possible SSRF/stream abuse | Segmented camera network, explicit device allowlists, validated URLs, credential handling, RTSP/stream authentication and traffic review |
| Authentication / authorization | Accounts, sessions, proxy header trust, public ingress or inherited defaults | GoreeCloud Identity architecture and role/session/integration tests; verify reverse-proxy boundaries |
| Privacy / records | Residential video, faces, audio, retention, snapshots, backups, notifications | GoreeShield consent, retention/minimization, storage encryption and deletion controls; local-only defaults and user transparency |
| Vulnerabilities and supply chain | Python/npm/container, model weights and external actions | Reproducible dependency resolution, SBOM, vulnerability reviews, source/provenance checks, immutable build inputs |
| Threat detection | Tampering, risky plugins, malware, intrusions and video-storage compromise | Wardveil assessment, logging, exposure restrictions, incident/restore playbooks |
| Cross-product integrations | Mesh synchronization, API/service credentials, privilege spread | Explicit GoreeCloud Mesh protocol/API contract, least privilege, failure isolation and verified access controls |
| UI and accessibility | Imported labels, badges, imagery, language accessibility, misleading vendor affiliation | Replace temporary icons with current approved GoreeCloud UI assets; visual and accessibility review |
| Operations / data loss | Storage exhaustion, retention errors, unencrypted backups, updates | Quotas, retention tests, encrypted off-host backups with restore drill, resource limits, reversible upgrades |

## Immediate engineering decisions

1. Restrict development-only MQTT host port to loopback. This reduces accidental LAN exposure but does **not** make the unauthenticated broker production-safe.
2. Align Dependabot's six inherited ecosystems with the actual GoreeCloud main branch and use a weekly maintenance cadence.
3. Keep GitHub Actions read-only, with a pinned checkout action and no publishing/release triggers. The static guard fails closed if an extra workflow or unreviewed privilege is introduced.
4. Preserve compatibility-critical upstream module names until integrated changes have passed functional tests. A full rename without compatibility mapping can silently break cameras, configs or integrations.
5. Do not enable DNS/ingress, camera access, production data migrations or deployment as part of source-import maintenance.

## Evidence and scope limits

Local validation: Python offline source-integrity script and regression tests. These validate documented import invariants and introduced safety checks only. **No runtime cameras, network probes, container builds, dependency installation, or production operations were performed.**

See [import provenance](IMPORT_PROVENANCE.md) and [release gate issue](https://github.com/GoreeCloud/home-security/issues/1) for the running acceptance checklist. Update this document only from verified implementation and acceptance evidence.
