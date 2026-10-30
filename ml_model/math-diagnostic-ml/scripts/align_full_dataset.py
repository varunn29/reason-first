"""Dataset Alignment Script for NCERT Class 3 Mathematics Diagnostic Platform.

Consolidates, standardizes, and validates all curriculum probes across:
- Canonical Baseline Subtraction Probes (5 probes)
- Chapter 1: What's in a Name? (pp. 1-8)
- Chapter 2: Toy Joy (pp. 9-15)
- Chapter 3: Double Century (pp. 16-28)
- Chapter 4: Vacation with My Nani Maa (pp. 29-43)
- Chapter 5: Fun with Shapes (pp. 44-63)
- Chapter 6: House of Hundreds - I (pp. 64-81)
- Chapter 7: Raksha Bandhan (pp. 82-106)
- Chapter 8: Fair Share (pp. 107-116)
- Chapter 9: House of Hundreds - II (pp. 117-127)
- Chapter 10: Fun at Class Party! (pp. 128-138)
- Chapter 11: Filling and Lifting (pp. 139-149)
- Chapter 12: Give and Take (pp. 150-164)
- Chapter 13: Time Goes On (pp. 165-176)
- Chapter 14: The Surajkund Fair (pp. 177-192, Material Sheets pp. 193-208)

Exports the unified master dataset to:
data/ncert_class3_mathematics_full_curriculum.json
"""

import json
from pathlib import Path
from typing import Any, Dict, List

