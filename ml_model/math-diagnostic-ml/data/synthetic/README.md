# Synthetic Evaluation Dataset Documentation

This directory contains the synthetic benchmark evaluation dataset for the Class 3 subtraction with regrouping diagnostic engine prototype.

---

## 1. Purpose of the Dataset
The dataset in `diagnostic_cases.jsonl` provides a reproducible, non-circular benchmark to evaluate whether the deterministic diagnostic engine behaves in strict accordance with the approved diagnostic rules across diverse response scenarios.

### Educational Privacy and Safety Policy
- **100% Synthetic:** Every case in this dataset is procedurally and manually constructed based on mathematical error rules.
- **Zero Real Student Data:** No student names, demographics, schools, or real assessment attempts are collected, stored, or simulated.
- **No Claims of Mind-Reading:** Observed answer patterns represent mathematical signatures only. They do not claim to prove a child's internal cognitive reasoning.

---

## 2. File Format and Schema

The dataset is stored as JSON Lines (`diagnostic_cases.jsonl`), where each line is an independent, valid JSON object with the following fields:

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `case_id` | `string` | Unique identifier for the test case (e.g., `syn_case_01`). |
| `synthetic` | `boolean` | Always `true`, explicitly marking the data as artificial. |
| `scenario_category` | `string` | Concise label describing the testing condition. |
| `responses` | `object` | Mapping of probe IDs (`probe_01`, `probe_02`, `probe_03`, `ctrl_01`, `ctrl_02`) to integer student answers. |
| `expected_diagnostic_status` | `string` | One of the four approved engine statuses (`SUPPORTED_HYPOTHESIS`, `INSUFFICIENT_EVIDENCE`, `AMBIGUOUS_PATTERN`, `NO_TARGET_PATTERN_DETECTED`). |
| `expected_signature` | `string` or `null` | Exact matching signature (`SMALLER_FROM_LARGER`, `BORROW_WITHOUT_DECREMENT`, or `null`). |
| `rationale` | `string` | Pedagogical and mathematical reason why this case belongs to this scenario. |

---

## 3. Curated Probe Reference

All responses in this dataset are based on the 5 approved two-digit subtraction probes:

| Probe ID | Type | Minuend ($M$) | Subtrahend ($S$) | Correct Answer | Smaller-From-Larger ($u_S - u_M, t_M - t_S$) | Borrow-Without-Decrement ($(u_M+10)-u_S, t_M - t_S$) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `probe_01` | Regrouping | 61 | 24 | **37** | **43** | **47** |
| `probe_02` | Regrouping | 72 | 38 | **34** | **46** | **44** |
| `probe_03` | Regrouping | 83 | 49 | **34** | **46** | **44** |
| `ctrl_01` | Control | 58 | 23 | **35** | *N/A* | *N/A* |
| `ctrl_02` | Control | 79 | 45 | **34** | *N/A* | *N/A* |

---

## 4. Scenario Coverage (29 Cases)

The dataset contains 29 cases spanning 13 distinct assessment scenarios:

1. **All Answers Correct on Fixed Probe Set:** Case `syn_case_01` (category: `all_answers_correct`). All five answers are correct on this fixed probe set. This verifies that the engine returns `NO_TARGET_PATTERN_DETECTED` with `all_correct: true`, but does **not** establish general mathematical mastery.
2. **Canonical Smaller-From-Larger:** Case `syn_case_02`.
3. **Canonical Borrow-Without-Decrement:** Case `syn_case_03`.
4. **Partial Signature Matches (1 or 2 matching items):** Cases `syn_case_04` through `syn_case_09`.
5. **Conflicting Signatures Across Probes:** Cases `syn_case_10` through `syn_case_12`.
6. **Unmodeled Errors with Correct Controls:** Cases `syn_case_13` through `syn_case_15`.
7. **Failed Control 1 (`ctrl_01`):** Cases `syn_case_16` and `syn_case_17`.
8. **Failed Control 2 (`ctrl_02`):** Cases `syn_case_18` and `syn_case_19`.
9. **Failed Both Controls:** Cases `syn_case_20` through `syn_case_22`.
10. **Missing One Response:** Cases `syn_case_23` and `syn_case_24`.
11. **Multiple Missing Responses:** Cases `syn_case_25` and `syn_case_26`.
12. **Empty Response Mapping:** Case `syn_case_27`.
13. **Other Mixed / Inconsistent Answer Patterns:** Cases `syn_case_28` and `syn_case_29`.

---

## 5. Explicit Limitations and Non-Validation Disclaimer

> **IMPORTANT NOTICE ON EVALUATION BOUNDARIES:**
> 
> Testing against this synthetic dataset verifies only that the **software implementation faithfully executes the deterministic rules specified in Phase 1**.
> 
> - **Software Testing vs. Educational Validity:** Synthetic cases test software behaviour only, not real-world diagnostic validity or educational effectiveness.
> - **No Proof of Child's Reasoning:** Matches to a mathematical error signature do not prove a child's internal cognitive process or prove why an answer was entered.
> - **No Claim of General Mastery:** When all five answers are correct on this fixed probe set, it indicates only that no error patterns were detected on these five specific problems; it does **not** establish general mathematical mastery.
> - **No Statistical Reliability:** Passing 100% of synthetic cases does **not** establish psychometric sensitivity, specificity, or real-world diagnostic accuracy.
> - **Formative Decision Aid Only:** In classroom application, all engine findings must be reviewed by a qualified primary mathematics educator.
