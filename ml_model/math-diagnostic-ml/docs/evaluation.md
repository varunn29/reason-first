# Diagnostic Prototype Evaluation Report (Phase 4)

## Executive Summary
This evaluation report presents an evidence-based assessment of the deterministic diagnostic engine implemented in [`src/math_diagnostic/engine.py`](file:///c:/Users/hp/OneDrive/Pictures/Documents/math_diagnostic_ml/src/math_diagnostic/engine.py). 

The evaluation relies strictly on:
1. The **16 automated unit tests** in [`tests/test_engine.py`](file:///c:/Users/hp/OneDrive/Pictures/Documents/math_diagnostic_ml/tests/test_engine.py) and [`tests/test_environment.py`](file:///c:/Users/hp/OneDrive/Pictures/Documents/math_diagnostic_ml/tests/test_environment.py).
2. The **29 synthetic evaluation cases** in [`data/synthetic/diagnostic_cases.jsonl`](file:///c:/Users/hp/OneDrive/Pictures/Documents/math_diagnostic_ml/data/synthetic/diagnostic_cases.jsonl).
3. The architectural and pedagogical specifications established in Phases 1, 2, and 3.

> **CRITICAL BOUNDARY DISCLAIMER:**
> All evidence reported here measures **software implementation correctness** against programmed mathematical rules. This report **does not claim real-world diagnostic accuracy**, psychometric reliability, or clinical educational validation. No real student data has been collected or analyzed.

---

## 1. Reproducibility

### 1.1 Test Suite Execution
The automated test suite runs via Python's standard `unittest` framework without third-party dependencies.

**Command (Windows PowerShell):**
```powershell
python -m unittest discover tests -v
```

*Verification status:* Verified directly. Execution produces 23 passing tests (16 engine/environment smoke tests + 7 evaluation pipeline tests) in $\approx 0.09$ seconds with exit code 0.

### 1.2 Synthetic Dataset Evaluation Pipeline
The benchmark evaluation pipeline is implemented in [`scripts/evaluate.py`](file:///c:/Users/hp/OneDrive/Pictures/Documents/math_diagnostic_ml/scripts/evaluate.py). It reads every record from `data/synthetic/diagnostic_cases.jsonl`, executes `diagnose_responses()`, validates JSON and schema integrity, and compares both diagnostic statuses and expected signatures.

**Command (Windows PowerShell):**
```powershell
python scripts/evaluate.py
```

**Actual Verified Execution Output:**
```text
========================================================================
DIAGNOSTIC ENGINE BENCHMARK EVALUATION REPORT
========================================================================
Dataset File: C:\Users\hp\OneDrive\Pictures\Documents\math_diagnostic_ml\data\synthetic\diagnostic_cases.jsonl
Total Cases Loaded:          29
Successfully Evaluated:      29
Invalid / Unreadable Rows:   0
Diagnostic Status Matches:   29 / 29
Expected Signature Matches:  2 / 2
Total Evaluation Mismatches: 0
------------------------------------------------------------------------
EVALUATION BOUNDARY NOTICE:
This evaluation tests software implementation correctness against programmed
rules on synthetic benchmark cases. It does NOT establish real-world classroom
diagnostic validity, psychometric reliability, or proof of a child's thinking.
========================================================================
```

**Process Exit Code Specification:**
- **Code 0:** All records parsed cleanly, all evaluated successfully, and 100% of diagnostic statuses and signatures matched expected values.
- **Code 1:** Encountered one or more evaluation mismatches, unreadable lines, or malformed schema records (e.g., missing `expected_diagnostic_status`).
- **Code 2:** Fatal process error (e.g., dataset file not found).

---

## 2. Scenario Coverage Analysis

The synthetic evaluation dataset covers 29 cases across 13 distinct assessment scenario categories:

| Scenario Category | Case Count | Expected Diagnostic Status | What Behaviour is Being Tested | Important Coverage Gaps & Limitations |
| :--- | :---: | :--- | :--- | :--- |
| **`all_answers_correct`** | 1 | `NO_TARGET_PATTERN_DETECTED` | Engine returns baseline output with `all_correct: true` when all 5 probe answers are correct. | Evaluates only one combination of correct answers; does not test general arithmetic mastery beyond this fixed probe set. |
| **`smaller_from_larger_canonical`** | 1 | `SUPPORTED_HYPOTHESIS` (`SMALLER_FROM_LARGER`) | Verifies that unanimous 3/3 regrouping matches with passing controls triggers the candidate hypothesis. | Tests only one specific numerical instance ($43, 46, 46$); does not test problem permutations. |
| **`borrow_without_decrement_canonical`** | 1 | `SUPPORTED_HYPOTHESIS` (`BORROW_WITHOUT_DECREMENT`) | Verifies that unanimous 3/3 regrouping matches with passing controls triggers the candidate hypothesis. | Tests only one specific numerical instance ($47, 44, 44$); does not test problem permutations. |
| **`partial_sfl_*`** | 3 | `AMBIGUOUS_PATTERN` | Verifies that 1 or 2 SFL matches mixed with correct answers or an unmodeled slip do not trigger a false hypothesis. | Tests a limited subset of partial configurations. |
| **`partial_bwd_*`** | 3 | `AMBIGUOUS_PATTERN` | Verifies that 1 or 2 BWD matches mixed with correct answers or an unmodeled slip do not trigger a false hypothesis. | Tests a limited subset of partial configurations. |
| **`conflicting_*`** | 3 | `AMBIGUOUS_PATTERN` | Verifies that mixed matches between SFL and BWD across different probes are flagged as ambiguous. | Only 3 conflicting combinations represented. |
| **`unmodeled_*`** | 3 | `NO_TARGET_PATTERN_DETECTED` | Verifies that calculation errors that do not follow modeled candidate rules return unmodeled status with `all_correct: false`. | Slips are simulated arbitrarily and do not model real student error distributions. |
| **`failed_control_01_*`** | 2 | `AMBIGUOUS_PATTERN` | Verifies that an incorrect answer on `ctrl_01` blocks regrouping hypothesis generation even when probes match SFL or are correct. | Only 2 incorrect values tested ($99, 25$). |
| **`failed_control_02_*`** | 2 | `AMBIGUOUS_PATTERN` | Verifies that an incorrect answer on `ctrl_02` blocks regrouping hypothesis generation even when probes match BWD or are correct. | Only 2 incorrect values tested ($24, 44$). |
| **`failed_both_controls_*`** | 3 | `AMBIGUOUS_PATTERN` | Verifies that failing both controls routes to ambiguous classification regardless of regrouping answers. | Limited value variations tested. |
| **`missing_single_*`** | 2 | `INSUFFICIENT_EVIDENCE` | Verifies that omitting 1 required probe returns insufficient evidence. | Tests omitting `probe_01` or `ctrl_02`; does not explicitly test omitting `probe_02`, `probe_03`, or `ctrl_01`. |
| **`missing_multiple_*`** | 2 | `INSUFFICIENT_EVIDENCE` | Verifies that omitting 2 or 4 probes returns insufficient evidence. | Sample subsets only. |
| **`empty_responses`** | 1 | `INSUFFICIENT_EVIDENCE` | Verifies that an empty dictionary `{}` returns insufficient evidence without throwing unhandled exceptions. | Complete coverage for empty mapping input. |
| **`single_*_with_unmodeled_slips`** | 2 | `AMBIGUOUS_PATTERN` | Verifies that a single signature match embedded in random slips does not trigger a false hypothesis. | Sample subsets only. |

---

## 3. Verified Evaluation Results

The table below summarizes verified metrics, separating historical checkpoint records from current executions:

| Metric Category | Verified Status (Current Execution) | Historical Checkpoint | Result Summary |
| :--- | :--- | :--- | :--- |
| **Total Automated Tests** | Independently Verified | Phase 2 Review | **23 / 23 passed (100%)** in $0.09$s |
| **Engine Smoke Tests** | Independently Verified | Phase 2 Review | **16 / 16 passed** (`tests/test_engine.py`, `tests/test_environment.py`) |
| **Evaluation Pipeline Tests** | Independently Verified | Current Pipeline Phase | **7 / 7 passed** (`tests/test_evaluate.py`) |
| **JSONL Syntax & Schema** | Independently Verified | Phase 3 Review | **29 / 29 lines valid JSON** |
| **Unique Case IDs** | Independently Verified | Phase 3 Review | **29 unique IDs** (`syn_case_01`–`syn_case_29`) |
| **Synthetic Flag Check** | Independently Verified | Phase 3 Review | **29 / 29 marked `synthetic: true`** |
| **Dataset Status Agreement** | Independently Verified | Current Pipeline Phase | **29 / 29 (100% agreement)** via `scripts/evaluate.py` |
| **Dataset Signature Agreement** | Independently Verified | Current Pipeline Phase | **2 / 2 (100% agreement on expected signatures)** |
| **Evaluation Mismatches** | Independently Verified | Current Pipeline Phase | **0 mismatches, 0 invalid rows** |
| **Input Validation Exceptions** | Independently Verified | Phase 2 Review | Strings, booleans, negatives, $>99$, and extra IDs rejected |

---

## 4. Boundary and Logic Analysis

### 4.1 Sufficiency of Three Regrouping Probes
In [`src/math_diagnostic/engine.py`](file:///c:/Users/hp/OneDrive/Pictures/Documents/math_diagnostic_ml/src/math_diagnostic/engine.py), `SUPPORTED_HYPOTHESIS` requires $100\%$ signature agreement across the 3 regrouping probes (`probe_01`, `probe_02`, `probe_03`).
- **For software consistency:** 3 unanimous probes provide a deterministic threshold for the engine's narrow, rule-based hypothesis.
- **For educational interpretation:** 3 items is a very small sample. A child making coincidental calculation slips or guessing could theoretically produce answers matching an error rule. Therefore, this threshold is sufficient **only as a tentative software hypothesis for teacher review**, never as proof of an underlying misconception.

### 4.2 Impact of Failed Controls
The two non-regrouping controls (`ctrl_01: 58 - 23 = 35` and `ctrl_02: 79 - 45 = 34`) establish whether a child can perform basic column subtraction when place-value unbundling is not required.
- If either control fails, [`resolve_classification()`](file:///c:/Users/hp/OneDrive/Pictures/Documents/math_diagnostic_ml/src/math_diagnostic/engine.py#L129-L131) immediately returns `AMBIGUOUS_PATTERN`.
- *Rationale:* If a student cannot reliably subtract single digits or align columns without regrouping, any errors on regrouping problems cannot be isolated as place-value misconceptions.

### 4.3 Handling of Partial Matches and Conflicting Signatures
The engine enforces strict conservatism:
- If a student's responses match `SMALLER_FROM_LARGER` on 2 probes and produce a random slip on the 3rd, the engine returns `AMBIGUOUS_PATTERN`.
- If a student's responses match `SMALLER_FROM_LARGER` on 1 probe and `BORROW_WITHOUT_DECREMENT` on another, the engine returns `AMBIGUOUS_PATTERN`.
- *Rationale:* Inconsistent rule application indicates that the student is not following a single systematic flawed algorithm; automated classification would be speculative.

### 4.4 Exact Meaning of `NO_TARGET_PATTERN_DETECTED`
The status `NO_TARGET_PATTERN_DETECTED` has two distinct meanings, delineated by the boolean flag `all_correct`:
1. `all_correct: true`: All 5 probe items were answered correctly on this fixed assessment set.
2. `all_correct: false`: The student made errors on regrouping probes, but those errors did **not** match either `SMALLER_FROM_LARGER` or `BORROW_WITHOUT_DECREMENT`.
- *Safety Rule:* `NO_TARGET_PATTERN_DETECTED` **never implies general mathematical mastery**. The output summary explicitly includes a warning when errors are unclassified.

### 4.5 Handling of Incomplete Sessions
Omitting any of the 5 required probes immediately returns `INSUFFICIENT_EVIDENCE`. The engine requires a complete assessment session (both controls and all 3 regrouping probes) to maintain diagnostic symmetry.

### 4.6 Non-Independence of the Synthetic Dataset
The 29 synthetic cases were designed using the same mathematical rules that the engine was programmed to evaluate. 
- *Crucial Distinction:* A 100% pass rate on synthetic cases proves **internal implementation consistency** (the code executes the programmed decision tree without logical errors). It does **not** prove real-world diagnostic accuracy or pedagogical truth.

---

## 5. Limitations and Validity

To maintain engineering and educational integrity, we explicitly separate three tiers of evidence:

```mermaid
flowchart TD
    subgraph Tier1["Tier A: Software Correctness"]
        A1["16 Unit Tests Pass"]
        A2["Input Validation Robust"]
        A3["Strict Typing & Bounds"]
    end
    subgraph Tier2["Tier B: Synthetic Scenario Coverage"]
        B1["29 Test Cases Verified"]
        B2["13 Scenarios Checked"]
        B3["Zero Logic Mismatches"]
    end
    subgraph Tier3["Tier C: Real-World Validity (UNPROVEN)"]
        C1["No Classroom Trials"]
        C2["No Primary Educator Review"]
        C3["Alternative Explanations Unchecked"]
    end
    Tier1 --> Tier2
    Tier2 -. "Does NOT Establish" .-> Tier3
```

### 5.1 Evidence Tier A: Software Correctness (ESTABLISHED)
- The Python codebase is deterministic, free of external dependencies, fully typed, and cleanly structured.
- All 16 unit tests pass, verifying boundary conditions, type rejections (`bool`, `str`, `float`), and classification rules.

### 5.2 Evidence Tier B: Scenario Coverage (ESTABLISHED)
- The 29 synthetic cases demonstrate that every branch of `resolve_classification()` executes as intended under programmed conditions.

### 5.3 Evidence Tier C: Real-World Educational Validity (UNPROVEN)
Real-world validity has **not** been established due to the following structural limitations:
1. **Fixed 5-Probe Constraint:** The system evaluates only 5 specific arithmetic problems. How performance on these 5 probes generalizes across other two-digit subtraction problems is untested.
2. **Alternative Explanations for Identical Numbers:** A final answer of `43` on `61 - 24` can be generated by:
   - Smaller-from-larger thinking ($4 - 1 = 3, 6 - 2 = 4$).
   - Reversing the problem ($64 - 21 = 43$).
   - An arithmetic fact slip combined with a transcription error.
   - A lucky guess.
   A final numeric answer alone cannot prove which cognitive process occurred.
3. **Absence of Real Student Data:** No empirical student response data has been gathered. The prevalence of these misconceptions in Indian Class 3 classrooms (NCERT curriculum) remains unmeasured.
4. **Lack of Expert Primary Educator Review:** The candidate remediation activities and misconception categories have not been formally validated by a primary school mathematics teacher.

---

## 6. Conclusions and Next Priorities

### 6.1 What Has Been Demonstrated
- A fully reproducible, explainable, rule-based diagnostic engine for Class 3 two-digit subtraction with regrouping has been successfully built and verified in standard Python.
- The software separates objective pattern matching (`observed_pattern_match`) from tentative educational interpretation (`inferred_misconception`).
- The engine rejects unsafe inputs, avoids arbitrary tie-breaking, and handles ambiguous and incomplete data conservatively.

### 6.2 What Remains Unproven
- Real-world diagnostic accuracy and classroom effectiveness.
- Whether 8-year-old students experience fatigue when answering 5 consecutive vertical subtraction probes.
- Whether teachers find the output summaries and recommended activities actionable and helpful.

### 6.3 Recommended Next Priorities
Before developing new software features, the immediate priorities should be:
1. **Primary Educator Review:** Conduct structured qualitative reviews with Class 3 mathematics teachers to evaluate the probe design, candidate error definitions, and teacher guidance.
2. **Curricular Alignment Check:** Verify probe formats against NCERT Class 3 *Math-Magic* materials and classroom teaching practices.
3. **Small-Scale Formative Pilot:** Run a non-automated paper-and-pencil pilot with an educator to observe whether children's scratchwork correlates with the engine's hypotheses.

### 6.4 Is There Any Reason to Introduce Machine Learning?
**NO.** There is currently zero evidence-based justification for introducing Machine Learning:
1. **Lack of Empirical Training Data:** There is no real student dataset. Training an ML model on synthetic rule-generated data would create an opaque, non-deterministic approximation of deterministic logic that is already 100% solved by simple `if/else` arithmetic checks.
2. **Explainability & Trust:** Primary educators require transparent diagnostic justifications. A neural network or probabilistic classifier cannot provide the clear, verifiable arithmetic audit trail that our deterministic engine delivers.
3. **Efficiency:** The deterministic engine runs in less than 1 millisecond and requires zero heavy dependencies (such as PyTorch or scikit-learn).
