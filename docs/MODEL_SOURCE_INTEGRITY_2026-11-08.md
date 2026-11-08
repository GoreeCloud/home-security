# Model Download Integrity and Python Supply Chain Review — November 8, 2026

**Product:** GoreeCloud Home Security (Frigate NVR attributed source import, not released)
**Source baseline:** public `main` commit `a40d4ae73add93e2ad68f164e11c39b8022aa9b9`
**Change type:** targeted Docker build source hardening; **no Docker image was built or deployed**.

## Verified supply-chain weakness

The imported `docker/main/Dockerfile` had an OpenVINO model-conversion stage that fetched a 2018 TensorFlow SSDLite MobileNetV2 model archive via **plain HTTP**, then immediately extracted its contents and executed the conversion step. An attacker able to tamper with the network path could replace the archive because the original build step had no verified content checksum.

The original download endpoint's direct HTTPS variant could **not** be safely adopted: an authenticated laptop TLS HEAD request returned certificate hostname mismatch. Certificate verification was never disabled or bypassed.

## Verified replacement and integrity provenance

Intel's OpenVINO Open Model Zoo maintains a source manifest for the exact historical model archive at:

- [Official OpenVINO model metadata](https://github.com/openvinotoolkit/open_model_zoo/blob/master/models/public/ssdlite_mobilenet_v2/model.yml)
- [Published HTTPS archive mirror](https://storage.openvinotoolkit.org/repositories/open_model_zoo/public/2022.1/ssdlite_mobilenet_v2/ssdlite_mobilenet_v2_coco_2018_05_09.tar.gz)

That source manifest records the model archive's size as **51,025,348 bytes** and its **SHA-384** digest as:

`8e205630237f1913ac0ed623d48798f1fa03a9e95c467bd149eb5f6107e704a8131cdb0a72fcf6517dafa0ff47d32a4e`

I verified the mirror's HTTPS certificate chain through an ordinary request (HTTP 200 with the expected content-length). I also downloaded the archive **only into an isolated laptop temporary file**, checked its exact 51,025,348-byte length and passed `sha384sum --check` against the published digest; a tar archive contents listing was successful. I did not extract or execute any model code or deploy any container. This confirms the tested file's identity against the vendor-published hash, not the absence of malware in the historical artifact or runtime model correctness.

The Dockerfile now fetches only from that HTTPS mirror using `wget --https-only` and checks the exact published SHA-384 **before** tar extraction. A checksum mismatch aborts the Docker build; verification is not optional. No TLS verification bypass, new credentials, package dependency changes, or publication steps were added.

## Regression and verification gates

The new `tests/import_integrity/test_model_source_integrity.py` provides five source-only cases:

1. Accept the exact official HTTPS URL, SHA-384 check and extraction ordering.
2. Reject a return to the original unencrypted HTTP URL.
3. Reject a wrong or absent archive digest.
4. Reject extraction before integrity verification.
5. Reject disabling TLS certificate validation.

The whole source-only Python regression suite and `scripts/verify_import.py` were run locally, with **42/42 tests PASS** on this independent review branch. Normal read-only GitHub source-integrity CI must also pass on the published commit before merge. **There is no full Debian/OpenVINO container build, model-conversion test, or NVR runtime acceptance in this evidence.** Such tests require proportionate isolated build resources, output provenance, container scanning and hardware compatibility review.

## Wider Python and container release blockers

The inherited `docker/main/requirements-wheels.txt` contains **70** active Python requirement lines, including **64** wildcard version ranges (e.g., `==3.12.*`), **one unpinned Git VCS dependency** (`git+https://github.com/fbcotter/py3nvml#egg=py3nvml`), and **two architecture-specific external TFLite wheel URLs** without content hashes in the requirement declarations. The effective Python wheel graph is not recorded as a single exact, fully hashed release lockfile. Existing package-source constraints do not establish that the actual Docker build is reproducible or that installed versions are free of vulnerabilities.

Other Docker stages also obtain base images, FFmpeg and hardware-acceleration artifacts from external sources; they are **not audited or changed here**. The main Dockerfile uses Debian 12 base tags without digest pinning. GPU, Coral, OpenVINO, video codec, native and model binaries require architecture-specific inventory, SBOMs, checksums, vulnerability review, license verification and container tests before release.

The proposed next safe steps are to inspect and pin the Git VCS dependency to an authenticated reviewed commit, verify hashes for external wheels and binaries, generate architecture-specific exact-lock/SBOM outputs from actual isolated builds, and run Python+OS/container CVE scans without prematurely declaring an incomplete dependency inventory secure.

This review **does not** establish production camera, HTTP authentication, network, recording, Wardveil defense, GoreeShield privacy, GoreeCloud Identity/Mesh, backup, accessibility, branding or release acceptance. Keep [security issue #41](https://github.com/GoreeCloud/home-security/issues/41) and [release gate issue #1](https://github.com/GoreeCloud/home-security/issues/1) open.
