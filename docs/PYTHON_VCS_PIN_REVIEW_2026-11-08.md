# Python NVML Git Dependency Reproducibility Review — November 8, 2026

**Product:** GoreeCloud Home Security (attributed Frigate NVR source import, not released)
**Source baseline:** `ef4723f7a378b1b7e7cd019adc769badb6d74e4a`
**Status:** source-only Python requirements hardening; no Python dependencies were installed, built or executed.

## Identified trust boundary

The inherited `docker/main/requirements-wheels.txt` references the public upstream `fbcotter/py3nvml` Git repository using `git+https://github.com/fbcotter/py3nvml#egg=py3nvml`, without a branch/tag/commit pin. That permits different source revisions to be installed in separate Docker builds if the remote default branch moves, defeating reproducibility and potentially introducing an unreviewed code-execution or supply-chain change.

## Verified source and action

On November 8, 2026, the public upstream `fbcotter/py3nvml` default `master` resolved through HTTPS Git to the full commit:

`0545dfd39858c1552aaabc52ea3fbcb7f5714853`

The repository is public and reported a BSD-3-Clause license. I cloned only that commit for **static review**, inspected the license and `setup.py`, and verified that it uses `setuptools.setup`, declares `xmltodict`, and lists `scripts/py3smi`; no custom installation commands were found in the reviewed packaging entrypoint. The historical upstream commit is dated April 14, 2022; a package age check is not a vulnerability assessment, and additional runtime/module behavior remains unverified. No third-party code was executed or installed.

The single `git+` requirements entry is now pinned to:

`git+https://github.com/fbcotter/py3nvml@0545dfd39858c1552aaabc52ea3fbcb7f5714853#egg=py3nvml`

This retains the original upstream source and BSD license, makes the selected Git commit explicit, and prevents silent future default-branch drift. Git source pinning does not independently prove software safety; Git network availability, dependency transitive resolution and downstream license obligations remain subject to release review.

## Offline verification

The new `tests/import_integrity/test_python_vcs_source_pin.py` verifies the exact reviewed full SHA, HTTPS transport, and absence of unreviewed additional VCS requirements. Its negative cases simulate an unpinned branch, abbreviated SHA, insecure transport and additional VCS source. It is included automatically in the existing read-only source integrity workflow's Python unittest discovery. The import source hygiene guard remains unchanged. No Docker images, Python wheel builds, Git package setup scripts or live NVML/GPU operations ran.

## Remaining high-risk supply-chain gaps

The primary `docker/main/requirements-wheels.txt` declares **70** active requirement lines, **64** with wildcard version ranges, and two architecture-specific external TFLite wheel URLs without declared content hashes. Source commit identity is now pinned for the one Git dependency; exact wheel artifact identities, broad package version ranges, OS base images and native GPU/model artifacts are **not** fully locked or security-scanned.

Subsequent release gates must produce architecture-specific installed-version inventories and exact hashes from isolated builds; run Python vulnerability and license scans, verify external wheel/binary provenance, and test real NVML/hardware compatibility. Do not claim pip audit coverage of an unresolved wildcard/GPU wheel graph, and do not allow package install scripts to run in the routine read-only source gate. No camera service or production system was deployed.

See [verified model archive integrity work](MODEL_SOURCE_INTEGRITY_2026-11-08.md), [security release blocker #41](https://github.com/GoreeCloud/home-security/issues/41) and [release gate #1](https://github.com/GoreeCloud/home-security/issues/1). Both issues remain OPEN.