ROOT_DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Canonical 5 probes with fully aligned dual-pedagogical distractors
CANONICAL_PROBES = [
    {
        "id": "probe_01",
        "chapter": "Canonical Diagnostic Baseline",
        "page": 152,
        "domain": "SUBTRACTION_REGROUPING",
        "context": "Diagnostic baseline probe: 2-digit column subtraction requiring ones-from-tens regrouping.",
        "prompt": "61 - 24 = ?",
        "correctAnswer": 37,
        "options": [37, 43, 47, 35],
        "optionLabels": [
            "37 (Correct regrouped answer)",
            "43 (Subtracted smaller from larger: 4 - 1 = 3)",
            "47 (Borrowed without decrement: 6 tens left unreduced)",
            "35 (Calculation slip in ones subtraction)"
        ],
        "distractors": {
            "43": {
                "signature": "SMALLER_FROM_LARGER",
                "explanation": "Subtracted smaller ones digit from larger ones digit (4 - 1 = 3) instead of unbundling from tens.",
                "teacherInquiry": "Look at the ones column: 1 - 4. Can you take 4 away from 1 without borrowing a ten?",
                "activity": "NCERT Dienes HTO Bundling Mat (p. 152): Trade 1 ten-rod for 10 loose unit cubes before removing 4.",
                "studentHint": "Oops! 1 is smaller than 4. Remember to borrow 1 ten from the tens column first!"
            },
            "47": {
                "signature": "BORROW_WITHOUT_DECREMENT",
                "explanation": "Added 10 to ones column (11 - 4 = 7), but forgot to decrement 6 tens to 5 tens.",
                "teacherInquiry": "Direct student to tens digit: 'You borrowed 1 ten. How many tens are left on the table?'",
                "activity": "The Banker's Exchange (NCERT pp. 156-160): Cross out the 6 tens and write 5 immediately upon borrowing.",
                "studentHint": "Great unbundling! But don't forget to cross out 6 and reduce it to 5!"
            },
            "35": {
                "signature": "CALCULATION_SLIP",
                "explanation": "Mental arithmetic subtraction slip in basic single-digit calculation.",
                "teacherInquiry": "Check your single-digit subtraction: 11 - 4.",
                "activity": "Count back on a bead string (ginladi) or number line from 61 by 24.",
                "studentHint": "Almost there! Double-check 11 minus 4 in the ones place."
            }
        },
        "is_regrouping": True,
        "minuend": 61,
        "subtrahend": 24,
    },
    {
        "id": "probe_02",
        "chapter": "Canonical Diagnostic Baseline",
        "page": 153,
        "domain": "SUBTRACTION_REGROUPING",
        "context": "Diagnostic baseline probe: 2-digit subtraction with large difference in ones column.",
        "prompt": "72 - 38 = ?",
        "correctAnswer": 34,
        "options": [34, 46, 44, 36],
        "optionLabels": [
            "34 (Correct regrouped answer)",
            "46 (Subtracted smaller from larger: 8 - 2 = 6)",
            "44 (Borrowed without decrement: 7 tens left unreduced)",
            "36 (Calculation slip)"
        ],
        "distractors": {
            "46": {
                "signature": "SMALLER_FROM_LARGER",
                "explanation": "Subtracted 8 - 2 = 6 in ones column instead of unbundling a ten.",
                "teacherInquiry": "If you have 2 cookies, can you eat 8 without opening a fresh box of 10?",
                "activity": "Tens-and-Ones Bundling Mat (p. 152): Exchange 1 ten-rod into 10 unit cubes.",
                "studentHint": "2 is smaller than 8! Unbundle 1 ten into 10 ones before subtracting!"
            },
            "44": {
                "signature": "BORROW_WITHOUT_DECREMENT",
                "explanation": "Correctly computed 12 - 8 = 4, but forgot to reduce 7 tens to 6 tens (6 - 3 = 3, not 7 - 3 = 4).",
                "teacherInquiry": "Look at the tens digit 7. You borrowed 1 ten, so what should 7 become?",
                "activity": "The Banker's Exchange: Record the crossing-out above the tens column before subtracting.",
                "studentHint": "Good unbundling! But remember to cross out 7 tens and make it 6 tens!"
            },
            "36": {
                "signature": "CALCULATION_SLIP",
                "explanation": "Single-digit arithmetic slip.",
                "teacherInquiry": "Recheck 12 - 8.",
                "activity": "Number line jumps: jump back 30 from 72 to 42, then back 8 to 34.",
                "studentHint": "Check your steps carefully: 12 - 8 = 4!"
            }
        },
        "is_regrouping": True,
        "minuend": 72,
        "subtrahend": 38,
    },
    {
        "id": "probe_03",
        "chapter": "Canonical Diagnostic Baseline",
        "page": 153,
        "domain": "SUBTRACTION_REGROUPING",
        "context": "Diagnostic baseline probe: 2-digit subtraction consistency probe.",
        "prompt": "83 - 49 = ?",
        "correctAnswer": 34,
        "options": [34, 46, 44, 38],
        "optionLabels": [
            "34 (Correct regrouped answer)",
            "46 (Subtracted smaller from larger: 9 - 3 = 6)",
            "44 (Borrowed without decrement: 8 tens left unreduced)",
            "38 (Calculation slip)"
        ],
        "distractors": {
            "46": {
                "signature": "SMALLER_FROM_LARGER",
                "explanation": "Subtracted 9 - 3 = 6 in ones column instead of unbundling from 8 tens.",
                "teacherInquiry": "Can we subtract from bottom to top? 3 - 9 needs an exchange from 8 tens!",
                "activity": "NCERT Dienes blocks: exchange 1 yellow ten-rod into 10 units.",
                "studentHint": "Don't subtract bottom to top! Borrow 1 ten from 8 tens first!"
            },
            "44": {
                "signature": "BORROW_WITHOUT_DECREMENT",
                "explanation": "Computed 13 - 9 = 4, but computed 8 - 4 = 4 instead of 7 - 4 = 3.",
                "teacherInquiry": "What happened to the 8 tens when you gave 1 ten to the ones place?",
                "activity": "The Banker's Exchange: Cross out 8 and write 7.",
                "studentHint": "You borrowed 1 ten, so 8 tens becomes 7 tens! 7 - 4 = 3!"
            },
            "38": {
                "signature": "CALCULATION_SLIP",
                "explanation": "Single-digit arithmetic slip.",
                "teacherInquiry": "Check 13 - 9.",
                "activity": "Ginladi bead string count-back.",
                "studentHint": "Almost there! What is 13 minus 9?"
            }
        },
        "is_regrouping": True,
        "minuend": 83,
        "subtrahend": 49,
    },
    {
        "id": "ctrl_01",
        "chapter": "Canonical Diagnostic Baseline",
        "page": 151,
        "domain": "SUBTRACTION_REGROUPING",
        "context": "Diagnostic baseline control probe: standard 2-digit subtraction without regrouping.",
        "prompt": "58 - 23 = ?",
        "correctAnswer": 35,
        "options": [35, 31, 25, 33],
        "optionLabels": [
            "35 (Correct baseline answer)",
            "31 (Calculation slip in ones)",
            "25 (Calculation slip in tens)",
            "33 (Calculation slip)"
        ],
        "distractors": {
            "31": {
                "signature": "CALCULATION_SLIP",
                "explanation": "Single-digit calculation slip in ones column (8 - 3 computed as 1).",
                "teacherInquiry": "Check 8 - 3.",
                "activity": "Single-digit flashcard review.",
                "studentHint": "Double-check 8 minus 3 in the ones place!"
            },
            "25": {
                "signature": "CALCULATION_SLIP",
                "explanation": "Calculation slip in tens column (5 - 2 computed as 2).",
                "teacherInquiry": "Check 5 - 2.",
                "activity": "Tens place value review.",
                "studentHint": "Double-check 5 tens minus 2 tens!"
            },
            "33": {
                "signature": "CALCULATION_SLIP",
                "explanation": "General calculation slip.",
                "teacherInquiry": "Recheck both columns.",
                "activity": "Practice baseline subtraction.",
                "studentHint": "Take another look at 58 minus 23!"
            }
        },
        "is_regrouping": False,
        "minuend": 58,
        "subtrahend": 23,
    },
    {
        "id": "ctrl_02",
        "chapter": "Canonical Diagnostic Baseline",
        "page": 151,
        "domain": "SUBTRACTION_REGROUPING",
        "context": "Diagnostic baseline control probe: standard 2-digit subtraction without regrouping.",
        "prompt": "79 - 45 = ?",
        "correctAnswer": 34,
        "options": [34, 32, 24, 35],
        "optionLabels": [
            "34 (Correct baseline answer)",
            "32 (Calculation slip in ones)",
            "24 (Calculation slip in tens)",
            "35 (Calculation slip)"
        ],
        "distractors": {
            "32": {
                "signature": "CALCULATION_SLIP",
                "explanation": "Single-digit slip in ones place.",
                "teacherInquiry": "Check 9 - 5.",
                "activity": "Single-digit flashcards.",
                "studentHint": "Double-check 9 minus 5 in the ones column!"
            },
            "24": {
                "signature": "CALCULATION_SLIP",
                "explanation": "Tens column subtraction slip.",
                "teacherInquiry": "Check 7 - 4.",
                "activity": "Tens count-back.",
                "studentHint": "Double-check 7 tens minus 4 tens!"
            },
            "35": {
                "signature": "CALCULATION_SLIP",
                "explanation": "General calculation slip.",
                "teacherInquiry": "Recheck both columns.",
                "activity": "Practice column subtraction without regrouping.",
                "studentHint": "Carefully subtract ones, then tens!"
            }
        },
        "is_regrouping": False,
        "minuend": 79,
        "subtrahend": 45,
    }
]

