# ReasonFirst: Comprehensive Implementation & Architecture Audit

**Date of Audit**: October 31, 2026  
**Auditor**: Senior Full-Stack & Cognitive Diagnostic Systems Engineer  
**Target Repository**: ReasonFirst (Educational Diagnostic & Intervention System)  
**Standard**: MIT Solve Global Learning Challenge / NCERT Class 3 Foundational Mathematics Alignment

---

## Executive Summary

An exhaustive code and architecture audit of the ReasonFirst repository was conducted across all subsystems:
1. Python Diagnostic Engine & Curriculum Psychometrics (`ml_model/math-diagnostic-ml/`)
2. Node.js Express Backend & PostgreSQL Schema (`backend/`)
3. React + Vite Frontend Application (`frontend/`)
4. Data governance, test suites, and integration contracts.

### Summary Classification Table

| Subsystem / Feature Area | Status | Primary File(s) | Key Evidence / Core Finding |
| :--- | :--- | :--- | :--- |
| **A. Single vs Multi-Response Diagnostic Paths** | **BROKEN / BYPASSED** | `ml_model/.../server.py`<br>`backend/server.js` | `diagnose_responses()` (multi-response) requires all 5 canonical probes simultaneously; frontend submits one question at a time to `/api/responses`, causing the multi-response engine to be completely bypassed in production. |
| **B. Assessment Session Workflow** | **NOT IMPLEMENTED** | `backend/server.js`<br>`backend/schema.sql`<br>`frontend/src/pages/QuestionSolving.jsx` | Responses are stored as isolated items per question. No `assessment_sessions` table exists. Student report endpoint fetches only `ORDER BY r.submitted_at DESC LIMIT 1`. |
| **C. Conversational Reasoning Integration** | **PARTIALLY IMPLEMENTED (DISCONNECTED)** | `backend/chat/chatRoutes.js`<br>`backend/chat/chatBrain.js`<br>`frontend/src/pages/ChatScreen.jsx` | Teacher Bot dialogue runs and generates a summary in `chat_summaries`, but this is never reconciled with the diagnostic engine. Diagnostic state and rules remain unchanged. |
| **D. Curriculum Probes, Skills & Signatures Usage** | **PARTIALLY IMPLEMENTED** | `ml_model/.../engine.py`<br>`data/ncert_class3_*.json`<br>`calibrated_diagnostic_model.json` | 132 probes and 44 skills are loaded into memory and metadata tables, but calculation rules exist only for 4 subtraction signatures (`SMALLER_FROM_LARGER`, `BORROW_WITHOUT_DECREMENT`, `ZERO_ACROSS_BORROW`, `OPERATION_CONFUSION_ADD`). |
| **E. Bayesian Cognitive Diagnostic Model Execution** | **PARTIALLY IMPLEMENTED** | `ml_model/.../engine.py`<br>`scripts/train.py`<br>`models/calibrated_diagnostic_model.json` | DINA posterior probabilities are calculated in `engine.py`, but item parameters (slip, guess, difficulty) are predefined synthetic heuristics (`0.04 + 0.007 * skill_count`), not empirically calibrated from real student trials. |
| **F. Confidence & Mastery Justification** | **BROKEN / UNSUPPORTED** | `ml_model/.../engine.py`<br>`frontend/src/pages/DiagnosticReport.jsx` | Single answers trigger `"confidence": "HIGH"` and declare "conceptual understanding and mastery". Frontend hardcodes concept percentages (`isPass ? 96 : 42`). |
| **G. Teacher Dashboard Evidence Display** | **PARTIALLY IMPLEMENTED** | `frontend/src/pages/TeacherDashboard.jsx`<br>`frontend/src/components/StudentCard.jsx` | Shows aggregate progress percentage and single student report; lacks misconception grouping, prerequisite gap breakdown, and transparent evidence cards. |
| **H. Reassessment & Intervention Tracking** | **NOT IMPLEMENTED** | `backend/`<br>`frontend/` | No schema, endpoints, UI, or evaluation mechanisms exist for tracking delivered interventions or pre/post reassessment comparison. |
| **I. End-to-End Subsystem Integration** | **PARTIALLY IMPLEMENTED** | All subsystems | Local services communicate via HTTP, but tests reveal broken auth seeds (`test-auth.js` 2 failures) and demo script failures (`test-e2e-demo.js` crashes). |

