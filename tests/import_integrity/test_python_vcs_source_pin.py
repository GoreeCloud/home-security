"""Offline reproducibility checks for the imported Python Git dependency.

Validates source declarations only; does not install or import third-party code.
"""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REQUIREMENTS = ROOT / "docker/main/requirements-wheels.txt"
REVIEWED_SHA = "0545dfd39858c1552aaabc52ea3fbcb7f5714853"
TRUSTED_ENTRY = (
    "git+https://github.com/fbcotter/py3nvml@" + REVIEWED_SHA +
    "#egg=py3nvml"
)

def validate_vcs_requirements(text: str) -> list[str]:
    errors: list[str] = []
    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    vcs_entries = [line for line in lines if "git+" in line]
    if vcs_entries != [TRUSTED_ENTRY]:
        errors.append("Python Git VCS dependency must use the exact reviewed HTTPS commit")
    if any("git+http://" in line or "git+git://" in line for line in vcs_entries):
        errors.append("Git dependency must use authenticated HTTPS")
    return errors

class PythonVcsPinTests(unittest.TestCase):
    def test_pinned_source_is_exactly_reviewed_commit(self):
        self.assertEqual(validate_vcs_requirements(REQUIREMENTS.read_text()), [])

    def test_rejects_unpinned_upstream_branch(self):
        text = REQUIREMENTS.read_text().replace("@" + REVIEWED_SHA, "")
        self.assertTrue(validate_vcs_requirements(text))

    def test_rejects_abbreviated_git_sha(self):
        text = REQUIREMENTS.read_text().replace(REVIEWED_SHA, REVIEWED_SHA[:12])
        self.assertTrue(validate_vcs_requirements(text))

    def test_rejects_insecure_transport(self):
        text = REQUIREMENTS.read_text().replace("git+https://", "git+http://")
        self.assertTrue(validate_vcs_requirements(text))

    def test_rejects_unreviewed_second_vcs_requirement(self):
        text = REQUIREMENTS.read_text() + "\ngit+https://example.com/other.git@abc#egg=other\n"
        self.assertTrue(validate_vcs_requirements(text))

if __name__ == "__main__":
    unittest.main()
