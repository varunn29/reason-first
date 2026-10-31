"""Unit tests verifying evidence-based diagnostic reasoning, session assessment,
reasoning reconciliation, and reassessment progress tracking.
"""

import unittest
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from math_diagnostic.engine import (
    EVIDENCE_MODERATE,
    EVIDENCE_NONE,
    EVIDENCE_STRONG,
    EVIDENCE_WEAK,
    INTERVENTION_CATALOGUE,
    MASTERY_DEVELOPING,
    MASTERY_INSUFFICIENT_EVIDENCE,
    MASTERY_NOT_ASSESSED,
    MASTERY_PROVISIONALLY_SECURE,
    MASTERY_SECURE,
    PREREQUISITE_GRAPH,
    SIG_BORROW_WITHOUT_DECREMENT,
    SIG_SMALLER_FROM_LARGER,
    STATUS_AMBIGUOUS_PATTERN,
    STATUS_CANDIDATE_MISCONCEPTION,
    STATUS_CONTRADICTED_HYPOTHESIS,
    STATUS_INSUFFICIENT_EVIDENCE,
    STATUS_NO_TARGET_PATTERN_DETECTED,
    STATUS_SUPPORTED_HYPOTHESIS,
    compare_reassessment,
    diagnose_responses,
    diagnose_session,
    diagnose_single_response,
    reconcile_reasoning,
)