---

## Detailed Investigation Findings

### Finding A: Diagnostic Engine Single-Response vs Multi-Response Paths
- **Classification**: `BROKEN / BYPASSED`
- **Location**:
  - `ml_model/math-diagnostic-ml/src/math_diagnostic/engine.py` (Lines 531–620, 902–1069)
  - `ml_model/math-diagnostic-ml/server.py` (Lines 293–327)
  - `backend/server.js` (Lines 145–215)
- **Evidence**:
  In `server.py`, the `/predict` route checks:
  ```python
  if len(probe_dict) >= len(APPROVED_PROBES) and all(k in probe_dict for k in APPROVED_PROBES.keys()):
      engine_result = diagnose_responses({k: int(v) for k, v in probe_dict.items()})
      response_payload = format_full_diagnosis(engine_result)
  else:
      response_payload = evaluate_single_answer(qid, ans)  # calls diagnose_single_response
  ```
  `diagnose_responses` is designed to enforce conservative diagnostic principles: it evaluates all regrouping probes together with non-regrouping control problems (`ctrl_01`, `ctrl_02`), returning `INSUFFICIENT_EVIDENCE` or `AMBIGUOUS_PATTERN` if inconsistent.
  However, the frontend UI (`QuestionSolving.jsx` lines 76–86) submits questions individually to `POST /api/responses`. The backend forwards each single response to `/predict`. Because `len(probe_dict) < 5`, `diagnose_responses` is **never executed in the student workflow**.
  Instead, `diagnose_single_response` is called. It evaluates an isolated answer: if 61 - 24 = 43, it immediately assigns `HIGH` confidence to `SMALLER_FROM_LARGER` based on a single response, violating foundational diagnostic standards.

---

### Finding B: Assessment Session Workflow
- **Classification**: `NOT IMPLEMENTED`
- **Location**:
  - `backend/schema.sql` (Lines 22–30)
  - `backend/server.js` (Lines 145–260, 326–350)
  - `frontend/src/pages/QuestionSolving.jsx` (Lines 76–106, 136–155)
- **Evidence**:
  1. In `backend/schema.sql`, there is no `assessment_sessions` table. The `responses` table links directly to `student_id` and `assignment_id`, but has no session identifier.
  2. Every question submission creates an independent `responseId = randomUUID()` with its own entry in `responses` and `diagnoses`.
  3. In `backend/server.js`, `/api/reports/student/:studentId` queries:
     ```sql
     SELECT r.*, ... FROM responses r WHERE r.student_id = $1 ORDER BY r.submitted_at DESC LIMIT 1
     ```
     This strictly retrieves the single most recent question answered by the student, completely discarding all earlier questions in the quiz.
  4. There is no concept of a session state machine (`in_progress`, `completed`, `reconciled`).

---

### Finding C: Conversational Reasoning Integration
- **Classification**: `PARTIALLY IMPLEMENTED (DISCONNECTED)`
- **Location**:
  - `backend/chat/chatRoutes.js` (Lines 209–265)
  - `backend/chat/chatBrain.js` (Lines 215–300)
  - `frontend/src/pages/ChatScreen.jsx` (Lines 464–502)
- **Evidence**:
  1. The chat dialogue between child and bot functions in Hindi/Hinglish and successfully invokes `generateTeacherSummary`.
  2. When the dialogue finishes, `POST /chat/finish` saves the generated summary in PostgreSQL `chat_summaries` or memory.
  3. **Disconnection**: `chatRoutes.js` never calls the ML Diagnostic Engine or updates `diagnoses` / `memoryStore.diagnoses`. The diagnosis remains whatever the isolated multiple-choice selection was.
  4. In `QuestionSolving.jsx` (lines 136–150), only the final question of the quiz (`question.id`, `studentAnswer`, `responseId`) is passed into `/chat`. The student's reasoning on prior questions is never collected or considered.