def load_json_file(filename: str) -> List[Dict[str, Any]]:
    path = ROOT_DATA_DIR / filename
    if not path.exists():
        print(f"Warning: {filename} not found.")
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data.get("probes", [])

def align_probe(probe: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure every probe matches the canonical schema and has complete pedagogical keys."""
    pid = probe["id"]
    chap = probe.get("chapter", "")
    page = probe.get("page", 1)
    domain = probe.get("domain", "")

    # Chapter 12 fixes
    if pid.startswith("ncert_ch12_"):
        chap = "Chapter 12: Give and Take"
        domain = "SUBTRACTION_REGROUPING"
        if "regrouping_type" in probe:
            probe["is_regrouping"] = (probe["regrouping_type"] != "NON_REGROUPING_CONTROL")

    # Options and optionLabels
    options = probe.get("options", [])
    option_labels = probe.get("optionLabels", [])
    if not option_labels or len(option_labels) < len(options):
        # Generate clean readable labels if absent
        option_labels = [str(opt) for opt in options]

    # Distractors alignment
    raw_distractors = probe.get("distractors", {})
    aligned_distractors = {}
    for opt_key, dist_val in raw_distractors.items():
        if isinstance(dist_val, dict):
            sig = dist_val.get("signature", "MISCONCEPTION")
            # Remove any legacy SIG_ prefix if present
            if sig.startswith("SIG_"):
                sig = sig[4:]
            expl = dist_val.get("explanation", f"Answer matches error signature {sig}.")
            inquiry = dist_val.get("teacherInquiry", dist_val.get("followUp", "Can you explain your thinking?"))
            activity = dist_val.get("activity", "Targeted hands-on practice with concrete materials.")
            hint = dist_val.get("studentHint", "")
            if not hint:
                # Generate child-friendly Mascot Chintu hint if missing
                if "smaller-from-larger" in expl.lower() or sig == "SMALLER_FROM_LARGER":
                    hint = "Hold on! Look at the top digit! Can we take a bigger number from a smaller one without unbundling?"
                elif "borrow without decrement" in expl.lower() or sig == "BORROW_WITHOUT_DECREMENT":
                    hint = "Great unbundling! But remember to cross out and reduce the higher column too!"
                elif "zero-across" in expl.lower() or sig == "ZERO_ACROSS_BORROW_ERROR":
                    hint = "Zeros can be tricky! Unbundle from the hundreds first to help the tens, then the ones!"
                elif "add" in expl.lower() or sig == "OPERATION_CONFUSION_ADD":
                    hint = "Check the math sign! Are we taking away or putting together?"
                else:
                    hint = "Check your thinking carefully and try again!"

            aligned_distractors[str(opt_key)] = {
                "signature": sig,
                "explanation": expl,
                "teacherInquiry": inquiry,
                "activity": activity,
                "studentHint": hint,
            }
        else:
            # String distractor conversion
            expl_str = str(dist_val)
            sig = "CALCULATION_SLIP"
            if "smaller-from-larger" in expl_str.lower():
                sig = "SMALLER_FROM_LARGER"
            elif "borrow without decrement" in expl_str.lower():
                sig = "BORROW_WITHOUT_DECREMENT"
            elif "operation confusion" in expl_str.lower():
                sig = "OPERATION_CONFUSION_ADD"

            aligned_distractors[str(opt_key)] = {
                "signature": sig,
                "explanation": expl_str,
                "teacherInquiry": "Walk me through how you solved this step by step.",
                "activity": "Practice with base-10 blocks and visual diagrams.",
                "studentHint": "Take a close look at your steps and try again!",
            }

    aligned = {
        "id": pid,
        "chapter": chap,
        "page": page,
        "domain": domain,
        "context": probe.get("context", ""),
        "prompt": probe.get("prompt", ""),
        "correctAnswer": probe.get("correctAnswer", 0),
        "options": options,
        "optionLabels": option_labels,
        "distractors": aligned_distractors,
        "is_regrouping": probe.get("is_regrouping", False),
        "minuend": probe.get("minuend", 0),
        "subtrahend": probe.get("subtrahend", 0),
    }

    if "dienes_blocks_scaffolding" in probe:
        aligned["dienes_blocks_scaffolding"] = probe["dienes_blocks_scaffolding"]
    if "number_line_jumps" in probe:
        aligned["number_line_jumps"] = probe["number_line_jumps"]

    return aligned

def build_aligned_curriculum_dataset():
    print("Consolidating NCERT Class 3 Mathematics Curriculum Probes...")

    files = [
        "ncert_maths_mela_foundations.json",
        "ncert_ch03_ch04_double_century_nani.json",
        "ncert_ch05_shapes_ch06_hundreds.json",
        "ncert_ch07_multiplication_ch08_fractions.json",
        "ncert_ch09_hundreds_ii_ch10_measurement.json",
        "ncert_ch11_ch13_ch14_final.json",
        "ncert_chapter12_give_and_take.json",
    ]

    probes_by_id = {}

    # 1. Add canonical probes first
    for cp in CANONICAL_PROBES:
        probes_by_id[cp["id"]] = cp

    # 2. Add files in chapter order (later files override duplicate entries with more complete details)
    for fname in files:
        raw_list = load_json_file(fname)
        for p in raw_list:
            aligned = align_probe(p)
            probes_by_id[aligned["id"]] = aligned

    print(f"Total Unique Probes Processed: {len(probes_by_id)}")

    # Sort probes by Chapter order, then by page
    def sort_key(p):
        chap = p.get("chapter", "")
        # Chapter ordering weight
        weight = 99
        if "Canonical" in chap: weight = 0
        elif "Chapter 1:" in chap: weight = 1
        elif "Chapter 2:" in chap: weight = 2
        elif "Chapter 3:" in chap: weight = 3
        elif "Chapter 4:" in chap: weight = 4
        elif "Chapter 5:" in chap: weight = 5
        elif "Chapter 6:" in chap: weight = 6
        elif "Chapter 7:" in chap: weight = 7
        elif "Chapter 8:" in chap: weight = 8
        elif "Chapter 9:" in chap: weight = 9
        elif "Chapter 10:" in chap: weight = 10
        elif "Chapter 11:" in chap: weight = 11
        elif "Chapter 12:" in chap: weight = 12
        elif "Chapter 13:" in chap: weight = 13
        elif "Chapter 14:" in chap: weight = 14
        return (weight, p.get("page", 0), p.get("id", ""))

    sorted_probes = sorted(probes_by_id.values(), key=sort_key)

    curriculum_metadata = {
        "curriculum": "NCERT Class 3 Mathematics",
        "textbook": "Maths Mela (First Edition 2024 / Reprint 2026-27)",
        "total_probes": len(sorted_probes),
        "chapters": [
            "Canonical Diagnostic Baseline",
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
            "Chapter 14: The Surajkund Fair (pp. 177-192, Material Sheets pp. 193-208)"
        ],
        "probes": sorted_probes
    }

    out_file = ROOT_DATA_DIR / "ncert_class3_mathematics_full_curriculum.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(curriculum_metadata, f, indent=2)

    print(f"Master unified aligned dataset successfully exported to:\n  {out_file}")

    # Also write back the aligned Chapter 12 dataset
    ch12_probes = [p for p in sorted_probes if p["id"].startswith("ncert_ch12_")]
    ch12_metadata = {
        "curriculum": "NCERT Class 3 Mathematics",
        "textbook": "Maths Mela (First Edition 2024 / Reprint 2026-27)",
        "chapter": "Chapter 12: Give and Take (pp. 150-164)",
        "learning_outcomes": [
            "M3.1: Subtracts two-digit numbers with regrouping in context of real-world problems",
            "M3.2: Solves three-digit subtraction with regrouping at ones and tens place",
            "M3.3: Diagnoses specific systematic error rules in subtraction algorithms"
        ],
        "probes": ch12_probes
    }
    with open(ROOT_DATA_DIR / "ncert_chapter12_give_and_take.json", "w", encoding="utf-8") as f:
        json.dump(ch12_metadata, f, indent=2)
    print(f"Aligned Chapter 12 dataset updated with {len(ch12_probes)} probes.")

    return curriculum_metadata

if __name__ == "__main__":
    build_aligned_curriculum_dataset()
