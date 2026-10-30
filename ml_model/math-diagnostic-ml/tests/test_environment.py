"""Environment and scaffolding verification tests.

Uses standard Python unittest without requiring any third-party dependencies.
"""

from pathlib import Path
import sys
import unittest

# Ensure the 'src' directory is accessible on the module search path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


class TestEnvironment(unittest.TestCase):
    """Smoke tests for local Python environment and Phase 0 scaffolding."""

    def test_python_version(self) -> None:
        """Verify that Python 3.10 or newer is running."""
        self.assertGreaterEqual(
            sys.version_info[:2],
            (3, 10),
            f"Python >= 3.10 is required; current version is {sys.version}",
        )

    def test_engine_scaffolding_import(self) -> None:
        """Verify that the math_diagnostic package can be imported and executed."""
        from math_diagnostic.engine import check_engine_status

        status_msg = check_engine_status()
        self.assertIsInstance(status_msg, str)
        self.assertIn("Phase 0 scaffolding initialized", status_msg)


if __name__ == "__main__":
    unittest.main()
