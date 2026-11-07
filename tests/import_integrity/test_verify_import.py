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
    "web/src/components/Logo.tsx", "web/index.html", "web/login.html",
    ".github/dependabot.yml", ".github/workflows/import-integrity.yml",
    ".github/workflows/docs-validation.yml", "web/package-lock.json",
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