---

### Finding D: Curriculum Probes, Cognitive Skills & Misconception Catalogue
- **Classification**: `PARTIALLY IMPLEMENTED`
- **Location**:
  - `ml_model/math-diagnostic-ml/src/math_diagnostic/engine.py` (Lines 319–408, 417–468)
  - `ml_model/math-diagnostic-ml/models/calibrated_diagnostic_model.json`
  - `ml_model/math-diagnostic-ml/data/` (14 JSON files)
- **Evidence**:
  1. The repository contains 132 authentic NCERT curriculum probes and 44 latent cognitive skills properly categorized in JSON data files.
  2. In `engine.py`, mathematical calculation functions (`calculate_signature_answer`) only implement four procedural signatures:
     - `SIG_SMALLER_FROM_LARGER`
     - `SIG_BORROW_WITHOUT_DECREMENT`
     - `SIG_ZERO_ACROSS_BORROW`
     - `SIG_OPERATION_CONFUSION_ADD`
  3. The other 239 signatures (e.g. geometric shape disjunctions, measurement misconceptions) exist purely as static string constants and text descriptions in `calibrated_diagnostic_model.json`, not operationalized in the diagnostic classification engine.
  4. `diagnose_responses` is hardcoded to check subtraction regrouping only and crashes or misdiagnoses if given probes from other domains.

---

### Finding E: Bayesian Cognitive Diagnostic Model Execution & Calibration
- **Classification**: `PARTIALLY IMPLEMENTED`
- **Location**:
  - `ml_model/math-diagnostic-ml/scripts/train.py` (Lines 573–600)
  - `ml_model/math-diagnostic-ml/models/calibrated_diagnostic_model.json`
  - `ml_model/math-diagnostic-ml/src/math_diagnostic/engine.py` (Lines 754–803, 827–868)
- **Evidence**:
  1. In `engine.py`, lines 770–798 implement the DINA model log-likelihood ratio `l1 / (l1 + l0)` to compute posterior mastery probability $P(\alpha_k = 1 \mid \mathbf{Y})$.
  2. However, inspection of `scripts/train.py` lines 580–595 reveals the parameter generation logic:
     ```python
     base_difficulty = 0.25 + (skill_count * 0.10)
     slip_rate = round(min(0.04 + (0.007 * skill_count), 0.085), 3)
     guess_rate = 0.04
     discrimination = round(1.25 + (0.12 * skill_count), 2)
     ```
  3. These parameters are deterministic heuristic functions of skill count. They have never been calibrated against empirical classroom response data.
  4. In `diagnose_single_response`, psychometrics are calculated using a 1-item formula $P(\alpha = 1 \mid \text{Pass}) = \frac{1-s}{1-s+g}$, which gives an illusion of precision from a single binary observation.

---

### Finding F: Confidence and Mastery Justification
- **Classification**: `BROKEN / UNSUPPORTED`
- **Location**:
  - `ml_model/math-diagnostic-ml/src/math_diagnostic/engine.py` (Lines 934, 966, 1001, 1028)
  - `frontend/src/pages/DiagnosticReport.jsx` (Lines 97–102)
