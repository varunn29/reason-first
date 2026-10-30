"""Evaluation pipeline for the Class 3 subtraction diagnostic engine.

Evaluates the deterministic diagnostic engine against benchmark datasets (e.g.
data/synthetic/diagnostic_cases.jsonl) and reports status matches, signature
matches, mismatches, and data schema errors.

Exit codes:
    0: All records loaded successfully and all expectations matched perfectly.
    1: One or more evaluation mismatches, unreadable lines, or malformed records.
    2: Fatal error (e.g. dataset file not found).
"""

import argparse
from dataclasses import dataclass, field
import json
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional

# Ensure project root 'src' is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from math_diagnostic.engine import diagnose_responses


@dataclass
class EvaluationMismatch:
    """Records an evaluation discrepancy between expected and actual results."""

    case_id: str
    scenario_category: str
    field_name: str
    expected: Any
    actual: Any


@dataclass
class EvaluationReport:
    """Holds complete statistical results of an evaluation run."""

    total_loaded: int = 0
    successfully_evaluated: int = 0
    status_matches: int = 0
    signature_evaluated_cases: int = 0
    signature_matches: int = 0
    mismatches: List[EvaluationMismatch] = field(default_factory=list)
    invalid_rows: List[Dict[str, Any]] = field(default_factory=list)

    @property
    def has_failures(self) -> bool:
        """Return True if any mismatches or invalid rows exist."""
        return len(self.mismatches) > 0 or len(self.invalid_rows) > 0


def evaluate_dataset(dataset_path: Path) -> EvaluationReport:
    """Evaluate a JSONL dataset against diagnose_responses.

    Args:
        dataset_path: Path to the .jsonl dataset file.

    Returns:
        EvaluationReport containing verification metrics and mismatch details.

    Raises:
        FileNotFoundError: If the dataset file does not exist.
    """
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {dataset_path}")

    report = EvaluationReport()

    with open(dataset_path, "r", encoding="utf-8") as f:
        for line_no, raw_line in enumerate(f, start=1):
            line = raw_line.strip()
            if not line:
                continue

            report.total_loaded += 1

            # 1. JSON parsing check
            try:
                record = json.loads(line)
            except json.JSONDecodeError as err:
                report.invalid_rows.append({
                    "line_number": line_no,
                    "error": f"JSON decode error: {err}",
                    "raw_content": line,
                })
                continue

            # 2. Schema check: required fields
            if not isinstance(record, dict):
                report.invalid_rows.append({
                    "line_number": line_no,
                    "error": f"Row is not a JSON object, got {type(record).__name__}",
                    "raw_content": line,
                })
                continue

            case_id = record.get("case_id")
            responses = record.get("responses")
            expected_status = record.get("expected_diagnostic_status")
            expected_sig = record.get("expected_signature")
            category = record.get("scenario_category", "unknown")

            if not case_id or not isinstance(case_id, str):
                report.invalid_rows.append({
                    "line_number": line_no,
                    "error": "Missing or non-string 'case_id'",
                    "raw_content": line,
                })
                continue

            if responses is None or not isinstance(responses, dict):
                report.invalid_rows.append({
                    "line_number": line_no,
                    "case_id": case_id,
                    "error": "Missing or non-dict 'responses'",
                })
                continue

            # Requirement: Do not count missing expected labels as successful matches
            if not expected_status or not isinstance(expected_status, str):
                report.invalid_rows.append({
                    "line_number": line_no,
                    "case_id": case_id,
                    "error": "Missing or non-string 'expected_diagnostic_status'",
                })
                continue

            # 3. Engine evaluation
            try:
                actual_result = diagnose_responses(responses)
            except Exception as err:
                report.invalid_rows.append({
                    "line_number": line_no,
                    "case_id": case_id,
                    "error": f"Engine execution error: {err}",
                })
                continue

            report.successfully_evaluated += 1

            # Extract actual outputs
            actual_status = actual_result.get("diagnostic_status")
            observed_pattern = actual_result.get("observed_pattern_match")
            actual_sig = observed_pattern.get("signature_id") if isinstance(observed_pattern, dict) else None

            # 4. Compare diagnostic status
            if actual_status == expected_status:
                report.status_matches += 1
            else:
                report.mismatches.append(EvaluationMismatch(
                    case_id=case_id,
                    scenario_category=category,
                    field_name="diagnostic_status",
                    expected=expected_status,
                    actual=actual_status,
                ))

            # 5. Compare signature (both when expected is non-null and when expected is null)
            if expected_sig is not None:
                report.signature_evaluated_cases += 1
                if actual_sig == expected_sig:
                    report.signature_matches += 1
                else:
                    report.mismatches.append(EvaluationMismatch(
                        case_id=case_id,
                        scenario_category=category,
                        field_name="signature_id",
                        expected=expected_sig,
                        actual=actual_sig,
                    ))
            else:
                # If no signature was expected, verify that actual_sig is indeed None
                if actual_sig is not None:
                    report.mismatches.append(EvaluationMismatch(
                        case_id=case_id,
                        scenario_category=category,
                        field_name="signature_id",
                        expected=None,
                        actual=actual_sig,
                    ))

    return report


