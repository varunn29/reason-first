"""Unit tests for the evaluation pipeline in scripts/evaluate.py.

Verifies:
1. Complete match on valid benchmark data.
2. Accurate detection and recording of status mismatches.
3. Accurate detection and recording of signature mismatches.
4. Handling of unreadable/corrupted JSON lines.
5. Strict rejection of rows with missing expected labels (not counted as success).
6. Proper exit code behaviour (0 on success, 1 on mismatches/malformed rows, 2 on file not found).
"""

import json
from pathlib import Path
import sys
import tempfile
import unittest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
SCRIPTS_DIR = PROJECT_ROOT / "scripts"

for p in (SRC_DIR, SCRIPTS_DIR):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from evaluate import evaluate_dataset, main


class TestEvaluationPipeline(unittest.TestCase):
    """Test suite for evaluate_dataset and main CLI runner."""

    def test_evaluate_valid_dataset(self) -> None:
        """Verify that valid matching records produce 100% matches and no failures."""
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".jsonl", delete=False) as f:
            f.write(json.dumps({
                "case_id": "test_01",
                "synthetic": True,
                "scenario_category": "all_answers_correct",
                "responses": {"probe_01": 37, "probe_02": 34, "probe_03": 34, "ctrl_01": 35, "ctrl_02": 34},
                "expected_diagnostic_status": "NO_TARGET_PATTERN_DETECTED",
                "expected_signature": None,
            }) + "\n")
            f.write(json.dumps({
                "case_id": "test_02",
                "synthetic": True,
                "scenario_category": "sfl_canonical",
                "responses": {"probe_01": 43, "probe_02": 46, "probe_03": 46, "ctrl_01": 35, "ctrl_02": 34},
                "expected_diagnostic_status": "SUPPORTED_HYPOTHESIS",
                "expected_signature": "SMALLER_FROM_LARGER",
            }) + "\n")
            temp_path = Path(f.name)

        try:
            report = evaluate_dataset(temp_path)
            self.assertEqual(report.total_loaded, 2)
            self.assertEqual(report.successfully_evaluated, 2)
            self.assertEqual(report.status_matches, 2)
            self.assertEqual(report.signature_matches, 1)
            self.assertEqual(len(report.mismatches), 0)
            self.assertEqual(len(report.invalid_rows), 0)
            self.assertFalse(report.has_failures)
        finally:
            temp_path.unlink(missing_ok=True)

    def test_evaluate_status_mismatch(self) -> None:
        """Verify that diagnostic status discrepancies are recorded as mismatches."""
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".jsonl", delete=False) as f:
            f.write(json.dumps({
                "case_id": "test_mismatch_status",
                "synthetic": True,
                "scenario_category": "intentional_mismatch",
                "responses": {"probe_01": 37, "probe_02": 34, "probe_03": 34, "ctrl_01": 35, "ctrl_02": 34},
                # Actual status will be NO_TARGET_PATTERN_DETECTED, so this expected status will mismatch
                "expected_diagnostic_status": "SUPPORTED_HYPOTHESIS",
                "expected_signature": None,
            }) + "\n")
            temp_path = Path(f.name)

        try:
            report = evaluate_dataset(temp_path)
            self.assertEqual(report.total_loaded, 1)
            self.assertEqual(report.successfully_evaluated, 1)
            self.assertEqual(report.status_matches, 0)
            self.assertEqual(len(report.mismatches), 1)
            self.assertTrue(report.has_failures)
            m = report.mismatches[0]
            self.assertEqual(m.case_id, "test_mismatch_status")
            self.assertEqual(m.field_name, "diagnostic_status")
            self.assertEqual(m.expected, "SUPPORTED_HYPOTHESIS")
            self.assertEqual(m.actual, "NO_TARGET_PATTERN_DETECTED")
        finally:
            temp_path.unlink(missing_ok=True)

    def test_evaluate_signature_mismatch(self) -> None:
        """Verify that signature discrepancies are recorded as mismatches."""
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".jsonl", delete=False) as f:
            f.write(json.dumps({
                "case_id": "test_mismatch_signature",
                "synthetic": True,
                "scenario_category": "intentional_sig_mismatch",
                "responses": {"probe_01": 43, "probe_02": 46, "probe_03": 46, "ctrl_01": 35, "ctrl_02": 34},
                "expected_diagnostic_status": "SUPPORTED_HYPOTHESIS",
                # Actual signature is SMALLER_FROM_LARGER, this expected signature will mismatch
                "expected_signature": "BORROW_WITHOUT_DECREMENT",
            }) + "\n")
            temp_path = Path(f.name)

        try:
            report = evaluate_dataset(temp_path)
            self.assertEqual(report.total_loaded, 1)
            self.assertEqual(report.successfully_evaluated, 1)
            self.assertEqual(report.status_matches, 1)
            self.assertEqual(report.signature_matches, 0)
            self.assertEqual(len(report.mismatches), 1)
            self.assertTrue(report.has_failures)
            m = report.mismatches[0]
            self.assertEqual(m.field_name, "signature_id")
            self.assertEqual(m.expected, "BORROW_WITHOUT_DECREMENT")
            self.assertEqual(m.actual, "SMALLER_FROM_LARGER")
        finally:
            temp_path.unlink(missing_ok=True)

    def test_evaluate_unreadable_json_row(self) -> None:
        """Verify that corrupted JSON rows are recorded as invalid rows without crashing."""
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".jsonl", delete=False) as f:
            f.write('{"case_id": "valid_01", "responses": {"probe_01": 37, "probe_02": 34, "probe_03": 34, "ctrl_01": 35, "ctrl_02": 34}, "expected_diagnostic_status": "NO_TARGET_PATTERN_DETECTED", "expected_signature": null}\n')
            f.write('INVALID_JSON_CORRUPTED_ROW\n')
            temp_path = Path(f.name)

        try:
            report = evaluate_dataset(temp_path)
            self.assertEqual(report.total_loaded, 2)
            self.assertEqual(report.successfully_evaluated, 1)
            self.assertEqual(len(report.invalid_rows), 1)
            self.assertTrue(report.has_failures)
            self.assertIn("JSON decode error", report.invalid_rows[0]["error"])
        finally:
            temp_path.unlink(missing_ok=True)

    def test_evaluate_missing_expected_status_rejected(self) -> None:
        """Verify that records with missing expected labels are flagged as invalid and never counted as matches."""
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".jsonl", delete=False) as f:
            f.write(json.dumps({
                "case_id": "missing_status_label",
                "responses": {"probe_01": 37, "probe_02": 34, "probe_03": 34, "ctrl_01": 35, "ctrl_02": 34},
                # expected_diagnostic_status is missing
                "expected_signature": None,
            }) + "\n")
            temp_path = Path(f.name)

        try:
            report = evaluate_dataset(temp_path)
            self.assertEqual(report.total_loaded, 1)
            self.assertEqual(report.successfully_evaluated, 0)
            self.assertEqual(report.status_matches, 0)
            self.assertEqual(len(report.invalid_rows), 1)
            self.assertTrue(report.has_failures)
            self.assertIn("Missing or non-string 'expected_diagnostic_status'", report.invalid_rows[0]["error"])
        finally:
            temp_path.unlink(missing_ok=True)

    def test_file_not_found_raises(self) -> None:
        """Verify that evaluate_dataset raises FileNotFoundError for missing paths."""
        nonexistent = Path("nonexistent_path_to_dataset.jsonl")
        with self.assertRaises(FileNotFoundError):
            evaluate_dataset(nonexistent)

    def test_main_cli_exit_codes(self) -> None:
        """Verify CLI main() returns exit code 0 on success, 1 on failures, and 2 on missing file."""
        # Test exit code 2 (file not found)
        code_missing = main(["--dataset", "nonexistent_file.jsonl"])
        self.assertEqual(code_missing, 2)

        # Test exit code 0 (success)
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".jsonl", delete=False) as f:
            f.write(json.dumps({
                "case_id": "cli_pass",
                "responses": {"probe_01": 37, "probe_02": 34, "probe_03": 34, "ctrl_01": 35, "ctrl_02": 34},
                "expected_diagnostic_status": "NO_TARGET_PATTERN_DETECTED",
                "expected_signature": None,
            }) + "\n")
            pass_path = Path(f.name)

        try:
            code_success = main(["--dataset", str(pass_path)])
            self.assertEqual(code_success, 0)
        finally:
            pass_path.unlink(missing_ok=True)

        # Test exit code 1 (mismatch)
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".jsonl", delete=False) as f:
            f.write(json.dumps({
                "case_id": "cli_fail",
                "responses": {"probe_01": 37, "probe_02": 34, "probe_03": 34, "ctrl_01": 35, "ctrl_02": 34},
                "expected_diagnostic_status": "SUPPORTED_HYPOTHESIS",
                "expected_signature": None,
            }) + "\n")
            fail_path = Path(f.name)

        try:
            code_fail = main(["--dataset", str(fail_path)])
            self.assertEqual(code_fail, 1)
        finally:
            fail_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
