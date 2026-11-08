"""Offline source-integrity checks for externally hosted binary Python wheels.

These tests parse declarations only. They do not download, install, or import
third-party wheels, and never execute camera or AI inference code.
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REQUIREMENTS_PATH = ROOT / "docker/main/requirements-wheels.txt"
DOCKER_PATH = ROOT / "docker/main/Dockerfile"

X86_URL = (
    "https://github.com/frigate-nvr/TFlite-builds/releases/download/v2.17.1/"
    "tflite_runtime-2.17.1-cp311-cp311-linux_x86_64.whl"
)
ARM_URL = (
    "https://github.com/feranick/TFlite-builds/releases/download/v2.17.1/"
    "tflite_runtime-2.17.1-cp311-cp311-linux_aarch64.whl"
)
AXERA_URL = (
    "https://github.com/AXERA-TECH/pyaxengine/releases/download/0.1.3-frigate/"
    "axengine-0.1.3-py3-none-any.whl"
)
EXPECTED = {
    X86_URL: "a6b4e57f13c536a737aeb0ebd27618177ddbbabb1e4242c9c3403cd566fe71b6",
    ARM_URL: "dd3768be23a44eb59b59b686cce943a1eef62c0160911fec4d3251d9c8ba97ab",
    AXERA_URL: "e995b8a887b067dc3456512aae2fa9c84f70e708c28b11caf184efdc254c64ae",
}


def validate_external_wheel_sources(requirements: str, dockerfile: str) -> list[str]:
    problems = []
    entries = [
        x.strip()
        for x in requirements.splitlines()
        if x.strip() and not x.lstrip().startswith("#") and " @ " in x
    ]
    expected_entries = {
        f"tflite_runtime @ {X86_URL}#sha256={EXPECTED[X86_URL]}; platform_machine == 'x86_64'",
        f"tflite_runtime @ {ARM_URL}#sha256={EXPECTED[ARM_URL]}; platform_machine == 'aarch64'",
    }
    if set(entries) != expected_entries or len(entries) != len(expected_entries):
        problems.append("TFLite external wheel URLs, architecture markers or SHA-256 pins differ from reviewed assets")

    exact_axera = f"RUN pip3 install {AXERA_URL}#sha256={EXPECTED[AXERA_URL]}"
    if dockerfile.count(exact_axera) != 1:
        problems.append("Axera external wheel lacks the reviewed SHA-256 pin")

    # Match any shell invocation of pip installing a remote wheel, including
    # additional unreviewed direct wheels inserted outside this single stage.
    direct = re.findall(r"\bpip3? install\s+(https?://\S+\.whl(?:#sha256=[a-f0-9]+)?)", dockerfile)
    if direct != [f"{AXERA_URL}#sha256={EXPECTED[AXERA_URL]}"]:
        problems.append("Unreviewed direct remote pip wheel install in Dockerfile")

    if re.search(r"\b(?:http://github\.com/|--trusted-host|--no-check-certificate|curl\s+-k\b)", requirements + dockerfile):
        problems.append("Wheel transport must not disable TLS verification")
    return problems


class ExternalWheelIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.requirements = REQUIREMENTS_PATH.read_text()
        self.dockerfile = DOCKER_PATH.read_text()

    def test_verified_architecture_wheels_and_axera_hashes(self):
        self.assertEqual(validate_external_wheel_sources(self.requirements, self.dockerfile), [])

    def test_refuses_removed_x86_checksum(self):
        src = self.requirements.replace("#sha256=" + EXPECTED[X86_URL], "")
        self.assertTrue(validate_external_wheel_sources(src, self.dockerfile))

    def test_refuses_modified_arm_checksum(self):
        src = self.requirements.replace(EXPECTED[ARM_URL], "0" * 64)
        self.assertTrue(validate_external_wheel_sources(src, self.dockerfile))

    def test_refuses_modified_axera_checksum(self):
        src = self.dockerfile.replace(EXPECTED[AXERA_URL], "f" * 64)
        self.assertTrue(validate_external_wheel_sources(self.requirements, src))

    def test_refuses_arm_x86_marker_swap(self):
        src = self.requirements.replace("platform_machine == 'aarch64'", "platform_machine == 'x86_64'")
        self.assertTrue(validate_external_wheel_sources(src, self.dockerfile))

    def test_refuses_extra_external_wheel_in_requirements(self):
        src = self.requirements + "\nadditional @ https://example.org/additional.whl#sha256=" + "0" * 64 + "\n"
        self.assertTrue(validate_external_wheel_sources(src, self.dockerfile))

    def test_refuses_unreviewed_direct_docker_wheel(self):
        src = self.dockerfile + "\nRUN pip3 install https://example.org/new.whl#sha256=" + "0" * 64 + "\n"
        self.assertTrue(validate_external_wheel_sources(self.requirements, src))


if __name__ == "__main__":
    unittest.main()
