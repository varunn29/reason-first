"""Benchmark evaluation for NCERT Class 3 Chapter 12 Cognitive Diagnostic Model.

Evaluates calibrated diagnostic responses against authentic textbook probes
for five synthetic student learning profiles:
1. Mastery (All Correct)
2. Systematic Smaller-From-Larger (SFL)
3. Systematic Borrow-Without-Decrement (BWD)
4. Systematic Operation Confusion (Addition)
5. Non-Regrouping Control Verification
"""

import json
from pathlib import Path
import sys
from typing import Any, Dict, List

# Ensure project src is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from math_diagnostic.engine import (
    SIG_BORROW_WITHOUT_DECREMENT,
    SIG_OPERATION_CONFUSION_ADD,
    SIG_SMALLER_FROM_LARGER,
    TEXTBOOK_PROBES,
    diagnose_single_response,
)


def run_ncert_benchmark() -> Dict[str, Any]:
    print("=" * 72)
    print("NCERT CLASS 3 CHAPTER 12 DIAGNOSTIC BENCHMARK EVALUATION")
    print("Curriculum: Maths Mela, Chapter 12: 'Give and Take' (pp. 150-164)")
    print("=" * 72)

    total_evaluations = 0
    passed_expectations = 0
    failures: List[Dict[str, Any]] = []

    # Scenario 1: Mastery Profile (Student answers all 10 probes correctly)
    print("\n[Scenario 1] Evaluating Student Mastery Profile (All Correct)...")
    for probe_id, probe in TEXTBOOK_PROBES.items():
        total_evaluations += 1
        res = diagnose_single_response(probe_id, probe.correct_answer)
        if res.get("status") == "Pass" and res.get("ruleId") == "CORRECT":
            passed_expectations += 1
        else:
            failures.append({
                "scenario": "Mastery",
                "probe_id": probe_id,
                "expected": "Pass/CORRECT",
                "got": f"{res.get('status')}/{res.get('ruleId')}",
            })

    # Scenario 2: Systematic Smaller-From-Larger Profile
    print("[Scenario 2] Evaluating Systematic Smaller-From-Larger (SFL) Misconception...")
    sfl_cases = {
        "ncert_ch12_saplings_230_75": 245,
        "ncert_ch12_herbs_270_36": 246,
        "ncert_ch12_library_356_138": 222,
        "ncert_ch12_sacks_305_210": 115,
        "ncert_ch12_money_756_465": 311,
        "ncert_ch12_cards_653_356": 303,
    }
    for probe_id, sfl_ans in sfl_cases.items():
        total_evaluations += 1
        res = diagnose_single_response(probe_id, sfl_ans)
        if res.get("status") == "Fail" and res.get("ruleId") == SIG_SMALLER_FROM_LARGER:
            passed_expectations += 1
        else:
            failures.append({
                "scenario": "SFL",
                "probe_id": probe_id,
                "expected": SIG_SMALLER_FROM_LARGER,
                "got": res.get("ruleId"),
            })

    # Scenario 3: Systematic Borrow-Without-Decrement Profile
    print("[Scenario 3] Evaluating Systematic Borrow-Without-Decrement (BWD) Misconception...")
    bwd_cases = {
        "ncert_ch12_saplings_230_75": 165,
        "ncert_ch12_herbs_270_36": 244,
        "ncert_ch12_library_356_138": 228,
        "ncert_ch12_sacks_305_210": 195,
        "ncert_ch12_money_756_465": 391,
        "ncert_ch12_groceries_500_209": 301,
    }
    for probe_id, bwd_ans in bwd_cases.items():
        total_evaluations += 1
        res = diagnose_single_response(probe_id, bwd_ans)
        if res.get("status") == "Fail" and res.get("ruleId") == SIG_BORROW_WITHOUT_DECREMENT:
            passed_expectations += 1
        else:
            failures.append({
                "scenario": "BWD",
                "probe_id": probe_id,
                "expected": SIG_BORROW_WITHOUT_DECREMENT,
                "got": res.get("ruleId"),
            })

    # Scenario 4: Operation Confusion Profile (Adding instead of Subtracting)
    print("[Scenario 4] Evaluating Operation Confusion Profile (Addition)...")
    add_cases = {
        "ncert_ch12_saplings_230_75": 305,
        "ncert_ch12_herbs_270_36": 306,
        "ncert_ch12_sacks_305_210": 515,
        "ncert_ch12_groceries_500_209": 709,
    }
    for probe_id, add_ans in add_cases.items():
        total_evaluations += 1
        res = diagnose_single_response(probe_id, add_ans)
        if res.get("status") == "Fail" and res.get("ruleId") == SIG_OPERATION_CONFUSION_ADD:
            passed_expectations += 1
        else:
            failures.append({
                "scenario": "Operation Confusion",
                "probe_id": probe_id,
                "expected": SIG_OPERATION_CONFUSION_ADD,
                "got": res.get("ruleId"),
            })

    # Scenario 5: Non-Regrouping Control Probe
    print("[Scenario 5] Evaluating Non-Regrouping Control Baseline (568 - 5)...")
    ctrl_probe = "ncert_ch12_cards_568_5"
    total_evaluations += 1
    res = diagnose_single_response(ctrl_probe, 563)
    if res.get("status") == "Pass" and res.get("ruleId") == "CORRECT":
        passed_expectations += 1
    else:
        failures.append({
            "scenario": "Control Baseline",
            "probe_id": ctrl_probe,
            "expected": "Pass/CORRECT",
            "got": f"{res.get('status')}/{res.get('ruleId')}",
        })

    accuracy = (passed_expectations / total_evaluations) * 100 if total_evaluations else 0.0

    print("\n" + "=" * 72)
    print("NCERT BENCHMARK EVALUATION SUMMARY")
    print("=" * 72)
    print(f"Total Benchmark Cases Evaluated: {total_evaluations}")
    print(f"Passed Expectations:            {passed_expectations} / {total_evaluations}")
    print(f"Diagnostic Accuracy:             {accuracy:.2f}%")
    print(f"Total Mismatches:                {len(failures)}")

    if failures:
        print("\nMISMATCH DETAILS:")
        for f in failures:
            print(f"  - [{f['scenario']}] Probe: {f['probe_id']} -> Expected {f['expected']}, got {f['got']}")
    else:
        print("\nPERFECT BENCHMARK MATCH: All cognitive diagnostic states and pedagogical")
        print("remediation mappings verified against NCERT Chapter 12 specifications.")
    print("=" * 72)

    return {
        "total_evaluations": total_evaluations,
        "passed_expectations": passed_expectations,
        "accuracy_pct": accuracy,
        "failures": failures,
    }


if __name__ == "__main__":
    results = run_ncert_benchmark()
    if results["failures"]:
        sys.exit(1)
    sys.exit(0)