def print_evaluation_summary(report: EvaluationReport, dataset_path: Path) -> None:
    """Print a clean, formatted evaluation report to stdout."""
    print("=" * 72)
    print("DIAGNOSTIC ENGINE BENCHMARK EVALUATION REPORT")
    print("=" * 72)
    print(f"Dataset File: {dataset_path}")
    print(f"Total Cases Loaded:          {report.total_loaded}")
    print(f"Successfully Evaluated:      {report.successfully_evaluated}")
    print(f"Invalid / Unreadable Rows:   {len(report.invalid_rows)}")
    print(f"Diagnostic Status Matches:   {report.status_matches} / {report.successfully_evaluated}")
    print(f"Expected Signature Matches:  {report.signature_matches} / {report.signature_evaluated_cases}")
    print(f"Total Evaluation Mismatches: {len(report.mismatches)}")
    print("-" * 72)

    if report.invalid_rows:
        print("INVALID / MALFORMED ROWS ENCOUNTERED:")
        for inv in report.invalid_rows:
            line_str = f"Line {inv.get('line_number')}"
            case_str = f" (Case ID: {inv.get('case_id')})" if inv.get("case_id") else ""
            print(f"  - {line_str}{case_str}: {inv.get('error')}")
        print("-" * 72)

    if report.mismatches:
        print("EVALUATION MISMATCHES:")
        for m in report.mismatches:
            print(
                f"  - [{m.case_id}] ({m.scenario_category}) {m.field_name}: "
                f"Expected '{m.expected}', got '{m.actual}'"
            )
        print("-" * 72)

    # Required boundary notice
    print("EVALUATION BOUNDARY NOTICE:")
    print("This evaluation tests software implementation correctness against programmed")
    print("rules on synthetic benchmark cases. It does NOT establish real-world classroom")
    print("diagnostic validity, psychometric reliability, or proof of a child's thinking.")
    print("=" * 72)


def main(argv: Optional[List[str]] = None) -> int:
    """CLI entrypoint for evaluation script. Returns process exit code."""
    parser = argparse.ArgumentParser(
        description="Evaluate diagnostic engine against benchmark dataset."
    )
    default_dataset = PROJECT_ROOT / "data" / "synthetic" / "diagnostic_cases.jsonl"
    parser.add_argument(
        "--dataset",
        type=Path,
        default=default_dataset,
        help=f"Path to JSONL benchmark dataset (default: {default_dataset})",
    )
    args = parser.parse_args(argv)

    try:
        report = evaluate_dataset(args.dataset)
    except FileNotFoundError as err:
        print(f"FATAL ERROR: {err}", file=sys.stderr)
        return 2

    print_evaluation_summary(report, args.dataset)

    # Non-zero exit code if failures or invalid rows exist
    if report.has_failures:
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
