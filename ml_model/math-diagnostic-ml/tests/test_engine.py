"""Dedicated test suite for the deterministic diagnostic engine.

Phase 2 Testing:
Verifies:
1. Each approved signature with all five responses.
2. All-correct responses.
3. Missing responses (INSUFFICIENT_EVIDENCE).
4. Unknown probe IDs.
5. Strings, booleans, negative answers, and answers above 99.
6. Incorrect controls (AMBIGUOUS_PATTERN).
7. Inconsistent responses (AMBIGUOUS_PATTERN).
8. Collision-handling branch where both signatures match (AMBIGUOUS_PATTERN).
9. Output contract consistency between status, evidence, and hypothesis.
"""

from pathlib import Path
import sys
import unittest

# Ensure the 'src' directory is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from math_diagnostic.engine import (
    APPROVED_PROBES,
    SIG_BORROW_WITHOUT_DECREMENT,
    SIG_SMALLER_FROM_LARGER,
    STATUS_AMBIGUOUS_PATTERN,
    STATUS_INSUFFICIENT_EVIDENCE,
    STATUS_NO_TARGET_PATTERN_DETECTED,
    STATUS_SUPPORTED_HYPOTHESIS,
    calculate_signature_answer,
    diagnose_responses,
    resolve_classification,
)


