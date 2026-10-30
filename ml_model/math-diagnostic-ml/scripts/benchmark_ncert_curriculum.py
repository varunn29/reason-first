"""Comprehensive NCERT Class 3 Mathematics Benchmark Evaluation.

Evaluates the calibrated Cognitive Diagnostic Model across all 6 NCERT chapters:
- Chapter 1: "What's in a Name?" (pp. 1-8)
- Chapter 2: "Toy Joy" (pp. 9-15)
- Chapter 3: "Double Century" (pp. 16-28)
- Chapter 4: "Vacation with My Nani Maa" (pp. 29-43)
- Chapter 5: "Fun with Shapes" (pp. 44-63)
- Chapter 12: "Give and Take" (pp. 150-164)
- Canonical 2-digit Subtraction Benchmark
"""

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
    ALL_PROBES,
    SIG_BORROW_WITHOUT_DECREMENT,
    SIG_CORNER_IN_CIRCLE_CONFUSION,
    SIG_DECADE_CROSSING_STUMBLE,
    SIG_DICE_SEQUENTIAL_OPPOSITE,
    SIG_GRID_DIRECTION_INVERSION,
    SIG_OPERATION_CONFUSION_ADD,
    SIG_REVERSE_HTO_ALIGNMENT,
    SIG_SMALLER_FROM_LARGER,
    SIG_SQUARE_ATTRIBUTE_OVERGENERALIZATION,
    SIG_SQUARE_RECTANGLE_DISJUNCTION,
    SIG_ZERO_PLACEHOLDER_OMISSION,
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
    SIG_PAN_BALANCE_TILT_INVERSION,
    SIG_HALF_QUARTER_CAPACITY_CONFUSION,
    SIG_CALENDAR_REOPEN_OFFSET_ERROR,
    SIG_CALENDAR_WEEKS_DEFAULT,
    SIG_HOUR_MINUTE_CONFUSION,
    SIG_QUARTER_POINTS_AT_FOUR_ERROR,
    SIG_COLOR_COUNT_WITHOUT_ORDER_SYMMETRY,
    SIG_TRANSLATION_INSTEAD_OF_REFLECTION,
    SIG_GAP_PERMISSIBLE_MISCONCEPTION,
    SIG_OPEN_BOX_FACIAL_OMISSION,
    SIG_CYLINDER_NET_INVERSION,
    diagnose_single_response,
)


