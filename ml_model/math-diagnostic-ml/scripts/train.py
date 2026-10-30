"""Cognitive Diagnostic Model Calibration Pipeline for NCERT Class 3 Mathematics.

Curriculum: NCERT Class 3 Mathematics ("Maths Mela", First Edition 2024 / Reprint 2026-27)
Chapters:
- Chapter 1: "What's in a Name?" (pp. 1-8)
- Chapter 2: "Toy Joy" (pp. 9-15)
- Chapter 3: "Double Century" (pp. 16-28)
- Chapter 4: "Vacation with My Nani Maa" (pp. 29-43)
- Chapter 5: "Fun with Shapes" (pp. 44-63)
- Chapter 12: "Give and Take" (pp. 150-164)
- Canonical Subtraction Regrouping Benchmark

Calibrates:
1. Q-Matrix: 27 diagnostic probes mapped to 12 latent cognitive skills.
2. DINA/Bayesian Item Parameters: slip rate (s_j), guess rate (g_j), item difficulty, discrimination.
3. Distractor Misconception Signatures across Arithmetic, Spatial, Geometric, and Data domains.
4. Dual Pedagogical Interventions: Teacher Clinical Review & Student Mascot Scaffolding.

Exports calibrated model weights and diagnostic rules to:
models/calibrated_diagnostic_model.json
"""

import argparse
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import sys
from typing import Any, Dict, List, Tuple

# Ensure project src is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from math_diagnostic.engine import (
    ALL_PROBES,
    APPROVED_PROBES,
    FOUNDATION_PROBES,
    CH03_CH04_PROBES,
    CH05_CH06_PROBES,
    CH07_CH08_PROBES,
    CH09_CH10_PROBES,
    CH11_CH13_CH14_PROBES,
    SIG_BORROW_WITHOUT_DECREMENT,
    SIG_CORNER_IN_CIRCLE_CONFUSION,
    SIG_CURVED_FACES_ONLY_ERROR,
    SIG_DECADE_CROSSING_STUMBLE,
    SIG_DICE_SEQUENTIAL_OPPOSITE,
    SIG_FLAT_FACES_ONLY_ERROR,
    SIG_GRID_DIRECTION_INVERSION,
    SIG_OPERATION_CONFUSION_ADD,
    SIG_REVERSE_HTO_ALIGNMENT,
    SIG_SMALLER_FROM_LARGER,
    SIG_SQUARE_ATTRIBUTE_OVERGENERALIZATION,
    SIG_SQUARE_RECTANGLE_DISJUNCTION,
    SIG_ZERO_ACROSS_BORROW,
    SIG_ZERO_PLACEHOLDER_OMISSION,
    SIG_CARRY_OVER_OMISSION,
    SIG_CONCATENATION_WITHOUT_REGROUPING,
    SIG_MINUEND_HUNDRED_ANCHORING_BIAS,
    SIG_ADDITION_INSTEAD_OF_MULTIPLICATION,
    SIG_SUBTRACTION_INSTEAD_OF_ADDITION,
    SIG_SUBTRACTION_MAGNITUDE_OVERESTIMATION,
    SIG_BRIDGING_TEN_OVERSHOOT_ERROR,
    SIG_ONES_DROPOUT_ERROR,
    SIG_CURVED_OR_TRIANGULAR_FACES_BIAS,
    SIG_PRISM_CUBOID_CONFUSION,
    SIG_SUB_PARTS_ONLY_COUNT,
    SIG_OPPOSITE_CORNERS_ONLY,
    SIG_RIGHT_ANGLE_DEFAULT,
    SIG_REVERSE_TENS_ONES_MAPPING,
    SIG_ONES_MAGNITUDE_OVERRIDE_TENS,
    SIG_ONES_TENS_INVERSION,
    SIG_SUBTRACTED_FROM_ONES,
    SIG_RIGHT_STEP_CONFUSION,
    SIG_OUT_OF_BOUNDS_HIGH,
    SIG_CHORD_UNEQUAL_PARTITION_BIAS,
    SIG_HALF_QUARTER_CONFUSION,
    SIG_RESOURCE_NEGLECT_FLOWERS_ONLY,
    SIG_DIVIDEND_HALF_CONFUSION,
    SIG_PERSPECTIVE_RIGIDITY_BIAS,
    SIG_ALL_FIVES_DEFAULT,
    SIG_HORN_COUNT_DUPLICATION,
    SIG_ZERO_TENS_OMISSION_3DIGIT,
    SIG_ONES_TENS_VALUE_CONFUSION,
    SIG_DECADE_JUMP_CALCULATION_SLIP,
    SIG_NEIGHBOURING_LANDMARK_CONFUSION,
    SIG_TENS_DIGIT_POSITION_CONFUSION,
    SIG_FENCEPOST_CUT_COUNT_ERROR,
    SIG_HANDSPAN_INVARIANCE_ASSUMPTION,
    SIG_ORIENTATION_NEGLECT_2D,
    SIG_QUARTER_HALF_METRE_CONFUSION,
    SIG_UNIT_INAPPROPRIATE_SCALE_BIAS,
    SIG_BHUTASANKHYA_DIGIT_INVERSION,
    SIG_CAPACITY_UNIT_SIZE_NEGLECT,
    SIG_HEIGHT_ONLY_VOLUME_BIAS,
    SIG_CONSERVATION_OF_VOLUME_VIOLATION,
    SIG_HALF_QUARTER_CAPACITY_CONFUSION,
    SIG_PAN_BALANCE_TILT_INVERSION,
    SIG_TOTAL_EQUAL_PART_CONFUSION,
    SIG_CALENDAR_REOPEN_OFFSET_ERROR,
    SIG_CALENDAR_WEEKS_DEFAULT,
    SIG_LUNAR_SOLAR_FESTIVAL_CONFUSION,
    SIG_HOUR_MINUTE_CONFUSION,
    SIG_QUARTER_POINTS_AT_FOUR_ERROR,
    SIG_ONE_NUMBER_ONE_MINUTE_ERROR,
    SIG_COLOR_COUNT_WITHOUT_ORDER_SYMMETRY,
    SIG_TRANSLATION_INSTEAD_OF_REFLECTION,
    SIG_GAP_PERMISSIBLE_MISCONCEPTION,
    SIG_OPEN_BOX_FACIAL_OMISSION,
    SIG_CYLINDER_NET_INVERSION,
    SIG_DEDUCTIVE_REASONING_DEFICIT,
    SIG_WEIGH_ALL_TOGETHER_ERROR,
    SIG_ASYMMETRIC_FOLD_MISCONCEPTION,
    SIG_MAP_LEGEND_PURPOSE_MISCONCEPTION,
    SIG_CUBE_EDGES_CONFUSION,
    TEXTBOOK_PROBES,
    calculate_signature_answer,
)

