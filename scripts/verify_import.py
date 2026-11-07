#!/usr/bin/env python3
"""Fail-closed, offline validation of the GoreeCloud Home Security source import.

Repository hygiene checks only: no application execution, external traffic,
malware scan, vulnerability clearance, or production approval.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
from pathlib import Path

SOURCE_SHA = "c60843cc24d3f08c132ec06eb581aa55e969065f"
LICENSE_SHA256 = "490bc07296c07845f0c5d0db6760da37e4c21258d0e6e1cfa500ce04bebf1983"
ALLOWED_WORKFLOWS = {"import-integrity.yml"}
REQUIRED_ICONS = {
    "web/images/branding/favicon.svg",
    "web/images/branding/favicon.ico",
    "web/images/branding/favicon.png",
    "web/images/branding/favicon-16x16.png",
    "web/images/branding/favicon-32x32.png",
    "web/images/branding/apple-touch-icon.png",
    "web/images/branding/mstile-150x150.png",
    "docs/static/img/branding/favicon.ico",
    "docs/static/img/branding/logo.svg",
    "docs/static/img/branding/logo-dark.svg",
    "docs/static/img/branding/goreecloud-home-security.png",
    "web/public/images/apple-touch-icon.png",
    "web/public/images/maskable-icon.png",
}

def verify_repository(root: Path) -> list[str]:
    problems: list[str] = []
    def data(path: str) -> bytes:
        target = root / path
        if not target.is_file() or target.is_symlink():
            problems.append("Missing or non-regular file: " + path)
            return b""
        return target.read_bytes()
    def text(path: str) -> str:
        return data(path).decode("utf-8", errors="replace")

    license_bytes = data("LICENSE")
    if hashlib.sha256(license_bytes).hexdigest() != LICENSE_SHA256:
        problems.append("Original MIT copyright and permission notice changed")
    if "Frigate, Inc." not in text("TRADEMARK.md"):
        problems.append("Upstream TRADEMARK.md not preserved")
    readme = text("README.md")
    provenance = text("docs/IMPORT_PROVENANCE.md")
    if not readme.startswith("# GoreeCloud Home Security\n"):
        problems.append("README does not identify GoreeCloud Home Security")
    for label, body in (("README", readme), ("provenance", provenance)):
        if SOURCE_SHA not in body:
            problems.append(label + " lacks exact upstream source SHA")
    if "not affiliated with, endorsed by, or sponsored by Frigate" not in readme:
        problems.append("README does not disclaim Frigate affiliation")
    if "upstream readme" not in text("docs/UPSTREAM-README.md").lower():
        problems.append("Archived upstream README not labeled")

    logo = text("web/src/components/Logo.tsx")
    if "GoreeCloud Home Security camera" not in logo or "M130 446.5" in logo:
        problems.append("Active UI logo may still be the upstream trademarked bird")
    for path in ("web/index.html", "web/login.html"):
        if "<title>GoreeCloud Home Security</title>" not in text(path):
            problems.append(path + ": browser title not rebranded")
    if "branding/goreecloud-home-security.png" not in text("README_CN.md"):
        problems.append("Translated README points to removed upstream image")

    for path in sorted(REQUIRED_ICONS):
        payload = data(path)
        if path.endswith(".png") and not payload.startswith(b"\x89PNG\r\n\x1a\n"):
            problems.append(path + ": invalid PNG signature")
        if path.endswith(".ico") and not payload.startswith(b"\x00\x00\x01\x00"):
            problems.append(path + ": invalid ICO signature")
        if path.endswith(".svg") and (b"<svg" not in payload or b"Camera" not in payload):
            problems.append(path + ": neutral camera SVG absent")
    if (root / "docs/static/img/branding/frigate.png").exists():
        problems.append("Proprietary Frigate logo file still distributed")

    workflows = root / ".github/workflows"
    found = {p.name for p in workflows.iterdir() if p.is_file()} if workflows.is_dir() else set()
    if found != ALLOWED_WORKFLOWS:
        problems.append("Unexpected workflow set: " + ", ".join(sorted(found)))
    for name in sorted(found):
        source = text(".github/workflows/" + name)
        forbidden = (
            "pull_request_target:", "workflow_run:", "schedule:", "release:",
            "secrets.", "docker/login-action", "docker/build-push-action",
            "packages: write", "contents: write", "id-token: write",
        )
        for token in forbidden:
            if token in source:
                problems.append(name + ": unreviewed privilege or publishing token " + token)
        if "permissions:\n  contents: read" not in source:
            problems.append(name + ": missing contents read-only permission")
        if "persist-credentials: false" not in source:
            problems.append(name + ": checkout credentials would persist")
    compose = text("docker-compose.yml")
    if "127.0.0.1:1883:1883" not in compose or '- "1883:1883"' in compose:
        problems.append("Unauthenticated development MQTT must bind to host loopback only")
    dependabot = text(".github/dependabot.yml")
    targets = re.findall(r"(?m)^\s*target-branch:\s*(\S+)\s*$", dependabot)
    if len(targets) != 6 or any(t != "main" for t in targets):
        problems.append("All six Dependabot ecosystems must target main")
    if "interval: weekly" not in dependabot:
        problems.append("Reviewed weekly Dependabot cadence missing")
    return problems

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    problems = verify_repository(args.root.resolve())
    report = {"status": "PASS" if not problems else "FAIL", "scope": "offline import hygiene", "issues": problems}
    print(json.dumps(report, indent=2) if args.json else report["status"] + ": " + "; ".join(problems))
    return bool(problems)

if __name__ == "__main__":
    raise SystemExit(main())
