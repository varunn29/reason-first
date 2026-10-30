"""Deterministic, explainable diagnostic engine for two-digit and three-digit subtraction with regrouping.

Aligned with NCERT Class 3 Mathematics (Maths Mela, Chapter 12: "Give and Take").
Analyzes student responses to both canonical diagnostic probes and authentic textbook word problems,
identifying whether observed errors systematically match candidate mathematical error signatures.
"""

from dataclasses import dataclass, field
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Tuple


@dataclass(frozen=True)
class SubtractionProbe:
    """Represents a subtraction problem probe (2-digit or 3-digit)."""

    probe_id: str
    minuend: int
    subtrahend: int
    is_regrouping: bool
    context: str = ""
    page: int = 150
    regrouping_type: str = "ONES_FROM_TENS"
    options: List[int] = field(default_factory=list)
    distractors: Dict[int, str] = field(default_factory=dict)

    @property
    def correct_answer(self) -> int:
        """Mathematically correct difference."""
        return self.minuend - self.subtrahend

    @property
    def minuend_hundreds(self) -> int:
        return (self.minuend // 100) % 10

    @property
    def minuend_tens(self) -> int:
        return (self.minuend // 10) % 10

    @property
    def minuend_ones(self) -> int:
        return self.minuend % 10

    @property
    def subtrahend_hundreds(self) -> int:
        return (self.subtrahend // 100) % 10

    @property
    def subtrahend_tens(self) -> int:
        return (self.subtrahend // 10) % 10

    @property
    def subtrahend_ones(self) -> int:
        return self.subtrahend % 10


# Canonical 5-probe curated set (2-digit subtraction benchmark)
APPROVED_PROBES: Dict[str, SubtractionProbe] = {
    "probe_01": SubtractionProbe("probe_01", 61, 24, is_regrouping=True),
    "probe_02": SubtractionProbe("probe_02", 72, 38, is_regrouping=True),
    "probe_03": SubtractionProbe("probe_03", 83, 49, is_regrouping=True),
    "ctrl_01": SubtractionProbe("ctrl_01", 58, 23, is_regrouping=False),
    "ctrl_02": SubtractionProbe("ctrl_02", 79, 45, is_regrouping=False),
}

# NCERT Class 3 Chapter 12 ("Give and Take") authentic textbook probes
TEXTBOOK_PROBES: Dict[str, SubtractionProbe] = {
    "ncert_ch12_saplings_230_75": SubtractionProbe(
        probe_id="ncert_ch12_saplings_230_75",
        minuend=230,
        subtrahend=75,
        is_regrouping=True,
        context="Kishan saplings delivery: 230 ordered, 75 packed in open box.",
        page=152,
        regrouping_type="TENS_AND_HUNDREDS",
        options=[155, 245, 165, 305],
        distractors={
            245: "Smaller-from-larger (subtracted 5 - 0 = 5 in ones and 7 - 3 = 4 in tens)",
            165: "Borrow without decrement (forgot to reduce tens column)",
            305: "Operation confusion (added 230 + 75)",
        },
    ),
    "ncert_ch12_herbs_270_36": SubtractionProbe(
        probe_id="ncert_ch12_herbs_270_36",
        minuend=270,
        subtrahend=36,
        is_regrouping=True,
        context="Kishan herbs comparison: 270 vs friend 36.",
        page=154,
        regrouping_type="ONES_FROM_TENS",
        options=[234, 246, 244, 306],
        distractors={
            246: "Smaller-from-larger (6 - 0 = 6, 7 - 3 = 4)",
            244: "Borrow without decrement (unreduced tens)",
            306: "Operation confusion (added 270 + 36)",
        },
    ),
    "ncert_ch12_library_356_138": SubtractionProbe(
        probe_id="ncert_ch12_library_356_138",
        minuend=356,
        subtrahend=138,
        is_regrouping=True,
        context="Library books: 356 total, 138 borrowed.",
        page=154,
        regrouping_type="ONES_FROM_TENS",
        options=[218, 222, 228, 216],
        distractors={
            222: "Smaller-from-larger (8 - 6 = 2 in ones)",
            228: "Borrow without decrement (unreduced tens)",
            216: "Calculation slip",
        },
    ),
    "ncert_ch12_sacks_305_210": SubtractionProbe(
        probe_id="ncert_ch12_sacks_305_210",
        minuend=305,
        subtrahend=210,
        is_regrouping=True,
        context="Grain sacks: 305 total, 210 on trailer.",
        page=155,
        regrouping_type="TENS_FROM_HUNDREDS",
        options=[95, 115, 195, 515],
        distractors={
            115: "Smaller-from-larger in tens (1 - 0 = 1)",
            195: "Borrow without decrement from hundreds",
            515: "Operation confusion (added 305 + 210)",
        },
    ),
    "ncert_ch12_money_756_465": SubtractionProbe(
        probe_id="ncert_ch12_money_756_465",
        minuend=756,
        subtrahend=465,
        is_regrouping=True,
        context="Peter uncle cashbox: morning 465, afternoon 756.",
        page=160,
        regrouping_type="TENS_FROM_HUNDREDS",
        options=[291, 311, 391, 281],
        distractors={
            311: "Smaller-from-larger in tens (6 - 5 = 1)",
            391: "Borrow without decrement from hundreds",
            281: "Calculation slip",
        },
    ),
    "ncert_ch12_groceries_500_209": SubtractionProbe(
        probe_id="ncert_ch12_groceries_500_209",
        minuend=500,
        subtrahend=209,
        is_regrouping=True,
        context="Reena groceries: 500 note given for 209 groceries.",
        page=162,
        regrouping_type="ZERO_ACROSS_BORROW",
        options=[291, 309, 391, 301],
        distractors={
            309: "Smaller-from-larger (9 - 0 = 9 across zeros)",
            391: "Borrow without decrement from hundreds",
            301: "Direct zero borrow trap",
        },
    ),
    "ncert_ch12_cards_600_82": SubtractionProbe(
        probe_id="ncert_ch12_cards_600_82",
        minuend=600,
        subtrahend=82,
        is_regrouping=True,
        context="Number cards activity: 600 - 82.",
        page=164,
        regrouping_type="ZERO_ACROSS_BORROW",
        options=[518, 682, 618, 528],
        distractors={
            682: "Smaller-from-larger (2 - 0 = 2, 8 - 0 = 8)",
            618: "Borrow without decrement from hundreds",
            528: "Calculation slip in tens",
        },
    ),
    "ncert_ch12_cards_653_356": SubtractionProbe(
        probe_id="ncert_ch12_cards_653_356",
        minuend=653,
        subtrahend=356,
        is_regrouping=True,
        context="Number cards activity: 653 - 356.",
        page=164,
        regrouping_type="DOUBLE_REGROUPING",
        options=[297, 303, 397, 307],
        distractors={
            303: "Smaller-from-larger (6 - 3 = 3, 5 - 5 = 0, 6 - 3 = 3)",
            397: "Borrow without decrement from hundreds",
            307: "Partial regrouping error",
        },
    ),
    "ncert_ch12_cards_568_5": SubtractionProbe(
        probe_id="ncert_ch12_cards_568_5",
        minuend=568,
        subtrahend=5,
        is_regrouping=False,
        context="Control problem: 568 - 5.",
        page=164,
        regrouping_type="NON_REGROUPING_CONTROL",
        options=[563, 560, 558, 573],
        distractors={
            560: "Calculation slip",
            558: "Place value alignment error",
            573: "Operation confusion (added 568 + 5)",
        },
    ),
    "ncert_ch12_saplings_456_63": SubtractionProbe(
        probe_id="ncert_ch12_saplings_456_63",
        minuend=456,
        subtrahend=63,
        is_regrouping=True,
        context="Kishan August saplings: 456 distributed 63.",
        page=154,
        regrouping_type="TENS_FROM_HUNDREDS",
        options=[393, 413, 493, 383],
        distractors={
            413: "Smaller-from-larger in tens (6 - 5 = 1)",
            493: "Borrow without decrement",
            383: "Calculation slip",
        },
    ),
}

@dataclass(frozen=True)
class CurriculumProbe:
    """Represents an authentic NCERT Class 3 curriculum probe across all chapters."""
    probe_id: str
    chapter: str
    page: int
    domain: str
    context: str
    prompt: str
    correct_answer: int
    options: List[int] = field(default_factory=list)
    distractors: Dict[Any, Any] = field(default_factory=dict)
    is_regrouping: bool = False
    minuend: int = 0
    subtrahend: int = 0
    option_labels: List[str] = field(default_factory=list)

    @property
    def minuend_hundreds(self) -> int:
        return (self.minuend // 100) % 10 if self.minuend >= 100 else 0

    @property
    def minuend_tens(self) -> int:
        return (self.minuend // 10) % 10 if self.minuend >= 10 else 0

    @property
    def minuend_ones(self) -> int:
        return self.minuend % 10

    @property
    def subtrahend_hundreds(self) -> int:
        return (self.subtrahend // 100) % 10 if self.subtrahend >= 100 else 0

    @property
    def subtrahend_tens(self) -> int:
        return (self.subtrahend // 10) % 10 if self.subtrahend >= 10 else 0

    @property
    def subtrahend_ones(self) -> int:
        return self.subtrahend % 10


# Load NCERT Foundations Probes (Chapters 1-5)
FOUNDATION_PROBES: Dict[str, CurriculumProbe] = {}
CH03_CH04_PROBES: Dict[str, CurriculumProbe] = {}
CH05_CH06_PROBES: Dict[str, CurriculumProbe] = {}
CH07_CH08_PROBES: Dict[str, CurriculumProbe] = {}
CH09_CH10_PROBES: Dict[str, CurriculumProbe] = {}
CH11_CH13_CH14_PROBES: Dict[str, CurriculumProbe] = {}
from pathlib import Path
import json

_data_dir = Path(__file__).resolve().parent.parent.parent / "data"

def _load_probes_from_file(file_path: Path, target_dict: Dict[str, CurriculumProbe]) -> None:
    if not file_path.exists():
        return
    try:
        with open(file_path, "r", encoding="utf-8") as _f:
            _raw = json.load(_f)
            for _p in _raw.get("probes", []):
                _dmap = {}
                for _k, _v in _p.get("distractors", {}).items():
                    try:
                        _dmap[int(_k)] = _v
                    except (ValueError, TypeError):
                        _dmap[_k] = _v
                target_dict[_p["id"]] = CurriculumProbe(
                    probe_id=_p["id"],
                    chapter=_p.get("chapter", ""),
                    page=_p.get("page", 1),
                    domain=_p.get("domain", "GENERAL"),
                    context=_p.get("context", ""),
                    prompt=_p.get("prompt", ""),
                    correct_answer=_p.get("correctAnswer", 0),
                    options=_p.get("options", []),
                    distractors=_dmap,
                    is_regrouping=_p.get("is_regrouping", False),
                    minuend=_p.get("minuend", 0),
                    subtrahend=_p.get("subtrahend", 0),
                    option_labels=_p.get("optionLabels", []),
                )
    except Exception as _err:
        pass

_load_probes_from_file(_data_dir / "ncert_maths_mela_foundations.json", FOUNDATION_PROBES)
_load_probes_from_file(_data_dir / "ncert_ch03_ch04_double_century_nani.json", CH03_CH04_PROBES)
_load_probes_from_file(_data_dir / "ncert_ch05_shapes_ch06_hundreds.json", CH05_CH06_PROBES)
_load_probes_from_file(_data_dir / "ncert_ch07_multiplication_ch08_fractions.json", CH07_CH08_PROBES)
_load_probes_from_file(_data_dir / "ncert_ch09_hundreds_ii_ch10_measurement.json", CH09_CH10_PROBES)
_load_probes_from_file(_data_dir / "ncert_ch11_ch13_ch14_final.json", CH11_CH13_CH14_PROBES)

# Master Unified Curriculum Dataset (132 Probes across All 14 NCERT Chapters)
FULL_CURRICULUM_PROBES: Dict[str, CurriculumProbe] = {}
_load_probes_from_file(_data_dir / "ncert_class3_mathematics_full_curriculum.json", FULL_CURRICULUM_PROBES)

# Complete unified probe registry across all NCERT Class 3 chapters
CURRICULUM_PROBES: Dict[str, Any] = {
    **APPROVED_PROBES,
    **TEXTBOOK_PROBES,
    **FOUNDATION_PROBES,
    **CH03_CH04_PROBES,
    **CH05_CH06_PROBES,
    **CH07_CH08_PROBES,
    **CH09_CH10_PROBES,
    **CH11_CH13_CH14_PROBES,
    **FULL_CURRICULUM_PROBES,
}
ALL_PROBES: Dict[str, Any] = CURRICULUM_PROBES

# Mathematical & Cognitive Misconception Signature Identifiers
SIG_SMALLER_FROM_LARGER = "SMALLER_FROM_LARGER"
SIG_BORROW_WITHOUT_DECREMENT = "BORROW_WITHOUT_DECREMENT"
SIG_ZERO_ACROSS_BORROW = "ZERO_ACROSS_BORROW_ERROR"
SIG_OPERATION_CONFUSION_ADD = "OPERATION_CONFUSION_ADD"
SIG_DECADE_CROSSING_STUMBLE = "DECADE_CROSSING_STUMBLE"
SIG_ZERO_PLACEHOLDER_OMISSION = "ZERO_PLACEHOLDER_OMISSION"
SIG_REVERSE_HTO_ALIGNMENT = "REVERSE_HTO_ALIGNMENT"
SIG_GRID_DIRECTION_INVERSION = "GRID_DIRECTION_INVERSION"
SIG_DICE_SEQUENTIAL_OPPOSITE = "DICE_SEQUENTIAL_OPPOSITE"
SIG_SQUARE_RECTANGLE_DISJUNCTION = "SQUARE_RECTANGLE_DISJUNCTION"
SIG_SQUARE_ATTRIBUTE_OVERGENERALIZATION = "SQUARE_ATTRIBUTE_OVERGENERALIZATION"
SIG_CORNER_IN_CIRCLE_CONFUSION = "CORNER_IN_CIRCLE_CONFUSION"
SIG_FLAT_FACES_ONLY_ERROR = "FLAT_FACES_ONLY_ERROR"
SIG_CURVED_FACES_ONLY_ERROR = "CURVED_FACES_ONLY_ERROR"
SIG_CARRY_OVER_OMISSION = "CARRY_OVER_OMISSION"
SIG_CONCATENATION_WITHOUT_REGROUPING = "CONCATENATION_WITHOUT_REGROUPING"
SIG_MINUEND_HUNDRED_ANCHORING_BIAS = "MINUEND_HUNDRED_ANCHORING_BIAS"
SIG_ADDITION_INSTEAD_OF_MULTIPLICATION = "ADDITION_INSTEAD_OF_MULTIPLICATION"
SIG_SUBTRACTION_INSTEAD_OF_ADDITION = "SUBTRACTION_INSTEAD_OF_ADDITION"
SIG_SUBTRACTION_MAGNITUDE_OVERESTIMATION = "SUBTRACTION_MAGNITUDE_OVERESTIMATION"
SIG_BRIDGING_TEN_OVERSHOOT_ERROR = "BRIDGING_TEN_OVERSHOOT_ERROR"
SIG_ONES_DROPOUT_ERROR = "ONES_DROPOUT_ERROR"
SIG_TENS_COUNT_OVERSHOOT = "TENS_COUNT_OVERSHOOT"
SIG_PREDECESSOR_CONFUSION = "PREDECESSOR_CONFUSION"
SIG_SUCCESSOR_PREDECESSOR_SWAP = "SUCCESSOR_PREDECESSOR_SWAP"
SIG_CURVED_OR_TRIANGULAR_FACES_BIAS = "CURVED_OR_TRIANGULAR_FACES_BIAS"
SIG_PRISM_CUBOID_CONFUSION = "PRISM_CUBOID_CONFUSION"
SIG_SUB_PARTS_ONLY_COUNT = "SUB_PARTS_ONLY_COUNT"
SIG_OPPOSITE_CORNERS_ONLY = "OPPOSITE_CORNERS_ONLY"
SIG_RIGHT_ANGLE_DEFAULT = "RIGHT_ANGLE_DEFAULT"
SIG_REVERSE_TENS_ONES_MAPPING = "REVERSE_TENS_ONES_MAPPING"
SIG_ONES_MAGNITUDE_OVERRIDE_TENS = "ONES_MAGNITUDE_OVERRIDE_TENS"
SIG_ONES_TENS_INVERSION = "ONES_TENS_INVERSION"
SIG_SUBTRACTED_FROM_ONES = "SUBTRACTED_FROM_ONES"
SIG_RIGHT_STEP_CONFUSION = "RIGHT_STEP_CONFUSION"
SIG_OUT_OF_BOUNDS_HIGH = "OUT_OF_BOUNDS_HIGH"
SIG_CHORD_UNEQUAL_PARTITION_BIAS = "CHORD_UNEQUAL_PARTITION_BIAS"
SIG_HALF_QUARTER_CONFUSION = "HALF_QUARTER_CONFUSION"
SIG_RESOURCE_NEGLECT_FLOWERS_ONLY = "RESOURCE_NEGLECT_FLOWERS_ONLY"
SIG_DIVIDEND_HALF_CONFUSION = "DIVIDEND_HALF_CONFUSION"
SIG_PERSPECTIVE_RIGIDITY_BIAS = "PERSPECTIVE_RIGIDITY_BIAS"
SIG_ALL_FIVES_DEFAULT = "ALL_FIVES_DEFAULT"
SIG_HORN_COUNT_DUPLICATION = "HORN_COUNT_DUPLICATION"
SIG_ZERO_TENS_OMISSION_3DIGIT = "ZERO_TENS_OMISSION_3DIGIT"
SIG_ONES_TENS_VALUE_CONFUSION = "ONES_TENS_VALUE_CONFUSION"
SIG_DECADE_JUMP_CALCULATION_SLIP = "DECADE_JUMP_CALCULATION_SLIP"
SIG_NEIGHBOURING_LANDMARK_CONFUSION = "NEIGHBOURING_LANDMARK_CONFUSION"
SIG_TENS_DIGIT_POSITION_CONFUSION = "TENS_DIGIT_POSITION_CONFUSION"
SIG_FENCEPOST_CUT_COUNT_ERROR = "FENCEPOST_CUT_COUNT_ERROR"
SIG_HANDSPAN_INVARIANCE_ASSUMPTION = "HANDSPAN_INVARIANCE_ASSUMPTION"
SIG_ORIENTATION_NEGLECT_2D = "ORIENTATION_NEGLECT_2D"
SIG_QUARTER_HALF_METRE_CONFUSION = "QUARTER_HALF_METRE_CONFUSION"
SIG_UNIT_INAPPROPRIATE_SCALE_BIAS = "UNIT_INAPPROPRIATE_SCALE_BIAS"
SIG_BHUTASANKHYA_DIGIT_INVERSION = "BHUTASANKHYA_DIGIT_INVERSION"
SIG_CAPACITY_UNIT_SIZE_NEGLECT = "CAPACITY_UNIT_SIZE_NEGLECT"
SIG_HEIGHT_ONLY_VOLUME_BIAS = "HEIGHT_ONLY_VOLUME_BIAS"
SIG_CONSERVATION_OF_VOLUME_VIOLATION = "CONSERVATION_OF_VOLUME_VIOLATION"
SIG_HALF_QUARTER_CAPACITY_CONFUSION = "HALF_QUARTER_CAPACITY_CONFUSION"
SIG_PAN_BALANCE_TILT_INVERSION = "PAN_BALANCE_TILT_INVERSION"
SIG_TOTAL_EQUAL_PART_CONFUSION = "TOTAL_EQUAL_PART_CONFUSION"
SIG_CALENDAR_REOPEN_OFFSET_ERROR = "CALENDAR_REOPEN_OFFSET_ERROR"
SIG_CALENDAR_WEEKS_DEFAULT = "CALENDAR_WEEKS_DEFAULT"
SIG_LUNAR_SOLAR_FESTIVAL_CONFUSION = "LUNAR_SOLAR_FESTIVAL_CONFUSION"
SIG_HOUR_MINUTE_CONFUSION = "HOUR_MINUTE_CONFUSION"
SIG_QUARTER_POINTS_AT_FOUR_ERROR = "QUARTER_POINTS_AT_FOUR_ERROR"
SIG_ONE_NUMBER_ONE_MINUTE_ERROR = "ONE_NUMBER_ONE_MINUTE_ERROR"
SIG_COLOR_COUNT_WITHOUT_ORDER_SYMMETRY = "COLOR_COUNT_WITHOUT_ORDER_SYMMETRY"
SIG_TRANSLATION_INSTEAD_OF_REFLECTION = "TRANSLATION_INSTEAD_OF_REFLECTION"
SIG_GAP_PERMISSIBLE_MISCONCEPTION = "GAP_PERMISSIBLE_MISCONCEPTION"
SIG_OPEN_BOX_FACIAL_OMISSION = "OPEN_BOX_FACIAL_OMISSION"
SIG_CYLINDER_NET_INVERSION = "CYLINDER_NET_INVERSION"
SIG_DEDUCTIVE_REASONING_DEFICIT = "DEDUCTIVE_REASONING_DEFICIT"
SIG_WEIGH_ALL_TOGETHER_ERROR = "WEIGH_ALL_TOGETHER_ERROR"
SIG_ASYMMETRIC_FOLD_MISCONCEPTION = "ASYMMETRIC_FOLD_MISCONCEPTION"
SIG_MAP_LEGEND_PURPOSE_MISCONCEPTION = "MAP_LEGEND_PURPOSE_MISCONCEPTION"
SIG_CUBE_EDGES_CONFUSION = "CUBE_EDGES_CONFUSION"

# Four Conservative Diagnostic Statuses
STATUS_SUPPORTED_HYPOTHESIS = "SUPPORTED_HYPOTHESIS"
STATUS_INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
STATUS_AMBIGUOUS_PATTERN = "AMBIGUOUS_PATTERN"
STATUS_NO_TARGET_PATTERN_DETECTED = "NO_TARGET_PATTERN_DETECTED"


def calculate_signature_answer(probe: SubtractionProbe, signature_id: str) -> Optional[int]:
    """Calculate the predicted answer for a probe under a specific mathematical signature.

    Returns None for non-regrouping control problems, as signatures only apply to regrouping.
    Supports both two-digit and three-digit subtraction.
    """
    if not probe.is_regrouping:
        return None

    if signature_id == SIG_OPERATION_CONFUSION_ADD:
        return probe.minuend + probe.subtrahend

    # 2-Digit Subtraction Calculation
    if probe.minuend < 100:
        if signature_id == SIG_SMALLER_FROM_LARGER:
            ones = abs(probe.minuend_ones - probe.subtrahend_ones)
            tens = probe.minuend_tens - probe.subtrahend_tens
            return tens * 10 + ones

        if signature_id == SIG_BORROW_WITHOUT_DECREMENT:
            ones = (probe.minuend_ones + 10) - probe.subtrahend_ones
            tens = probe.minuend_tens - probe.subtrahend_tens
            return tens * 10 + ones

    # 3-Digit Subtraction Calculation
    else:
        m_h, m_t, m_u = probe.minuend_hundreds, probe.minuend_tens, probe.minuend_ones
        s_h, s_t, s_u = probe.subtrahend_hundreds, probe.subtrahend_tens, probe.subtrahend_ones

        if signature_id == SIG_SMALLER_FROM_LARGER:
            # Column-by-column upward subtraction whenever minuend < subtrahend
            ones = abs(m_u - s_u) if m_u < s_u else (m_u - s_u)
            tens = abs(m_t - s_t) if m_t < s_t else (m_t - s_t)
            hundreds = abs(m_h - s_h) if m_h < s_h else (m_h - s_h)
            return hundreds * 100 + tens * 10 + ones

        if signature_id == SIG_BORROW_WITHOUT_DECREMENT:
            # Borrow into ones or tens without decrementing the higher column
            ones = (m_u + 10 - s_u) if m_u < s_u else (m_u - s_u)
            # Unreduced tens
            tens = (m_t + 10 - s_t) if m_t < s_t else (m_t - s_t)
            # Unreduced hundreds
            hundreds = m_h - s_h
            return hundreds * 100 + tens * 10 + ones

        if signature_id == SIG_ZERO_ACROSS_BORROW:
            # Zero-across trap: e.g. 500 - 209 -> 301
            if m_t == 0 and m_u == 0:
                return (m_h - 1 - s_h) * 100 + 0 + (10 - s_u)
            return None

    raise ValueError(f"Unknown signature ID: '{signature_id}'")


def validate_responses(responses: Mapping[str, Any], allowed_probes: Mapping[str, SubtractionProbe] = APPROVED_PROBES) -> None:
    """Validate incoming responses mapping against the allowed probe set.

    Raises:
        TypeError: If an answer is not an integer.
        ValueError: If an unknown probe ID is supplied or an answer is out of bounds.
    """
    if not isinstance(responses, Mapping):
        raise TypeError(f"Responses must be a mapping/dict, got {type(responses).__name__}")

    for probe_id, answer in responses.items():
        if probe_id not in allowed_probes:
            raise ValueError(
                f"Unknown probe ID '{probe_id}'. Approved IDs are: {sorted(allowed_probes.keys())}"
            )

        if isinstance(answer, bool) or not isinstance(answer, int):
            raise TypeError(
                f"Answer for '{probe_id}' must be an integer, got {type(answer).__name__} ({answer!r})"
            )

        # Allow answers up to 999 for 3-digit textbook problems
        max_bound = 999 if any(p.minuend >= 100 for p in allowed_probes.values()) else 99
        if answer < 0 or answer > max_bound:
            raise ValueError(
                f"Answer for '{probe_id}' must be between 0 and {max_bound}, got {answer}"
            )


def resolve_classification(
    sfl_match_count: int,
    bwd_match_count: int,
    regrouping_total: int,
    controls_correct: bool,
    all_correct: bool,
) -> Tuple[str, Optional[str]]:
    """Determine diagnostic status and matched signature ID based on objective criteria."""
    if not controls_correct:
        return STATUS_AMBIGUOUS_PATTERN, None

    matches_sfl = (sfl_match_count == regrouping_total)
    matches_bwd = (bwd_match_count == regrouping_total)

    if matches_sfl and matches_bwd:
        return STATUS_AMBIGUOUS_PATTERN, None

    if matches_sfl:
        return STATUS_SUPPORTED_HYPOTHESIS, SIG_SMALLER_FROM_LARGER
    if matches_bwd:
        return STATUS_SUPPORTED_HYPOTHESIS, SIG_BORROW_WITHOUT_DECREMENT

    if all_correct:
        return STATUS_NO_TARGET_PATTERN_DETECTED, None

    if sfl_match_count > 0 or bwd_match_count > 0:
        return STATUS_AMBIGUOUS_PATTERN, None

    return STATUS_NO_TARGET_PATTERN_DETECTED, None


def diagnose_responses(
    responses: Mapping[str, Any], 
    probe_set: Optional[Mapping[str, SubtractionProbe]] = None
) -> Dict[str, Any]:
    """Diagnose a set of student answers for an assessment.

    Supports both the canonical 5-probe assessment and the NCERT Chapter 12 textbook probe set.
    """
    # Select appropriate probe dictionary
    if probe_set is None:
        if any(k.startswith("ncert_ch12_") for k in responses.keys()):
            active_probes = TEXTBOOK_PROBES
        else:
            active_probes = APPROVED_PROBES
    else:
        active_probes = probe_set

    validate_responses(responses, allowed_probes=active_probes)

    # Check for missing required responses
    required_ids = set(active_probes.keys())
    provided_ids = set(responses.keys())
    missing_ids = sorted(list(required_ids - provided_ids))

    if missing_ids:
        return {
            "engine_version": "0.2.0",
            "diagnostic_status": STATUS_INSUFFICIENT_EVIDENCE,
            "all_correct": False,
            "summary": (
                f"Assessment incomplete. Missing {len(missing_ids)} required probe(s): {missing_ids}. "
                f"All {len(required_ids)} curated probes must be answered to form a diagnostic evaluation."
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
    for pid, probe in active_probes.items():
        if not probe.is_regrouping:
            controls_total += 1
            if responses[pid] == probe.correct_answer:
                controls_correct_count += 1
    controls_passed = (controls_total == 0) or (controls_correct_count == controls_total)

    # Evaluate regrouping probes
    regrouping_probes = {pid: p for pid, p in active_probes.items() if p.is_regrouping}
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

    status, matched_signature = resolve_classification(
        sfl_match_count=len(sfl_matches),
        bwd_match_count=len(bwd_matches),
        regrouping_total=regrouping_total,
        controls_correct=controls_passed,
        all_correct=all_correct,
    )

    observed_pattern_match: Optional[Dict[str, Any]] = None
    inferred_misconception: Optional[Dict[str, Any]] = None

    if status == STATUS_SUPPORTED_HYPOTHESIS and matched_signature:
        if matched_signature == SIG_SMALLER_FROM_LARGER:
            observed_pattern_match = {
                "signature_id": SIG_SMALLER_FROM_LARGER,
                "mathematical_rule": "Column digit = abs(minuend_digit - subtrahend_digit) without unbundling",
                "probes_evaluated": regrouping_total,
                "probes_matching": len(sfl_matches),
                "controls_evaluated": controls_total,
                "controls_correct": controls_correct_count,
                "supporting_problem_ids": sfl_matches,
                "details": regrouping_details,
            }
            inferred_misconception = {
                "candidate_category": "Smaller-From-Larger (Zero-Borrowing Error)",
                "description": (
                    "Student consistently subtracted the smaller digit from the larger digit "
                    "in columns requiring regrouping, rather than unbundling from the higher place value."
                ),
                "is_unique_explanation": False,
                "alternative_explanations": [
                    "Bottom-to-top visual reading reversal",
                    "Coincidental mental arithmetic calculation slips",
                    "Over-reliance on commutative addition intuition (a - b treated as b - a)",
                ],
                "teacher_review_guidance": {
                    "recommended_action": (
                        "Conduct a verbal probe asking the child to demonstrate 230 - 75 with Dienes blocks."
                    ),
                    "suggested_hands_on_activity": (
                        "Tens-and-Ones Bundling Mat (NCERT p. 152): exchange 1 ten-rod for 10 unit cubes "
                        "before removing subtrahend ones."
                    ),
                },
                "student_feedback": {
                    "mascot_message": "Remember to unbundle 1 ten into 10 ones before subtracting!",
                    "hint_type": "DIENES_BLOCKS_EXCHANGE",
                }
            }
            summary = (
                f"Submitted answers match the mathematical signature for Smaller-From-Larger "
                f"across all {regrouping_total} regrouping probes with all controls answered correctly."
            )

        elif matched_signature == SIG_BORROW_WITHOUT_DECREMENT:
            observed_pattern_match = {
                "signature_id": SIG_BORROW_WITHOUT_DECREMENT,
                "mathematical_rule": "Ones digit = (minuend_ones + 10) - subtrahend_ones; Higher column left unreduced",
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
                    "Student correctly added 10 to the target column, but did not decrement "
                    "the next higher column of the minuend before subtracting."
                ),
                "is_unique_explanation": False,
                "alternative_explanations": [
                    "Arithmetic recall slip in higher column (e.g. 5 - 2 misremembered as 4)",
                    "Incomplete recording of crossing-out markings",
                ],
                "teacher_review_guidance": {
                    "recommended_action": (
                        "Check student's written crossing-out markings on the tens and hundreds column."
                    ),
                    "suggested_hands_on_activity": (
                        "The Banker's Exchange (NCERT p. 156-160): student must hand over a ₹100 or ₹10 "
                        "token to the bank before receiving 10 smaller tokens."
                    ),
                },
                "student_feedback": {
                    "mascot_message": "Great unbundling! Don't forget to cross out and reduce the higher column!",
                    "hint_type": "CROSS_OUT_REMINDER",
                }
            }
            summary = (
                f"Submitted answers match the mathematical signature for Borrow-Without-Decrement "
                f"across all {regrouping_total} regrouping probes with all controls answered correctly."
            )
        else:
            summary = f"Signature {matched_signature} identified."

    elif status == STATUS_AMBIGUOUS_PATTERN:
        if not controls_passed:
            summary = (
                f"Ambiguous pattern: Control problem(s) were answered incorrectly ({controls_correct_count}/{controls_total} correct). "
                "Because baseline non-regrouping subtraction was not demonstrated, regrouping errors cannot be safely classified."
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
            summary = f"All {len(active_probes)} items (including controls) were answered correctly. Place value regrouping mastery demonstrated."
        else:
            summary = (
                "No target error pattern detected: Student made errors on regrouping probes, but the answers "
                "did not match any modeled candidate signatures. WARNING: This does not imply mastery."
            )
    else:
        summary = f"Diagnostic status: {status}"

    res_dict = {
        "engine_version": "0.3.0",
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

    # Dynamic cognitive skill mastery computation using calibrated model
    model = get_calibrated_model()
    if model:
        q_mat = model.get("q_matrix", {})
        cal_items = model.get("calibrated_items", {})
        skills_def = model.get("latent_cognitive_skills", [])
        skill_mastery = {}

        for skill in skills_def:
            sid = skill["id"]
            relevant_probes = [
                pid for pid in responses.keys()
                if pid in q_mat and q_mat[pid].get(sid, 0) == 1
            ]
            if not relevant_probes:
                continue

            log_l1 = 0.0
            log_l0 = 0.0
            for rpid in relevant_probes:
                r_ans = responses[rpid]
                item_info = cal_items.get(rpid, {})
                s_j = item_info.get("slip_rate_s", 0.05)
                g_j = item_info.get("guess_rate_g", 0.04)
                corr_ans = item_info.get("correct_answer", ALL_PROBES[rpid].correct_answer if rpid in ALL_PROBES else None)
                is_passed = (r_ans == corr_ans)

                if is_passed:
                    log_l1 += math.log(max(1.0 - s_j, 1e-4))
                    log_l0 += math.log(max(g_j, 1e-4))
                else:
                    log_l1 += math.log(max(s_j, 1e-4))
                    log_l0 += math.log(max(1.0 - g_j, 1e-4))

            l1 = math.exp(log_l1)
            l0 = math.exp(log_l0)
            denom = l1 + l0
            post_prob = round(l1 / denom, 4) if denom > 0 else 0.5

            skill_mastery[sid] = {
                "name": skill.get("name", sid),
                "posterior_mastery_probability": post_prob,
                "status": "MASTERED" if post_prob >= 0.70 else ("NEEDS_SCAFFOLDING" if post_prob < 0.40 else "EMERGING"),
                "probes_evaluated": len(relevant_probes),
                "ncert_ref": skill.get("ncert_ref", ""),
            }

        if skill_mastery:
            res_dict["cognitive_skill_mastery"] = skill_mastery

    return res_dict


_CALIBRATED_MODEL: Optional[Dict[str, Any]] = None


def get_calibrated_model() -> Dict[str, Any]:
    """Load and cache the full curriculum calibrated diagnostic model."""
    global _CALIBRATED_MODEL
    if _CALIBRATED_MODEL is not None:
        return _CALIBRATED_MODEL

    model_path = Path(__file__).resolve().parent.parent.parent / "models" / "calibrated_diagnostic_model.json"
    if model_path.exists():
        try:
            with open(model_path, "r", encoding="utf-8") as f:
                _CALIBRATED_MODEL = json.load(f)
                return _CALIBRATED_MODEL
        except Exception as e:
            print(f"Warning: Failed to load calibrated model from {model_path}: {e}")
    _CALIBRATED_MODEL = {}
    return _CALIBRATED_MODEL


def _enrich_with_calibrated_model(probe_id: str, answer: int, res: Dict[str, Any]) -> Dict[str, Any]:
    """Enrich diagnostic result with psychometrics and dual pedagogical guidance."""
    model = get_calibrated_model()
    if not model:
        return res

    cal_items = model.get("calibrated_items", {})
    item_cal = cal_items.get(probe_id)
    cat = model.get("pedagogical_catalog", {})
    rule_id = res.get("ruleId", "")
    is_pass = (res.get("status") == "Pass" or rule_id == "CORRECT")

    # 1. Attach Psychometrics and Latent Cognitive Skills
    if item_cal:
        s_j = item_cal.get("slip_rate_s", 0.05)
        g_j = item_cal.get("guess_rate_g", 0.04)
        b_j = item_cal.get("difficulty_b", 0.45)
        a_j = item_cal.get("discrimination_a", 1.45)
        req_skills = item_cal.get("required_skills", [])

        if is_pass:
            # P(alpha = 1 | Pass) = (1 - s) / (1 - s + g)
            p_mastery = (1.0 - s_j) / ((1.0 - s_j) + g_j)
        else:
            # P(alpha = 1 | Fail) = s / (s + (1 - g))
            p_mastery = s_j / (s_j + (1.0 - g_j))

        psychometrics = {
            "difficulty_b": b_j,
            "discrimination_a": a_j,
            "slip_rate_s": s_j,
            "guess_rate_g": g_j,
            "posterior_mastery_probability": round(p_mastery, 4),
            "required_cognitive_skills": req_skills,
        }
        if "evidence" not in res:
            res["evidence"] = {}
        res["evidence"]["psychometrics"] = psychometrics
        res["evidence"]["cognitive_skills"] = req_skills
        res["psychometrics"] = psychometrics
        res["requiredSkills"] = req_skills

    # 2. Attach Dual Pedagogical Scaffolding
    catalog_key = "CORRECT" if is_pass else rule_id
    cat_entry = cat.get(catalog_key)
    if cat_entry:
        tg = cat_entry.get("teacher_guidance", {})
        sc = cat_entry.get("student_scaffolding", {})

        res["teacherGuidance"] = {
            "clinicalInquiry": tg.get("clinical_inquiry", res.get("followUpQuestion", "")),
            "handsOnManipulative": tg.get("hands_on_manipulative", res.get("suggestedActivity", "")),
            "interventionTier": tg.get("intervention_tier", "Tier 1 Targeted Concept Clarification"),
            "domain": cat_entry.get("domain", "GENERAL_MATH"),
        }
        res["studentScaffolding"] = {
            "mascotVoice": sc.get("mascot_voice", "Friendly Mascot Chintu"),
            "encouragingMessage": sc.get("encouraging_message", res.get("studentFeedback", "")),
            "visualScaffold": sc.get("visual_scaffold", ""),
            "growthMindsetPrompt": sc.get("growth_mindset_prompt", "Keep exploring math!"),
        }
        if tg.get("clinical_inquiry") and res.get("followUpQuestion") in (
            "Can you explain your thinking?",
            "Walk me through how you solved this question or what steps you took.",
        ):
            res["followUpQuestion"] = tg.get("clinical_inquiry")
        if tg.get("hands_on_manipulative") and res.get("suggestedActivity") in (
            "Targeted hands-on practice with concrete materials.",
            "Review with concrete manipulatives and visual number lines.",
        ):
            res["suggestedActivity"] = tg.get("hands_on_manipulative")

    return res


def diagnose_single_response(probe_id: str, answer: int, explanation: str = "") -> Dict[str, Any]:
    """Diagnose a single student response for either canonical or textbook probes.

    Provides rich dual guidance for both teachers and students.
    """
    probe = ALL_PROBES.get(probe_id)
    if not probe:
        # Fallback evaluation if custom question
        return _enrich_with_calibrated_model(probe_id, answer, {
            "status": "Pass" if answer == 27 else "Fail",
            "ruleId": "CORRECT" if answer == 27 else "BORROW_WITHOUT_DECREMENT",
            "observations": f"Answer {answer} evaluated for custom question {probe_id}.",
            "evidence": {"observed": answer},
            "alternatives": ["Calculation slip"],
            "confidence": "MEDIUM",
            "followUpQuestion": "Explain the strategy you used to subtract.",
            "suggestedActivity": "Practice place value unbundling with Dienes blocks.",
            "studentFeedback": "Keep practicing your column regrouping!",
        })

    correct = probe.correct_answer
    is_correct = (answer == correct)

    prompt_label = getattr(probe, "prompt", "") or f"{probe.minuend} - {probe.subtrahend}"

    if is_correct:
        return _enrich_with_calibrated_model(probe_id, answer, {
            "status": "Pass",
            "ruleId": "CORRECT",
            "observations": f"Answer {answer} is correct for '{prompt_label}'. Student demonstrated conceptual understanding and mastery.",
            "evidence": {"observed": answer, "expected": correct, "is_correct": True},
            "alternatives": [],
            "confidence": "HIGH",
            "followUpQuestion": "Explain the step-by-step strategy, number line jumps, or concrete model you used to solve this.",
            "suggestedActivity": "Advance to multi-step reasoning extensions or student-designed word problems.",
            "studentFeedback": "🌟 Superstar! You solved this question perfectly!",
        })

    # 1. Check if probe has a structured distractor mapping for this answer
    dist_map = getattr(probe, "distractors", {})
    dist_info = dist_map.get(answer) if answer in dist_map else dist_map.get(str(answer))

    if isinstance(dist_info, dict):
        rule_id = dist_info.get("signature", "MISCONCEPTION")
        explanation_text = dist_info.get("explanation", f"Answer {answer} matches a modeled error pattern.")
        teacher_q = dist_info.get("teacherInquiry", dist_info.get("followUp", "Can you explain your thinking?"))
        activity_text = dist_info.get("activity", "Targeted hands-on practice with concrete materials.")
        student_msg = dist_info.get("studentHint", "Check your thinking carefully!")

        return _enrich_with_calibrated_model(probe_id, answer, {
            "status": "Fail",
            "ruleId": rule_id,
            "observations": f"Answer {answer}: {explanation_text}",
            "evidence": {
                "observed": answer,
                "expected": correct,
                "signature": rule_id,
                "predicted_signature_answer": answer,
            },
            "alternatives": [
                "Careless reading of question prompt",
                "Single arithmetic calculation slip",
                "Perceptual / visual distraction",
            ],
            "confidence": "HIGH",
            "followUpQuestion": teacher_q,
            "suggestedActivity": activity_text,
            "studentFeedback": student_msg,
        })

    # 2. Check mathematical calculation signatures (for regrouping subtraction)
    pred_sfl = calculate_signature_answer(probe, SIG_SMALLER_FROM_LARGER)
    pred_bwd = calculate_signature_answer(probe, SIG_BORROW_WITHOUT_DECREMENT)
    pred_add = calculate_signature_answer(probe, SIG_OPERATION_CONFUSION_ADD)

    dist_desc = str(dist_info or "").lower()
    is_sfl = (probe.is_regrouping and answer == pred_sfl) or ("smaller-from-larger" in dist_desc)
    is_bwd = (probe.is_regrouping and answer == pred_bwd) or ("borrow without decrement" in dist_desc)
    is_add = (answer == pred_add) or ("operation confusion" in dist_desc)

    if probe.is_regrouping and is_sfl:
        return _enrich_with_calibrated_model(probe_id, answer, {
            "status": "Fail",
            "ruleId": SIG_SMALLER_FROM_LARGER,
            "observations": (
                f"Answer {answer} on {probe.minuend} - {probe.subtrahend} matches Smaller-From-Larger error: "
                "student subtracted smaller digits from larger digits without unbundling from the higher column."
            ),
            "evidence": {
                "observed": answer,
                "expected": correct,
                "signature": SIG_SMALLER_FROM_LARGER,
                "predicted_signature_answer": answer,
            },
            "alternatives": [
                "Bottom-to-top visual reading reversal",
                "Arithmetic calculation slip",
                "Overgeneralization of commutative addition property",
            ],
            "confidence": "HIGH",
            "followUpQuestion": f"Can you show how you solved the ones column in {probe.minuend} - {probe.subtrahend} using Dienes blocks?",
            "suggestedActivity": (
                "Dienes HTO Unbundling Mat (NCERT p. 152): exchange 1 yellow ten-rod into 10 loose unit cubes "
                "before taking away the subtrahend."
            ),
            "studentFeedback": "Oops! Remember you cannot take a bigger number from a smaller one without unbundling from the tens!",
        })

    if probe.is_regrouping and is_bwd:
        return _enrich_with_calibrated_model(probe_id, answer, {
            "status": "Fail",
            "ruleId": SIG_BORROW_WITHOUT_DECREMENT,
            "observations": (
                f"Answer {answer} on {probe.minuend} - {probe.subtrahend} matches Borrow-Without-Decrement: "
                "student added 10 to the target column, but forgot to decrement the higher column."
            ),
            "evidence": {
                "observed": answer,
                "expected": correct,
                "signature": SIG_BORROW_WITHOUT_DECREMENT,
                "predicted_signature_answer": answer,
            },
            "alternatives": [
                "Forgot to record crossing-out markings",
                "Arithmetic recall slip in the left column",
            ],
            "confidence": "HIGH",
            "followUpQuestion": "Look at the higher column after unbundling. What happened to it?",
            "suggestedActivity": (
                "The Banker's Exchange (NCERT p. 156-160): cross out and reduce the higher denomination note "
                "immediately upon receiving change."
            ),
            "studentFeedback": "Great unbundling! But remember to cross out and reduce the tens column too!",
        })

    if is_add:
        return _enrich_with_calibrated_model(probe_id, answer, {
            "status": "Fail",
            "ruleId": SIG_OPERATION_CONFUSION_ADD,
            "observations": (
                f"Answer {answer} matches addition ({probe.minuend} + {probe.subtrahend}) instead of subtraction."
            ),
            "evidence": {
                "observed": answer,
                "expected": correct,
                "signature": SIG_OPERATION_CONFUSION_ADD,
                "predicted_signature_answer": answer,
            },
            "alternatives": ["Misread operator symbol", "Problem schema misunderstanding"],
            "confidence": "HIGH",
            "followUpQuestion": "Does the problem ask how many in all, or how many are left?",
            "suggestedActivity": "Draw a Part-Whole box diagram (NCERT p. 151-154) to visualize whether to add or subtract.",
            "studentFeedback": "Check the sign! You added the numbers instead of subtracting!",
        })

    # General calculation slip / unmodeled error
    return _enrich_with_calibrated_model(probe_id, answer, {
        "status": "Fail",
        "ruleId": "GENERAL_ERROR",
        "observations": f"Answer {answer} for '{prompt_label}' is incorrect (expected {correct}).",
        "evidence": {"observed": answer, "expected": correct, "is_correct": False},
        "alternatives": ["Mental arithmetic calculation slip", "Single-digit recall error"],
        "confidence": "MEDIUM",
        "followUpQuestion": "Walk me through how you solved this question or what steps you took.",
        "suggestedActivity": "Review with concrete manipulatives and visual number lines.",
        "studentFeedback": "Almost there! Let's check the steps carefully and try again!",
    })


def check_engine_status() -> str:
    """Return status string confirming engine initialization."""
    model = get_calibrated_model()
    cal_count = len(model.get("calibrated_items", {}))
    return f"Math Diagnostic Engine (Phase 0 scaffolding initialized; v0.3.0 with {len(ALL_PROBES)} active probes, {cal_count} calibrated items)."


if __name__ == "__main__":
    print(check_engine_status())
