# GoreeCloud Home Security

**Rebranded Import — source-development baseline, not a tested or deployed GoreeCloud release.**

GoreeCloud Home Security is a GoreeCloud-managed derivative source import of [Frigate NVR](https://github.com/blakeblackshear/frigate), a local IP camera network video recorder. Upstream-inherited capabilities include video recording, live streams, motion and object detection, and Home Assistant integration. These capabilities are **not independently validated for this GoreeCloud import**.

## Source and provenance

- Upstream: https://github.com/blakeblackshear/frigate
- Source branch: master (upstream has no main; the upstream default branch is dev)
- Pinned master commit: c60843cc24d3f08c132ec06eb581aa55e969065f (verified November 7, 2026)
- Import method: independent snapshot with new GoreeCloud Git history, not a GitHub fork, ongoing mirror, or automatic updater.
- [Import details](docs/IMPORT_PROVENANCE.md) and [archived upstream README](docs/UPSTREAM-README.md).

## What has and has not been rebranded

This import changes the repository identity, public-facing README, core UI bird-logo component, and bundled proprietary Frigate favicon/logo files. Temporary neutral camera-symbol placeholders are used until approved GoreeCloud UI assets are available. Upstream internal Python packages, API routes, configuration keys, Docker image names, dependencies, translations, and documentation may still use the upstream name for compatibility. **This is not a complete application-level rebrand**, a hardened release, or a validated deployment.

GoreeCloud Identity, GoreeShield privacy governance, Wardveil cybersecurity, GoreeCloud Mesh integration, and full GoreeCloud UI conformity are integration requirements; they have **not** been established by importing source.

## License and trademarks

The imported upstream code is licensed under [MIT](LICENSE), with its original copyright and permission notice preserved. Third-party media and components may have other conditions. The names Frigate, Frigate NVR, Frigate+, and their official logos are trademarks of Frigate, Inc., not licensed by MIT. **GoreeCloud Home Security is independent and not affiliated with, endorsed by, or sponsored by Frigate, Inc.** See [the upstream trademark policy](TRADEMARK.md).

## Safety and operations

No cameras are configured, no service is deployed, and no production security validation is claimed. Review authentication, storage retention, camera-network isolation, integration credentials, and dependencies before running. Do not expose camera feeds or admin endpoints publicly without verified protections. The imported development Compose configuration uses an unauthenticated MQTT broker; the host port has been restricted to loopback only and is **not production-safe**. See the [initial security baseline and remaining gates](docs/SECURITY_BASELINE.md). Inherited upstream GitHub workflows that can publish containers or run schedules are intentionally omitted; the new offline integrity workflow has no publishing privileges.

Upstream technical documentation remains available at [docs.frigate.video](https://docs.frigate.video), but is **not** GoreeCloud-specific release documentation.