# Cognitive Skills (Q-Matrix Latent Attributes) across the NCERT Class 3 Curriculum
COGNITIVE_SKILLS = [
    {
        "id": "SINGLE_DIGIT_FACTS",
        "name": "Single-Digit Arithmetic Facts",
        "description": "Fluency recalling elementary addition and subtraction facts (a ± b) without regrouping.",
        "ncert_ref": "Class 3 Chapter 4, pp. 29-31; Chapter 12, pp. 150-151",
    },
    {
        "id": "ONES_REGROUPING",
        "name": "Ones-from-Tens Regrouping",
        "description": "Ability to unbundle 1 ten into 10 ones when minuend ones < subtrahend ones.",
        "ncert_ref": "Class 3 Chapter 12, pp. 152-154; Chapter 4, p. 33",
    },
    {
        "id": "TENS_REGROUPING",
        "name": "Tens-from-Hundreds Regrouping",
        "description": "Ability to unbundle 1 hundred into 10 tens when minuend tens < subtrahend tens.",
        "ncert_ref": "Class 3 Chapter 12, pp. 154-156",
    },
    {
        "id": "ZERO_REGROUPING",
        "name": "Regrouping Across Zeros",
        "description": "Sequential two-stage unbundling across zero digits (e.g. 500 - 209, 600 - 82).",
        "ncert_ref": "Class 3 Chapter 12, pp. 162-164",
    },
    {
        "id": "PLACE_VALUE_BUNDLES",
        "name": "Base-10 Bundling & Place Value (HTO)",
        "description": "Composing and decomposing numbers 100-200 using 100s, 10s, and 1s with 0-placeholders.",
        "ncert_ref": "Class 3 Chapter 3, pp. 16-24",
    },
    {
        "id": "NUMBER_LINE_NAVIGATION",
        "name": "Number Line & Ginladi Jumps",
        "description": "Navigating number lines and bead strings with chunked jumps of 5, 10, 20 and decade crossing.",
        "ncert_ref": "Class 3 Chapter 3, pp. 23-28; Chapter 4, pp. 32-34",
    },
    {
        "id": "NUMBER_GRID_TWO_AXIS",
        "name": "Smart 100-Grid Two-Axis Navigation",
        "description": "Adding/subtracting 2-digit numbers using vertical (±10) and horizontal (±1) grid steps.",
        "ncert_ref": "Class 3 Chapter 4, pp. 35-37",
    },
    {
        "id": "WORD_PROBLEM_SEMANTICS",
        "name": "Word Problem Semantics & Part-Whole Modeling",
        "description": "Interpreting situational text (Part-Whole) and avoiding operation confusion / keyword traps.",
        "ncert_ref": "Class 3 Chapter 1, p. 2; Chapter 4, pp. 38-42; Chapter 12, pp. 151-155",
    },
    {
        "id": "TALLY_AND_COUNTING",
        "name": "Tally Marks & Cardinality",
        "description": "Tracking quantities with tallies, one-to-one correspondence, and discrete letter counting.",
        "ncert_ref": "Class 3 Chapter 1, pp. 1-6",
    },
    {
        "id": "SOLID_SHAPES_3D",
        "name": "3D Solids & Spatial Invariants",
        "description": "Discriminating Cube, Cuboid, Cylinder, Cone, Sphere; applying the die opposite face sum=7 rule.",
        "ncert_ref": "Class 3 Chapter 2, pp. 9-15",
    },
    {
        "id": "FACES_EDGES_VERTICES",
        "name": "Faces, Edges & Vertices Attributes",
        "description": "Identifying and counting flat vs curved faces, straight vs curved edges, and corners.",
        "ncert_ref": "Class 3 Chapter 2, pp. 10-14",
    },
    {
        "id": "2D_SHAPE_PROPERTIES_ANGLES",
        "name": "2D Shapes & Square Corners (Angles)",
        "description": "Sides and corners of polygons; classifying square corners (right angles); folding circle center.",
        "ncert_ref": "Class 3 Chapter 5, pp. 44-60",
    },
    {
        "id": "BENCHMARK_ESTIMATION",
        "name": "Benchmark Estimation & Inequality Comparison",
        "description": "Comparing numbers and operations against anchor benchmarks (> 100 vs < 100, 50) without full computation.",
        "ncert_ref": "Class 3 Chapter 4, p. 43; Chapter 12, p. 154",
    },
    {
        "id": "TWO_DIGIT_ADDITION_REGROUPING",
        "name": "2-Digit Addition with Regrouping (Carry-Over)",
        "description": "Composing 10 ones into 1 ten and transferring to the tens column in column addition.",
        "ncert_ref": "Class 3 Chapter 4, pp. 40-41; Chapter 12, pp. 150-151",
    },
    {
        "id": "THREE_DIGIT_PLACE_VALUE_HTO",
        "name": "Three-Digit Place Value & Bundling (200-500+)",
        "description": "Composing and decomposing 3-digit numbers in Hundreds, Tens, and Ones using bundles, boxes, and sliders.",
        "ncert_ref": "Class 3 Chapter 6, pp. 64-81",
    },
    {
        "id": "NUMBER_COMPARISON_INEQUALITY",
        "name": "3-Digit Number Comparison & Inequality Logic",
        "description": "Comparing numbers using > and < by evaluating place-value hierarchy (Hundreds -> Tens -> Ones).",
        "ncert_ref": "Class 3 Chapter 6, pp. 79-80",
    },
    {
        "id": "HIGH_RISE_APARTMENT_GRID_COORDINATES",
        "name": "Multi-Story Apartment Grid Coordinate Tracking",
        "description": "Tracking vertical floor numbers (Tens) and horizontal column numbers (Ones) on apartment grids.",
        "ncert_ref": "Class 3 Chapter 6, pp. 73-75",
    },
    {
        "id": "COMBINATORIAL_DIGIT_REASONING",
        "name": "Combinatorial Digit Reasoning & Riddle Constraints",
        "description": "Constructing greatest/smallest numbers under constraints and solving 'Who am I?' place-value riddles.",
        "ncert_ref": "Class 3 Chapter 6, pp. 75, 81",
    },
    {
        "id": "CIRCLE_PROPERTIES",
        "name": "Circle Properties & Paper-Folding Center Discovery",
        "description": "Identifying curved continuous boundary, zero corners, zero straight sides, and center from fold creases.",
        "ncert_ref": "Class 3 Chapter 5, pp. 58-59",
    },
    {
        "id": "FRACTION_EQUAL_PARTITIONING",
        "name": "Equal Partitioning & Fair Share (Halves & Quarters)",
        "description": "Discriminating equal area/length partitions from unequal chord/segment cuts in continuous wholes.",
        "ncert_ref": "Class 3 Chapter 8, pp. 107-111",
    },
    {
        "id": "FRACTION_QUANTITY_OPERATIONS",
        "name": "Fraction of a Discrete Collection",
        "description": "Calculating fractions (1/2, 1/4, 3/4) of discrete sets (e.g. 8 birds, 16 flowers) via fair sharing.",
        "ncert_ref": "Class 3 Chapter 8, pp. 112-116",
    },
    {
        "id": "DOUBLE_AND_HALF_RELATIONS",
        "name": "Double and Half Inverse Relationships",
        "description": "Understanding that half of 2n is n and double of n is 2n, and navigating these relationships on the number line.",
        "ncert_ref": "Class 3 Chapter 8, pp. 110-111",
    },
    {
        "id": "MULTIPLICATION_ARRAY_COMMUTATIVITY",
        "name": "Multiplication as Equal Groups & Array Commutativity",
        "description": "Unitizing equal groups, repeated addition, and understanding array commutativity (a x b = b x a).",
        "ncert_ref": "Class 3 Chapter 7, pp. 82-89, 94-96",
    },
    {
        "id": "DIVISION_EQUAL_SHARING_REPEATED_SUBTRACTION",
        "name": "Division as Fair Sharing & Repeated Subtraction",
        "description": "Fair distribution into equal parts and quotitive measurement via repeated subtraction.",
        "ncert_ref": "Class 3 Chapter 7, pp. 89-93, 104-106",
    },
    {
        "id": "LIMITING_RESOURCE_REASONING",
        "name": "Limiting Resource Bottleneck Reasoning",
        "description": "Determining the maximum number of multi-component items possible given constrained component inventories.",
        "ncert_ref": "Class 3 Chapter 7, p. 84",
    },
    {
        "id": "MULTIPLICATION_TABLE_PATTERNS",
        "name": "Multiplication Table Patterns & Digit Invariants",
        "description": "Recognizing unit digit patterns (times-5 alternating 0 and 5) and table additivity combinations.",
        "ncert_ref": "Class 3 Chapter 7, pp. 97-101",
    },
    {
        "id": "THREE_DIGIT_NUMERATION_UP_TO_1000",
        "name": "3-Digit Numeration & Word Names up to 1000",
        "description": "Reading, writing, and decomposing 3-digit numbers to 1000 with zero placeholders and word names.",
        "ncert_ref": "Class 3 Chapter 9, pp. 117-118, 120, 125",
    },
    {
        "id": "LANDMARK_AND_NEIGHBOURING_BOUNDS",
        "name": "Neighbouring Landmarks & Bounds (Hundreds, Fifties, Tens)",
        "description": "Identifying neighbouring landmarks and calculating step jumps on the 1000 number line.",
        "ncert_ref": "Class 3 Chapter 9, pp. 118-119, 122",
    },
    {
        "id": "NUMBER_CHAIN_AND_SKIP_PATTERNS",
        "name": "Number Chains & Skip Counting (+25, +30, +100)",
        "description": "Completing multi-step number chains and additive sequence patterns up to 1000.",
        "ncert_ref": "Class 3 Chapter 9, p. 121",
    },
    {
        "id": "BHUTASANKHYA_WORD_NUMERALS",
        "name": "Bhutasankhya Word Numerals Heritage",
        "description": "Encoding and decoding place-value digits using ancient Indian semantic word numeral symbols.",
        "ncert_ref": "Class 3 Chapter 9, pp. 126-127",
    },
    {
        "id": "MEASUREMENT_NONSTANDARD_UNITS_VARIANCE",
        "name": "Non-Standard Measurement & Unit Variance",
        "description": "Understanding that informal body units (handspans, footsteps) vary across people and require standard units.",
        "ncert_ref": "Class 3 Chapter 10, pp. 128-130, 133",
    },
    {
        "id": "MEASUREMENT_STANDARD_METRE_BENCHMARK",
        "name": "Standard Metre Unit & Relative Benchmarks",
        "description": "Using the 1-metre benchmark to classify real-world objects as greater than, less than, or equal to 1 metre.",
        "ncert_ref": "Class 3 Chapter 10, pp. 133-136",
    },
    {
        "id": "METRE_FRACTIONAL_SUBDIVISIONS",
        "name": "Fractions of a Metre (Half & Quarter Metre)",
        "description": "Folding metre ropes into half metres (50 cm) and quarter metres (25 cm) and measuring distances.",
        "ncert_ref": "Class 3 Chapter 10, pp. 136-137",
    },
    {
        "id": "FENCEPOST_PARTITION_LOGIC",
        "name": "Fencepost Partition Logic (Cuts vs Pieces)",
        "description": "Applying partition logic where n equal segments require n - 1 cuts in continuous materials.",
        "ncert_ref": "Class 3 Chapter 10, p. 138",
    },
    {
        "id": "INDIRECT_SPATIAL_MEASUREMENT",
        "name": "Indirect Spatial Measurement & 2D Rotation",
        "description": "Using common transfer tools (strings) and orientation changes (breadth vs doorway) to solve spatial fit.",
        "ncert_ref": "Class 3 Chapter 10, pp. 131-132",
    },
    {
        "id": "CAPACITY_VOLUME_CONSERVATION",
        "name": "Capacity & Liquid Volume Conservation",
        "description": "Understanding liquid volume invariance across different container shapes and standard unit Litre.",
        "ncert_ref": "Class 3 Chapter 11, pp. 139-144",
    },
    {
        "id": "MASS_WEIGHT_PAN_BALANCE",
        "name": "Mass, Weight & Pan-Balance Directionality",
        "description": "Comparing weights using pan-balances (downward tilt = heavier) and standard unit Kilogram.",
        "ncert_ref": "Class 3 Chapter 11, pp. 145-148",
    },
    {
        "id": "DEDUCTIVE_BALANCE_LOGIC",
        "name": "Deductive Pan-Balance Logic",
        "description": "Applying single-weighing deductive elimination to identify defective or heavier items.",
        "ncert_ref": "Class 3 Chapter 11, p. 149",
    },
    {
        "id": "CALENDAR_INTERVAL_CALCULATION",
        "name": "Calendar Reading & Vacation Interval Calculation",
        "description": "Interpreting monthly grids, calculating closed-to-reopen dates, and knowing 52 weeks in a standard year.",
        "ncert_ref": "Class 3 Chapter 13, pp. 165-171",
    },
    {
        "id": "TIME_ANALOG_CLOCK_READING",
        "name": "Analog Clock Reading & Timescale Sorting",
        "description": "Reading clock hands to quarter past / half past (5-min jumps) and sorting durations by seconds/minutes/hours/months.",
        "ncert_ref": "Class 3 Chapter 13, pp. 172-176",
    },
    {
        "id": "BILATERAL_SYMMETRY_REFLECTION",
        "name": "Bilateral Symmetry & Mirror Reflections",
        "description": "Identifying mirror axes, reversing symmetrical sequences, and tracking mirror line distance invariance.",
        "ncert_ref": "Class 3 Chapter 14, pp. 177-182",
    },
    {
        "id": "TILING_AND_TESSELLATION",
        "name": "Surface Tiling & Tessellation Constraints",
        "description": "Covering 2D surfaces edge-to-edge with polygon tiles with zero gaps and zero overlaps.",
        "ncert_ref": "Class 3 Chapter 14, pp. 183-186",
    },
    {
        "id": "NETS_OF_3D_SOLIDS",
        "name": "2D Unfolding Nets of 3D Solids",
        "description": "Deconstructing 3D solids (Cube, Cuboid, Cylinder, Cone) into their flat 2D nets.",
        "ncert_ref": "Class 3 Chapter 14, pp. 189-192, 193-208",
    },
    {
        "id": "MAP_SPATIAL_NAVIGATION",
        "name": "Directional Map Reading & Legend Navigation",
        "description": "Interpreting 2D spatial fair maps using symbols, keys, and relative directional navigation.",
        "ncert_ref": "Class 3 Chapter 14, pp. 187-188",
    },
]

# Prior Probabilities across Primary Classroom Cognitive States
PRIORS = {
    "MASTERY": 0.35,
    SIG_SMALLER_FROM_LARGER: 0.18,
    SIG_BORROW_WITHOUT_DECREMENT: 0.12,
    SIG_ZERO_ACROSS_BORROW: 0.05,
    SIG_OPERATION_CONFUSION_ADD: 0.08,
    SIG_ZERO_PLACEHOLDER_OMISSION: 0.05,
    SIG_DECADE_CROSSING_STUMBLE: 0.04,
    SIG_GRID_DIRECTION_INVERSION: 0.04,
    SIG_SQUARE_RECTANGLE_DISJUNCTION: 0.03,
    "GENERAL_SLIP": 0.06,
}