class TestDiagnosticEngine(unittest.TestCase):
    """Test suite verifying diagnostic engine correctness and safety rules."""

    def test_all_correct_responses(self) -> None:
        """Verify that all correct answers yield NO_TARGET_PATTERN_DETECTED with all_correct=True."""
        responses = {
            "probe_01": 37,
            "probe_02": 34,
            "probe_03": 34,
            "ctrl_01": 35,
            "ctrl_02": 34,
        }
        result = diagnose_responses(responses)

        self.assertEqual(result["diagnostic_status"], STATUS_NO_TARGET_PATTERN_DETECTED)
        self.assertTrue(result["all_correct"])
        self.assertIsNone(result["observed_pattern_match"])
        self.assertIsNone(result["inferred_misconception"])
        self.assertIn("All 5 items (including controls) were answered correctly", result["summary"])

    def test_smaller_from_larger_supported(self) -> None:
        """Verify that SMALLER_FROM_LARGER pattern is identified when all probes match."""
        # probe_01: 61 - 24 -> 43
        # probe_02: 72 - 38 -> 46
        # probe_03: 83 - 49 -> 46
        # ctrl_01:  58 - 23 -> 35 (correct)
        # ctrl_02:  79 - 45 -> 34 (correct)
        responses = {
            "probe_01": 43,
            "probe_02": 46,
            "probe_03": 46,
            "ctrl_01": 35,
            "ctrl_02": 34,
        }
        result = diagnose_responses(responses)

        self.assertEqual(result["diagnostic_status"], STATUS_SUPPORTED_HYPOTHESIS)
        self.assertFalse(result["all_correct"])

        # Check observed pattern match
        pattern = result["observed_pattern_match"]
        self.assertIsNotNone(pattern)
        self.assertEqual(pattern["signature_id"], SIG_SMALLER_FROM_LARGER)
        self.assertEqual(pattern["probes_matching"], 3)
        self.assertEqual(pattern["controls_correct"], 2)
        self.assertEqual(pattern["supporting_problem_ids"], ["probe_01", "probe_02", "probe_03"])

        # Check inferred misconception separation
        hypothesis = result["inferred_misconception"]
        self.assertIsNotNone(hypothesis)
        self.assertIn("Smaller-From-Larger", hypothesis["candidate_category"])
        self.assertFalse(hypothesis["is_unique_explanation"])
        self.assertGreater(len(hypothesis["alternative_explanations"]), 0)
        self.assertIn("Tens-and-Ones Bundling Mat", hypothesis["teacher_review_guidance"]["suggested_hands_on_activity"])

    def test_borrow_without_decrement_supported(self) -> None:
        """Verify that BORROW_WITHOUT_DECREMENT pattern is identified when all probes match."""
        # probe_01: 61 - 24 -> 47 (correct is 37)
        # probe_02: 72 - 38 -> 44 (correct is 34)
        # probe_03: 83 - 49 -> 44 (correct is 34)
        # ctrl_01:  58 - 23 -> 35 (correct)
        # ctrl_02:  79 - 45 -> 34 (correct)
        responses = {
            "probe_01": 47,
            "probe_02": 44,
            "probe_03": 44,
            "ctrl_01": 35,
            "ctrl_02": 34,
        }
        result = diagnose_responses(responses)

        self.assertEqual(result["diagnostic_status"], STATUS_SUPPORTED_HYPOTHESIS)
        self.assertFalse(result["all_correct"])

        pattern = result["observed_pattern_match"]
        self.assertIsNotNone(pattern)
        self.assertEqual(pattern["signature_id"], SIG_BORROW_WITHOUT_DECREMENT)
        self.assertEqual(pattern["probes_matching"], 3)
        self.assertEqual(pattern["controls_correct"], 2)
        self.assertEqual(pattern["supporting_problem_ids"], ["probe_01", "probe_02", "probe_03"])

        hypothesis = result["inferred_misconception"]
        self.assertIsNotNone(hypothesis)
        self.assertIn("Borrow-Without-Decrement", hypothesis["candidate_category"])
        self.assertFalse(hypothesis["is_unique_explanation"])
        self.assertIn("The Banker's Exchange", hypothesis["teacher_review_guidance"]["suggested_hands_on_activity"])

    def test_calculate_signature_answer_direct(self) -> None:
        """Verify calculate_signature_answer behavior for controls and invalid signatures."""
        ctrl_probe = APPROVED_PROBES["ctrl_01"]
        self.assertIsNone(calculate_signature_answer(ctrl_probe, SIG_SMALLER_FROM_LARGER))
        self.assertIsNone(calculate_signature_answer(ctrl_probe, SIG_BORROW_WITHOUT_DECREMENT))

        regrouping_probe = APPROVED_PROBES["probe_01"]
        with self.assertRaises(ValueError) as ctx:
            calculate_signature_answer(regrouping_probe, "INVALID_SIGNATURE_ID")
        self.assertIn("Unknown signature ID", str(ctx.exception))

    def test_missing_responses_insufficient_evidence(self) -> None:
        """Verify that omitting required probes returns INSUFFICIENT_EVIDENCE."""
        incomplete_responses = {
            "probe_01": 43,
            "probe_02": 46,
            # probe_03 is missing
            "ctrl_01": 35,
            "ctrl_02": 34,
        }
        result = diagnose_responses(incomplete_responses)

        self.assertEqual(result["diagnostic_status"], STATUS_INSUFFICIENT_EVIDENCE)
        self.assertIn("probe_03", result["summary"])
        self.assertIsNone(result["observed_pattern_match"])
        self.assertIsNone(result["inferred_misconception"])

    def test_empty_responses_returns_insufficient_evidence(self) -> None:
        """Verify that passing an empty dictionary returns INSUFFICIENT_EVIDENCE."""
        empty_result = diagnose_responses({})
        self.assertEqual(empty_result["diagnostic_status"], STATUS_INSUFFICIENT_EVIDENCE)
        self.assertIsNone(empty_result["observed_pattern_match"])
        self.assertIsNone(empty_result["inferred_misconception"])
        self.assertIn("Missing 5 required probe(s)", empty_result["summary"])

    def test_unknown_probe_id_raises_value_error(self) -> None:
        """Verify that supplying an unrecognized probe ID raises ValueError."""
        responses = {
            "probe_01": 43,
            "probe_02": 46,
            "probe_03": 46,
            "ctrl_01": 35,
            "ctrl_02": 34,
            "mystery_probe": 42,
        }
        with self.assertRaises(ValueError) as ctx:
            diagnose_responses(responses)
        self.assertIn("Unknown probe ID 'mystery_probe'", str(ctx.exception))

    def test_invalid_types_rejected(self) -> None:
        """Verify that strings and booleans are strictly rejected with TypeError."""
        # String rejection
        with self.assertRaises(TypeError):
            diagnose_responses({"probe_01": "43"})

        # Boolean True rejection (despite bool being a subclass of int in Python)
        with self.assertRaises(TypeError):
            diagnose_responses({"probe_01": True})

        # Boolean False rejection
        with self.assertRaises(TypeError):
            diagnose_responses({"probe_01": False})

        # Float rejection
        with self.assertRaises(TypeError):
            diagnose_responses({"probe_01": 43.0})

    def test_out_of_range_answers_raise_value_error(self) -> None:
        """Verify that answers < 0 or > 99 raise ValueError."""
        with self.assertRaises(ValueError):
            diagnose_responses({"probe_01": -1})

        with self.assertRaises(ValueError):
            diagnose_responses({"probe_01": 100})

    def test_incorrect_controls_yields_ambiguous_pattern(self) -> None:
        """Verify that failing control problems yields AMBIGUOUS_PATTERN."""
        # Even if regrouping answers match SMALLER_FROM_LARGER,
        # failing a control means we cannot safely diagnose regrouping misconceptions.
        responses = {
            "probe_01": 43,
            "probe_02": 46,
            "probe_03": 46,
            "ctrl_01": 99,  # Incorrect (correct is 35)
            "ctrl_02": 34,
        }
        result = diagnose_responses(responses)

        self.assertEqual(result["diagnostic_status"], STATUS_AMBIGUOUS_PATTERN)
        self.assertIsNone(result["observed_pattern_match"])
        self.assertIn("Control problem(s) were answered incorrectly", result["summary"])

    def test_inconsistent_responses_yields_ambiguous_pattern(self) -> None:
        """Verify that mixed responses (e.g. 1 SFL, 1 BWD, 1 correct) yield AMBIGUOUS_PATTERN."""
        responses = {
            "probe_01": 43,  # Matches SFL
            "probe_02": 44,  # Matches BWD
            "probe_03": 34,  # Correct answer
            "ctrl_01": 35,  # Correct
            "ctrl_02": 34,  # Correct
        }
        result = diagnose_responses(responses)

        self.assertEqual(result["diagnostic_status"], STATUS_AMBIGUOUS_PATTERN)
        self.assertIsNone(result["observed_pattern_match"])
        self.assertIn("Ambiguous pattern", result["summary"])

    def test_unmodeled_errors_yield_no_target_pattern_detected(self) -> None:
        """Verify that arbitrary calculation errors that do not match modeled patterns return NO_TARGET_PATTERN_DETECTED."""
        # Controls are correct, but student answers random slips not matching SFL or BWD
        responses = {
            "probe_01": 10,
            "probe_02": 20,
            "probe_03": 30,
            "ctrl_01": 35,
            "ctrl_02": 34,
        }
        result = diagnose_responses(responses)

        self.assertEqual(result["diagnostic_status"], STATUS_NO_TARGET_PATTERN_DETECTED)
        self.assertFalse(result["all_correct"])
        self.assertIsNone(result["observed_pattern_match"])
        self.assertIn("WARNING: This does not imply mastery", result["summary"])

    def test_collision_handling_branch(self) -> None:
        """Verify that resolve_classification handles the collision branch safely.

        Note on mathematical collision:
        Under our approved probe set, $u_S - u_M \neq 5$ on all items (differences are 3, 6, and 6),
        meaning SMALLER_FROM_LARGER and BORROW_WITHOUT_DECREMENT can never produce identical answers.
        To test the engine's collision safety rule without altering the approved probe values,
        we test resolve_classification directly with both signatures matching.
        """
        status, matched_sig = resolve_classification(
            sfl_match_count=3,
            bwd_match_count=3,
            regrouping_total=3,
            controls_correct=True,
            all_correct=False,
        )
        self.assertEqual(status, STATUS_AMBIGUOUS_PATTERN)
        self.assertIsNone(matched_sig)

    def test_output_contract_consistency(self) -> None:
        """Verify output contract structure, prototype label, and educational disclaimers."""
        responses = {
            "probe_01": 43,
            "probe_02": 46,
            "probe_03": 46,
            "ctrl_01": 35,
            "ctrl_02": 34,
        }
        result = diagnose_responses(responses)

        self.assertIn("engine_version", result)
        self.assertIn("diagnostic_status", result)
        self.assertIn("all_correct", result)
        self.assertIn("summary", result)
        self.assertIn("observed_pattern_match", result)
        self.assertIn("inferred_misconception", result)
        self.assertIn("disclaimer", result)
        self.assertIn("PROTOTYPE ONLY", result["disclaimer"])
        self.assertIn("Synthetic and software tests do not establish educational validity", result["disclaimer"])


if __name__ == "__main__":
    unittest.main()
