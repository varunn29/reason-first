# Integration Contract — Class 3 Subtraction Diagnostic Prototype

## 1. Purpose

This document defines how the rules-based diagnostic engine should communicate
with a future user interface. It is an integration specification, not evidence
of classroom effectiveness.

## 2. Current scope

The prototype evaluates five fixed two-digit subtraction probes involving
subtraction with regrouping and control questions.

| Probe ID | Question | Correct answer |
|---|---|---:|
| probe_01 | 61 - 24 | 37 |
| probe_02 | 72 - 38 | 34 |
| probe_03 | 83 - 49 | 34 |
| ctrl_01 | 58 - 23 | 35 |
| ctrl_02 | 79 - 45 | 34 |

The interface must use these exact probe IDs when submitting responses.

## 3. Engine entry point

Python module: `math_diagnostic.engine`

Function: `diagnose_responses(responses)`

Expected input: a mapping from probe IDs to integer answers.

Example:

    responses = {
        "probe_01": 37,
        "probe_02": 46,
        "probe_03": 46,
        "ctrl_01": 35,
        "ctrl_02": 34
    }

This example is illustrative. The interface must submit actual entered answers,
not pre-filled answers or answers generated from the expected diagnosis.

## 4. Output contract

The engine returns a result containing these fields:

- `engine_version`
- `diagnostic_status`
- `all_correct`
- `summary`
- `observed_pattern_match`
- `inferred_misconception`
- `disclaimer`

The interface must display the returned status, summary and disclaimer. Optional
or null pattern fields must not be displayed as confirmed diagnoses.

## 5. Diagnostic statuses

- `SUPPORTED_HYPOTHESIS`: responses match a modeled answer pattern. This is a
  hypothesis, not proof of the learner's internal reasoning.
- `INSUFFICIENT_EVIDENCE`: there are not enough usable responses.
- `AMBIGUOUS_PATTERN`: the responses do not support a sufficiently consistent
  classification.
- `NO_TARGET_PATTERN_DETECTED`: the modeled target patterns were not detected.
  This does not necessarily mean the learner understands the concept.

The interface must preserve these distinctions and must not convert uncertain
results into definitive claims.

## 6. Input and error handling

- Preserve the exact probe IDs.
- Collect integer answers from the learner.
- Do not silently replace missing answers with zero.
- Do not silently convert invalid text to an answer.
- Show a clear input error if an answer is invalid.
- Handle engine exceptions without presenting a false diagnosis.
- Do not claim a diagnosis was completed if the engine call failed.

The engine's current validation rejects unsupported IDs, invalid types and
out-of-range answers. The interface should respect the engine's actual rules.

## 7. Integration boundary

The frontend and engine must agree on the input mapping and returned fields
before integration.

Preferred initial integration: call the existing Python engine from a Python
application layer. If the teammate's frontend is a separate JavaScript
application, use a small Python API adapter only after agreeing on the request
and response formats. Do not duplicate the diagnostic rules in JavaScript.

No API endpoint, deployment, authentication or database is claimed to exist
unless it is separately implemented and tested.

## 8. Current verification evidence

At the time this contract was drafted:

- 23 automated unit tests passed.
- The synthetic evaluation dataset contained 29 cases.
- Expected diagnostic statuses matched in 29 of 29 cases.
- Expected target-pattern signatures matched in 2 of 2 labelled cases.
- The evaluation reported zero mismatches.

These results verify programmed behaviour on synthetic cases. They do not
establish real-world classroom validity, diagnostic accuracy, psychometric
reliability or proof of a learner's reasoning.

## 9. Data and ethical boundaries

- Current benchmark records are synthetic.
- No official school or learner dataset is claimed.
- No educator validation or stakeholder validation is claimed.
- Do not use this prototype as the sole basis for grading, labelling, placement
  or high-stakes decisions about a learner.
- A teacher should remain responsible for interpreting results.
- Collect no real learner-identifying information during a synthetic demo.

## 10. Next integration checks

Before declaring the end-to-end prototype complete:

1. Confirm the frontend's framework and entry point.
2. Agree on the request and response formats.
3. Connect the frontend to the existing engine without duplicating its logic.
4. Test all-correct, target-pattern, ambiguous and insufficient-evidence cases.
5. Test invalid input and engine failure handling.
6. Record the test results and any remaining limitations.
7. Obtain educator feedback before making classroom-effectiveness claims.