def build_curriculum_q_matrix() -> Dict[str, Dict[str, int]]:
    """Construct the unified 27-item x 12-skill Q-Matrix."""
    q_matrix = {}
    for probe_id, probe in ALL_PROBES.items():
        is_canonical = probe_id.startswith("probe_") or probe_id.startswith("ctrl_")
        is_ch12 = probe_id.startswith("ncert_ch12_")
        is_ch01 = probe_id.startswith("ncert_ch01_")
        is_ch02 = probe_id.startswith("ncert_ch02_")
        is_ch03 = probe_id.startswith("ncert_ch03_")
        is_ch04 = probe_id.startswith("ncert_ch04_")
        is_ch05 = probe_id.startswith("ncert_ch05_")
        is_ch06 = probe_id.startswith("ncert_ch06_")
        is_ch07 = probe_id.startswith("ncert_ch07_")
        is_ch08 = probe_id.startswith("ncert_ch08_")
        is_ch09 = probe_id.startswith("ncert_ch09_")
        is_ch10 = probe_id.startswith("ncert_ch10_")
        is_ch11 = probe_id.startswith("ncert_ch11_")
        is_ch13 = probe_id.startswith("ncert_ch13_")
        is_ch14 = probe_id.startswith("ncert_ch14_")

        # Initialize skill vector
        skills = {s["id"]: 0 for s in COGNITIVE_SKILLS}

        # Subtraction / Arithmetic Probes
        if is_canonical or is_ch12 or is_ch04 or probe_id == "ncert_ch01_cows_43_2":
            skills["SINGLE_DIGIT_FACTS"] = 1

        if getattr(probe, "is_regrouping", False):
            if probe.minuend % 10 < probe.subtrahend % 10:
                skills["ONES_REGROUPING"] = 1
            if probe.minuend >= 100 and ((probe.minuend // 10) % 10) <= ((probe.subtrahend // 10) % 10):
                skills["TENS_REGROUPING"] = 1
            if "0" in str(probe.minuend):
                skills["ZERO_REGROUPING"] = 1

        # Chapter-Specific Skill Mappings
        if is_ch01:
            skills["TALLY_AND_COUNTING"] = 1
            skills["WORD_PROBLEM_SEMANTICS"] = 1

        if is_ch02:
            skills["SOLID_SHAPES_3D"] = 1
            skills["FACES_EDGES_VERTICES"] = 1

        if is_ch03:
            skills["PLACE_VALUE_BUNDLES"] = 1
            skills["NUMBER_LINE_NAVIGATION"] = 1

        if is_ch04:
            skills["WORD_PROBLEM_SEMANTICS"] = 1
            if "grid" in probe_id:
                skills["NUMBER_GRID_TWO_AXIS"] = 1
            else:
                skills["NUMBER_LINE_NAVIGATION"] = 1

        if is_ch05:
            skills["2D_SHAPE_PROPERTIES_ANGLES"] = 1
            if "circle" in probe_id:
                skills["CIRCLE_PROPERTIES"] = 1
            if "cuboid" in probe_id:
                skills["SOLID_SHAPES_3D"] = 1
                skills["FACES_EDGES_VERTICES"] = 1

        if is_ch06:
            skills["THREE_DIGIT_PLACE_VALUE_HTO"] = 1
            if "comparison" in probe_id or "flag" in probe_id:
                skills["NUMBER_COMPARISON_INEQUALITY"] = 1
            if "apartment" in probe_id:
                skills["HIGH_RISE_APARTMENT_GRID_COORDINATES"] = 1
            if "who_am_i" in probe_id or "digits" in probe_id:
                skills["COMBINATORIAL_DIGIT_REASONING"] = 1
            if "number_line" in probe_id or "slider" in probe_id:
                skills["NUMBER_LINE_NAVIGATION"] = 1

        if is_ch07:
            if "multiplication" in probe_id or "bed" in probe_id or "sweet" in probe_id:
                skills["MULTIPLICATION_ARRAY_COMMUTATIVITY"] = 1
            if "distribute" in probe_id or "repeated_subtraction" in probe_id or "wheels" in probe_id or "necklace" in probe_id:
                skills["DIVISION_EQUAL_SHARING_REPEATED_SUBTRACTION"] = 1
            if "limiting" in probe_id:
                skills["LIMITING_RESOURCE_REASONING"] = 1
            if "table_5" in probe_id or "pattern" in probe_id:
                skills["MULTIPLICATION_TABLE_PATTERNS"] = 1
            if "riddle" in probe_id or "horns" in probe_id:
                skills["COMBINATORIAL_DIGIT_REASONING"] = 1
            if "shortfall" in probe_id:
                skills["WORD_PROBLEM_SEMANTICS"] = 1
                skills["SINGLE_DIGIT_FACTS"] = 1

        if is_ch08:
            if "partition" in probe_id or "quarters_in_a_whole" in probe_id or "chikki" in probe_id:
                skills["FRACTION_EQUAL_PARTITIONING"] = 1
            if "birds" in probe_id or "flowers" in probe_id or "three_quarters" in probe_id:
                skills["FRACTION_QUANTITY_OPERATIONS"] = 1
            if "double" in probe_id or "half" in probe_id or "number_line" in probe_id or "riddle" in probe_id:
                skills["DOUBLE_AND_HALF_RELATIONS"] = 1
            if "number_line" in probe_id:
                skills["NUMBER_LINE_NAVIGATION"] = 1

        if is_ch09:
            skills["THREE_DIGIT_NUMERATION_UP_TO_1000"] = 1
            if "crane" in probe_id or "neighbouring" in probe_id or "loop" in probe_id:
                skills["LANDMARK_AND_NEIGHBOURING_BOUNDS"] = 1
                skills["NUMBER_LINE_NAVIGATION"] = 1
            if "skip" in probe_id or "ladder" in probe_id:
                skills["NUMBER_CHAIN_AND_SKIP_PATTERNS"] = 1
            if "bhutasankhya" in probe_id:
                skills["BHUTASANKHYA_WORD_NUMERALS"] = 1
            if "slips" in probe_id or "crows" in probe_id or "tambola" in probe_id:
                skills["PLACE_VALUE_BUNDLES"] = 1

        if is_ch10:
            if "handspan" in probe_id or "arms" in probe_id:
                skills["MEASUREMENT_NONSTANDARD_UNITS_VARIANCE"] = 1
            if "benchmark" in probe_id or "saree" in probe_id:
                skills["MEASUREMENT_STANDARD_METRE_BENCHMARK"] = 1
            if "folding" in probe_id or "jumping" in probe_id:
                skills["METRE_FRACTIONAL_SUBDIVISIONS"] = 1
            if "cuts" in probe_id or "pieces" in probe_id:
                skills["FENCEPOST_PARTITION_LOGIC"] = 1
            if "door" in probe_id or "table" in probe_id or "lights" in probe_id:
                skills["INDIRECT_SPATIAL_MEASUREMENT"] = 1

        if is_ch11:
            if "juice" in probe_id or "glass" in probe_id or "jug" in probe_id or "bottle" in probe_id or "quarter_litre" in probe_id:
                skills["CAPACITY_VOLUME_CONSERVATION"] = 1
            if "balance" in probe_id or "salt" in probe_id or "daal" in probe_id or "tea" in probe_id:
                skills["MASS_WEIGHT_PAN_BALANCE"] = 1
            if "balls" in probe_id or "tricky" in probe_id:
                skills["DEDUCTIVE_BALANCE_LOGIC"] = 1

        if is_ch13:
            if "calendar" in probe_id:
                skills["CALENDAR_INTERVAL_CALCULATION"] = 1
            if "age" in probe_id or "birth_certificate" in probe_id:
                skills["WORD_PROBLEM_SEMANTICS"] = 1
                skills["CALENDAR_INTERVAL_CALCULATION"] = 1
            if "clock" in probe_id or "duration" in probe_id:
                skills["TIME_ANALOG_CLOCK_READING"] = 1

        if is_ch14:
            if "mala" in probe_id or "kolam" in probe_id or "mask" in probe_id or "mirror" in probe_id or "tit_for_tat" in probe_id:
                skills["BILATERAL_SYMMETRY_REFLECTION"] = 1
            if "tessellation" in probe_id or "tangram" in probe_id:
                skills["TILING_AND_TESSELLATION"] = 1
            if "map" in probe_id:
                skills["MAP_SPATIAL_NAVIGATION"] = 1
            if "net" in probe_id or "cube" in probe_id or "cylinder" in probe_id:
                skills["NETS_OF_3D_SOLIDS"] = 1
                skills["SOLID_SHAPES_3D"] = 1

        if is_ch12:
            skills["WORD_PROBLEM_SEMANTICS"] = 1
            skills["NUMBER_LINE_NAVIGATION"] = 1

        if "estimation" in probe_id:
            skills["BENCHMARK_ESTIMATION"] = 1

        if "apples_total" in probe_id or getattr(probe, "domain", "") == "TWO_DIGIT_ADDITION_REGROUPING":
            skills["TWO_DIGIT_ADDITION_REGROUPING"] = 1

        q_matrix[probe_id] = skills
    return q_matrix


def calibrate_curriculum_item_parameters(q_matrix: Dict[str, Dict[str, int]]) -> Dict[str, Dict[str, Any]]:
    """Calibrate psychometric parameters (slip, guess, difficulty, discrimination) for all 27 items."""
    item_params = {}
    for probe_id, probe in ALL_PROBES.items():
        q_skills = q_matrix.get(probe_id, {})
        skill_count = sum(q_skills.values())

        # Item difficulty (b_j): scales with number of required cognitive skills and concept level
        base_difficulty = 0.25 + (skill_count * 0.10)
        if getattr(probe, "minuend", 0) >= 500:
            base_difficulty += 0.12
        if "0" in str(getattr(probe, "minuend", 0)) and getattr(probe, "is_regrouping", False):
            base_difficulty += 0.10

        # Slip rate (s_j): probability of an error even when possessing required skills
        slip_rate = round(min(0.04 + (0.007 * skill_count), 0.085), 3)

        # Guess rate (g_j): 4-choice MCQ distractor bounds
        guess_rate = 0.04

        # Item discrimination (a_j): item's capacity to distinguish mastery vs misconception
        discrimination = round(1.25 + (0.12 * skill_count), 2)

        signatures = {"CORRECT": probe.correct_answer}
        if getattr(probe, "is_regrouping", False):
            signatures[SIG_SMALLER_FROM_LARGER] = calculate_signature_answer(probe, SIG_SMALLER_FROM_LARGER)
            signatures[SIG_BORROW_WITHOUT_DECREMENT] = calculate_signature_answer(probe, SIG_BORROW_WITHOUT_DECREMENT)

        # Add distractor signatures if present
        for dist_key, dist_val in getattr(probe, "distractors", {}).items():
            if isinstance(dist_val, dict) and "signature" in dist_val:
                try:
                    signatures[dist_val["signature"]] = int(dist_key)
                except (ValueError, TypeError):
                    signatures[dist_val["signature"]] = dist_key

        required_skills = [sid for sid, val in q_skills.items() if val == 1]

        item_params[probe_id] = {
            "probe_id": probe_id,
            "chapter": getattr(probe, "chapter", "Canonical 2-Digit Benchmark"),
            "page": getattr(probe, "page", 150),
            "domain": getattr(probe, "domain", "GENERAL"),
            "correct_answer": probe.correct_answer,
            "required_skills": required_skills,
            "difficulty_b": round(base_difficulty, 2),
            "discrimination_a": discrimination,
            "slip_rate_s": slip_rate,
            "guess_rate_g": guess_rate,
            "signatures": signatures,
        }
    return item_params


def generate_curriculum_pedagogical_catalog() -> Dict[str, Dict[str, Any]]:
    """Build calibrated dual pedagogical policies for Teachers and Students across all domains."""
    catalog = {
        SIG_SMALLER_FROM_LARGER: {
            "domain": "ARITHMETIC_REGROUPING",
            "name": "Smaller-From-Larger Misconception",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'Can you show me how you solved the ones column? If you have 0 (or 2) candies, can you give 5 candies away without opening a 10-pack?'",
                "hands_on_manipulative": "NCERT Dienes HTO Bundling Mat (Chapter 12, pp. 152-154; Chapter 4, p. 33): Physically trade 1 ten-rod into 10 loose unit cubes before removing the subtrahend.",
                "intervention_tier": "Tier 2 Targeted Conceptual Group",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Hold on! Look at the top digit! Can we take a bigger number from a smaller one?",
                "visual_scaffold": "Dienes Ten-Rod Trade: Let's break 1 Ten into 10 Ones first!",
                "growth_mindset_prompt": "You are doing great! Let's trade one bundle and try again!",
            },
        },
        SIG_BORROW_WITHOUT_DECREMENT: {
            "domain": "ARITHMETIC_REGROUPING",
            "name": "Borrow-Without-Decrement Misconception",
            "teacher_guidance": {
                "clinical_inquiry": "Direct student's eye to the higher column: 'Look at the tens (or hundreds) column after you took 1 ten away. How many tens are actually left sitting on the table?'",
                "hands_on_manipulative": "The Banker's Exchange (NCERT Chapter 12, pp. 156-160): Student hands over a ₹10 note first and crosses it out on their ledger before receiving 10 ₹1 coins.",
                "intervention_tier": "Tier 2 Targeted Procedural Execution",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Super unbundling! But wait—when we borrow a ten, how many tens are left?",
                "visual_scaffold": "Cross-Out Reminder: Cross out the tens digit and write the new number right above it!",
                "growth_mindset_prompt": "Almost there! Don't forget to cross out the ten you borrowed!",
            },
        },
        SIG_ZERO_ACROSS_BORROW: {
            "domain": "ARITHMETIC_REGROUPING",
            "name": "Zero-Across-Borrowing Misconception",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'In 500, we have 0 tens and 0 ones. If the ones place needs help, who does it ask? Can the tens give something if it has 0? Where must we go first?'",
                "hands_on_manipulative": "Two-Step Dienes Unbundling (NCERT Chapter 12, pp. 162-164): 500 = 5 Hundred flats. Unbundle 1 hundred to 10 tens, then 1 ten to 10 ones. Middle zero becomes 9!",
                "intervention_tier": "Tier 3 Intensive Clinical Manipulative Support",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Zeros can be tricky! If there are 0 tens in the middle, we have to visit the hundreds first!",
                "visual_scaffold": "Two-Step Unbundle: 1 Hundred becomes 10 Tens, then 1 Ten becomes 10 Ones! The middle zero becomes 9!",
                "growth_mindset_prompt": "You are learning a powerful secret about zeros! Let's unbundle step-by-step!",
            },
        },
        SIG_OPERATION_CONFUSION_ADD: {
            "domain": "WORD_PROBLEMS",
            "name": "Operation Confusion (Addition instead of Subtraction)",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'Let us read the story again. Does the problem ask how many in all, or how many are left / how many more?'",
                "hands_on_manipulative": "NCERT Part-Whole Box Diagrams (Chapter 1, p. 2; Chapter 4, pp. 38-42; Chapter 12, pp. 151-155): Draw a large bar for Whole, divide into Known Part and Unknown Part.",
                "intervention_tier": "Tier 1 Word Problem Comprehension Scaffolding",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Check the question story! Are we finding what is LEFT or putting things together?",
                "visual_scaffold": "Part-Whole Box: Total is given! Subtract the known part to find what is missing!",
                "growth_mindset_prompt": "Stories tell mathematical adventures! Let's see what is left!",
            },
        },
        SIG_ZERO_PLACEHOLDER_OMISSION: {
            "domain": "PLACE_VALUE",
            "name": "Zero-Tens Placeholder Omission",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'What happens if we forget to write the 0 in the tens place? Is 14 the same as 104?'",
                "hands_on_manipulative": "NCERT p. 22 Matchstick Bundles Table: Place 1 under '100', 0 under '10s', and 4 under '1s' using digit cards.",
                "intervention_tier": "Tier 2 Targeted Place-Value Intervention",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Don't forget the zero in the middle for 0 tens! 1 hundred and 4 ones is 104, not 14!",
                "visual_scaffold": "Place-Value Card: [1 Hundred] [0 Tens] [4 Ones] = 104!",
                "growth_mindset_prompt": "Zero is a mighty placeholder! Keep it in the tens place!",
            },
        },
        SIG_DECADE_CROSSING_STUMBLE: {
            "domain": "PLACE_VALUE",
            "name": "Decade-Crossing Number Sequence Stumble",
            "teacher_guidance": {
                "clinical_inquiry": "Count after 109: 107, 108, 109... what comes right after 9 in the tens family?",
                "hands_on_manipulative": "NCERT p. 23 Bead String (Ginladi): Slide 1 bead past 109 to see the decade group of 110.",
                "intervention_tier": "Tier 1 Number Sequence Practice",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "When we add 1 to 9, it bundles into a full ten! 109 becomes 110!",
                "visual_scaffold": "Talking Pot: 1 more than 109 is 110!",
                "growth_mindset_prompt": "You got the decade jump! Next is 110!",
            },
        },
        SIG_GRID_DIRECTION_INVERSION: {
            "domain": "NUMBER_GRID",
            "name": "100-Number Grid Direction Inversion",
            "teacher_guidance": {
                "clinical_inquiry": "On the number grid, moving down adds 10 and moving right adds 1. Which direction did you move?",
                "hands_on_manipulative": "NCERT p. 36 Number Grid: Use transparent counters to jump down rows (+10) and right (+1).",
                "intervention_tier": "Tier 1 Grid Navigation Practice",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "On the grid, jump down to add 10, and step right to add 1!",
                "visual_scaffold": "Grid Navigation: 45 + 30 (down 3 rows = 75) + 4 (right 4 steps = 79)!",
                "growth_mindset_prompt": "Grid jumping is super fun! Follow the arrows!",
            },
        },
        SIG_DICE_SEQUENTIAL_OPPOSITE: {
            "domain": "3D_SHAPES_AND_SOLIDS",
            "name": "Dice Opposite Face Invariant Misunderstanding",
            "teacher_guidance": {
                "clinical_inquiry": "Check the rule on a die: opposite faces ALWAYS sum to 7 (1+6=7, 2+5=7). What number added to 3 makes 7?",
                "hands_on_manipulative": "NCERT p. 14 Die Observation: Hold a physical die between fingers to verify opposite face pairs.",
                "intervention_tier": "Tier 1 Invariant Pattern Discovery",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Remember the die secret! Opposite faces always add up to 7! 3 + ? = 7!",
                "visual_scaffold": "Die Pairs: 1 with 6, 2 with 5, 3 with 4! All sum to 7!",
                "growth_mindset_prompt": "You discovered the magic die pattern!",
            },
        },
        SIG_SQUARE_RECTANGLE_DISJUNCTION: {
            "domain": "2D_GEOMETRY",
            "name": "Square-Rectangle Hierarchical Disjunction",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'What is a rectangle? A 4-sided shape with 4 square corners and opposite sides equal. Does a square have all of those?'",
                "hands_on_manipulative": "NCERT p. 51 Shape Comparison: Fold a square sheet in half to make a rectangle, then unfold and observe properties.",
                "intervention_tier": "Tier 1 Conceptual Geometric Classification",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Fun secret: Every square is actually a special rectangle where all sides happen to be equal!",
                "visual_scaffold": "Shape Family: Squares have 4 square corners and 4 equal sides!",
                "growth_mindset_prompt": "You are thinking like a real geometrician!",
            },
        },
        SIG_CORNER_IN_CIRCLE_CONFUSION: {
            "domain": "2D_GEOMETRY",
            "name": "Circle Center vs Corner Misconception",
            "teacher_guidance": {
                "clinical_inquiry": "Does a round circle have sharp corners on its outside? Where is this point located?",
                "hands_on_manipulative": "NCERT p. 59 Paper Plate Folding: Fold circular paper plate twice; the point where fold creases intersect is the CENTER.",
                "intervention_tier": "Tier 1 Geometric Discovery",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "A circle has 0 corners! The point right in the middle where fold lines meet is the CENTER!",
                "visual_scaffold": "Fold Creases: Cross at the exact center of the circle!",
                "growth_mindset_prompt": "Great folding! That middle point is the circle's center!",
            },
        },
        SIG_CARRY_OVER_OMISSION: {
            "domain": "TWO_DIGIT_ADDITION",
            "name": "Carry-Over Omission in Addition",
            "teacher_guidance": {
                "clinical_inquiry": "In 5 + 7 = 12, what happens to the 1 ten? Where does it get added in the tens column?",
                "hands_on_manipulative": "NCERT p. 40 Matchstick Bundles: Tie 10 loose sticks into 1 new bundle of 10 and place it with the other tens bundles.",
                "intervention_tier": "Tier 2 Column Addition Regrouping Practice",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "5 + 7 = 12! Put 2 in the ones place, and carry the 1 ten to the tens place!",
                "visual_scaffold": "Carry-Over Box: [1 carried] + 8 tens + 6 tens = 15 tens -> 152!",
                "growth_mindset_prompt": "You got the ones digit! Don't leave the carried ten behind!",
            },
        },
        SIG_CONCATENATION_WITHOUT_REGROUPING: {
            "domain": "TWO_DIGIT_ADDITION",
            "name": "Side-by-Side Digit Concatenation",
            "teacher_guidance": {
                "clinical_inquiry": "Can two 2-digit numbers add up to more than one thousand? What is 80 + 60 approximately?",
                "hands_on_manipulative": "NCERT p. 40 Number Line Estimation: Show 85 + 67 is between 100 and 200 using 10-bundle leaps.",
                "intervention_tier": "Tier 2 Place-Value Regrouping Intervention",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Careful! 85 and 67 together is about 150, not 1412! Regroup 10 ones into 1 ten!",
                "visual_scaffold": "Estimate first: 80 + 60 = 140, answer must be near 152!",
                "growth_mindset_prompt": "Always check if your answer makes sense with estimation!",
            },
        },
        SIG_MINUEND_HUNDRED_ANCHORING_BIAS: {
            "domain": "BENCHMARK_ESTIMATION",
            "name": "Minuend Hundred Anchoring Bias",
            "teacher_guidance": {
                "clinical_inquiry": "In 134, how much is beyond 100? Only 34. If we subtract 56, does it drop below 100?",
                "hands_on_manipulative": "NCERT p. 43 Number Line Benchmark: 134 - 34 = 100. Since we subtract 56 (which is 34 + 22), we drop below 100 to 78.",
                "intervention_tier": "Tier 1 Benchmark Estimation",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "134 has only 34 above 100! Taking away 56 takes away MORE than 34, so it drops BELOW 100!",
                "visual_scaffold": "Number Line: 134 -> jump back 34 to 100 -> jump back 22 more to 78 (< 100)!",
                "growth_mindset_prompt": "Awesome reasoning! Anchor to 100 to estimate!",
            },
        },
        SIG_SUBTRACTION_MAGNITUDE_OVERESTIMATION: {
            "domain": "BENCHMARK_ESTIMATION",
            "name": "Subtraction Magnitude Overestimation",
            "teacher_guidance": {
                "clinical_inquiry": "What is 150 - 50? Exactly 100. If we take away 49 (which is LESS than 50), is the result more or less than 100?",
                "hands_on_manipulative": "NCERT p. 43 Number Line Benchmark: Compare taking away 50 (lands at 100) vs taking away 49 (lands at 101).",
                "intervention_tier": "Tier 1 Inverse Inequality Reasoning",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "150 - 50 is exactly 100! Taking away 49 takes away LESS, so the answer is 101 (MORE than 100)!",
                "visual_scaffold": "Benchmark Leap: 150 - 50 = 100, so 150 - 49 = 101 (> 100)!",
                "growth_mindset_prompt": "Subtracting less leaves more! Brilliant thinking!",
            },
        },
        SIG_BRIDGING_TEN_OVERSHOOT_ERROR: {
            "domain": "NUMBER_LINE_NAVIGATION",
            "name": "Bridging Ten Overshoot Error",
            "teacher_guidance": {
                "clinical_inquiry": "Test 65 + 45: 60 + 40 = 100, plus 5 + 5 = 10, so 110! How many jumps from 65 to 70 first?",
                "hands_on_manipulative": "NCERT p. 19 Number Line Jumps: Jump 5 to 70, then 30 to 100 (5 + 30 = 35).",
                "intervention_tier": "Tier 1 Two-Step Number Line Bridging",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "First jump 5 steps to reach 70! From 70 to 100 is 30 steps! 30 + 5 = 35!",
                "visual_scaffold": "Two-step Jump: 65 --(+5)--> 70 --(+30)--> 100 (Total Jump: 35)!",
                "growth_mindset_prompt": "Break the jump into friendly landmarks!",
            },
        },
        SIG_ADDITION_INSTEAD_OF_MULTIPLICATION: {
            "domain": "PLACE_VALUE_AND_HUNDREDS",
            "name": "Addition instead of Repeated Grouping",
            "teacher_guidance": {
                "clinical_inquiry": "Count each packet: 10, 20, 30... How many bindis when all 10 packets are opened?",
                "hands_on_manipulative": "NCERT p. 18 Ginladi / Bundles: Count ten 10-bundles of sticks by tens to reach 100.",
                "intervention_tier": "Tier 1 Skip-Counting and Unitizing Groups",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Each packet has 10! Let's count by tens: 10, 20, 30... up to 100!",
                "visual_scaffold": "10 Packets x 10 Bindis = 100 bindis (One Century)!",
                "growth_mindset_prompt": "Counting groups of 10 makes big numbers easy!",
            },
        },
        SIG_SUBTRACTION_INSTEAD_OF_ADDITION: {
            "domain": "WORD_PROBLEMS",
            "name": "Subtraction instead of Addition",
            "teacher_guidance": {
                "clinical_inquiry": "The problem asks 'How many in all?'. Does that mean combine them or find the difference?",
                "hands_on_manipulative": "NCERT Part-Whole diagram (p. 40): Nandini (85) + Chirag (67) = Total in all (152).",
                "intervention_tier": "Tier 1 Word Problem Target Clarification",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "'In all' means put them TOGETHER! 85 + 67 = 152!",
                "visual_scaffold": "Part-Whole Diagram: 85 + 67 = 152 in all!",
                "growth_mindset_prompt": "Read the story clue words carefully!",
            },
        },
        SIG_REVERSE_TENS_ONES_MAPPING: {
            "domain": "THREE_DIGIT_PLACE_VALUE",
            "name": "Reverse Tens-Ones Place Value Mapping",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'In 280, there are 8 tens and 0 ones. Where does the 8 go in Hundreds-Tens-Ones?'",
                "hands_on_manipulative": "NCERT p. 65 Bangles / Matchstick Bundles: Count 8 bundles of 10 to see it represents 80 in the tens place.",
                "intervention_tier": "Tier 2 Targeted Place-Value Intervention",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "80 means 8 tens! Keep 8 in the tens spot: 280, not 208!",
                "visual_scaffold": "Place-Value Mat: [2 Hundreds] [8 Tens] [0 Ones] = 280!",
                "growth_mindset_prompt": "Tens go in the middle! You got this!",
            },
        },
        SIG_ONES_MAGNITUDE_OVERRIDE_TENS: {
            "domain": "NUMBER_COMPARISON",
            "name": "Ones Magnitude Override Tens Bias",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'When comparing 209 and 290, both have 2 hundreds. Which place do we compare next: tens or ones?'",
                "hands_on_manipulative": "NCERT p. 79 Dienes Blocks: Compare 9 loose unit cubes (9) with 9 ten-rods (90).",
                "intervention_tier": "Tier 1 Place-Value Priority in Comparison",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "290 has 9 tens (90), but 209 has 0 tens! 90 is much bigger than 9, so 209 < 290!",
                "visual_scaffold": "Compare Hundreds first (2=2), then Tens: 0 tens < 9 tens! 209 < 290!",
                "growth_mindset_prompt": "Always check the bigger place value first!",
            },
        },
        SIG_ONES_TENS_INVERSION: {
            "domain": "COMBINATORIAL_REASONING",
            "name": "Ones and Tens Digit Position Inversion",
            "teacher_guidance": {
                "clinical_inquiry": "The riddle says 'I have 9 ones'. In your answer, which digit is in the ones place?",
                "hands_on_manipulative": "NCERT p. 75 Riddle Slots: Fill in empty boxes [_] [_] [9] starting with the clue.",
                "intervention_tier": "Tier 1 Constraint-Based Digit Placement",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "It has 9 ones, so it must end with 9! 1 hundred, 5 tens, 9 ones: 159!",
                "visual_scaffold": "Clue Matching: 9 ones -> last digit is 9! Number is 159!",
                "growth_mindset_prompt": "Match each clue one by one!",
            },
        },
        SIG_SUBTRACTED_FROM_ONES: {
            "domain": "PLACE_VALUE_OPERATIONS",
            "name": "Subtracted from Ones instead of Tens",
            "teacher_guidance": {
                "clinical_inquiry": "When decreasing by 10, which column changes? Do the ones change or the tens?",
                "hands_on_manipulative": "NCERT p. 68 Number Slider: Slide only the middle tens strip down by 1 unit.",
                "intervention_tier": "Tier 1 Mental Addition/Subtraction of 10",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Subtracting 10 changes the TENS digit! 8 tens - 1 ten = 7 tens: 279!",
                "visual_scaffold": "Slider Step: 289 -> change 8 to 7 -> 279!",
                "growth_mindset_prompt": "Tens change with tens! Great try!",
            },
        },
        SIG_RIGHT_STEP_CONFUSION: {
            "domain": "APARTMENT_GRID_COORDINATES",
            "name": "Horizontal Step Confusion on Vertical Grid",
            "teacher_guidance": {
                "clinical_inquiry": "Moving 1 floor straight up is like taking an elevator: it adds 10. Does stepping right go to another floor?",
                "hands_on_manipulative": "NCERT p. 73 Hop Hundreds Home: Trace vertical path from 105 straight up to 115.",
                "intervention_tier": "Tier 1 2D Grid Coordinate Navigation",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Going UP one floor adds 10! 105 + 10 = 115! Stepping right is just next door!",
                "visual_scaffold": "Elevator Arrow: [105] --(UP 1 floor)--> [115]!",
                "growth_mindset_prompt": "Up is +10! Follow the elevator up!",
            },
        },
        SIG_SUB_PARTS_ONLY_COUNT: {
            "domain": "2D_GEOMETRY",
            "name": "Sub-Parts Only Count (Enclosing Shape Omission)",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'You counted the 4 small squares inside. What about the big square frame holding them all?'",
                "hands_on_manipulative": "NCERT p. 51 Drawing Inspection: Trace the large outer boundary with a red crayon.",
                "intervention_tier": "Tier 1 Part-Whole Geometric Decomposition",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Don't forget the BIG outside square! 4 small squares + 1 big square = 5 squares in all!",
                "visual_scaffold": "Nested Shapes: 4 inside + 1 enclosing = 5 squares!",
                "growth_mindset_prompt": "Look for shapes hiding in plain sight!",
            },
        },
        SIG_CHORD_UNEQUAL_PARTITION_BIAS: {
            "domain": "FRACTIONS_EQUAL_PARTITIONING",
            "name": "Chord Unequal Partition Bias",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'To get equal halves, must the fold pass directly through the center? Does any straight cut create two equal halves?'",
                "hands_on_manipulative": "NCERT Chap 8 (pp. 107-109) Paper Folding & Superimposition: Cut paper shapes along fold line and physically place one piece on top of the other to check if they match exactly.",
                "intervention_tier": "Tier 1 Concrete Superimposition Verification",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Equal halves must be the EXACT same size! A cut near the edge leaves one piece tiny and one piece big!",
                "visual_scaffold": "Superimposition Check: Fold and place one piece on top of the other—do they match completely?",
                "growth_mindset_prompt": "Fair sharing means both sides get equal parts! Try superimposing the pieces!",
            },
        },
        SIG_HALF_QUARTER_CONFUSION: {
            "domain": "FRACTIONS_DISCRETE_COLLECTIONS",
            "name": "Half vs Quarter Unit Fraction Confusion",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'When we share into 4 equal groups, is that one-half or one-quarter? How many groups of 2 are in 8?'",
                "hands_on_manipulative": "NCERT Chap 8 (pp. 112-113) 4-Plate Sorting: Distribute 8 counters one by one into 4 bowls to see that each bowl gets 2 (1/4 of 8).",
                "intervention_tier": "Tier 1 Partition Sorting Manipulative",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Dividing into 4 equal groups gives one-quarter (1/4)! 8 shared among 4 is 2, while half (1/2) of 8 is 4!",
                "visual_scaffold": "4 Equal Bowls: 8 counters shared into 4 bowls = 2 counters per bowl (1/4)!",
                "growth_mindset_prompt": "Quarters mean four equal parts! You're getting the hang of fractions!",
            },
        },
        SIG_RESOURCE_NEGLECT_FLOWERS_ONLY: {
            "domain": "LIMITING_RESOURCE_REASONING",
            "name": "Resource Neglect (Single Component Bias)",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'You have enough flowers for 10 rakhis, but how many beads do you have? If each rakhi needs 4 beads, how many can you make with 30 beads?'",
                "hands_on_manipulative": "NCERT Chap 7 (p. 84) Rakhi Crafting Table: Use physical cups containing 30 counters each. Group them into sets of (3 flowers, 4 beads, 1 thread) until beads run out.",
                "intervention_tier": "Tier 2 Multi-Constraint Bottleneck Modeling",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Look at all materials! You have 30 beads, and each rakhi needs 4 beads. 30 / 4 = 7 rakhis with 2 beads left over!",
                "visual_scaffold": "Assembly Table: 30 beads / 4 per rakhi = 7 rakhis! Beads run out first!",
                "growth_mindset_prompt": "Check all your craft supplies! The material that runs out first sets the limit!",
            },
        },
        SIG_DIVIDEND_HALF_CONFUSION: {
            "domain": "DIVISION_EQUAL_SHARING",
            "name": "Dividend-Half Confusion in Division",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'There are 18 laddoos and 9 people. If you give 9 to each person, how many laddoos would you need? 81!'",
                "hands_on_manipulative": "NCERT Chap 7 (pp. 89-91) Sweet Box Distribution: Share 18 counters among 9 cups using 1-to-1 dealing. Each cup gets exactly 2.",
                "intervention_tier": "Tier 1 Concrete Dealing / Fair Sharing",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Share 18 laddoos among 9 friends! 9 groups of 2 = 18. Each friend gets 2 laddoos!",
                "visual_scaffold": "Fair Sharing: 18 / 9 = 2 laddoos per person (not 9)!",
                "growth_mindset_prompt": "Deal them out one by one! Fair share is 2 for each friend!",
            },
        },
        SIG_PERSPECTIVE_RIGIDITY_BIAS: {
            "domain": "MULTIPLICATION_ARRAY_COMMUTATIVITY",
            "name": "Perspective Rigidity Bias (Commutative Invariance)",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'If you stand at the side of the garden bed, 8 rows of 6 flowers looks like 6 rows of 8 flowers. Does the total number of flowers change?'",
                "hands_on_manipulative": "NCERT Chap 7 (pp. 94-96) Rectangular Grid Rotation: Draw an 8x6 grid of dots on paper and rotate the sheet 90 degrees to demonstrate 8 x 6 = 6 x 8 = 48.",
                "intervention_tier": "Tier 1 90-Degree Array Rotation Invariance",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Turning the garden around does not change the flowers! 8 rows of 6 = 6 rows of 8 = 48 flowers either way!",
                "visual_scaffold": "Grid Rotation: 8 x 6 = 48 and 6 x 8 = 48! The array just turned sideways!",
                "growth_mindset_prompt": "Both views give the same total! That's the magic of arrays!",
            },
        },
        SIG_ALL_FIVES_DEFAULT: {
            "domain": "MULTIPLICATION_TABLE_PATTERNS",
            "name": "All-Fives Default Pattern Misconception",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'Let us count by fives: 5, 10, 15, 20, 25, 30... Look at the last digit. Does it always end in 5, or does it alternate?'",
                "hands_on_manipulative": "NCERT Chap 7 (pp. 97-98) Clock Face & Hand Tracing: Highlight multiples of 5 on a clock face (0, 5, 0, 5) showing even numbers end in 0.",
                "intervention_tier": "Tier 1 Parity-Based Ending Digit Pattern",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Look closely at the 5 times table: 5, 10, 15, 20! It alternates between 5 and 0! Even numbers always end in 0!",
                "visual_scaffold": "Ending Digit Pattern: Odd x 5 ends in 5; Even x 5 ends in 0!",
                "growth_mindset_prompt": "Pattern spotted! 0 and 5 take turns at the end!",
            },
        },
        SIG_HORN_COUNT_DUPLICATION: {
            "domain": "COMBINATORIAL_REASONING",
            "name": "Horn Count Duplication in Animal Legs Riddle",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'How many horns does 1 cow have? 2. How many legs? 4. If 1 cow has 2 horns and 4 legs, 2 cows have 4 horns and 8 legs.'",
                "hands_on_manipulative": "NCERT Chap 7 (p. 103) Cow Silhouette Cutouts: Count 2 horns on head and 4 legs below for each animal cutout.",
                "intervention_tier": "Tier 1 Multi-Attribute Animal Modeling",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Each cow has 2 horns and 4 legs! For 2 cows: 2 x 2 = 4 horns, and 2 x 4 = 8 legs!",
                "visual_scaffold": "Cow Attributes: 1 cow = 2 horns, 4 legs. 2 cows = 4 horns, 8 legs!",
                "growth_mindset_prompt": "Count horns and legs per animal! You solved the riddle!",
            },
        },
        SIG_ZERO_TENS_OMISSION_3DIGIT: {
            "domain": "THREE_DIGIT_NUMERATION",
            "name": "Zero-Tens Omission in 3-Digit Number",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'In 504, how many tens are there? 0. If you write 54, what is the value of 5? 5 tens, not 5 hundreds!'",
                "hands_on_manipulative": "NCERT Chap 9 (p. 118) Place Value Tiles: Lay out 5 hundred flats, leave tens column empty (0), and place 4 loose unit cubes.",
                "intervention_tier": "Tier 2 Targeted Zero-Placeholder Intervention",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Don't forget the zero in the middle! 5 hundreds and 4 ones is 504, not 54!",
                "visual_scaffold": "HTO Columns: [5 Hundreds] [0 Tens] [4 Ones] = 504!",
                "growth_mindset_prompt": "Zero protects the tens place! You've got this!",
            },
        },
        SIG_ONES_TENS_VALUE_CONFUSION: {
            "domain": "THREE_DIGIT_NUMERATION",
            "name": "Ones and Tens Value Confusion",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'Does sixty mean 6 tens or 3 tens? Where does the 6 go in Hundreds-Tens-Ones?'",
                "hands_on_manipulative": "NCERT Chap 9 (pp. 117-118) Arrow Cards: Layer 900, 60, and 3 to reveal 963.",
                "intervention_tier": "Tier 1 Place Value Transcoding",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Sixty means 6 tens in the middle! 963, not 936!",
                "visual_scaffold": "Arrow Cards: 900 + 60 + 3 = 963!",
                "growth_mindset_prompt": "Listen to the word clues: sixty is 6 tens!",
            },
        },
        SIG_DECADE_JUMP_CALCULATION_SLIP: {
            "domain": "NUMBER_LINE_NAVIGATION",
            "name": "Decade Jump Calculation Slip",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'From 667 to 660 is 7 steps. How many more steps from 660 to 650? 10. So 7 + 10 = 17 steps!'",
                "hands_on_manipulative": "NCERT Chap 9 (p. 119) Crane Number Line: Use finger to jump 7 back to 660, then leap a full decade of 10 to 650.",
                "intervention_tier": "Tier 1 Number Line Chunking",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Break the jump into two friendly hops: 7 steps to 660, and 10 steps to 650! Total: 17 steps!",
                "visual_scaffold": "Two-hop Jump: 667 --(-7)--> 660 --(-10)--> 650 (7 + 10 = 17)!",
                "growth_mindset_prompt": "Hop to the friendly decade first!",
            },
        },
        SIG_NEIGHBOURING_LANDMARK_CONFUSION: {
            "domain": "NUMBER_LINE_NAVIGATION",
            "name": "Neighbouring Landmark Confusion (Fifties vs Hundreds)",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'Fifties end in 00 or 50. Between which two multiples of 50 does 468 sit?'",
                "hands_on_manipulative": "NCERT Chap 9 (p. 119) Fifties Strip: Highlight 400, 450, 500. 468 is between 450 and 500.",
                "intervention_tier": "Tier 1 Benchmark Landmark Identification",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Fifties count by 50: 400, 450, 500! 468 sits right between 450 and 500!",
                "visual_scaffold": "Fifties Landmark: [450] <--- 468 ---> [500]!",
                "growth_mindset_prompt": "Landmarks are like bus stops: 450 and 500 are the fifties!",
            },
        },
        SIG_TENS_DIGIT_POSITION_CONFUSION: {
            "domain": "THREE_DIGIT_NUMERATION",
            "name": "Tens Digit Position Confusion",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'In a 3-digit number, which place is the tens digit: first, middle, or last?'",
                "hands_on_manipulative": "NCERT Chap 9 (p. 120) Tambola Grid: Use a sliding 3-window frame (H-T-O) to spotlight the middle tens digit.",
                "intervention_tier": "Tier 1 Place-Value Slot Identification",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "The tens digit is always right in the MIDDLE! In 614, the tens digit is 1!",
                "visual_scaffold": "Middle Slot: [Hundreds] [TENS = 1] [Ones] -> 614!",
                "growth_mindset_prompt": "Spot the middle digit for tens!",
            },
        },
        SIG_FENCEPOST_CUT_COUNT_ERROR: {
            "domain": "MEASUREMENT_PARTITION_LOGIC",
            "name": "Fencepost Partition Logic Error (Pieces vs Cuts)",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'Take a strip of paper. Make 1 cut: how many pieces do you get? 2 pieces! So to get 4 pieces, how many cuts do you make?'",
                "hands_on_manipulative": "NCERT Chap 10 (p. 138) Paper Strip Cutting: Make 1 cut (2 pieces), 2 cuts (3 pieces), 3 cuts (4 pieces). Number of cuts is pieces - 1.",
                "intervention_tier": "Tier 1 Concrete Partition Modeling",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "1 cut gives 2 pieces! 2 cuts gives 3 pieces! To get 4 equal pieces, you only need 3 cuts!",
                "visual_scaffold": "Rope Cuts: [Piece 1] |cut 1| [Piece 2] |cut 2| [Piece 3] |cut 3| [Piece 4] (3 cuts = 4 pieces)!",
                "growth_mindset_prompt": "Cuts are always 1 less than the pieces you want!",
            },
        },
        SIG_HANDSPAN_INVARIANCE_ASSUMPTION: {
            "domain": "MEASUREMENT_NONSTANDARD_UNITS",
            "name": "Handspan Invariance Assumption",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'Do all people have hands of the exact same size? If Leena's hands are smaller, will she need more or fewer spans?'",
                "hands_on_manipulative": "NCERT Chap 10 (p. 128) Dual Handspan Measurement: Teacher and student place hands along table to visibly see unit size difference.",
                "intervention_tier": "Tier 1 Informal-to-Standard Conceptual Transition",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Smaller hands take MORE spans to cover the table! Because Leena's hands are smaller, her count will be higher than Adi's!",
                "visual_scaffold": "Hand Comparison: Smaller hand -> more spans needed! That's why we use metre rods!",
                "growth_mindset_prompt": "Different hands mean different counts! That's why standard metres were invented!",
            },
        },
        SIG_ORIENTATION_NEGLECT_2D: {
            "domain": "INDIRECT_SPATIAL_MEASUREMENT",
            "name": "Orientation Neglect in Spatial Clearance",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'Can you turn the table sideways? How wide is the breadth? 70 cm. Since 70 cm is less than 85 cm, will it fit through the door?'",
                "hands_on_manipulative": "NCERT Chap 10 (p. 132) Cardboard Box and Doorway: Rotate a 3D box to slide through a slot narrower than its length.",
                "intervention_tier": "Tier 1 3D Spatial Rotation & Dimension Disaggregation",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Turn the table sideways! Its breadth is only 70 cm, which easily slides through the 85 cm door!",
                "visual_scaffold": "Sideways Turn: 70 cm breadth < 85 cm door width! It fits perfectly!",
                "growth_mindset_prompt": "Think in 3D! Turn it on its side to fit through!",
            },
        },
        SIG_QUARTER_HALF_METRE_CONFUSION: {
            "domain": "METRE_FRACTIONS",
            "name": "Quarter vs Half Metre Fraction Confusion",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'Folding 1 metre once gives half metre. When you fold half in half again, what do you get? A quarter metre (25 cm)!'",
                "hands_on_manipulative": "NCERT Chap 10 (p. 136) 1-Metre Rope Folding: Fold rope in half (50 cm), then fold again to reveal 25 cm (quarter metre).",
                "intervention_tier": "Tier 1 Concrete Folding Halves of Halves",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Folding once gives a HALF metre! Folding it in half again gives a QUARTER metre (25 cm)!",
                "visual_scaffold": "Double Fold: 1 Metre -> Half Metre (1/2) -> Quarter Metre (1/4)!",
                "growth_mindset_prompt": "Half of a half is a quarter! Great job folding!",
            },
        },
        SIG_UNIT_INAPPROPRIATE_SCALE_BIAS: {
            "domain": "MEASUREMENT_STANDARD_UNITS",
            "name": "Unit Inappropriate Scale Bias",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'If you measure a 5-metre saree with a small pencil, how many times must you move the pencil? What do cloth shopkeepers use?'",
                "hands_on_manipulative": "NCERT Chap 10 (pp. 133-134) Metre Rod vs Pencil: Compare measuring 5 metres with a 15 cm pencil vs a 1 m rod.",
                "intervention_tier": "Tier 1 Appropriate Unit Selection",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "A pencil is way too tiny for a long saree! Use a 1-metre measuring rod or tape, just like shopkeepers!",
                "visual_scaffold": "Shopkeeper Tool: 1-Metre Rod measures long cloth quickly and accurately!",
                "growth_mindset_prompt": "Pick the right tool for the job! Big things need metre rods!",
            },
        },
        SIG_BHUTASANKHYA_DIGIT_INVERSION: {
            "domain": "BHUTASANKHYA_WORD_NUMERALS",
            "name": "Bhutasankhya Digit Sequence Inversion",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'Directions is 4 (first card) and Eyes is 2 (second card). Read them left-to-right as digits: 4 followed by 2 is 42.'",
                "hands_on_manipulative": "NCERT Chap 9 (pp. 126-127) Bhutasankhya Cards: Place card 4 in tens slot and card 2 in ones slot to read 42.",
                "intervention_tier": "Tier 1 Word Numeral Order Preservation",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Read the cards in order: Directions = 4, Eyes = 2! Put them together to make 42!",
                "visual_scaffold": "Card Order: [Directions = 4] [Eyes = 2] -> 42!",
                "growth_mindset_prompt": "You decoded ancient Indian word numerals! 4 followed by 2 is 42!",
            },
        },
        SIG_CAPACITY_UNIT_SIZE_NEGLECT: {
            "domain": "MEASUREMENT_CAPACITY",
            "name": "Capacity Container Unit Size Neglect",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'If you drink 6 big bottles of water, is that the same as 6 small cups? Why does container size determine total liquid?'",
                "hands_on_manipulative": "NCERT Chapter 11 (p. 139) Sugarcane Juice: Pour 6 small glasses into a jug, then compare with 6 large mugs to observe liquid height differences.",
                "intervention_tier": "Tier 1 Capacity Volume Invariance",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Big glasses hold way more juice inside! 6 big glasses is much more than 6 small glasses!",
                "visual_scaffold": "Glass Capacity Comparison: Big glass = 300 ml, Small glass = 100 ml. 6 big = 1800 ml!",
                "growth_mindset_prompt": "Container size counts! Bigger glasses hold way more liquid!",
            },
        },
        SIG_HEIGHT_ONLY_VOLUME_BIAS: {
            "domain": "MEASUREMENT_CAPACITY",
            "name": "Height-Only Liquid Volume Bias",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'When milk is poured from a wide bowl into a tall narrow glass, does the amount of milk increase or stay the same?'",
                "hands_on_manipulative": "NCERT Chapter 11 (p. 140) Vessel Transfusion: Pour identical amounts of water between a tall narrow cylinder and a short wide pan.",
                "intervention_tier": "Tier 2 Piagetian Conservation of Volume",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "The glass is taller, but it is also narrower! No juice was added or removed!",
                "visual_scaffold": "Conservation of Volume: Tall and thin vs Short and wide - exactly the same amount of milk!",
                "growth_mindset_prompt": "Changing shapes doesn't change the amount of milk inside! Great thinking!",
            },
        },
        SIG_PAN_BALANCE_TILT_INVERSION: {
            "domain": "MEASUREMENT_WEIGHT",
            "name": "Pan Balance Tilt Inversion",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'When you sit on a see-saw with someone heavier, which side goes down to the ground?'",
                "hands_on_manipulative": "NCERT Chapter 11 (p. 145) Pan Balance: Place heavy stone on left pan and lighter leaf on right pan to observe downward tilt.",
                "intervention_tier": "Tier 1 Gravity and Balance Directionality",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Heavy objects push down towards the ground! The heavier pan goes DOWN!",
                "visual_scaffold": "Pan Balance: Heavier side sinks DOWN, lighter side rises UP!",
                "growth_mindset_prompt": "Think of a playground see-saw! Heavy pushes down to the ground!",
            },
        },
        SIG_HALF_QUARTER_CAPACITY_CONFUSION: {
            "domain": "MEASUREMENT_CAPACITY",
            "name": "Half vs Quarter Subunit Confusion",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'If 1 litre is 4 quarters, how many quarters make half a litre? 4 quarter-litre glasses fill 1 litre, so 1 glass is 1/4 L, not 1/2 L.'",
                "hands_on_manipulative": "NCERT Chapter 11 (pp. 142-144) 1-Litre Measuring Bottle: Fill 1-litre bottle using 4 identical 250-ml glasses.",
                "intervention_tier": "Tier 2 Fractional Capacity Unitization",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "It takes 4 glasses to fill 1 litre, so 1 glass is 1/4 of a litre (a quarter litre)!",
                "visual_scaffold": "4 quarter glasses = 1 full litre bottle! 1 glass = 1/4 L = 250 ml!",
                "growth_mindset_prompt": "You're learning liquid fractions! 4 quarters make 1 whole litre!",
            },
        },
        SIG_CALENDAR_REOPEN_OFFSET_ERROR: {
            "domain": "TIME_AND_CALENDAR",
            "name": "Calendar Vacation Reopen Offset Error",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'The school is closed for 15 full days starting July 7: days 7 through 21 (15 days). When does it reopen?'",
                "hands_on_manipulative": "NCERT Chapter 13 (pp. 165-167) July Calendar Grid: Shade the 15 vacation days from July 7 to July 21. Reopening day is next day, July 22.",
                "intervention_tier": "Tier 1 Calendar Interval Counting",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Count the 15 closed days starting from July 7! Day 1 is July 7, so day 15 is July 21. Reopening is July 22!",
                "visual_scaffold": "Calendar Days: 7 + 15 = 22! The school reopens on July 22!",
                "growth_mindset_prompt": "Calendar math is super useful! Count the vacation days on the grid!",
            },
        },
        SIG_CALENDAR_WEEKS_DEFAULT: {
            "domain": "TIME_AND_CALENDAR",
            "name": "Calendar Weeks Default Confusion",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'How many days are in 1 week? 7. How many 7s are in 365? 52 weeks x 7 days = 364 days, plus 1 extra day!'",
                "hands_on_manipulative": "NCERT Chapter 13 (p. 168) Year Wheel: Calculate 52 x 7 = 364 days to show there are 52 full weeks in a year.",
                "intervention_tier": "Tier 1 Astronomical and Calendar Time Structure",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "A standard year has 365 days, which is 52 weeks and 1 day!",
                "visual_scaffold": "52 weeks x 7 days = 364 days + 1 extra day = 365 days in a year!",
                "growth_mindset_prompt": "52 weeks in every year! Keep this fact in your math toolkit!",
            },
        },
        SIG_HOUR_MINUTE_CONFUSION: {
            "domain": "TIME_ANALOG_CLOCKS",
            "name": "Hour and Minute Scale Confusion",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'Does it take 20 hours to eat your morning breakfast, or 20 minutes?'",
                "hands_on_manipulative": "NCERT Chapter 13 (pp. 172-175) Activity Duration Sorting: Sort daily activities into seconds, minutes, hours, and days.",
                "intervention_tier": "Tier 1 Timescale Proportionality",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "20 hours is almost a whole day! Eating breakfast takes about 20 minutes!",
                "visual_scaffold": "Timescales: Eating breakfast = minutes, Sleeping = hours, Growing tall = months!",
                "growth_mindset_prompt": "Match the activity to the right time unit: seconds, minutes, or hours!",
            },
        },
        SIG_QUARTER_POINTS_AT_FOUR_ERROR: {
            "domain": "TIME_ANALOG_CLOCKS",
            "name": "Quarter Past Points at 4 Misconception",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'In an analog clock, the face is divided into 4 quarters of 15 minutes each. Where is 15 minutes? At 3, because 3 x 5 = 15!'",
                "hands_on_manipulative": "NCERT Chapter 13 (p. 174) Geared Clock Model: Divide clock into 4 pie wedges of 15 min each to show quarter past is hand at 3.",
                "intervention_tier": "Tier 2 Analog Clock Fraction Partitioning",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Quarter past means 15 minutes past the hour! The minute hand points at 3 (3 x 5 = 15 minutes)!",
                "visual_scaffold": "Quarter of a clock: 60 / 4 = 15 minutes -> Minute hand points at 3!",
                "growth_mindset_prompt": "Remember: 3 is 15 minutes, 6 is 30 minutes, 9 is 45 minutes!",
            },
        },
        SIG_COLOR_COUNT_WITHOUT_ORDER_SYMMETRY: {
            "domain": "GEOMETRY_SYMMETRY",
            "name": "Color Count Without Order Symmetry Error",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'A symmetrical mala must look identical when flipped. Does Red-Blue-Green mirror to Red-Blue-Green, or Green-Blue-Red?'",
                "hands_on_manipulative": "NCERT Chapter 14 (p. 177) Bead String Symmetry: Fold a mala in half or use a mirror to verify opposite bead sequence.",
                "intervention_tier": "Tier 1 Bilateral Reflection Order",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Symmetry is a mirror reflection! The bead pattern must reverse on the other side!",
                "visual_scaffold": "Bilateral Symmetry: Left side [Red, Yellow, Blue] mirrors to Right side [Blue, Yellow, Red]!",
                "growth_mindset_prompt": "Look into the mirror! Left side and right side reflect each other in reverse order!",
            },
        },
        SIG_TRANSLATION_INSTEAD_OF_REFLECTION: {
            "domain": "GEOMETRY_SYMMETRY",
            "name": "Translation Instead of Reflection Bias",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'In a mirror line, does an object shift in the same direction or reflect at equal distance on the opposite side?'",
                "hands_on_manipulative": "NCERT Chapter 14 (p. 182) Mirror Line Game: Place physical mirror on center line and place counters at equal perpendicular distances.",
                "intervention_tier": "Tier 2 Reflection vs Translation Invariance",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "The mirror creates a reflection! The image is at the exact same distance on the opposite side of the mirror line!",
                "visual_scaffold": "Mirror Law: Distance from mirror to object = Distance from mirror to image!",
                "growth_mindset_prompt": "Mirrors flip the image across the line! You've got this reflection superpower!",
            },
        },
        SIG_GAP_PERMISSIBLE_MISCONCEPTION: {
            "domain": "GEOMETRY_TILING",
            "name": "Permissible Gaps Tiling Misconception",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'When tiling a floor, can there be open empty spaces or gaps between tiles? What happens when water or dirt spills?'",
                "hands_on_manipulative": "NCERT Chapter 14 (pp. 183-185) Floor Tiling Patterns: Arrange tessellating polygon shapes on a grid with 0 gaps and 0 overlaps.",
                "intervention_tier": "Tier 1 Surface Tessellation Constraints",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Tiling must cover the whole floor with NO gaps and NO overlaps!",
                "visual_scaffold": "Floor Tiling Rule: Tiles must touch edge-to-edge with 0 gaps and 0 overlapping tiles!",
                "growth_mindset_prompt": "Perfect tiles fit snugly together with zero gaps! Just like real floor tiles!",
            },
        },
        SIG_OPEN_BOX_FACIAL_OMISSION: {
            "domain": "GEOMETRY_NETS",
            "name": "Open Box vs Closed Cube Face Count Confusion",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'A standard closed cube has 6 faces (top, bottom, 4 walls). An open cardboard box has no lid, so how many square faces does it have?'",
                "hands_on_manipulative": "NCERT Chapter 14 (pp. 189-191) Unfolding Nets: Cut and fold paper nets into open boxes (5 squares) and closed cubes (6 squares).",
                "intervention_tier": "Tier 1 3D Net Face Invariance",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "A closed cube has 6 faces: top, bottom, and 4 sides! An open box with no lid has 5 faces!",
                "visual_scaffold": "Cube Net: Closed Cube = 6 squares. Open Box (no lid) = 5 squares!",
                "growth_mindset_prompt": "Count the faces: 1 bottom + 4 walls = 5 squares for an open box!",
            },
        },
        SIG_CYLINDER_NET_INVERSION: {
            "domain": "GEOMETRY_NETS",
            "name": "Cylinder Net Component Inversion",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student: 'When you unroll a circular tin can or cardboard roll, what flat shape does the curved side become? A rectangle! What covers the top and bottom? Two circles!'",
                "hands_on_manipulative": "NCERT Chapter 14 (pp. 191-192) Can Unrolling: Unroll a paper cylinder into 1 rectangle and 2 circular lids.",
                "intervention_tier": "Tier 2 3D Net Decomposition",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "Unrolling a cylinder gives 1 rectangle for the curved tube, and 2 circles for the top and bottom!",
                "visual_scaffold": "Cylinder Net = 1 Rectangle + 2 Circular Flat Faces!",
                "growth_mindset_prompt": "Picture unrolling a can label: it's a long flat rectangle with two circular lids!",
            },
        },
        "CORRECT": {
            "domain": "GENERAL_MASTERY",
            "name": "Curriculum Concept Mastery",
            "teacher_guidance": {
                "clinical_inquiry": "Ask student to explain the strategy or mental model they used to solve the problem.",
                "hands_on_manipulative": "Encourage student to create their own puzzles, word problems, or geometric models (NCERT p. 6, p. 15, p. 42).",
                "intervention_tier": "Tier 1 Enrichment & Extension",
            },
            "student_scaffolding": {
                "mascot_voice": "Friendly Mascot Chintu",
                "encouraging_message": "🌟 Stellar Job! You mastered this concept like a math champion!",
                "visual_scaffold": "Star Badge Earned! Accurate reasoning and perfect execution!",
                "growth_mindset_prompt": "Keep rocking! You're ready for the next math adventure!",
            },
        },
    }

    # Dynamically ingest and synthesize pedagogical entries for all signatures in the master curriculum dataset
    curriculum_path = ROOT_DIR / "data" / "ncert_class3_mathematics_full_curriculum.json"
    if curriculum_path.exists():
        try:
            with open(curriculum_path, "r", encoding="utf-8") as f:
                c_data = json.load(f)
                for probe in c_data.get("probes", []):
                    domain = probe.get("domain", "GENERAL_MATH")
                    chap = probe.get("chapter", "NCERT Class 3")
                    for opt_k, dist in probe.get("distractors", {}).items():
                        if isinstance(dist, dict) and "signature" in dist:
                            sig = dist["signature"]
                            if sig not in catalog:
                                catalog[sig] = {
                                    "domain": domain,
                                    "name": sig.replace("_", " ").title(),
                                    "teacher_guidance": {
                                        "clinical_inquiry": dist.get("teacherInquiry", f"Ask student: '{dist.get('explanation')}'"),
                                        "hands_on_manipulative": dist.get("activity", f"Concrete practice with {chap} textbook manipulatives."),
                                        "intervention_tier": "Tier 1 Targeted Concept Clarification",
                                    },
                                    "student_scaffolding": {
                                        "mascot_voice": "Friendly Mascot Chintu",
                                        "encouraging_message": dist.get("studentHint", "Take a close look at your steps!"),
                                        "visual_scaffold": f"Concept Check: {dist.get('explanation')}",
                                        "growth_mindset_prompt": "You are learning a new math concept! Every mistake is a step forward!",
                                    }
                                }
        except Exception as err:
            print(f"Warning: could not harvest dynamic catalog entries: {err}")

    return catalog


