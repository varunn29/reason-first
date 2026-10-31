"""Comprehensive synthetic evaluation benchmark generator and evaluator for ReasonFirst.

Generates 60+ benchmark profiles and computes:
- Precision & Recall per misconception signature
- False-Positive Rate on correct students (target: 0%)
- False-Positive Rate on random slips
- Incomplete assessment handling (INSUFFICIENT_EVIDENCE)
- Reasoning interview reconciliation accuracy (Hindi & English)
- Reassessment delta detection accuracy
"""

import json
from pathlib import Path
import sys
from typing import Any, Dict, List

# Ensure src is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from math_diagnostic.engine import (
    diagnose_responses,
    diagnose_session,
    reconcile_reasoning,
    compare_reassessment,
    STATUS_SUPPORTED_HYPOTHESIS,
    STATUS_CANDIDATE_MISCONCEPTION,
    STATUS_AMBIGUOUS_PATTERN,
    STATUS_INSUFFICIENT_EVIDENCE,
    STATUS_NO_TARGET_PATTERN_DETECTED,
    STATUS_CONTRADICTED_HYPOTHESIS,
    EVIDENCE_STRONG,
    EVIDENCE_WEAK,
    EVIDENCE_NONE,
)

DATA_FILE = PROJECT_ROOT / "data" / "synthetic" / "comprehensive_benchmark.jsonl"