class TestEvidenceReasoning(unittest.TestCase):
    """Test suite validating evidence levels, reasoning reconciliation, and session integrity."""

    def test_single_response_does_not_declare_high_confidence_mastery(self):
        """Rule: A single correct answer must NOT establish mastery with HIGH confidence."""
        res = diagnose_single_response("probe_01", 37)
        self.assertEqual(res["status"], "Pass")
        self.assertEqual(res["confidence"], "LOW")
        self.assertEqual(res["evidence_strength"], EVIDENCE_WEAK)
        self.assertEqual(res["mastery_status"], MASTERY_INSUFFICIENT_EVIDENCE)
        self.assertIn("preliminary evidence only", res["observations"])

    def test_single_error_does_not_declare_high_confidence_misconception(self):
        """Rule: A single incorrect answer must NOT establish a misconception as a established fact."""
        res = diagnose_single_response("probe_01", 43)
        self.assertEqual(res["status"], "Fail")
        self.assertEqual(res["ruleId"], SIG_SMALLER_FROM_LARGER)
        self.assertEqual(res["diagnostic_status"], STATUS_CANDIDATE_MISCONCEPTION)
        self.assertEqual(res["confidence"], "LOW")
        self.assertEqual(res["evidence_strength"], EVIDENCE_WEAK)
        self.assertIn("candidate", res["observations"].lower())

    def test_session_incomplete_returns_insufficient_evidence(self):
        """Rule: Empty or incomplete sessions return INSUFFICIENT_EVIDENCE."""
        empty_session = {"session_id": "s_empty", "student_id": "stu_1", "responses": []}
        res = diagnose_session(empty_session)
        self.assertEqual(res["diagnostic_status"], STATUS_INSUFFICIENT_EVIDENCE)
        self.assertEqual(res["evidence_strength"], EVIDENCE_NONE)
        self.assertFalse(res["all_correct"])

    def test_session_multi_probe_supported_hypothesis(self):
        """Rule: Consistent errors across regrouping probes with correct controls support hypothesis."""
        session_data = {
            "session_id": "s_sfl_01",
            "student_id": "stu_rahul",
            "responses": [
                {"question_id": "probe_01", "answer": 43},
                {"question_id": "probe_02", "answer": 46},
                {"question_id": "probe_03", "answer": 46},
                {"question_id": "ctrl_01", "answer": 35},
                {"question_id": "ctrl_02", "answer": 34},
            ]
        }
        res = diagnose_session(session_data)
        self.assertEqual(res["diagnostic_status"], STATUS_SUPPORTED_HYPOTHESIS)
        self.assertEqual(res["candidate_misconception"], SIG_SMALLER_FROM_LARGER)
        self.assertEqual(res["evidence_strength"], EVIDENCE_STRONG)
        self.assertEqual(res["related_prerequisite_skill"]["id"], "PLACE_VALUE_BUNDLES")
        self.assertIsNotNone(res["recommended_intervention"])
        self.assertEqual(res["recommended_intervention"]["target_skill"], "ONES_REGROUPING")

    def test_reasoning_reconciliation_supports_hypothesis(self):
        """Rule: Verbal explanation matching arithmetic inversion upgrades candidate to supported."""
        initial = {
            "ruleId": SIG_SMALLER_FROM_LARGER,
            "candidate_misconception": SIG_SMALLER_FROM_LARGER,
            "diagnostic_status": STATUS_CANDIDATE_MISCONCEPTION,
            "evidence_strength": EVIDENCE_WEAK,
            "supporting_evidence": ["Distractor 43 matches SFL rule."],
        }
        # Student explains in Hindi: "4 me se 1 ghataya aur 3 likha" (subtracted 4 from 1)
        reconciled = reconcile_reasoning(initial, "maine 4 me se 1 ghataya aur 3 likha")
        self.assertEqual(reconciled["diagnostic_status"], STATUS_SUPPORTED_HYPOTHESIS)
        self.assertEqual(reconciled["evidence_strength"], EVIDENCE_STRONG)
        self.assertEqual(reconciled["reasoning_alignment"], "SUPPORTS_HYPOTHESIS")
        self.assertEqual(reconciled["confidence"], "HIGH")

    def test_reasoning_reconciliation_uncertain_preserves_insufficient_evidence(self):
        """Rule: Student stating 'I don't know' / 'pata nahi' keeps inconclusive status."""
        initial = {
            "ruleId": SIG_SMALLER_FROM_LARGER,
            "candidate_misconception": SIG_SMALLER_FROM_LARGER,
            "diagnostic_status": STATUS_CANDIDATE_MISCONCEPTION,
            "evidence_strength": EVIDENCE_WEAK,
        }
        reconciled = reconcile_reasoning(initial, "mujhe nahi pata maine andaza lagaya")
        self.assertEqual(reconciled["diagnostic_status"], STATUS_INSUFFICIENT_EVIDENCE)
        self.assertEqual(reconciled["reasoning_alignment"], "UNCERTAIN_OR_GUESS")
        self.assertEqual(reconciled["confidence"], "LOW")

    def test_reasoning_reconciliation_contradiction(self):
        """Rule: Student explaining correct regrouping contradicts Smaller-From-Larger."""
        initial = {
            "ruleId": SIG_SMALLER_FROM_LARGER,
            "candidate_misconception": SIG_SMALLER_FROM_LARGER,
            "diagnostic_status": STATUS_CANDIDATE_MISCONCEPTION,
            "evidence_strength": EVIDENCE_WEAK,
        }
        reconciled = reconcile_reasoning(initial, "I borrowed 1 from tens, so 1 became 11, then 11 - 4 is 7")
        self.assertEqual(reconciled["diagnostic_status"], STATUS_CONTRADICTED_HYPOTHESIS)
        self.assertEqual(reconciled["reasoning_alignment"], "CONTRADICTS_HYPOTHESIS")

    def test_prerequisite_graph_relationships(self):
        """Rule: Explicit DAG relationships for foundational subtraction."""
        self.assertIn("SINGLE_DIGIT_FACTS", PREREQUISITE_GRAPH)
        self.assertIn("PLACE_VALUE_BUNDLES", PREREQUISITE_GRAPH)
        self.assertIn("ONES_REGROUPING", PREREQUISITE_GRAPH)
        self.assertIn("PLACE_VALUE_BUNDLES", PREREQUISITE_GRAPH["ONES_REGROUPING"]["prerequisites"])

    def test_reassessment_progress_comparison(self):
        """Rule: Pre/post comparison reports observational improvement without unsupported causation."""
        pre = {
            "diagnostic_status": STATUS_SUPPORTED_HYPOTHESIS,
            "candidate_misconception": SIG_SMALLER_FROM_LARGER,
            "evidence_strength": EVIDENCE_STRONG,
        }
        post = {
            "diagnostic_status": STATUS_NO_TARGET_PATTERN_DETECTED,
            "all_correct": True,
            "status": "Pass",
            "candidate_misconception": None,
        }
        comp = compare_reassessment(pre, post)
        self.assertEqual(comp["misconception_trend"], "RESOLVED")
        self.assertEqual(comp["comparison_outcome"], "IMPROVEMENT_OBSERVED")
        self.assertIn("Improvement observed after intervention", comp["teacher_summary"])
        self.assertNotIn("proved successful", comp["teacher_summary"])


if __name__ == "__main__":
    unittest.main()

