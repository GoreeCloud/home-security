"""Offline regression tests for GoreeCloud Home Security import guard."""
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from scripts.verify_import import REQUIRED_ICONS, verify_repository

COPY_PATHS = (
    "LICENSE", "TRADEMARK.md", "README.md", "README_CN.md", "docker-compose.yml",
    "docs/IMPORT_PROVENANCE.md", "docs/UPSTREAM-README.md",
    "docs/docusaurus.config.ts", "docs/package.json", "docs/package-lock.json",
    "docs/plugins/browser-path-polyfill.js",
    "web/src/components/Logo.tsx", "web/index.html", "web/login.html",
    ".github/dependabot.yml", ".github/workflows/import-integrity.yml",
    ".github/workflows/docs-validation.yml", "web/package.json", "web/package-lock.json",
    "web/src/lib/validation/authSchemas.ts", "web/src/lib/validation/authSchemas.test.ts",
    "web/src/lib/validation/numericSchemas.ts", "web/src/lib/validation/numericSchemas.test.ts",
    "web/vitest.validation.config.ts", ".github/workflows/web-validation.yml",
    *sorted(REQUIRED_ICONS),
)

class ImportIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for name in COPY_PATHS:
            src = ROOT / name
            dst = self.root / name
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

    def test_known_clean_import_passes(self):
        self.assertEqual([], verify_repository(self.root))

    def test_detects_modified_license(self):
        (self.root / "LICENSE").write_text("NOT AN MIT LICENSE\n")
        self.assertTrue(any("MIT copyright" in s for s in verify_repository(self.root)))

    def test_detects_upstream_brand_image(self):
        p = self.root / "docs/static/img/branding/frigate.png"
        p.write_bytes(b"fake")
        self.assertTrue(any("Proprietary Frigate logo" in s for s in verify_repository(self.root)))

    def test_detects_missing_readme_provenance(self):
        p = self.root / "README.md"
        p.write_text("# GoreeCloud Home Security\n")
        issues = verify_repository(self.root)
        self.assertTrue(any("upstream source SHA" in s for s in issues))
        self.assertTrue(any("affiliation" in s for s in issues))

    def test_detects_unreviewed_workflow(self):
        p = self.root / ".github/workflows/release.yml"
        p.write_text("name: Unreviewed\non:\n  release: {}\n")
        self.assertTrue(any("Unexpected workflow" in s for s in verify_repository(self.root)))

    def test_detects_publishing_in_workflow(self):
        p = self.root / ".github/workflows/import-integrity.yml"
        p.write_text(p.read_text() + "\n# docker/login-action\n")
        self.assertTrue(any("publishing token" in s for s in verify_repository(self.root)))

    def test_detects_public_development_mqtt_port(self):
        p = self.root / "docker-compose.yml"
        p.write_text(p.read_text().replace("127.0.0.1:1883:1883", "1883:1883"))
        self.assertTrue(any("MQTT" in issue for issue in verify_repository(self.root)))

    def test_rejects_upstream_ai_docs_plugin(self):
        p = self.root / "docs/docusaurus.config.ts"
        p.write_text(p.read_text() + "\n// @inkeep/docusaurus/chatButton\n")
        self.assertTrue(any("upstream docs integration" in issue for issue in verify_repository(self.root)))

    def test_rejects_public_docs_host(self):
        p = self.root / "docs/docusaurus.config.ts"
        p.write_text(p.read_text().replace('url: "http://localhost"', 'url: "https://docs.frigate.video"'))
        self.assertTrue(any("localhost-only preview" in issue for issue in verify_repository(self.root)))

    def test_rejects_docs_ai_manifest_dependency(self):
        p = self.root / "docs/package.json"
        p.write_text(p.read_text() + '\n// "@inkeep/docusaurus"\n')
        self.assertTrue(any("AI dependency" in issue for issue in verify_repository(self.root)))

    def test_detects_vulnerable_openapi_lodash(self):
        import json
        p = self.root / "docs/package-lock.json"
        lock = json.loads(p.read_text())
        lock["packages"]["node_modules/openapi-to-postmanv2/node_modules/lodash"] = {
            "version": "4.17.21",
            "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
            "integrity": "sha512-test",
        }
        p.write_text(json.dumps(lock))
        self.assertTrue(any("vulnerable nested Lodash" in issue for issue in verify_repository(self.root)))

    def test_detects_web_pattern_override_removed(self):
        import json
        p = self.root / "web/package.json"
        x = json.loads(p.read_text())
        del x["overrides"]["picomatch@2.3.1"]
        p.write_text(json.dumps(x))
        self.assertTrue(any("Missing scoped web pattern" in s for s in verify_repository(self.root)))

    def test_detects_legacy_picomatch(self):
        import json
        p = self.root / "web/package-lock.json"
        x = json.loads(p.read_text())
        x["packages"]["node_modules/picomatch"]["version"] = "2.3.1"
        p.write_text(json.dumps(x))
        self.assertTrue(any("vulnerable web pattern" in s for s in verify_repository(self.root)))

    def test_detects_reintroduced_unused_object_path(self):
        import json
        p = self.root / "web/package-lock.json"
        x = json.loads(p.read_text())
        x["packages"]["node_modules/object-path"] = {"version": "0.6.0"}
        p.write_text(json.dumps(x))
        self.assertTrue(any("unused sort-by/object-path" in s for s in verify_repository(self.root)))

    def test_rejects_external_algolia_docs_search_activation(self):
        p = self.root / "docs/docusaurus.config.ts"
        p.write_text(p.read_text() + "\n  algolia: { apiKey: 'unreviewed' },\n")
        self.assertTrue(any("GoreeShield approval" in issue for issue in verify_repository(self.root)))

    def test_detects_unreviewed_docsearch_ai_dependency(self):
        import json
        p = self.root / "docs/package-lock.json"
        value = json.loads(p.read_text())
        value["packages"]["node_modules/ai"] = {"version": "5.0.286"}
        p.write_text(json.dumps(value))
        self.assertTrue(any("Unreviewed AI SDK" in issue for issue in verify_repository(self.root)))

    def test_detects_unreviewed_docsearch_version(self):
        import json
        p = self.root / "docs/package-lock.json"
        value = json.loads(p.read_text())
        for name, entry in value["packages"].items():
            if name.endswith("/node_modules/@docsearch/react"):
                entry["version"] = "4.3.2"
        p.write_text(json.dumps(value))
        self.assertTrue(any("Unexpected DocSearch" in issue for issue in verify_repository(self.root)))

    def test_detects_removed_docsearch_scope(self):
        import json
        p = self.root / "docs/package.json"
        value = json.loads(p.read_text())
        del value["overrides"]["@docusaurus/theme-search-algolia"]
        p.write_text(json.dumps(value))
        self.assertTrue(any("AI-SDK-free DocSearch" in issue for issue in verify_repository(self.root)))

    def test_detects_reintroduced_openapi_yaml(self):
        import json
        p = self.root / "docs/package-lock.json"
        x = json.loads(p.read_text())
        x["packages"]["node_modules/openapi-to-postmanv2/node_modules/js-yaml"] = {"version": "4.1.0"}
        p.write_text(json.dumps(x))
        self.assertTrue(any("Vulnerable nested OpenAPI js-yaml" in issue for issue in verify_repository(self.root)))

    def test_detects_missing_openapi_yaml_override(self):
        import json
        p = self.root / "docs/package.json"
        x = json.loads(p.read_text())
        del x["overrides"]["openapi-to-postmanv2"]["js-yaml"]
        p.write_text(json.dumps(x))
        self.assertTrue(any("Missing reviewed OpenAPI parent-scoped js-yaml" in issue for issue in verify_repository(self.root)))

    def test_detects_unreviewed_gray_matter_yaml_major(self):
        import json
        p = self.root / "docs/package-lock.json"
        x = json.loads(p.read_text())
        x["packages"]["node_modules/gray-matter/node_modules/js-yaml"]["version"] = "4.3.2"
        p.write_text(json.dumps(x))
        self.assertTrue(any("gray-matter YAML major" in issue for issue in verify_repository(self.root)))

    def test_detects_removed_serializer_override(self):
        import json
        p = self.root / "docs/package.json"
        x = json.loads(p.read_text())
        del x["overrides"]["copy-webpack-plugin"]
        p.write_text(json.dumps(x))
        self.assertTrue(any("Docs serialization security override" in issue for issue in verify_repository(self.root)))

    def test_detects_vulnerable_serializer_version(self):
        import json
        p = self.root / "docs/package-lock.json"
        x = json.loads(p.read_text())
        x["packages"]["node_modules/css-minimizer-webpack-plugin/node_modules/serialize-javascript"]["version"] = "6.0.2"
        p.write_text(json.dumps(x))
        self.assertTrue(any("Vulnerable docs serialization dependency" in issue for issue in verify_repository(self.root)))

    def test_detects_unreviewed_serializer_copy(self):
        import json
        p = self.root / "docs/package-lock.json"
        x = json.loads(p.read_text())
        x["packages"]["node_modules/serialize-javascript"] = {"version": "6.0.2"}
        p.write_text(json.dumps(x))
        self.assertTrue(any("Unexpected docs serialization dependency graph" in issue for issue in verify_repository(self.root)))

    def test_detects_missing_real_auth_schema_tests(self):
        p = self.root / "web/src/lib/validation/authSchemas.test.ts"
        p.write_text("test('no tests here', () => {})")
        self.assertTrue(any("Missing real auth validation regression test" in issue for issue in verify_repository(self.root)))

    def test_detects_missing_isolated_node_test_config(self):
        p = self.root / "web/vitest.validation.config.ts"
        p.write_text(p.read_text().replace('environment: "node"', 'environment: "jsdom"'))
        self.assertTrue(any("isolated Node-only config" in issue for issue in verify_repository(self.root)))

    def test_detects_disabled_auth_validation_ci(self):
        p = self.root / ".github/workflows/web-validation.yml"
        p.write_text(p.read_text().replace(
            "npx --no-install vitest run --config vitest.validation.config.ts",
            "echo fake-tests",
        ))
        self.assertTrue(any("Web CI missing reviewed dependency/build action" in issue for issue in verify_repository(self.root)))

    def test_detects_missing_numeric_schema_regressions(self):
        p = self.root / "web/src/lib/validation/numericSchemas.test.ts"
        p.write_text("test('not the real tests', () => {})")
        self.assertTrue(any("Missing numeric form coercion regression test" in issue for issue in verify_repository(self.root)))

    def test_detects_zod_v3_reintroduction_in_candidate(self):
        import json
        p = self.root / "web/package-lock.json"
        x = json.loads(p.read_text())
        x["packages"]["node_modules/zod"]["version"] = "3.25.76"
        p.write_text(json.dumps(x))
        self.assertTrue(any("Zod 4 package pair lockfile drift" in issue for issue in verify_repository(self.root)))

    def test_detects_incompatible_form_resolver_in_candidate(self):
        import json
        p = self.root / "web/package-lock.json"
        x = json.loads(p.read_text())
        x["packages"]["node_modules/@hookform/resolvers"]["version"] = "3.10.0"
        p.write_text(json.dumps(x))
        self.assertTrue(any("Zod 4 package pair lockfile drift" in issue for issue in verify_repository(self.root)))

    def test_detects_missing_docs_node_matrix(self):
        p = self.root / ".github/workflows/docs-validation.yml"
        p.write_text(p.read_text().replace("node: ['20', '24']", "node: ['24']", 1))
        self.assertTrue(any("Docs CI missing" in issue for issue in verify_repository(self.root)))

    def test_detects_unscoped_minimatch_upgrade(self):
        import json
        p = self.root / "docs/package-lock.json"
        d = json.loads(p.read_text())
        d["packages"]["node_modules/minimatch"]["version"] = "5.1.6"
        p.write_text(json.dumps(d))
        self.assertTrue(any("reviewed minimatch" in issue for issue in verify_repository(self.root)))

    def test_detects_vulnerable_docs_worker_pool(self):
        import json
        p = self.root / "docs/package-lock.json"
        d = json.loads(p.read_text())
        d["packages"]["node_modules/tinypool"]["version"] = "1.1.1"
        p.write_text(json.dumps(d))
        self.assertTrue(any("fixed Tinypool" in issue for issue in verify_repository(self.root)))

    def test_detects_unreviewed_node_browser_polyfills(self):
        p = self.root / "docs/plugins/browser-path-polyfill.js"
        p.write_text(p.read_text() + "\n// crypto: require.resolve('bad')\n")
        self.assertTrue(any("Unreviewed privileged browser polyfill" in s for s in verify_repository(self.root)))

    def test_detects_incompatible_webpackbar_major(self):
        p = self.root / "docs/package-lock.json"
        source = p.read_text()
        assert '"node_modules/webpackbar"' in source
        import json
        data = json.loads(source)
        data["packages"]["node_modules/webpackbar"]["version"] = "6.0.1"
        p.write_text(json.dumps(data))
        self.assertTrue(any("Incompatible webpack" in issue for issue in verify_repository(self.root)))

    def test_detects_noncanonical_dependency_registry(self):
        p = self.root / "docs/package-lock.json"
        p.write_text(p.read_text().replace("https://registry.npmjs.org/", "https://mirrors.example.invalid/", 1))
        self.assertTrue(any("noncanonical dependency source" in s for s in verify_repository(self.root)))

    def test_detects_missing_dependency_integrity(self):
        p = self.root / "web/package-lock.json"
        p.write_text(p.read_text().replace('"integrity": "sha512-', '"integrity": "', 1))
        self.assertTrue(any("missing SHA-512 integrity" in s for s in verify_repository(self.root)))

    def test_rejects_unreviewed_docs_publish(self):
        p = self.root / ".github/workflows/docs-validation.yml"
        p.write_text(p.read_text() + "\n# id-token: write\n")
        self.assertTrue(any("unreviewed privilege" in s for s in verify_repository(self.root)))

    def test_detects_missing_frontend_install_safety(self):
        p = self.root / ".github/workflows/web-validation.yml"
        p.write_text(p.read_text().replace("npm ci --ignore-scripts", "npm ci", 1))
        self.assertTrue(any("Web CI missing" in issue for issue in verify_repository(self.root)))

    def test_detects_unbounded_dependabot_prs(self):
        p = self.root / ".github/dependabot.yml"
        p.write_text(p.read_text().replace("open-pull-requests-limit: 2", "open-pull-requests-limit: 10", 1))
        self.assertTrue(any("low-noise" in issue for issue in verify_repository(self.root)))

    def test_detects_nonexistent_docker_dependabot_directory(self):
        p = self.root / ".github/dependabot.yml"
        p.write_text(p.read_text().replace('directory: "/docker/main"', 'directory: "/docker"'))
        self.assertTrue(any("Docker Dependabot" in issue for issue in verify_repository(self.root)))

    def test_detects_wrong_dependabot_branch(self):
        p = self.root / ".github/dependabot.yml"
        p.write_text(p.read_text().replace("target-branch: main", "target-branch: dev", 1))
        self.assertTrue(any("six Dependabot" in s for s in verify_repository(self.root)))

    def test_detects_original_logo_component(self):
        p = self.root / "web/src/components/Logo.tsx"
        p.write_text('export default function Logo(){ return "M130 446.5"; }')
        self.assertTrue(any("upstream trademarked bird" in s for s in verify_repository(self.root)))

if __name__ == "__main__":
    unittest.main()
