# Verified External Python Wheel Pins — November 8, 2026

**Product:** GoreeCloud Home Security (Frigate-attributed source import, unreleased)
**Starting public main:** `06da62e7d5f17ac9cc90619c0b944de807c92f76`
**Change:** fail-closed SHA-256 URL fragment pins for three existing, externally hosted Python wheels; no new dependencies, model/runtime execution, camera access or container build.

## Why this matters

The inherited `docker/main/requirements-wheels.txt` directly downloaded separate TensorFlow Lite Python 3.11 architecture wheels from GitHub release assets. A separate `docker/main/Dockerfile` stage used `pip3 install` on a prebuilt Axera Python wheel. All three URLs used HTTPS but **did not specify expected content digests**. A fixed release tag or asset filename alone does not prove that the fetched binary bytes are identical over time.

## Reviewed original release assets

| Existing dependency URL owner and release | Intended architecture | GitHub release asset length | Locally verified SHA-256 |
| --- | --- | ---: | --- |
| [frigate-nvr/TFlite-builds v2.17.1](https://github.com/frigate-nvr/TFlite-builds/releases/tag/v2.17.1) — `tflite_runtime-2.17.1-cp311-cp311-linux_x86_64.whl` | x86_64 / CPython 3.11 | 3,021,050 bytes | `a6b4e57f13c536a737aeb0ebd27618177ddbbabb1e4242c9c3403cd566fe71b6` |
| [feranick/TFlite-builds v2.17.1](https://github.com/feranick/TFlite-builds/releases/tag/v2.17.1) — `tflite_runtime-2.17.1-cp311-cp311-linux_aarch64.whl` | aarch64 / CPython 3.11 | 2,618,022 bytes | `dd3768be23a44eb59b59b686cce943a1eef62c0160911fec4d3251d9c8ba97ab` |
| [AXERA-TECH/pyaxengine 0.1.3-frigate](https://github.com/AXERA-TECH/pyaxengine/releases/tag/0.1.3-frigate) — `axengine-0.1.3-py3-none-any.whl` | platform-independent Python package declaration | 19,373 bytes | `e995b8a887b067dc3456512aae2fa9c84f70e708c28b11caf184efdc254c64ae` |

The **Axera wheel SHA-256 exactly matches the digest published by the GitHub release-assets API**. The two TFLite releases had `digest: null` in GitHub's release-assets API when checked; for those, hashes are locally calculated **trust-on-first-use integrity baselines**, not independently authenticated vendor signatures. This distinction must remain explicit.

I downloaded **only** these three exact existing source URLs through normal TLS-verified GitHub release redirects, into temporary laptop files, with a 30-MB size ceiling. Each downloaded file exactly matched the public asset length reported by the GitHub API. SHA-256 was calculated on every file; the zip/wheel containers were inspected without extracting or executing package code. No unsafe absolute/parent-traversal entry or archive symlink was found, and each wheel has one `.dist-info/METADATA` record. Both TFLite wheels identify `tflite-runtime` version 2.17.1 with an Apache 2.0 metadata license and contain a native interpreter-wrapper `.so`; the Axera wheel identifies version 0.1.3, contains an inspected BSD 3-Clause license file (AXERA, 2024), and has Python dependencies `cffi`, `ml-dtypes` and `numpy`. There were no `.pth` files or wheel-install script entries in the three inspected zip archives. A file inventory cannot rule out malicious native or Python code, and no trusted binary-code security review has been performed.

## Exact source-only changes

- Add standard `#sha256=<64 hex>` fragment to **both existing** TFLite direct `tflite_runtime @ https://...whl` requirements, preserving their x86_64/aarch64 platform markers and the original source URLs.
- Add the published `#sha256=<64 hex>` fragment to the **existing** `RUN pip3 install https://...axengine-0.1.3-py3-none-any.whl` command.
- Check all three formats with locally installed pip's requirement parser **without installing anything**: each URL is a wheel, each `pip` Link exposes `hash_name=sha256` and the exact expected 64-hex hash; the requirements retain the correct platform markers.
- Add `tests/import_integrity/test_external_wheel_integrity.py`: seven offline tests require original reviewed URLs, architecture markers, SHA-256 pins and no new direct remote wheel source, while rejecting checksum removal, tampering, architecture-marker swap and unreviewed additions. Read-only CI already discovers this test path alongside source-provenance checks.

Changing a source asset's bytes now causes pip's digest verification to reject that download rather than silently using unexpected code. A malicious or flawed **already-hashed** wheel still remains a risk, and the TFLite hashes do **not** prove upstream authenticity beyond the observed GitHub release sources. If a legitimate upstream asset changes, conduct a new source, license, functional and checksum review before changing the expected digest.

## Remaining release gates

This change **does not** perform a Docker build, package installation, TensorFlow Lite/Coral/OpenVINO/Axera runtime test, network/camera access, CVE scan, SBOM generation, or package signature verification. Python requirements still contain many wildcard ranges and the base OS, FFmpeg, GPU, hardware and other downloaded build artifacts are not comprehensively immutable or scanned. Full architecture-specific lockfiles, binary provenance, license audits, SBOMs, image scans and actual hardware/browser/backup acceptance remain required before any production release.

The code's provenance and original MIT license/trademark notices remain untouched. See [existing model integrity review](MODEL_SOURCE_INTEGRITY_2026-11-08.md), [Python Git pin review](PYTHON_VCS_PIN_REVIEW_2026-11-08.md), active [release gate #1](https://github.com/GoreeCloud/home-security/issues/1), and [Zod 4 draft PR #54](https://github.com/GoreeCloud/home-security/pull/54) (separate ongoing work).
