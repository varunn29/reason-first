"""Deterministic, explainable diagnostic engine for two-digit subtraction with regrouping.

Phase 2 Implementation:
Analyzes student responses to a curated 5-probe assessment set and identifies
whether observed errors systematically match candidate mathematical error signatures.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Mapping, Optional, Tuple


@dataclass(frozen=True)
class SubtractionProbe:
    """Represents a two-digit subtraction problem probe."""

    probe_id: str
    minuend: int
    subtrahend: int
    is_regrouping: bool

    @property
    def correct_answer(self) -> int:
        """Mathematically correct difference."""
        return self.minuend - self.subtrahend

    @property
    def minuend_tens(self) -> int:
        return self.minuend // 10

    @property
    def minuend_ones(self) -> int:
        return self.minuend % 10

    @property
    def subtrahend_tens(self) -> int:
        return self.subtrahend // 10

    @property
    def subtrahend_ones(self) -> int:
        return self.subtrahend % 10


# Approved 5-probe curated set (strictly 2-digit subtraction)
APPROVED_PROBES: Dict[str, SubtractionProbe] = {
    "probe_01": SubtractionProbe("probe_01", 61, 24, is_regrouping=True),
    "probe_02": SubtractionProbe("probe_02", 72, 38, is_regrouping=True),
    "probe_03": SubtractionProbe("probe_03", 83, 49, is_regrouping=True),
    "ctrl_01": SubtractionProbe("ctrl_01", 58, 23, is_regrouping=False),
    "ctrl_02": SubtractionProbe("ctrl_02", 79, 45, is_regrouping=False),
}

# Approved Signature Identifiers
SIG_SMALLER_FROM_LARGER = "SMALLER_FROM_LARGER"
SIG_BORROW_WITHOUT_DECREMENT = "BORROW_WITHOUT_DECREMENT"

# Four Conservative Diagnostic Statuses
STATUS_SUPPORTED_HYPOTHESIS = "SUPPORTED_HYPOTHESIS"
STATUS_INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
STATUS_AMBIGUOUS_PATTERN = "AMBIGUOUS_PATTERN"
STATUS_NO_TARGET_PATTERN_DETECTED = "NO_TARGET_PATTERN_DETECTED"


def calculate_signature_answer(probe: SubtractionProbe, signature_id: str) -> Optional[int]:
    """Calculate the predicted answer for a probe under a specific mathematical signature.

    Returns None for non-regrouping control problems, as signatures only apply to regrouping.
    """
    if not probe.is_regrouping:
        return None

    if signature_id == SIG_SMALLER_FROM_LARGER:
        # Ones = absolute difference of digits (u_S - u_M when regrouping is needed)
        ones = abs(probe.minuend_ones - probe.subtrahend_ones)
        # Tens = minuend tens - subtrahend tens (no borrow from tens)
        tens = probe.minuend_tens - probe.subtrahend_tens
        return tens * 10 + ones

    if signature_id == SIG_BORROW_WITHOUT_DECREMENT:
        # Ones = regrouped ones minus subtrahend ones: (u_M + 10) - u_S
        ones = (probe.minuend_ones + 10) - probe.subtrahend_ones
        # Tens = unreduced minuend tens minus subtrahend tens: t_M - t_S
        tens = probe.minuend_tens - probe.subtrahend_tens
        return tens * 10 + ones

    raise ValueError(f"Unknown signature ID: '{signature_id}'")


def validate_responses(responses: Mapping[str, Any]) -> None:
    """Validate incoming responses mapping.

    Raises:
        TypeError: If an answer is not an integer (explicitly checks and rejects booleans and strings).
        ValueError: If an unknown probe ID is supplied or an answer is outside 0..99.
    """
    if not isinstance(responses, Mapping):
        raise TypeError(f"Responses must be a mapping/dict, got {type(responses).__name__}")

    for probe_id, answer in responses.items():
        if probe_id not in APPROVED_PROBES:
            raise ValueError(
                f"Unknown probe ID '{probe_id}'. Approved IDs are: {sorted(APPROVED_PROBES.keys())}"
            )

        # In Python, bool is a subclass of int (isinstance(True, int) == True),
        # so we must explicitly check that answer is not a bool.
        if isinstance(answer, bool) or not isinstance(answer, int):
            raise TypeError(
                f"Answer for '{probe_id}' must be an integer, got {type(answer).__name__} ({answer!r})"
            )

        if answer < 0 or answer > 99:
            raise ValueError(
                f"Answer for '{probe_id}' must be between 0 and 99, got {answer}"
            )


def resolve_classification(
    sfl_match_count: int,
    bwd_match_count: int,
    regrouping_total: int,
    controls_correct: bool,
    all_correct: bool,
) -> Tuple[str, Optional[str]]:
    """Determine the diagnostic status and matched signature ID based on objective criteria.

    Returns:
        (status, matched_signature_or_none)
    """
    # Check 1: If controls failed, we cannot safely classify regrouping misconceptions
    if not controls_correct:
        return STATUS_AMBIGUOUS_PATTERN, None

    matches_sfl = (sfl_match_count == regrouping_total)
    matches_bwd = (bwd_match_count == regrouping_total)

    # Check 2: If both signatures matched all probes (mathematical collision)
    if matches_sfl and matches_bwd:
        return STATUS_AMBIGUOUS_PATTERN, None

    # Check 3: If exactly one signature matched all probes and controls passed
    if matches_sfl:
        return STATUS_SUPPORTED_HYPOTHESIS, SIG_SMALLER_FROM_LARGER
    if matches_bwd:
        return STATUS_SUPPORTED_HYPOTHESIS, SIG_BORROW_WITHOUT_DECREMENT

    # Check 4: If all responses across the session are correct
    if all_correct:
        return STATUS_NO_TARGET_PATTERN_DETECTED, None

    # Check 5: If signatures were partially or conflictingly matched (inconsistent pattern)
    if sfl_match_count > 0 or bwd_match_count > 0:
        return STATUS_AMBIGUOUS_PATTERN, None

    # Check 6: Controls passed, but neither signature matched any regrouping problem
    return STATUS_NO_TARGET_PATTERN_DETECTED, None


def diagnose_responses(responses: Mapping[str, Any]) -> Dict[str, Any]:
    """Diagnose a set of student answers for the curated 5-probe subtraction assessment.

    Args:
        responses: Mapping of probe IDs (e.g. 'probe_01', 'ctrl_01') to integer student answers.

    Returns:
        Dictionary conforming to the Phase 1 diagnostic contract.
    """
    validate_responses(responses)

    # Check for missing required responses
    required_ids = set(APPROVED_PROBES.keys())
    provided_ids = set(responses.keys())
    missing_ids = sorted(list(required_ids - provided_ids))

    if missing_ids:
        return {
            "engine_version": "0.1.0",
            "diagnostic_status": STATUS_INSUFFICIENT_EVIDENCE,
            "all_correct": False,
            "summary": (
                f"Assessment incomplete. Missing {len(missing_ids)} required probe(s): {missing_ids}. "
                "All 5 curated probes must be answered to form a diagnostic evaluation."
            ),
            "observed_pattern_match": None,
            "inferred_misconception": None,
            "disclaimer": (
                "PROTOTYPE ONLY: Automated rule-based pattern matching prototype. "
                "Synthetic and software tests do not establish educational validity. "
                "Must be reviewed by a primary educator."
            ),
        }

    # Evaluate controls
    controls_total = 0
    controls_correct_count = 0
    for pid, probe in APPROVED_PROBES.items():
        if not probe.is_regrouping:
            controls_total += 1
            if responses[pid] == probe.correct_answer:
                controls_correct_count += 1
    controls_passed = (controls_correct_count == controls_total)

    # Evaluate regrouping probes
    regrouping_probes = {pid: p for pid, p in APPROVED_PROBES.items() if p.is_regrouping}
    regrouping_total = len(regrouping_probes)

    sfl_matches = []
    bwd_matches = []
    correct_regrouping_matches = []
    regrouping_details: Dict[str, Dict[str, Any]] = {}

    for pid, probe in regrouping_probes.items():
        ans = responses[pid]
        pred_sfl = calculate_signature_answer(probe, SIG_SMALLER_FROM_LARGER)
        pred_bwd = calculate_signature_answer(probe, SIG_BORROW_WITHOUT_DECREMENT)
        is_corr = (ans == probe.correct_answer)

        if ans == pred_sfl:
            sfl_matches.append(pid)
        if ans == pred_bwd:
            bwd_matches.append(pid)
        if is_corr:
            correct_regrouping_matches.append(pid)

        regrouping_details[pid] = {
            "observed": ans,
            "correct_answer": probe.correct_answer,
            "predicted_smaller_from_larger": pred_sfl,
            "predicted_borrow_without_decrement": pred_bwd,
        }

    all_correct = controls_passed and (len(correct_regrouping_matches) == regrouping_total)

    # Resolve diagnostic status
    status, matched_signature = resolve_classification(
        sfl_match_count=len(sfl_matches),
        bwd_match_count=len(bwd_matches),
        regrouping_total=regrouping_total,
        controls_correct=controls_passed,
        all_correct=all_correct,
    )

    # Build observed pattern match and inferred misconception structures
    observed_pattern_match: Optional[Dict[str, Any]] = None
    inferred_misconception: Optional[Dict[str, Any]] = None

    if status == STATUS_SUPPORTED_HYPOTHESIS and matched_signature:
        if matched_signature == SIG_SMALLER_FROM_LARGER:
            observed_pattern_match = {
                "signature_id": SIG_SMALLER_FROM_LARGER,
                "mathematical_rule": "Ones digit = abs(u_M - u_S); Tens digit = t_M - t_S",
                "probes_evaluated": regrouping_total,
                "probes_matching": len(sfl_matches),
                "controls_evaluated": controls_total,
                "controls_correct": controls_correct_count,
                "supporting_problem_ids": sfl_matches,
                "details": regrouping_details,
            }
            inferred_misconception = {
                "candidate_category": "Smaller-From-Larger (Zero-Borrowing)",
                "description": (
                    "Student consistently subtracted the smaller digit from the larger digit "
                    "in the ones column when regrouping was required."
                ),
                "is_unique_explanation": False,
                "alternative_explanations": [
                    "Reversal or misreading of problem orientation (reading bottom-to-top)",
                    "Coincidental arithmetic calculation slips on these specific digit pairs",
                    "Partial guess using visible numbers",
                ],
                "teacher_review_guidance": {
                    "recommended_action": (
                        "Conduct a brief verbal check asking the student to explain how they solved problem 61 - 24."
                    ),
                    "suggested_hands_on_activity": (
                        "Tens-and-Ones Bundling Mat: have student construct the top number with physical "
                        "rods and units, observe that loose units are insufficient, and unbundle one ten."
                    ),
                },
            }
            summary = (
                "Submitted answers match the mathematical signature for Smaller-From-Larger "
                "across all 3 regrouping probes with all controls answered correctly."
            )

        elif matched_signature == SIG_BORROW_WITHOUT_DECREMENT:
            observed_pattern_match = {
                "signature_id": SIG_BORROW_WITHOUT_DECREMENT,
                "mathematical_rule": "Ones digit = (u_M + 10) - u_S; Tens digit = t_M - t_S (unreduced)",
                "probes_evaluated": regrouping_total,
                "probes_matching": len(bwd_matches),
                "controls_evaluated": controls_total,
                "controls_correct": controls_correct_count,
                "supporting_problem_ids": bwd_matches,
                "details": regrouping_details,
            }
            inferred_misconception = {
                "candidate_category": "Borrow-Without-Decrement (Forgot to Reduce Left Column)",
                "description": (
                    "Student correctly added 10 to the ones column, but did not decrement "
                    "the tens column of the minuend before subtracting."
                ),
                "is_unique_explanation": False,
                "alternative_explanations": [
                    "Arithmetic recall slip specifically in the tens column (e.g. 5 - 2 miscalculated as 4)",
                    "Incomplete recording of regrouping markings",
                ],
                "teacher_review_guidance": {
                    "recommended_action": (
                        "Check student's written crossing-out markings on the tens column to see "
                        "if the decrement step was recorded."
                    ),
                    "suggested_hands_on_activity": (
                        "The Banker's Exchange: student must exchange and remove a 10-token before "
                        "receiving 10 one-tokens, crossing out the tens column first."
                    ),
                },
            }
            summary = (
                "Submitted answers match the mathematical signature for Borrow-Without-Decrement "
                "across all 3 regrouping probes with all controls answered correctly."
            )
        else:
            summary = f"Signature {matched_signature} identified."

    elif status == STATUS_AMBIGUOUS_PATTERN:
        if not controls_passed:
            summary = (
                f"Ambiguous pattern: Control problem(s) were answered incorrectly ({controls_correct_count}/{controls_total} correct). "
                "Because baseline non-regrouping column subtraction was not demonstrated, regrouping errors cannot be safely classified."
            )
        elif sfl_matches and bwd_matches:
            summary = (
                "Ambiguous pattern: Responses matched conflicting error signatures across different probe items. "
                "A 1-on-1 teacher interview is recommended."
            )
        else:
            summary = (
                "Ambiguous pattern: Inconsistent responses observed across regrouping probes. "
                "No single error rule accounts for all errors."
            )

    elif status == STATUS_NO_TARGET_PATTERN_DETECTED:
        if all_correct:
            summary = "All 5 items (including controls) were answered correctly. No error patterns detected."
        else:
            summary = (
                "No target error pattern detected: Student made errors on regrouping probes, but the answers "
                "did not match any modeled candidate signatures. WARNING: This does not imply mastery."
            )

    else:
        summary = f"Diagnostic status: {status}"

    return {
        "engine_version": "0.1.0",
        "diagnostic_status": status,
        "all_correct": all_correct,
        "summary": summary,
        "observed_pattern_match": observed_pattern_match,
        "inferred_misconception": inferred_misconception,
        "disclaimer": (
            "PROTOTYPE ONLY: Automated rule-based pattern matching prototype. "
            "Synthetic and software tests do not establish educational validity. "
            "Must be reviewed by a primary educator."
        ),
    }


def check_engine_status() -> str:
    """Return a status string confirming scaffolding is initialized (Phase 0 compatibility)."""
    return "Math Diagnostic Engine (Phase 0 scaffolding initialized)."


if __name__ == "__main__":
    print(check_engine_status())
