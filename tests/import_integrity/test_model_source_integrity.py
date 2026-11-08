"""Offline tests for authenticated, checksum-gated model archive acquisition.

This test parses Dockerfile source only. It does not build an image,
download executable scripts, unpack model files, or run a camera.
"""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCKERFILE = ROOT / "docker/main/Dockerfile"
ARCHIVE = "ssdlite_mobilenet_v2_coco_2018_05_09.tar.gz"
TRUSTED_SOURCE = (
    "https://storage.openvinotoolkit.org/repositories/open_model_zoo/"
    "public/2022.1/ssdlite_mobilenet_v2/" + ARCHIVE
)
VERIFIED_SHA384 = (
    "8e205630237f1913ac0ed623d48798f1fa03a9e95c467bd149eb5f6107e"
    "704a8131cdb0a72fcf6517dafa0ff47d32a4e"
)

def verify_model_download(source: str) -> list[str]:
    issues = []
    if "http://download.tensorflow.org/models/object_detection/" in source:
        issues.append("insecure TensorFlow HTTP model download returned")

    block_start = source.find("# Get OpenVino Model")
    block_end = source.find("####", block_start)
    block = source[block_start:block_end] if block_start >= 0 and block_end > block_start else ""
    expected_fetch = f'wget --https-only -q -O {ARCHIVE} "{TRUSTED_SOURCE}"'
    expected_checksum = f'echo "{VERIFIED_SHA384}  {ARCHIVE}" | sha384sum --check --status'
    fetch_at = block.find(expected_fetch)
    checksum_at = block.find(expected_checksum)
    unpack_at = block.find("tar -xvf " + ARCHIVE)

    if fetch_at < 0:
        issues.append("model source must be the verified Intel HTTPS mirror")
    if checksum_at < 0:
        issues.append("required published model SHA-384 checksum gate missing")
    if not (fetch_at >= 0 and checksum_at > fetch_at and unpack_at > checksum_at):
        issues.append("model archive must be checked before extraction")
    if any(flag in block for flag in ("--no-check-certificate", "curl -k", "--insecure")):
        issues.append("TLS certificate verification must not be disabled")
    return issues

class DockerModelSourceTests(unittest.TestCase):
    def test_verified_https_model_and_checksum_precede_unpack(self):
        self.assertEqual(verify_model_download(DOCKERFILE.read_text()), [])

    def test_refuses_unencrypted_model_source(self):
        src = DOCKERFILE.read_text().replace(TRUSTED_SOURCE, "http://download.tensorflow.org/models/object_detection/" + ARCHIVE)
        self.assertTrue(verify_model_download(src))

    def test_refuses_missing_or_wrong_model_checksum(self):
        src = DOCKERFILE.read_text().replace(VERIFIED_SHA384, "0" * 96)
        self.assertTrue(any("SHA-384 checksum" in issue for issue in verify_model_download(src)))

    def test_refuses_unpack_before_checksum(self):
        src = DOCKERFILE.read_text()
        original = (
            f'&& echo "{VERIFIED_SHA384}  {ARCHIVE}" | sha384sum --check --status \\\n'
            f'    && tar -xvf {ARCHIVE}'
        )
        if original not in src:
            self.fail("unexpected Dockerfile model stage layout")
        bad = src.replace(original, (
            f'&& tar -xvf {ARCHIVE} \\\n'
            f'    && echo "{VERIFIED_SHA384}  {ARCHIVE}" | sha384sum --check --status'
        ))
        self.assertTrue(any("before extraction" in issue for issue in verify_model_download(bad)))

    def test_refuses_tls_verification_bypass(self):
        src = DOCKERFILE.read_text().replace("wget --https-only", "wget --no-check-certificate --https-only")
        self.assertTrue(any("TLS certificate verification" in issue for issue in verify_model_download(src)))

if __name__ == "__main__":
    unittest.main()