- **Evidence**:
  1. In `engine.py` line 934:
     ```python
     if is_correct:
         return {
             "status": "Pass",
             "ruleId": "CORRECT",
             "observations": "...Student demonstrated conceptual understanding and mastery.",
             "confidence": "HIGH"
         }
     ```
     A single correct answer on a 4-choice MCQ (with a 25% random guessing baseline) is assigned `HIGH` confidence and labeled as demonstrating "mastery".
  2. In `engine.py` lines 1001 & 1028, a single erroneous answer immediately generates `"confidence": "HIGH"`.
  3. In `frontend/src/pages/DiagnosticReport.jsx` lines 97–102:
     ```javascript
     const conceptData = [
       { label: 'Place Value Concept (Tens/Ones)', percentage: isPass ? 96 : 42, color: isPass ? 'bg-secondary' : 'bg-danger' },
       { label: 'Two-Digit Regrouping Procedure', percentage: isPass ? 94 : 35, color: isPass ? 'bg-secondary' : 'bg-danger' },
       { label: 'Basic Subtraction Facts (< 10)', percentage: isPass ? 92 : 78, color: 'bg-secondary' },
       { label: 'Single-Digit Recall Speed', percentage: 85, color: 'bg-accent' },
     ];
     ```
     The concept breakdown percentages shown to teachers are completely fabricated conditional numbers (96% vs 42%) hardcoded in the frontend view.

---

### Finding G: Teacher Dashboard Evidence Display
- **Classification**: `PARTIALLY IMPLEMENTED`
- **Location**:
  - `frontend/src/pages/TeacherDashboard.jsx` (Lines 53–62, 254–267)
  - `backend/server.js` (Lines 522–600)
- **Evidence**:
  1. The Teacher Dashboard loads student records from `/api/dashboard`, but each student is represented only by a scalar progress percentage (`correctCount / totalResponses * 100`).
  2. The dashboard offers a simple binary filter: `s.progress < 75` (labeled as "Pending Review").
  3. It does not group students by identified misconception, prerequisite gap, or pedagogical intervention need.
  4. Clicking on a student opens `/report`, which presents only the single latest response rather than an evidence trail.

---

### Finding H: Reassessment & Intervention Tracking
- **Classification**: `NOT IMPLEMENTED`
- **Location**:
  - Whole repository search for `reassessment`, `pre_post`, `intervention_records`.
- **Evidence**:
  1. No database table exists for teacher interventions or post-intervention reassessment.
  2. `overrides` table exists for human-in-the-loop decisions on single diagnoses (`confirm` / `reject`), but has no fields for recording instructional actions taken or scheduled reassessments.
  3. No pre/post comparison logic exists in either the backend or Python engine.

---

### Finding I: End-to-End System Integration and Test Suite Health
- **Classification**: `PARTIALLY IMPLEMENTED / BROKEN TESTS`
- **Location**:
  - `backend/test-auth.js`
  - `backend/test-e2e-demo.js`
  - `backend/chat/test-chat.js`
  - `ml_model/math-diagnostic-ml/tests/`
- **Evidence**:
  1. Python tests (`python -m unittest discover`): 23 tests ran, all 23 pass.
  2. Chatbot safety edge cases (`node chat/test-edge-cases.js`): 5 tests ran, all 5 pass.
  3. Auth tests (`node test-auth.js`): **2 tests FAIL** due to missing in-memory seed for `teacher@demo.com` and default class code `"3A"`.
  4. E2E demo test (`node test-e2e-demo.js`): **FAILS / CRASHES** with `TypeError: Cannot read properties of undefined (reading 'id')` because student login with class code `"3A"` returns 404.
  5. Interactive chat test (`node chat/test-chat.js`): Blocks indefinitely on terminal stdin because it is an interactive prompt rather than an automated assertion test.

---

## Conclusion & Architectural Readiness

The repository possesses strong domain foundations (NCERT curriculum alignment, rule-based mathematical distractor modeling, bilingual conversational scaffolding). However, the system currently suffers from **subsystem isolation**:
- The assessment session does not exist as a coherent entity.
- The multi-response engine is bypassed in favor of premature single-answer diagnoses.
- Conversational reasoning produces a summary card without feeding back into the diagnostic model.
- Confidence levels and progress percentages are unsupported or hardcoded.
- Interventions, reassessments, and needs-based groupings are absent.

The remediation plan specified in the Master Engineering Prompt is technically sound, necessary, and addresses each of these architectural vulnerabilities directly.