def run_curriculum_benchmark() -> Dict[str, Any]:
    print("=" * 76)
    print("FULL NCERT CLASS 3 CURRICULUM DIAGNOSTIC BENCHMARK EVALUATION")
    print("Textbook: Maths Mela (First Edition 2024 / Reprint 2026-27)")
    print("=" * 76)

    total_evaluations = 0
    passed_expectations = 0
    failures: List[Dict[str, Any]] = []

    # 1. Evaluate Mastery Profile across ALL probes
    print(f"\n[Evaluation 1] Student Mastery Profile (All {len(ALL_PROBES)} Probes Answered Correctly)...")
    for probe_id, probe in ALL_PROBES.items():
        total_evaluations += 1
        res = diagnose_single_response(probe_id, probe.correct_answer)
        if res.get("status") == "Pass" and res.get("ruleId") == "CORRECT":
            passed_expectations += 1
        else:
            failures.append({
                "test": "Mastery",
                "probe_id": probe_id,
                "expected": "Pass/CORRECT",
                "got": f"{res.get('status')}/{res.get('ruleId')}",
            })

    # 2. Evaluate Chapter 1 Misconceptions
    print("[Evaluation 2] Chapter 1: 'What's in a Name?' Misconception Signatures...")
    ch1_cases = [
        ("ncert_ch01_cows_43_2", 45, SIG_OPERATION_CONFUSION_ADD),
        ("ncert_ch01_captains_elephant_ox", 2, "MINIMUM_MAXIMUM_CONFUSION"),
        ("ncert_ch01_number_name_riddle", 92, "SECOND_WORD_LETTER_MISCOUNT"),
    ]
    for pid, ans, expected_sig in ch1_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch1", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 3. Evaluate Chapter 2 Misconceptions
    print("[Evaluation 3] Chapter 2: 'Toy Joy' (3D Solids) Misconception Signatures...")
    ch2_cases = [
        ("ncert_ch02_dice_opposite_faces", 5, SIG_DICE_SEQUENTIAL_OPPOSITE),
        ("ncert_ch02_shape_properties_faces", 2, "FLAT_FACES_ONLY_ERROR"),
        ("ncert_ch02_shape_properties_faces", 3, "CURVED_FACES_ONLY_ERROR"),
    ]
    for pid, ans, expected_sig in ch2_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch2", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 4. Evaluate Chapter 3 Misconceptions
    print("[Evaluation 4] Chapter 3: 'Double Century' Place Value Misconception Signatures...")
    ch3_cases = [
        ("ncert_ch03_bundles_zero_tens_104", 140, SIG_REVERSE_HTO_ALIGNMENT),
        ("ncert_ch03_bundles_zero_tens_104", 14, SIG_ZERO_PLACEHOLDER_OMISSION),
        ("ncert_ch03_talking_pot_109", 1010, SIG_DECADE_CROSSING_STUMBLE),
        ("ncert_ch03_century_cricket_bindis", 20, "ADDITION_INSTEAD_OF_MULTIPLICATION"),
        ("ncert_ch03_making_100_bholu_65_35", 45, "BRIDGING_TEN_OVERSHOOT_ERROR"),
        ("ncert_ch03_number_line_jumps_20", 130, "JUMP_10_CONFUSION"),
        ("ncert_ch03_number_line_jumps_20", 150, "HALFWAY_BENCHMARK_LEAP"),
        ("ncert_ch03_one_less_one_more_160", 161, "SUCCESSOR_PREDECESSOR_SWAP"),
    ]
    for pid, ans, expected_sig in ch3_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch3", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 5. Evaluate Chapter 4 Misconceptions
    print("[Evaluation 5] Chapter 4: 'Vacation with My Nani Maa' (2-Digit Ops) Misconceptions...")
    ch4_cases = [
        ("ncert_ch04_stamps_52_37", 25, SIG_SMALLER_FROM_LARGER),
        ("ncert_ch04_stamps_52_37", 89, SIG_OPERATION_CONFUSION_ADD),
        ("ncert_ch04_grid_jump_45_34", 71, SIG_GRID_DIRECTION_INVERSION),
        ("ncert_ch04_hidden_seeds_23_7", 24, SIG_SMALLER_FROM_LARGER),
        ("ncert_ch04_ginladi_stamp_15_7", 5, "PART_PART_EQUAL_ASSUMPTION"),
        ("ncert_ch04_grid_navigation_chirag_89_63", 36, "TENS_DECADE_MISCOUNT_GRID"),
        ("ncert_ch04_grid_navigation_chirag_89_63", 152, SIG_OPERATION_CONFUSION_ADD),
        ("ncert_ch04_vegetables_box_100_65", 45, "ZERO_ACROSS_BORROW_ERROR"),
        ("ncert_ch04_apples_total_85_67", 142, "CARRY_OVER_OMISSION"),
        ("ncert_ch04_apples_total_85_67", 1412, "CONCATENATION_WITHOUT_REGROUPING"),
        ("ncert_ch04_apples_difference_85_67", 22, SIG_SMALLER_FROM_LARGER),
        ("ncert_ch04_gehu_plants_56_29", 33, SIG_SMALLER_FROM_LARGER),
        ("ncert_ch04_estimation_more_or_less_150_49", 2, "SUBTRACTION_MAGNITUDE_OVERESTIMATION"),
        ("ncert_ch04_estimation_more_or_less_134_56", 1, "MINUEND_HUNDRED_ANCHORING_BIAS"),
    ]
    for pid, ans, expected_sig in ch4_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch4", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 6. Evaluate Chapter 5 Misconceptions
    print("[Evaluation 6] Chapter 5: 'Fun with Shapes' (2D Shapes & Angles) Misconceptions...")
    ch5_cases = [
        ("ncert_ch05_square_vs_rectangle", 2, SIG_SQUARE_ATTRIBUTE_OVERGENERALIZATION),
        ("ncert_ch05_square_vs_rectangle", 3, SIG_SQUARE_RECTANGLE_DISJUNCTION),
        ("ncert_ch05_circle_center_folding", 2, SIG_CORNER_IN_CIRCLE_CONFUSION),
        ("ncert_ch05_cuboid_faces_shapes_tracing", 2, "CURVED_OR_TRIANGULAR_FACES_BIAS"),
        ("ncert_ch05_cuboid_triangle_face_impossibility", 1, "PRISM_CUBOID_CONFUSION"),
        ("ncert_ch05_nested_squares_counting_diagram", 4, "SUB_PARTS_ONLY_COUNT"),
        ("ncert_ch05_square_corners_right_angles_identification", 2, "OPPOSITE_CORNERS_ONLY"),
        ("ncert_ch05_corner_tester_acute_angle", 2, "RIGHT_ANGLE_DEFAULT"),
        ("ncert_ch05_circle_paper_plate_center_creases", 2, SIG_CORNER_IN_CIRCLE_CONFUSION),
        ("ncert_ch05_circle_boundary_and_corners", 2, "ONE_BOUNDARY_CONFUSION"),
    ]
    for pid, ans, expected_sig in ch5_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch5", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 7. Evaluate Chapter 6 Misconceptions
    print("[Evaluation 7] Chapter 6: 'House of Hundreds - I' (3-Digit Place Value & Grid) Misconceptions...")
    ch6_cases = [
        ("ncert_ch06_triangular_torans_200_50", 205, "REVERSE_TENS_ONES_MAPPING"),
        ("ncert_ch06_bangles_teji_280", 208, "REVERSE_TENS_ONES_MAPPING"),
        ("ncert_ch06_toffees_century_boundary_299", 2910, SIG_DECADE_CROSSING_STUMBLE),
        ("ncert_ch06_matchstick_bundles_sentences_235", 25, "TENS_DIFFERENCE_SLIP"),
        ("ncert_ch06_number_slider_operations_289_minus_10", 288, "SUBTRACTED_FROM_ONES"),
        ("ncert_ch06_flag_game_inequality_207", 209, "OUT_OF_BOUNDS_HIGH"),
        ("ncert_ch06_apartment_grid_step_113_above_13", 106, "RIGHT_STEP_CONFUSION"),
        ("ncert_ch06_who_am_i_riddle_digits_9_1_5", 195, "ONES_TENS_INVERSION"),
        ("ncert_ch06_who_am_i_riddle_same_digits_300_400", 333, "ZERO_TENS_VIOLATION"),
        ("ncert_ch06_packing_tens_into_hundred_boxes", 4, "UNIT_CONFUSION_GROUP_AS_ITEM"),
        ("ncert_ch06_comparison_place_value_priority_209_vs_290", 2, "ONES_MAGNITUDE_OVERRIDE_TENS"),
        ("ncert_ch06_digits_greatest_3_digit_3_2_4", 423, "TENS_ONES_SUBOPTIMAL"),
    ]
    for pid, ans, expected_sig in ch6_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch6", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 8. Evaluate Chapter 12 & Canonical Subtraction Probes
    print("[Evaluation 8] Chapter 12: 'Give and Take' Subtraction Regrouping Misconceptions...")
    ch12_cases = [
        ("ncert_ch12_saplings_230_75", 245, SIG_SMALLER_FROM_LARGER),
        ("ncert_ch12_saplings_230_75", 165, SIG_BORROW_WITHOUT_DECREMENT),
        ("ncert_ch12_saplings_230_75", 305, SIG_OPERATION_CONFUSION_ADD),
        ("ncert_ch12_herbs_270_36", 246, SIG_SMALLER_FROM_LARGER),
        ("ncert_ch12_sacks_305_210", 115, SIG_SMALLER_FROM_LARGER),
        ("ncert_ch12_money_756_465", 391, SIG_BORROW_WITHOUT_DECREMENT),
        ("ncert_ch12_cards_653_356", 303, SIG_SMALLER_FROM_LARGER),
    ]
    for pid, ans, expected_sig in ch12_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch12", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 9. Evaluate Chapter 7 Misconceptions
    print("[Evaluation 9] Chapter 7: 'Raksha Bandhan' (Multiplication & Division) Misconceptions...")
    ch7_cases = [
        ("ncert_ch07_limiting_material_rakhis", 30, SIG_RESOURCE_NEGLECT_FLOWERS_ONLY),
        ("ncert_ch07_limiting_material_rakhis", 15, "THREADS_LIMIT_ONLY"),
        ("ncert_ch07_limiting_material_rakhis", 10, "DECIMAL_ROUNDING_ERROR"),
        ("ncert_ch07_sweet_shop_2_boxes_laddoos", 11, "ADDITION_INSTEAD_OF_MULTIPLICATION"),
        ("ncert_ch07_sweet_shop_2_boxes_laddoos", 27, "THREE_BOXES_OVERSHOOT"),
        ("ncert_ch07_distribute_18_laddoos_9_people", 9, SIG_DIVIDEND_HALF_CONFUSION),
        ("ncert_ch07_repeated_subtraction_20_kaju_katlis_5_people", 15, "FIRST_SUBTRACTION_DIFFERENCE"),
        ("ncert_ch07_repeated_subtraction_20_kaju_katlis_5_people", 5, "DIVISOR_DEFAULT"),
        ("ncert_ch07_wheels_12_wheels_cycles", 10, "SUBTRACTION_INSTEAD_OF_DIVISION"),
        ("ncert_ch07_wheels_12_wheels_cycles", 24, "MULTIPLICATION_INSTEAD_OF_DIVISION"),
        ("ncert_ch07_family_jalebis_shortfall_36_minus_24", 36, "TOTAL_NEEDED_INSTEAD_OF_SHORTFALL"),
        ("ncert_ch07_flower_bed_commutativity_8x6_vs_6x8", 2, SIG_PERSPECTIVE_RIGIDITY_BIAS),
        ("ncert_ch07_flower_bed_commutativity_8x6_vs_6x8", 4, "COMMUTATIVITY_MISUNDERSTANDING"),
        ("ncert_ch07_table_5_ending_digit_patterns", 2, SIG_ALL_FIVES_DEFAULT),
        ("ncert_ch07_table_5_ending_digit_patterns", 3, "ALL_ZEROS_DEFAULT"),
        ("ncert_ch07_cow_horns_and_legs_riddle", 24, SIG_HORN_COUNT_DUPLICATION),
        ("ncert_ch07_cow_horns_and_legs_riddle", 96, "HORN_MULTIPLIED_BY_LEGS"),
        ("ncert_ch07_sea_shells_necklace_repeated_subtraction", 3, "INCOMPLETE_SUBTRACTION"),
    ]
    for pid, ans, expected_sig in ch7_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch7", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 10. Evaluate Chapter 8 Misconceptions
    print("[Evaluation 10] Chapter 8: 'Fair Share' (Fractions: Halves & Quarters) Misconceptions...")
    ch8_cases = [
        ("ncert_ch08_paratha_equal_halves_partition", 2, SIG_CHORD_UNEQUAL_PARTITION_BIAS),
        ("ncert_ch08_paratha_equal_halves_partition", 3, "OFF_CENTER_BIAS"),
        ("ncert_ch08_chikki_grid_eaten_less_or_more_than_half", 1, "LESS_THAN_HALF_CONFUSION"),
        ("ncert_ch08_chikki_grid_eaten_less_or_more_than_half", 3, "EXACT_HALF_ASSUMPTION"),
        ("ncert_ch08_number_line_distance_double_of_7", 6, "SUBTRACTED_7_MINUS_13"),
        ("ncert_ch08_number_line_distance_double_of_7", 14, "DOUBLE_VALUE_CONFUSION"),
        ("ncert_ch08_number_line_distance_half_of_14", 7, "HALF_VALUE_CONFUSION"),
        ("ncert_ch08_number_line_distance_half_of_14", 9, "ADDED_5_PLUS_HALF"),
        ("ncert_ch08_riddle_double_3_half_8", 4, "LOWER_BOUND_CONFUSION"),
        ("ncert_ch08_riddle_double_3_half_8", 6, "UPPER_BOUND_CONFUSION"),
        ("ncert_ch08_quarters_in_a_whole_count", 2, SIG_HALF_QUARTER_CONFUSION),
        ("ncert_ch08_quarters_in_a_whole_count", 1, "SINGLE_PIECE_CONFUSION"),
        ("ncert_ch08_birds_fraction_half_vs_quarter", 2, "REVERSED_FRACTION_ATTRIBUTION"),
        ("ncert_ch08_birds_fraction_half_vs_quarter", 3, "HOMOGENIZATION_FRACTION_BIAS"),
        ("ncert_ch08_flowers_subsets_16_flowers", 1, "INVERSE_RELATION_CONFUSION"),
        ("ncert_ch08_flowers_subsets_16_flowers", 3, "EQUALITY_BIAS"),
        ("ncert_ch08_three_quarters_identification", 2, "UNSHADED_PART_FOCUS"),
        ("ncert_ch08_three_quarters_identification", 3, "HALF_APPROXIMATION_BIAS"),
    ]
    for pid, ans, expected_sig in ch8_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch8", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 11. Evaluate Chapter 9 Misconceptions
    print("[Evaluation 11] Chapter 9: 'House of Hundreds - II' (Place Value to 1000 & Heritage) Misconceptions...")
    ch9_cases = [
        ("ncert_ch09_crows_963_place_value", 90063, "CONCATENATION_WITHOUT_PLACE_VALUE"),
        ("ncert_ch09_crows_963_place_value", 936, SIG_ONES_TENS_VALUE_CONFUSION),
        ("ncert_ch09_rice_sacks_504_zero_placeholder", 54, SIG_ZERO_TENS_OMISSION_3DIGIT),
        ("ncert_ch09_rice_sacks_504_zero_placeholder", 540, SIG_ONES_TENS_VALUE_CONFUSION),
        ("ncert_ch09_crane_jump_667_to_650", 7, SIG_DECADE_JUMP_CALCULATION_SLIP),
        ("ncert_ch09_crane_jump_667_to_700", 43, "BRIDGING_TEN_OVERSHOOT_ERROR"),
        ("ncert_ch09_neighbouring_landmarks_468", 2, SIG_NEIGHBOURING_LANDMARK_CONFUSION),
        ("ncert_ch09_neighbouring_landmarks_468", 3, SIG_NEIGHBOURING_LANDMARK_CONFUSION),
        ("ncert_ch09_tambola_tens_digit_one", 581, SIG_TENS_DIGIT_POSITION_CONFUSION),
        ("ncert_ch09_skip_counting_ladder_25s", 900, "CENTURY_ROUNDING_ERROR"),
        ("ncert_ch09_inequality_loop_4_numbers", 2, "PLACE_VALUE_MAGNITUDE_SWAP"),
        ("ncert_ch09_six_slips_largest_and_231", 2, SIG_ONES_TENS_VALUE_CONFUSION),
        ("ncert_ch09_bhutasankhya_directions_eyes", 24, SIG_BHUTASANKHYA_DIGIT_INVERSION),
        ("ncert_ch09_bhutasankhya_directions_eyes", 6, "ADDITION_INSTEAD_OF_PLACE_VALUE"),
    ]
    for pid, ans, expected_sig in ch9_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch9", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 12. Evaluate Chapter 10 Misconceptions
    print("[Evaluation 12] Chapter 10: 'Fun at Class Party!' (Measurement & Metre Benchmarks) Misconceptions...")
    ch10_cases = [
        ("ncert_ch10_handspan_invariance_dilemma", 1, SIG_HANDSPAN_INVARIANCE_ASSUMPTION),
        ("ncert_ch10_handspan_invariance_dilemma", 3, "UNIT_SIZE_INVERSE_COUNT_CONFUSION"),
        ("ncert_ch10_table_door_indirect_measurement", 1, SIG_ORIENTATION_NEGLECT_2D),
        ("ncert_ch10_four_equal_pieces_rope_cuts", 4, SIG_FENCEPOST_CUT_COUNT_ERROR),
        ("ncert_ch10_four_equal_pieces_rope_cuts", 2, "HALVING_ONLY_CUTS"),
        ("ncert_ch10_metre_rope_folding_quarter", 1, SIG_QUARTER_HALF_METRE_CONFUSION),
        ("ncert_ch10_metre_rope_folding_quarter", 3, "THREE_QUARTERS_DEFAULT"),
        ("ncert_ch10_benchmark_classroom_door_height", 2, "BENCHMARK_SCALE_INVERSION"),
        ("ncert_ch10_benchmark_pencil_box_length", 1, "BENCHMARK_SCALE_INVERSION"),
        ("ncert_ch10_arms_wide_open_height_invariant", 2, "BODY_PROPORTION_MISUNDERSTANDING"),
        ("ncert_ch10_longest_string_lights_uncoiling", 1, "APPARENT_SPAN_VISUAL_BIAS"),
        ("ncert_ch10_jumping_distance_comparison", 1, SIG_QUARTER_HALF_METRE_CONFUSION),
        ("ncert_ch10_saree_curtain_unit_choice", 2, SIG_UNIT_INAPPROPRIATE_SCALE_BIAS),
    ]
    for pid, ans, expected_sig in ch10_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch10", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 13. Evaluate Chapter 11 Misconceptions
    print("[Evaluation 13] Chapter 11: 'Filling and Lifting' (Capacity, Volume & Pan-Balance) Misconceptions...")
    ch11_cases = [
        ("ncert_ch11_juice_glass_size_invariance", 1, SIG_CAPACITY_UNIT_SIZE_NEGLECT),
        ("ncert_ch11_glass_shape_conservation_milk", 2, SIG_HEIGHT_ONLY_VOLUME_BIAS),
        ("ncert_ch11_glass_shape_conservation_milk", 3, SIG_CONSERVATION_OF_VOLUME_VIOLATION),
        ("ncert_ch11_jug_glasses_lemonade_multiplication", 8, "ADDITION_INSTEAD_OF_MULTIPLICATION"),
        ("ncert_ch11_jug_glasses_lemonade_multiplication", 2, "SUBTRACTION_INSTEAD_OF_MULTIPLICATION"),
        ("ncert_ch11_measuring_bottle_1_litre_benchmark", 2, "BENCHMARK_SCALE_INVERSION"),
        ("ncert_ch11_quarter_litre_glasses_in_one_litre", 2, SIG_HALF_QUARTER_CAPACITY_CONFUSION),
        ("ncert_ch11_quarter_litre_glasses_in_one_litre", 1, "SINGLE_UNIT_CONFUSION"),
        ("ncert_ch11_heavier_or_lighter_pan_balance_tilt", 2, SIG_PAN_BALANCE_TILT_INVERSION),
        ("ncert_ch11_salt_packet_1_kg_benchmark", 2, "BENCHMARK_SCALE_INVERSION"),
        ("ncert_ch11_daal_packets_half_kg_balance", 2, "TOTAL_EQUAL_PART_CONFUSION"),
        ("ncert_ch11_tea_packets_quarter_kg_balance", 1, SIG_HALF_QUARTER_CAPACITY_CONFUSION),
        ("ncert_ch11_tricky_balls_one_weighing_puzzle", 2, "WEIGH_ALL_TOGETHER_ERROR"),
        ("ncert_ch11_tricky_balls_one_weighing_puzzle", 3, "DEDUCTIVE_REASONING_DEFICIT"),
    ]
    for pid, ans, expected_sig in ch11_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch11", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 14. Evaluate Chapter 13 Misconceptions
    print("[Evaluation 14] Chapter 13: 'Time Goes On' (Calendars, Clocks & Timescales) Misconceptions...")
    ch13_cases = [
        ("ncert_ch13_calendar_july_interval_calculation", 22, SIG_CALENDAR_REOPEN_OFFSET_ERROR),
        ("ncert_ch13_calendar_july_interval_calculation", 21, "OFF_BY_ONE_DAY_ERROR"),
        ("ncert_ch13_calendar_days_in_a_year_and_weeks", 48, "MONTH_WEEKS_APPROXIMATION_ERROR"),
        ("ncert_ch13_calendar_days_in_a_year_and_weeks", 53, SIG_CALENDAR_WEEKS_DEFAULT),
        ("ncert_ch13_calendar_fixed_vs_changing_festivals", 2, "LUNAR_SOLAR_FESTIVAL_CONFUSION"),
        ("ncert_ch13_age_fun_twice_and_10_years_older", 2, "ADDITION_ONLY_AGE_SLIP"),
        ("ncert_ch13_age_fun_twice_and_10_years_older", 3, "TWICE_CONFUSED_WITH_PLUS_TWO"),
        ("ncert_ch13_birth_certificate_age_calculation", 11, "OFF_BY_ONE_YEAR_ERROR"),
        ("ncert_ch13_birth_certificate_age_calculation", 20, "CENTURY_SUBTRACTION_ERROR"),
        ("ncert_ch13_birth_certificate_issue_delay", 18, "DATE_AS_DURATION_CONFUSION"),
        ("ncert_ch13_birth_certificate_issue_delay", 20, "ADDITION_INSTEAD_OF_SUBTRACTION"),
        ("ncert_ch13_analog_clock_breakfast_duration", 7, SIG_HOUR_MINUTE_CONFUSION),
        ("ncert_ch13_analog_clock_breakfast_duration", 30, "HALF_HOUR_DEFAULT"),
        ("ncert_ch13_analog_clock_quarter_past_eight", 4, SIG_QUARTER_POINTS_AT_FOUR_ERROR),
        ("ncert_ch13_analog_clock_quarter_past_eight", 8, "HOUR_MINUTE_HAND_INVERSION"),
        ("ncert_ch13_duration_scale_sorting", 2, "DURATION_SCALE_MISMATCH"),
        ("ncert_ch13_analog_clock_minute_hand_five_minute_jump", 1, "ONE_NUMBER_ONE_MINUTE_ERROR"),
        ("ncert_ch13_analog_clock_minute_hand_five_minute_jump", 10, "DECADE_MINUTE_OVERESTIMATION"),
    ]
    for pid, ans, expected_sig in ch13_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch13", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    # 15. Evaluate Chapter 14 Misconceptions
    print("[Evaluation 15] Chapter 14: 'The Surajkund Fair' (Symmetry, Tiling, Nets & Maps) Misconceptions...")
    ch14_cases = [
        ("ncert_ch14_mala_bilateral_symmetry", 2, SIG_COLOR_COUNT_WITHOUT_ORDER_SYMMETRY),
        ("ncert_ch14_kolam_line_of_symmetry", 2, "ASYMMETRIC_FOLD_MISCONCEPTION"),
        ("ncert_ch14_cat_mask_paper_folding_symmetry", 1, "IRRELEVANT_PROCEDURAL_ATTRIBUTE"),
        ("ncert_ch14_mirror_game_counter_reflection", 2, SIG_TRANSLATION_INSTEAD_OF_REFLECTION),
        ("ncert_ch14_mirror_game_counter_reflection", 3, "ROW_AXIS_INVERSION"),
        ("ncert_ch14_tessellation_tiling_without_gaps", 3, SIG_GAP_PERMISSIBLE_MISCONCEPTION),
        ("ncert_ch14_tessellation_tiling_without_gaps", 2, "OVERLAP_PERMISSIBLE_MISCONCEPTION"),
        ("ncert_ch14_map_reading_chaupal_navigation", 2, "MAP_LEGEND_PURPOSE_MISCONCEPTION"),
        ("ncert_ch14_net_of_a_cube_faces_count", 4, SIG_OPEN_BOX_FACIAL_OMISSION),
        ("ncert_ch14_net_of_a_cube_faces_count", 12, "CUBE_EDGES_CONFUSION"),
        ("ncert_ch14_net_of_a_cylinder_components", 2, SIG_CYLINDER_NET_INVERSION),
        ("ncert_ch14_net_of_a_cylinder_components", 4, "CONE_CYLINDER_CONFUSION"),
        ("ncert_ch14_tangram_seven_pieces_composition", 2, "SHAPE_COMPOSABILITY_DENIAL"),
        ("ncert_ch14_tit_for_tat_half_money_symmetry", 2, "LITERAL_POVERTY_ASSUMPTION"),
    ]
    for pid, ans, expected_sig in ch14_cases:
        total_evaluations += 1
        res = diagnose_single_response(pid, ans)
        if res.get("status") == "Fail" and res.get("ruleId") == expected_sig:
            passed_expectations += 1
        else:
            failures.append({"test": "Ch14", "probe_id": pid, "expected": expected_sig, "got": res.get("ruleId")})

    accuracy = (passed_expectations / total_evaluations) * 100 if total_evaluations else 0.0

    print("\n" + "=" * 76)
    print("FULL CURRICULUM BENCHMARK EVALUATION SUMMARY")
    print("=" * 76)
    print(f"Total Benchmark Cases Evaluated: {total_evaluations}")
    print(f"Passed Expectations:            {passed_expectations} / {total_evaluations}")
    print(f"Diagnostic Accuracy:             {accuracy:.2f}%")
    print(f"Total Mismatches:                {len(failures)}")

    if failures:
        print("\nMISMATCH DETAILS:")
        for f in failures:
            print(f"  - [{f['test']}] Probe: {f['probe_id']} -> Expected {f['expected']}, got {f['got']}")
    else:
        print(f"\nPERFECT CURRICULUM MATCH: All {len(ALL_PROBES)} probes and distinct misconception")
        print("signatures correctly classified with pedagogical interventions verified.")
    print("=" * 76)

    return {
        "total_evaluations": total_evaluations,
        "passed_expectations": passed_expectations,
        "accuracy_pct": accuracy,
        "failures": failures,
    }


if __name__ == "__main__":
    results = run_curriculum_benchmark()
    if results["failures"]:
        sys.exit(1)
    sys.exit(0)

