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
ALLOWED_WORKFLOWS = {"import-integrity.yml", "docs-validation.yml", "web-validation.yml"}
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

    docs_config = text("docs/docusaurus.config.ts")
    if 'title: "GoreeCloud Home Security"' not in docs_config or 'url: "http://localhost"' not in docs_config:
        problems.append("Imported docs must remain a GoreeCloud-branded, localhost-only preview")
    for token in ("@inkeep", "inkeepConfig:", "https://docs.frigate.video", "http://demo.frigate.video", "https://frigate.video/plus/"):
        if token in docs_config:
            problems.append("Unapproved upstream docs integration or product host: " + token)
    if re.search(r"(?m)^\s*algolia\s*:", docs_config):
        problems.append("External Algolia documentation search requires GoreeShield approval")
    if '"@inkeep/docusaurus"' in text("docs/package.json"):
        problems.append("Unapproved external docs AI dependency in package manifest")
    try:
        docs_lock = json.loads(text("docs/package-lock.json"))
        if "node_modules/@inkeep/docusaurus" in docs_lock.get("packages", {}):
            problems.append("Unapproved external docs AI dependency in lockfile")
    except json.JSONDecodeError:
        problems.append("Invalid docs package-lock.json")

    # Webpack 5.106+ rejects WebpackBar 6 ProgressPlugin option forwarding.
    # Preserve a known-compatible loader until an upstream bundler upgrade is tested.
    try:
        webpack = docs_lock["packages"]["node_modules/webpack"]["version"]
        webpackbar = docs_lock["packages"]["node_modules/webpackbar"]["version"]
        webpack_parts = [int(part) for part in webpack.split(".")[:2]]
        if webpack_parts[0] == 5 and webpack_parts[1] >= 106 and int(webpackbar.split(".")[0]) < 7:
            problems.append("Incompatible webpack 5.106+ and webpackbar 6 progress plugin")
    except (KeyError, ValueError, IndexError):
        problems.append("Cannot verify webpack / webpackbar compatibility versions")

    # The imported OpenAPI client generator uses node:path from a browser bundle.
    # Only a browser-safe path fallback is approved, never fs/crypto/process.
    compat = text("docs/plugins/browser-path-polyfill.js")
    if 'path: require.resolve("path-browserify")' not in compat:
        problems.append("Missing narrowly-scoped browser path compatibility fallback")
    if 'path.resolve(__dirname, "plugins", "browser-path-polyfill")' not in docs_config:
        problems.append("Docusaurus browser path compatibility plugin is not registered")
    for unsafe in ("fs: ", "crypto: ", "child_process", "eval(", "exec("):
        if unsafe in compat:
            problems.append("Unreviewed privileged browser polyfill: " + unsafe)

    # The original docs Tinypool 1.1.1 is covered by critical RCE advisories.
    # The validated candidate deliberately overrides Docusaurus' Tinypool major.
    if docs_lock.get("packages", {}).get("node_modules/tinypool", {}).get("version") != "2.1.2":
        problems.append("Docs must use verified fixed Tinypool 2.1.2 until a reviewed upstream resolution")
    try:
        docs_package = json.loads(text("docs/package.json"))
    except json.JSONDecodeError:
        problems.append("Invalid docs/package.json")
        docs_package = {}
    if docs_package.get("overrides", {}).get("tinypool") != "2.1.2":
        problems.append("Docs Tinypool major override is not explicit in package manifest")
    if docs_package.get("engines", {}).get("node") != ">=20.0.0":
        problems.append("Docs Node engine must match the fixed Tinypool's Node 20+ support")

    # Docusaurus' search theme explicitly accepts DocSearch 3.9 or 4.1+.
    # Pin its no-AI-SDK v3 dependency instead of the v4 AI assistant chain.
    docs_search_override = docs_package.get("overrides", {}).get("@docusaurus/theme-search-algolia")
    if docs_search_override != {"@docsearch/react": "3.9.0"}:
        problems.append("Docs search must use reviewed AI-SDK-free DocSearch 3.9.0 scope")
    docs_packages = docs_lock.get("packages", {})
    docsearch_versions = [
        entry.get("version") for name, entry in docs_packages.items()
        if name == "node_modules/@docsearch/react" or name.endswith("/node_modules/@docsearch/react")
    ]
    if docsearch_versions != ["3.9.0"]:
        problems.append("Unexpected DocSearch dependency version or duplicate")
    for forbidden in (
        "node_modules/ai", "node_modules/@ai-sdk/react",
        "node_modules/@ai-sdk/provider-utils", "node_modules/@ai-sdk/gateway",
        "node_modules/undici", "node_modules/@fastify/busboy",
    ):
        if forbidden in docs_packages:
            problems.append("Unreviewed AI SDK or legacy HTTP client in docs: " + forbidden)

    # OpenAPI-to-Postman's exact legacy js-yaml 4.1.0 pin carries a high
    # advisory. Resolve only that old package version to the existing 4.3.2;
    # do not force gray-matter's unrelated 3.x YAML consumer to major 4.
    docs_entries = docs_lock.get("packages", {})
    if docs_package.get("overrides", {}).get("openapi-to-postmanv2", {}).get("js-yaml") != "4.3.2":
        problems.append("Missing reviewed OpenAPI parent-scoped js-yaml security override")
    if docs_entries.get("node_modules/js-yaml", {}).get("version") != "4.3.2":
        problems.append("Unexpected docs root js-yaml version")
    if "node_modules/openapi-to-postmanv2/node_modules/js-yaml" in docs_entries:
        problems.append("Vulnerable nested OpenAPI js-yaml dependency returned")
    if docs_entries.get("node_modules/gray-matter/node_modules/js-yaml", {}).get("version", "").split(".")[0] != "3":
        problems.append("Unreviewed gray-matter YAML major migration")

    # Two inherited docs webpack plugins use a serialize-javascript 6.x
    # chain with a high advisory. Keep the reviewed Node20+ v7 fix scoped to
    # those parents; check all resolved copies for reintroduction.
    for parent in ("copy-webpack-plugin", "css-minimizer-webpack-plugin"):
        scope = docs_package.get("overrides", {}).get(parent, {})
        if scope.get("serialize-javascript") != "7.1.3":
            problems.append("Docs serialization security override not reviewed: " + parent)
        nested = f"node_modules/{parent}/node_modules/serialize-javascript"
        if docs_entries.get(nested, {}).get("version") != "7.1.3":
            problems.append("Vulnerable docs serialization dependency: " + parent)
    serializer_paths = {
        key for key in docs_entries
        if key == "node_modules/serialize-javascript" or key.endswith("/node_modules/serialize-javascript")
    }
    required_serializers = {
        f"node_modules/{parent}/node_modules/serialize-javascript"
        for parent in ("copy-webpack-plugin", "css-minimizer-webpack-plugin")
    }
    if serializer_paths != required_serializers:
        problems.append("Unexpected docs serialization dependency graph")

    # Restrict this OpenAPI toolchain minimatch fix to the affected parent.
    # Unrelated older minimatch 3 consumers must keep their existing majors.
    minimatch_version = docs_lock.get("packages", {}).get("node_modules/minimatch", {}).get("version")
    if minimatch_version != "5.1.8":
        problems.append("OpenAPI toolchain must pin reviewed minimatch 5.1.8")
    redocly_override = docs_package.get("overrides", {}).get("@redocly/openapi-core", {})
    if redocly_override.get("minimatch") != "5.1.8":
        problems.append("OpenAPI minimatch fix must be scoped to @redocly/openapi-core")
    for nested in ("node_modules/glob/node_modules/minimatch", "node_modules/serve-handler/node_modules/minimatch"):
        if docs_lock.get("packages", {}).get(nested, {}).get("version") != "3.1.5":
            problems.append("Unreviewed major upgrade of unrelated minimatch consumer: " + nested)

    # OpenAPI-to-Postman's inherited nested lodash 4.17.21 has high advisories.
    # Require the scoped 4.x-compatible fix, without changing unrelated packages.
    packages = docs_lock.get("packages", {})
    lodash = packages.get("node_modules/openapi-to-postmanv2/node_modules/lodash", packages.get("node_modules/lodash", {}))
    try:
        if tuple(int(n) for n in lodash.get("version", "").split(".")[:3]) < (4, 18, 1):
            problems.append("OpenAPI code generator has vulnerable nested Lodash")
    except ValueError:
        problems.append("Cannot verify OpenAPI generator Lodash version")
    if docs_package.get("overrides", {}).get("openapi-to-postmanv2", {}).get("lodash") != "4.18.1":
        problems.append("OpenAPI generator Lodash security override is missing")

    # Reviewed, exact-version web transitive fixes; avoid globally forcing
    # legacy major 1/2 versions onto unrelated brace-expansion/picomatch 4/5.
    try:
        web_package = json.loads(text("web/package.json"))
        web_lock = json.loads(text("web/package-lock.json"))
        web_packages = web_lock.get("packages", {})
        overrides = web_package.get("overrides", {})
        for name, required in (("brace-expansion@1.1.11", "1.1.21"), ("picomatch@2.3.1", "2.3.2")):
            if overrides.get(name) != required:
                problems.append("Missing scoped web pattern security override: " + name)
        for name, version in (("brace-expansion", "1.1.21"), ("picomatch", "2.3.2")):
            if web_packages.get("node_modules/" + name, {}).get("version") != version:
                problems.append("Unreviewed vulnerable web pattern dependency: " + name)
        if web_packages.get("node_modules/vite/node_modules/picomatch", {}).get("version", "").split(".")[0] != "4":
            problems.append("Web Vite picomatch major changed without compatibility review")
        if "sort-by" in web_package.get("dependencies", {}) or "node_modules/sort-by" in web_packages or "node_modules/object-path" in web_packages:
            problems.append("Reintroduced unused sort-by/object-path vulnerable dependency chain")
        if web_package.get("dependencies") != web_packages.get("", {}).get("dependencies"):
            problems.append("Web direct dependencies and lockfile root are inconsistent")
        # The Zod 3 resolver reads the removed ZodError.errors property.
        # Keep the reviewed Zod 4 + resolver 5 pair pinned together.
        for name, version in (("zod", "4.6.7"), ("@hookform/resolvers", "5.9.2")):
            if web_package.get("dependencies", {}).get(name) != version:
                problems.append("Zod 4 package pair manifest drift: " + name)
            if web_packages.get("node_modules/" + name, {}).get("version") != version:
                problems.append("Zod 4 package pair lockfile drift: " + name)
        # Preserve test coverage independently of the unfinished Zod 4 upgrade.
        schema_source = text("web/src/lib/validation/authSchemas.ts")
        schema_tests = text("web/src/lib/validation/authSchemas.test.ts")
        for builder in (
            "createLoginSchema",
            "createUserSchema",
            "createRoleSchema",
            "createSetPasswordSchema",
            "createPasswordChangeSchema",
            "createPasswordResetSchema",
            "createRoleCameraAccessSchema",
        ):
            if builder not in schema_source or builder not in schema_tests:
                problems.append("Missing real auth validation regression test: " + builder)
        test_config = text("web/vitest.validation.config.ts")
        if (
            'environment: "node"' not in test_config
            or "authSchemas.test.ts" not in test_config
            or "numericSchemas.test.ts" not in test_config
            or "maskSchemas.test.ts" not in test_config
            or "classificationSchemas.test.ts" not in test_config
            or "triggerSchemas.test.ts" not in test_config
            or "groupSchemas.test.ts" not in test_config
            or "zoneSchemas.test.ts" not in test_config
        ):
            problems.append("Validation tests must run with the isolated Node-only config")
        login_dom_config = text("web/vitest.dom-validation.config.ts")
        login_dom_test = text("web/src/components/auth/AuthForm.dom.test.tsx")
        login_source = text("web/src/components/auth/AuthForm.tsx")
        if ('environment: "jsdom"' not in login_dom_config or "AuthForm.dom.test.tsx" not in login_dom_config):
            problems.append("Login DOM test must use the isolated jsdom harness")
        if ('UserAuthForm' not in login_dom_test or 'aria-invalid' not in login_dom_test or 'api.post' not in login_dom_test):
            problems.append("Missing real network-free login DOM validation test")
        if login_source.count('<FormMessage role="alert" />') != 2:
            problems.append("Login must render accessible field validation errors for username and password")
        browser_config = text("web/playwright.validation.config.ts")
        browser_test = text("web/tests/e2e/login.validation.spec.ts")
        if (
            "@playwright/test" not in browser_config
            or '127.0.0.1:4179' not in browser_config
            or "reuseExistingServer: false" not in browser_config
        ):
            problems.append("Real login browser test must run in isolated loopback Chromium")
        if (
            'page.route("**/*"' not in browser_test
            or 'route.abort("blockedbyclient")' not in browser_test
            or "authenticationSubmitted" not in browser_test
            or "Username is required" not in browser_test
            or "Password is required" not in browser_test
            or 'target.pathname === "/api/auth/first_time_login"' not in browser_test
            or 'target.pathname.startsWith("/api/")' not in browser_test
        ):
            problems.append("Missing real browser login-validation and no-network acceptance coverage")
        if (
            browser_test.count('page.route("**/api/login"') != 2
            or browser_test.count('["x-csrf-token"]') != 2
            or "status: 401" not in browser_test
            or "status: 429" not in browser_test
            or "Login failed" not in browser_test
            or "Exceeded rate limit" not in browser_test
        ):
            problems.append("Missing synthetic login CSRF and rejection-path browser tests")
        mask_source = text("web/src/lib/validation/maskSchemas.ts")
        mask_tests = text("web/src/lib/validation/maskSchemas.test.ts")
        for name, ui_file in (
            ("createMotionMaskSchema", "web/src/components/settings/MotionMaskEditPane.tsx"),
            ("createObjectMaskSchema", "web/src/components/settings/ObjectMaskEditPane.tsx"),
        ):
            if (
                name not in mask_source
                or name not in mask_tests
                or name + "(" not in text(ui_file)
            ):
                problems.append("Missing actual privacy-mask validation regression: " + name)
        classification_source = text("web/src/lib/validation/classificationSchemas.ts")
        classification_tests = text("web/src/lib/validation/classificationSchemas.test.ts")
        classification_ui = text("web/src/components/classification/wizard/Step1NameAndDefine.tsx")
        if (
            "createClassificationDefinitionSchema" not in classification_source
            or "createClassificationDefinitionSchema(" not in classification_ui
            or "createClassificationDefinitionSchema(" not in classification_tests
            or "modelType" not in classification_tests
            or "classesUnique" not in classification_tests
            or "stateRequiresTwoClasses" not in classification_tests
            or "objectLabelRequired" not in classification_tests
            or "objectTypeRequired" not in classification_tests
        ):
            problems.append("Missing actual classification wizard Zod4 resolver contract regression")
        trigger_source = text("web/src/lib/validation/triggerSchemas.ts")
        trigger_tests = text("web/src/lib/validation/triggerSchemas.test.ts")
        trigger_ui = text("web/src/components/overlay/CreateTriggerDialog.tsx")
        if (
            "createTriggerSchema(" not in trigger_source
            or "createTriggerSchema(" not in trigger_tests
            or "createTriggerSchema(" not in trigger_ui
            or "alreadyExists" not in trigger_tests
            or "minThreshold" not in trigger_tests
            or "maxThreshold" not in trigger_tests
            or "external_command" not in trigger_tests
        ):
            problems.append("Missing actual camera-trigger action validation regression")
        group_source = text("web/src/lib/validation/groupSchemas.ts")
        group_tests = text("web/src/lib/validation/groupSchemas.test.ts")
        group_ui = text("web/src/components/filter/CameraGroupSelector.tsx")
        if (
            "createCameraGroupSchema(" not in group_source
            or "createCameraGroupSchema(" not in group_tests
            or "createCameraGroupSchema(" not in group_ui
            or "result.values.name" not in group_tests
            or "messages.duplicate" not in group_tests
            or "messages.invalidReservedName" not in group_tests
            or "messages.noPeriod" not in group_tests
        ):
            problems.append("Missing camera-group name normalization and authorization-safe validation regression")
        zone_source = text("web/src/lib/validation/zoneSchemas.ts")
        zone_tests = text("web/src/lib/validation/zoneSchemas.test.ts")
        zone_ui = text("web/src/components/settings/ZoneEditPane.tsx")
        if (
            "createZoneSchema(" not in zone_source
            or "createZoneSchema(" not in zone_ui
            or "createZoneSchema(" not in zone_tests
            or "speedLoiteringConflict" not in zone_tests
            or "distanceRequired" not in zone_tests
            or "unfinishedPolygon" not in zone_tests
            or "parsed.values" not in zone_tests
        ):
            problems.append("Missing actual zone polygon Zod4 cross-field validation regression")
        numeric_source = text("web/src/lib/validation/numericSchemas.ts")
        numeric_tests = text("web/src/lib/validation/numericSchemas.test.ts")
        for builder in (
            "createOnvifPortSchema",
            "createOptionalClassificationIntervalSchema",
            "createZoneInertiaSchema",
            "createOptionalZoneNumberSchema",
            "hasPositiveZoneLoiteringTime",
        ):
            if builder not in numeric_source or builder not in numeric_tests:
                problems.append("Missing numeric form coercion regression test: " + builder)
    except (ValueError, KeyError, TypeError):
        problems.append("Unable to validate web security dependencies or JSON manifest")

    for lock_path in ("web/package-lock.json", "docs/package-lock.json"):
        try:
            lock_data = json.loads(text(lock_path))
            for package, entry in lock_data.get("packages", {}).items():
                origin = entry.get("resolved")
                if origin and not origin.startswith("https://registry.npmjs.org/"):
                    problems.append(lock_path + ": noncanonical dependency source for " + package)
                if origin and not entry.get("integrity", "").startswith("sha512-"):
                    problems.append(lock_path + ": missing SHA-512 integrity for " + package)
        except json.JSONDecodeError:
            problems.append("Invalid lockfile JSON: " + lock_path)

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
    docs_validation = text(".github/workflows/docs-validation.yml")
    for expected in ("node: ['20', '24']", "node-version: ${{ matrix.node }}", "npm ci --ignore-scripts", "npm run build"):
        if expected not in docs_validation:
            problems.append("Docs CI missing both supported Node versions or safe build step: " + expected)
    web_validation = text(".github/workflows/web-validation.yml")
    for expected in ("npm ci --ignore-scripts", "npm audit --package-lock-only --omit=dev --audit-level=high --registry=https://registry.npmjs.org", "npx --no-install patch-package", "npx --no-install vitest run --config vitest.validation.config.ts", "npx --no-install vitest run --config vitest.dom-validation.config.ts", "npx --no-install playwright install --with-deps chromium", "npx --no-install playwright test --config playwright.validation.config.ts", "npm run build", "node-version: '24'"):
        if expected not in web_validation:
            problems.append("Web CI missing reviewed dependency/build action: " + expected)

    compose = text("docker-compose.yml")
    if "127.0.0.1:1883:1883" not in compose or '- "1883:1883"' in compose:
        problems.append("Unauthenticated development MQTT must bind to host loopback only")
    dependabot = text(".github/dependabot.yml")
    targets = re.findall(r"(?m)^\s*target-branch:\s*(\S+)\s*$", dependabot)
    if len(targets) != 6 or any(t != "main" for t in targets):
        problems.append("All six Dependabot ecosystems must target main")
    if "interval: weekly" not in dependabot:
        problems.append("Reviewed weekly Dependabot cadence missing")
    limits = re.findall(r"(?m)^\s*open-pull-requests-limit:\s*(\d+)\s*$", dependabot)
    if len(limits) != 6 or any(int(limit) > 2 for limit in limits):
        problems.append("Dependabot version-update PR limits exceed approved low-noise cap")
    if not re.search(r'package-ecosystem:\s*"docker"\s*\n\s*directory:\s*"/docker/main"', dependabot):
        problems.append("Docker Dependabot updater must point at a directory containing a Dockerfile")
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