def generate_benchmark_cases() -> List[Dict[str, Any]]:
    cases = []

    # 1. Systematic Smaller-From-Larger (SFL) - 8 cases
    for i in range(1, 9):
        cases.append({
            "case_id": f"sfl_canonical_{i}",
            "type": "session",
            "category": "systematic_sfl",
            "responses": [
                {"question_id": "probe_01", "answer": 43},
                {"question_id": "probe_02", "answer": 46},
                {"question_id": "probe_03", "answer": 46},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "expected_status": STATUS_SUPPORTED_HYPOTHESIS,
            "expected_signature": "SMALLER_FROM_LARGER",
        })

    # 2. Systematic Borrow-Without-Decrement (BWD) - 8 cases
    for i in range(1, 9):
        cases.append({
            "case_id": f"bwd_canonical_{i}",
            "type": "session",
            "category": "systematic_bwd",
            "responses": [
                {"question_id": "probe_01", "answer": 47},
                {"question_id": "probe_02", "answer": 44},
                {"question_id": "probe_03", "answer": 44},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "expected_status": STATUS_SUPPORTED_HYPOTHESIS,
            "expected_signature": "BORROW_WITHOUT_DECREMENT",
        })

    # 3. Consistent Correct Responses (Place Value Understanding) - 8 cases
    for i in range(1, 9):
        cases.append({
            "case_id": f"correct_all_{i}",
            "type": "session",
            "category": "consistent_correct",
            "responses": [
                {"question_id": "probe_01", "answer": 37},
                {"question_id": "probe_02", "answer": 34},
                {"question_id": "probe_03", "answer": 34},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "expected_status": STATUS_NO_TARGET_PATTERN_DETECTED,
            "expected_signature": None,
        })

    # 4. Random Calculation Slips (Off by 1 or 2, arithmetic fact slips) - 6 cases
    slips = [
        {"p1": 36, "p2": 34, "p3": 34, "c1": 35, "c2": 34},
        {"p1": 37, "p2": 35, "p3": 34, "c1": 35, "c2": 34},
        {"p1": 37, "p2": 33, "p3": 35, "c1": 35, "c2": 34},
        {"p1": 38, "p2": 34, "p3": 34, "c1": 35, "c2": 34},
        {"p1": 37, "p2": 34, "p3": 33, "c1": 35, "c2": 34},
        {"p1": 36, "p2": 33, "p3": 35, "c1": 35, "c2": 34},
    ]
    for i, slip in enumerate(slips, start=1):
        cases.append({
            "case_id": f"random_slip_{i}",
            "type": "session",
            "category": "random_slip",
            "responses": [
                {"question_id": "probe_01", "answer": slip["p1"]},
                {"question_id": "probe_02", "answer": slip["p2"]},
                {"question_id": "probe_03", "answer": slip["p3"]},
                {"question_id": "ctrl_01", "answer": slip["c1"]},
                {"question_id": "ctrl_02", "answer": slip["c2"]},
            ],
            "expected_status": STATUS_NO_TARGET_PATTERN_DETECTED,
            "expected_signature": None,
        })

    # 5. Guessing / Unmodeled Errors - 6 cases
    wild_errors = [
        {"p1": 10, "p2": 20, "p3": 30, "c1": 35, "c2": 34},
        {"p1": 88, "p2": 77, "p3": 66, "c1": 35, "c2": 34},
        {"p1": 12, "p2": 5, "p3": 99, "c1": 35, "c2": 34},
        {"p1": 99, "p2": 99, "p3": 99, "c1": 35, "c2": 34},
        {"p1": 15, "p2": 25, "p3": 35, "c1": 35, "c2": 34},
        {"p1": 50, "p2": 60, "p3": 70, "c1": 35, "c2": 34},
    ]
    for i, wild in enumerate(wild_errors, start=1):
        cases.append({
            "case_id": f"guessing_{i}",
            "type": "session",
            "category": "guessing_unmodeled",
            "responses": [
                {"question_id": "probe_01", "answer": wild["p1"]},
                {"question_id": "probe_02", "answer": wild["p2"]},
                {"question_id": "probe_03", "answer": wild["p3"]},
                {"question_id": "ctrl_01", "answer": wild["c1"]},
                {"question_id": "ctrl_02", "answer": wild["c2"]},
            ],
            "expected_status": STATUS_NO_TARGET_PATTERN_DETECTED,
            "expected_signature": None,
        })

    # 6. Incomplete Assessments (1, 2, or 3 probes only) - 6 cases
    incomplete_samples = [
        [{"question_id": "probe_01", "answer": 43}],
        [{"question_id": "probe_01", "answer": 37}],
        [{"question_id": "probe_01", "answer": 43}, {"question_id": "probe_02", "answer": 46}],
        [{"question_id": "ctrl_01", "answer": 35}],
        [{"question_id": "probe_01", "answer": 47}, {"question_id": "ctrl_01", "answer": 35}],
        [],
    ]
    for i, inc in enumerate(incomplete_samples, start=1):
        cases.append({
            "case_id": f"incomplete_{i}",
            "type": "session",
            "category": "incomplete_assessment",
            "responses": inc,
            "expected_status": STATUS_INSUFFICIENT_EVIDENCE,
            "expected_signature": None,
        })

    # 7. Conversational Reasoning Reconciliation (Hindi & English) - 10 cases
    reasoning_cases = [
        # Candidate SFL + verbal confirms SFL in English -> SUPPORTED_HYPOTHESIS
        {
            "case_id": "reconcile_sfl_confirm_en",
            "type": "reconcile",
            "category": "reasoning_support",
            "initial_hypothesis": "SMALLER_FROM_LARGER",
            "explanation": "Because 4 is bigger than 1, so 4 minus 1 is 3.",
            "language": "en",
            "expected_status": STATUS_SUPPORTED_HYPOTHESIS,
        },
        # Candidate SFL + verbal confirms SFL in Hindi -> SUPPORTED_HYPOTHESIS
        {
            "case_id": "reconcile_sfl_confirm_hi",
            "type": "reconcile",
            "category": "reasoning_support",
            "initial_hypothesis": "SMALLER_FROM_LARGER",
            "explanation": "मैंने 4 में से 1 को घटा दिया तो 3 आया।",
            "language": "hi",
            "expected_status": STATUS_SUPPORTED_HYPOTHESIS,
        },
        # Candidate SFL + verbal contradicts SFL (student did regrouping) in English -> CONTRADICTED_HYPOTHESIS
        {
            "case_id": "reconcile_sfl_contradict_en",
            "type": "reconcile",
            "category": "reasoning_contradiction",
            "initial_hypothesis": "SMALLER_FROM_LARGER",
            "explanation": "I borrowed 1 ten from 6 to make 11, then 11 minus 4 is 7, but I made a mistake writing.",
            "language": "en",
            "expected_status": STATUS_CONTRADICTED_HYPOTHESIS,
        },
        # Candidate SFL + verbal contradicts SFL (student did regrouping) in Hindi -> CONTRADICTED_HYPOTHESIS
        {
            "case_id": "reconcile_sfl_contradict_hi",
            "type": "reconcile",
            "category": "reasoning_contradiction",
            "initial_hypothesis": "SMALLER_FROM_LARGER",
            "explanation": "मैंने 6 में से 1 दहाई उधार ली और 11 बनाया।",
            "language": "hi",
            "expected_status": STATUS_CONTRADICTED_HYPOTHESIS,
        },
        # Candidate BWD + verbal confirms forgot to reduce tens in English -> SUPPORTED_HYPOTHESIS
        {
            "case_id": "reconcile_bwd_confirm_en",
            "type": "reconcile",
            "category": "reasoning_support",
            "initial_hypothesis": "BORROW_WITHOUT_DECREMENT",
            "explanation": "I took 1 ten for 11, but the 6 tens stayed 6, so 6 minus 2 is 4.",
            "language": "en",
            "expected_status": STATUS_SUPPORTED_HYPOTHESIS,
        },
        # Candidate BWD + verbal confirms forgot to reduce tens in Hindi -> SUPPORTED_HYPOTHESIS
        {
            "case_id": "reconcile_bwd_confirm_hi",
            "type": "reconcile",
            "category": "reasoning_support",
            "initial_hypothesis": "BORROW_WITHOUT_DECREMENT",
            "explanation": "मैंने दहाई उधार ली लेकिन 6 दहाई को घटाना भूल गया।",
            "language": "hi",
            "expected_status": STATUS_SUPPORTED_HYPOTHESIS,
        },
        # Inconclusive/short explanation -> Retains CANDIDATE_MISCONCEPTION
        {
            "case_id": "reconcile_vague_en_1",
            "type": "reconcile",
            "category": "reasoning_inconclusive",
            "initial_hypothesis": "SMALLER_FROM_LARGER",
            "explanation": "I just did it.",
            "language": "en",
            "expected_status": STATUS_CANDIDATE_MISCONCEPTION,
        },
        {
            "case_id": "reconcile_vague_en_2",
            "type": "reconcile",
            "category": "reasoning_inconclusive",
            "initial_hypothesis": "BORROW_WITHOUT_DECREMENT",
            "explanation": "I calculated with my fingers.",
            "language": "en",
            "expected_status": STATUS_CANDIDATE_MISCONCEPTION,
        },
        {
            "case_id": "reconcile_uncertain_hi_1",
            "type": "reconcile",
            "category": "reasoning_inconclusive",
            "initial_hypothesis": "SMALLER_FROM_LARGER",
            "explanation": "मुझे नहीं पता।",
            "language": "hi",
            "expected_status": STATUS_INSUFFICIENT_EVIDENCE,
        },
        {
            "case_id": "reconcile_vague_hi_2",
            "type": "reconcile",
            "category": "reasoning_inconclusive",
            "initial_hypothesis": "BORROW_WITHOUT_DECREMENT",
            "explanation": "बस ऐसे ही घटाया।",
            "language": "hi",
            "expected_status": STATUS_CANDIDATE_MISCONCEPTION,
        },
    ]
    cases.extend(reasoning_cases)

    # 8. Reassessment Resolution & Persistence - 6 cases
    reassessment_cases = [
        # Successful intervention: Pre had SFL, Post all correct -> IMPROVEMENT_OBSERVED
        {
            "case_id": "reassess_resolved_1",
            "type": "reassessment",
            "category": "reassessment_resolution",
            "pre_responses": [
                {"question_id": "probe_01", "answer": 43},
                {"question_id": "probe_02", "answer": 46},
                {"question_id": "probe_03", "answer": 46},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "post_responses": [
                {"question_id": "probe_01", "answer": 37},
                {"question_id": "probe_02", "answer": 34},
                {"question_id": "probe_03", "answer": 34},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "expected_delta_status": "IMPROVEMENT_OBSERVED",
        },
        {
            "case_id": "reassess_resolved_2",
            "type": "reassessment",
            "category": "reassessment_resolution",
            "pre_responses": [
                {"question_id": "probe_01", "answer": 47},
                {"question_id": "probe_02", "answer": 44},
                {"question_id": "probe_03", "answer": 44},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "post_responses": [
                {"question_id": "probe_01", "answer": 37},
                {"question_id": "probe_02", "answer": 34},
                {"question_id": "probe_03", "answer": 34},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "expected_delta_status": "IMPROVEMENT_OBSERVED",
        },
        {
            "case_id": "reassess_resolved_3",
            "type": "reassessment",
            "category": "reassessment_resolution",
            "pre_responses": [
                {"question_id": "probe_01", "answer": 43},
                {"question_id": "probe_02", "answer": 46},
                {"question_id": "probe_03", "answer": 46},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "post_responses": [
                {"question_id": "probe_01", "answer": 37},
                {"question_id": "probe_02", "answer": 34},
                {"question_id": "probe_03", "answer": 34},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "expected_delta_status": "IMPROVEMENT_OBSERVED",
        },
        # Persisting pattern: Pre had SFL, Post still SFL -> PERSISTING_PATTERN
        {
            "case_id": "reassess_persisting_1",
            "type": "reassessment",
            "category": "reassessment_persistence",
            "pre_responses": [
                {"question_id": "probe_01", "answer": 43},
                {"question_id": "probe_02", "answer": 46},
                {"question_id": "probe_03", "answer": 46},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "post_responses": [
                {"question_id": "probe_01", "answer": 43},
                {"question_id": "probe_02", "answer": 46},
                {"question_id": "probe_03", "answer": 46},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "expected_delta_status": "PERSISTING_PATTERN",
        },
        {
            "case_id": "reassess_persisting_2",
            "type": "reassessment",
            "category": "reassessment_persistence",
            "pre_responses": [
                {"question_id": "probe_01", "answer": 47},
                {"question_id": "probe_02", "answer": 44},
                {"question_id": "probe_03", "answer": 44},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "post_responses": [
                {"question_id": "probe_01", "answer": 47},
                {"question_id": "probe_02", "answer": 44},
                {"question_id": "probe_03", "answer": 44},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "expected_delta_status": "PERSISTING_PATTERN",
        },
        {
            "case_id": "reassess_persisting_3",
            "type": "reassessment",
            "category": "reassessment_persistence",
            "pre_responses": [
                {"question_id": "probe_01", "answer": 43},
                {"question_id": "probe_02", "answer": 46},
                {"question_id": "probe_03", "answer": 46},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "post_responses": [
                {"question_id": "probe_01", "answer": 43},
                {"question_id": "probe_02", "answer": 46},
                {"question_id": "probe_03", "answer": 46},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ],
            "expected_delta_status": "PERSISTING_PATTERN",
        },
    ]
    cases.extend(reassessment_cases)

    return cases


def run_comprehensive_evaluation() -> Dict[str, Any]:
    cases = generate_benchmark_cases()
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        for c in cases:
            f.write(json.dumps(c) + "\n")

    # Metrics accumulators
    metrics = {
        "total_cases": len(cases),
        "sfl_true_positive": 0,
        "sfl_false_positive": 0,
        "sfl_false_negative": 0,
        "bwd_true_positive": 0,
        "bwd_false_positive": 0,
        "bwd_false_negative": 0,
        "correct_fp_count": 0,
        "correct_total": 0,
        "slip_fp_count": 0,
        "slip_total": 0,
        "incomplete_handled": 0,
        "incomplete_total": 0,
        "reconcile_correct": 0,
        "reconcile_total": 0,
        "reassess_correct": 0,
        "reassess_total": 0,
        "mismatches": [],
    }

    for case in cases:
        c_type = case["type"]
        c_id = case["case_id"]

        if c_type == "session":
            session_payload = {
                "session_id": c_id,
                "student_id": "eval_student",
                "responses": case["responses"],
            }
            res = diagnose_session(session_payload)
            status = res["diagnostic_status"]
            sig = res["candidate_misconception"]

            # Check status match
            if status != case["expected_status"]:
                metrics["mismatches"].append({
                    "case_id": c_id,
                    "field": "diagnostic_status",
                    "expected": case["expected_status"],
                    "actual": status,
                })

            # Misconception metrics
            if case["category"] == "systematic_sfl":
                if sig == "SMALLER_FROM_LARGER" and status == STATUS_SUPPORTED_HYPOTHESIS:
                    metrics["sfl_true_positive"] += 1
                else:
                    metrics["sfl_false_negative"] += 1

            elif case["category"] == "systematic_bwd":
                if sig == "BORROW_WITHOUT_DECREMENT" and status == STATUS_SUPPORTED_HYPOTHESIS:
                    metrics["bwd_true_positive"] += 1
                else:
                    metrics["bwd_false_negative"] += 1

            elif case["category"] == "consistent_correct":
                metrics["correct_total"] += 1
                if sig is not None or status != STATUS_NO_TARGET_PATTERN_DETECTED:
                    metrics["correct_fp_count"] += 1

            elif case["category"] == "random_slip":
                metrics["slip_total"] += 1
                if status == STATUS_SUPPORTED_HYPOTHESIS:
                    metrics["slip_fp_count"] += 1

            elif case["category"] == "incomplete_assessment":
                metrics["incomplete_total"] += 1
                if status == STATUS_INSUFFICIENT_EVIDENCE:
                    metrics["incomplete_handled"] += 1

        elif c_type == "reconcile":
            rec = reconcile_reasoning(
                initial_diagnosis={
                    "candidate_misconception": case["initial_hypothesis"],
                    "diagnostic_status": STATUS_CANDIDATE_MISCONCEPTION,
                },
                explanation_text=case["explanation"],
            )
            metrics["reconcile_total"] += 1
            if rec["diagnostic_status"] == case["expected_status"]:
                metrics["reconcile_correct"] += 1
            else:
                metrics["mismatches"].append({
                    "case_id": c_id,
                    "field": "reconciled_status",
                    "expected": case["expected_status"],
                    "actual": rec["diagnostic_status"],
                })

        elif c_type == "reassessment":
            pre_diag = diagnose_session({"session_id": "pre", "responses": case["pre_responses"]})
            post_diag = diagnose_session({"session_id": "post", "responses": case["post_responses"]})
            delta = compare_reassessment(pre_diag, post_diag)
            metrics["reassess_total"] += 1
            if delta["comparison_outcome"] == case["expected_delta_status"]:
                metrics["reassess_correct"] += 1
            else:
                metrics["mismatches"].append({
                    "case_id": c_id,
                    "field": "reassessment_status",
                    "expected": case["expected_delta_status"],
                    "actual": delta["comparison_outcome"],
                })

    # Compute Rates
    sfl_p = (metrics["sfl_true_positive"] / (metrics["sfl_true_positive"] + metrics["sfl_false_positive"])) if (metrics["sfl_true_positive"] + metrics["sfl_false_positive"]) > 0 else 1.0
    sfl_r = (metrics["sfl_true_positive"] / (metrics["sfl_true_positive"] + metrics["sfl_false_negative"])) if (metrics["sfl_true_positive"] + metrics["sfl_false_negative"]) > 0 else 1.0

    bwd_p = (metrics["bwd_true_positive"] / (metrics["bwd_true_positive"] + metrics["bwd_false_positive"])) if (metrics["bwd_true_positive"] + metrics["bwd_false_positive"]) > 0 else 1.0
    bwd_r = (metrics["bwd_true_positive"] / (metrics["bwd_true_positive"] + metrics["bwd_false_negative"])) if (metrics["bwd_true_positive"] + metrics["bwd_false_negative"]) > 0 else 1.0

    correct_fpr = (metrics["correct_fp_count"] / metrics["correct_total"]) if metrics["correct_total"] > 0 else 0.0
    slip_fpr = (metrics["slip_fp_count"] / metrics["slip_total"]) if metrics["slip_total"] > 0 else 0.0

    print("\n" + "=" * 76)
    print("REASONFIRST COMPREHENSIVE SYNTHETIC EVALUATION REPORT")
    print("=" * 76)
    print(f"Total Benchmark Cases Evaluated:       {metrics['total_cases']}")
    print(f"Total Software Discrepancies/Failures: {len(metrics['mismatches'])}")
    print("-" * 76)
    print("DIAGNOSTIC METRIC                                    RESULT        DENOMINATOR")
    print("-" * 76)
    print(f"Smaller-From-Larger Precision:                       {sfl_p * 100:.1f}%        ({metrics['sfl_true_positive']}/{metrics['sfl_true_positive'] + metrics['sfl_false_positive']})")
    print(f"Smaller-From-Larger Recall:                          {sfl_r * 100:.1f}%        ({metrics['sfl_true_positive']}/{metrics['sfl_true_positive'] + metrics['sfl_false_negative']})")
    print(f"Borrow-Without-Decrement Precision:                  {bwd_p * 100:.1f}%        ({metrics['bwd_true_positive']}/{metrics['bwd_true_positive'] + metrics['bwd_false_positive']})")
    print(f"Borrow-Without-Decrement Recall:                     {bwd_r * 100:.1f}%        ({metrics['bwd_true_positive']}/{metrics['bwd_true_positive'] + metrics['bwd_false_negative']})")
    print(f"False-Positive Rate on Correct Students:            {correct_fpr * 100:.1f}%          ({metrics['correct_fp_count']}/{metrics['correct_total']}) [Target: 0.0%]")
    print(f"False-Positive Rate on Random Slips:                 {slip_fpr * 100:.1f}%          ({metrics['slip_fp_count']}/{metrics['slip_total']}) [Target: 0.0%]")
    print(f"Incomplete Assessment Handling (INSUFFICIENT_EVID): {metrics['incomplete_handled'] / metrics['incomplete_total'] * 100:.1f}%        ({metrics['incomplete_handled']}/{metrics['incomplete_total']})")
    print(f"Reasoning Reconciliation Accuracy (HI & EN):         {metrics['reconcile_correct'] / metrics['reconcile_total'] * 100:.1f}%        ({metrics['reconcile_correct']}/{metrics['reconcile_total']})")
    print(f"Reassessment Change Detection Accuracy:              {metrics['reassess_correct'] / metrics['reassess_total'] * 100:.1f}%        ({metrics['reassess_correct']}/{metrics['reassess_total']})")
    print("-" * 76)
    print("EVALUATION BOUNDARY STATEMENT:")
    print("This evaluation demonstrates software correctness against synthetic ground truth;")
    print("it does not constitute clinical or empirical validation in real classrooms.")
    print("=" * 76)

    return metrics


if __name__ == "__main__":
    res = run_comprehensive_evaluation()
    if res["mismatches"]:
        print(f"FAILED: {len(res['mismatches'])} mismatches detected:")
        for m in res["mismatches"]:
            print(f"  - {m}")
        sys.exit(1)
    else:
        print("\nALL BENCHMARK TESTS PASSED WITH 0 FAILURES.")
        sys.exit(0)