def train_and_export_curriculum_model(output_path: Path) -> Dict[str, Any]:
    """Execute training pipeline across all 14 NCERT Class 3 chapters and export model JSON."""
    print("=" * 76)
    print("STARTING FULL NCERT CLASS 3 CURRICULUM COGNITIVE DIAGNOSTIC MODEL TRAINING")
    print("Textbook: NCERT Class 3 Mathematics ('Maths Mela', 2024 / Reprint 2026-27)")
    print("Chapters: 1 (Names/Data), 2 (3D Solids), 3 (Numbers to 200), 4 (2-Digit Ops),")
    print("          5 (2D Shapes/Angles), 6 (Hundreds-I), 7 (Multiplication), 8 (Fractions),")
    print("          9 (Hundreds-II), 10 (Measurement), 11 (Capacity/Weight), 12 (Subtraction),")
    print("          13 (Time/Clocks), 14 (Symmetry/Tiling/Nets)")
    print("=" * 76)

    # 1. Total probes
    total_probes = len(ALL_PROBES)
    print(f"Total Combined Item Bank: {total_probes} probes across 14 chapters.")
    print(f"  - Canonical Subtraction Benchmark: {len(APPROVED_PROBES)} probes")
    print(f"  - NCERT Chapter 12 Probes:         {len(TEXTBOOK_PROBES)} probes")
    print(f"  - NCERT Foundations Probes:        {len(FOUNDATION_PROBES)} probes")
    print(f"  - NCERT Chapters 3 & 4 Probes:     {len(CH03_CH04_PROBES)} probes")
    print(f"  - NCERT Chapters 5 & 6 Probes:     {len(CH05_CH06_PROBES)} probes")
    print(f"  - NCERT Chapters 7 & 8 Probes:     {len(CH07_CH08_PROBES)} probes")
    print(f"  - NCERT Chapters 9 & 10 Probes:    {len(CH09_CH10_PROBES)} probes")
    print(f"  - NCERT Chapters 11, 13, 14 Probes: {len(CH11_CH13_CH14_PROBES)} probes")

    # 2. Build Q-Matrix
    q_matrix = build_curriculum_q_matrix()
    print(f"\nQ-Matrix Constructed: {len(q_matrix)} items x {len(COGNITIVE_SKILLS)} Cognitive Skills:")
    for skill in COGNITIVE_SKILLS:
        print(f"  - [{skill['id']}] {skill['name']}: {skill['description']}")

    # 3. Item Parameter Calibration
    item_params = calibrate_curriculum_item_parameters(q_matrix)
    print(f"\nCalibrated {len(item_params)} item parameter profiles (slip, guess, difficulty, discrimination).")

    # 4. Pedagogical Intervention Policies
    pedagogical_catalog = generate_curriculum_pedagogical_catalog()
    print(f"Calibrated dual pedagogical policies for {len(pedagogical_catalog)} misconception states.")

    # 5. Compile Model Object
    calibrated_model = {
        "model_metadata": {
            "model_name": "Cognitive Diagnostic Model (CDM) - NCERT Class 3 Mathematics",
            "model_version": "2.0.0",
            "calibration_timestamp": datetime.now(timezone.utc).isoformat(),
            "curriculum": "NCERT Class 3 Mathematics (Maths Mela)",
            "chapters": [
                "Chapter 1: What's in a Name? (pp. 1-8)",
                "Chapter 2: Toy Joy (pp. 9-15)",
                "Chapter 3: Double Century (pp. 16-28)",
                "Chapter 4: Vacation with My Nani Maa (pp. 29-43)",
                "Chapter 5: Fun with Shapes (pp. 44-63)",
                "Chapter 6: House of Hundreds - I (pp. 64-81)",
                "Chapter 7: Raksha Bandhan (pp. 82-106)",
                "Chapter 8: Fair Share (pp. 107-116)",
                "Chapter 9: House of Hundreds - II (pp. 117-127)",
                "Chapter 10: Fun at Class Party! (pp. 128-138)",
                "Chapter 11: Filling and Lifting (pp. 139-149)",
                "Chapter 12: Give and Take (pp. 150-164)",
                "Chapter 13: Time Goes On (pp. 165-176)",
                "Chapter 14: The Surajkund Fair (pp. 177-192, Material Sheets pp. 193-208)",
            ],
            "primary_method": "Bayesian Cognitive Attribute Pattern Matching with DINA Slip/Guess Parameters",
            "total_items": total_probes,
            "total_latent_skills": len(COGNITIVE_SKILLS),
            "total_misconception_signatures": len(pedagogical_catalog),
        },
        "latent_cognitive_skills": COGNITIVE_SKILLS,
        "priors": PRIORS,
        "q_matrix": q_matrix,
        "calibrated_items": item_params,
        "pedagogical_catalog": pedagogical_catalog,
        "calibration_metrics": {
            "mean_slip_rate": round(sum(p["slip_rate_s"] for p in item_params.values()) / total_probes, 4),
            "mean_guess_rate": round(sum(p["guess_rate_g"] for p in item_params.values()) / total_probes, 4),
            "mean_difficulty": round(sum(p["difficulty_b"] for p in item_params.values()) / total_probes, 4),
            "mean_discrimination": round(sum(p["discrimination_a"] for p in item_params.values()) / total_probes, 4),
            "item_bank_coverage": {
                "2_digit_canonical": len(APPROVED_PROBES),
                "3_digit_ncert_ch12": len(TEXTBOOK_PROBES),
                "foundations_ncert_ch01_05": len(FOUNDATION_PROBES),
                "ncert_ch03_ch04": len(CH03_CH04_PROBES),
                "ncert_ch05_ch06": len(CH05_CH06_PROBES),
                "ncert_ch07_ch08": len(CH07_CH08_PROBES),
                "ncert_ch09_ch10": len(CH09_CH10_PROBES),
                "ncert_ch11_ch13_ch14": len(CH11_CH13_CH14_PROBES),
                "total_items": total_probes,
            },
        },
    }

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(calibrated_model, f, indent=2)

    print(f"\nModel exported successfully to: {output_path}")
    print("=" * 76)
    print("CALIBRATION SUMMARY METRICS:")
    print(f"  Total Calibrated Items:     {total_probes}")
    print(f"  Latent Cognitive Skills:    {len(COGNITIVE_SKILLS)}")
    print(f"  Mean Slip Rate (s):         {calibrated_model['calibration_metrics']['mean_slip_rate']}")
    print(f"  Mean Guess Rate (g):        {calibrated_model['calibration_metrics']['mean_guess_rate']}")
    print(f"  Mean Difficulty (b):        {calibrated_model['calibration_metrics']['mean_difficulty']}")
    print(f"  Mean Discrimination (a):    {calibrated_model['calibration_metrics']['mean_discrimination']}")
    print("=" * 76)
    return calibrated_model


def main() -> None:
    parser = argparse.ArgumentParser(description="Calibrate Full NCERT Class 3 Curriculum Cognitive Diagnostic Model.")
    default_out = ROOT_DIR / "models" / "calibrated_diagnostic_model.json"
    parser.add_argument(
        "--output",
        type=Path,
        default=default_out,
        help=f"Target path for model export (default: {default_out})",
    )
    args = parser.parse_args()
    train_and_export_curriculum_model(args.output)


if __name__ == "__main__":
    main()
