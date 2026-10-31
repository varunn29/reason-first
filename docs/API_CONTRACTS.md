# ReasonFirst: Comprehensive API Contracts & Schemas

## 1. Overview & Conventions

All ReasonFirst APIs adhere to standard REST principles and JSON payloads.
- **Base URL (Backend Gateway)**: `http://localhost:4000`
- **Base URL (ML Diagnostic Engine)**: `http://localhost:8000`
- **Standard Authentication**: `Authorization: Bearer <jwt-token>` (Required for teacher endpoints; student endpoints use session or class code authentication).
- **Error Format**:
  ```json
  {
    "ok": false,
    "error": "Descriptive error message"
  }
  ```

---

## 2. Assessment Session Lifecycle Endpoints

### 2.1. Start Assessment Session
- **Endpoint**: `POST /api/sessions/start`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "studentId": "student_01",
    "assignmentId": "asgn_class3_subtraction",
    "studentName": "Aarav Sharma"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "ok": true,
    "session": {
      "id": "sess_1761902845123",
      "studentId": "student_01",
      "assignmentId": "asgn_class3_subtraction",
      "studentName": "Aarav Sharma",
      "status": "in_progress",
      "startedAt": "2026-10-31T07:15:00.000Z",
      "responses": []
    }
  }
  ```
- **Error Codes**: `400 Bad Request` (missing `studentId` or `assignmentId`).

### 2.2. Submit Probe Response in Session
- **Endpoint**: `POST /api/sessions/:id/responses`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "questionId": "probe_01",
    "questionText": "61 - 24 = ?",
    "answer": 43,
    "correctAnswer": 37,
    "explanation": "4 me se 1 ghataya",
    "timestamp": "2026-10-31T07:15:30.000Z"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "responseId": "resp_1761902875000",
    "preliminaryDiagnosis": {
      "status": "CANDIDATE_MISCONCEPTION",
      "evidence_strength": "WEAK",
      "confidence": "LOW",
      "candidate_misconception": "SMALLER_FROM_LARGER",
      "observations": "Candidate misconception pattern; preliminary observation from single question."
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Question ID not in active assignment.
  - `404 Not Found`: Session ID does not exist.
  - `409 Conflict`: Response already submitted for this `questionId` in this session.

### 2.3. Complete Assessment Session & Run Synthesis
- **Endpoint**: `POST /api/sessions/:id/complete`
- **Headers**: `Content-Type: application/json`
- **Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "session": {
      "id": "sess_1761902845123",
      "status": "completed",
      "completedAt": "2026-10-31T07:18:00.000Z",
      "responsesCount": 5
    },
    "diagnosis": {
      "diagnostic_status": "SUPPORTED_HYPOTHESIS",
      "evidence_strength": "STRONG",
      "confidence": "HIGH",
      "candidate_misconception": "SMALLER_FROM_LARGER",
      "all_correct": false,
      "probes_evaluated": 5,
      "correct_count": 2,
      "supporting_evidence": [
        "Correct: 2/5 probes.",
        "Consistent signature: SMALLER_FROM_LARGER across 3 regrouping probes."
      ],
      "contradictory_evidence": [],
      "missing_evidence": [],
      "skill_mastery": {
        "ONES_REGROUPING": "DEVELOPING",
        "NON_REGROUPING_SUBTRACTION": "SECURE",
        "PLACE_VALUE_BUNDLES": "DEVELOPING"
      },
      "related_prerequisite_skill": {
        "id": "PLACE_VALUE_BUNDLES",
        "name": "Base-10 Tens & Ones Structure",
        "ncert_mapping": "NCERT Class 3 Chapter 2"
      },
      "recommended_intervention": {
        "title": "Tens-and-Ones Bundling Mat & Concrete Unbundling",
        "concrete_materials": "Matchstick bundles of 10, loose seeds"
      }
    }
  }
  ```
- **Error Codes**:
  - `404 Not Found`: Session not found.
  - `400 Bad Request`: Incomplete session attempted without minimum responses.

---

## 3. Conversational Reasoning Interview Endpoints

### 3.1. Start Dialogue
- **Endpoint**: `POST /chat/start`
- **Request Body**:
  ```json
  {
    "studentId": "student_01",
    "questionId": "probe_01",
    "language": "hi",
    "question": "61 - 24 = ?",
    "studentAnswer": "43"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "sessionId": "chat_sess_12345",
    "botMessage": "शाबाश आरव! क्या आप मुझे बता सकते हैं कि आपने इकाई में 1 में से 4 को कैसे घटाया?",
    "quickReplies": ["4 में से 1 घटाया", "उधार लिया", "अंदाज़ा लगाया"]
  }
  ```

### 3.2. Send Student Dialogue Turn
- **Endpoint**: `POST /chat/message`
- **Request Body**:
  ```json
  {
    "sessionId": "chat_sess_12345",
    "text": "मैंने 4 में से 1 को घटा दिया तो 3 आया।"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "botMessage": "अच्छा, तो आपने 4 में से 1 घटाया! क्या दहाई में भी कुछ बदला?",
    "canFinish": true
  }
  ```

### 3.3. Finish Dialogue & Reconcile Reasoning
- **Endpoint**: `POST /chat/finish`
- **Request Body**:
  ```json
  {
    "sessionId": "chat_sess_12345",
    "existingDiagnosis": {
      "candidate_misconception": "SMALLER_FROM_LARGER",
      "diagnostic_status": "CANDIDATE_MISCONCEPTION"
    }
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "reconciliation": {
      "diagnostic_status": "SUPPORTED_HYPOTHESIS",
      "evidence_strength": "STRONG",
      "confidence": "HIGH",
      "reasoning_alignment": "SUPPORTS_HYPOTHESIS",
      "teacher_facing_explanation": "Student verbally confirmed subtracting smaller digit from larger digit (4 - 1 = 3) without unbundling tens."
    }
  }
  ```

---

## 4. Teacher Clinical Interventions & Reassessment Endpoints

### 4.1. Record Intervention Delivery
- **Endpoint**: `POST /api/interventions/deliver`
- **Headers**: `Authorization: Bearer <jwt-token>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "studentId": "student_01",
    "interventionId": "INT_ONES_REGROUPING",
    "interventionType": "CONCRETE_MANIPULATIVE",
    "targetSkill": "ONES_REGROUPING",
    "targetMisconception": "SMALLER_FROM_LARGER",
    "notes": "Used matchstick bundles of 10; Aarav practiced untying 1 ten to make 11 ones."
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "ok": true,
    "intervention": {
      "id": "rec_int_1761903000000",
      "studentId": "student_01",
      "deliveredAt": "2026-10-31T07:22:00.000Z",
      "targetSkill": "ONES_REGROUPING"
    }
  }
  ```

### 4.2. Start Reassessment Session
- **Endpoint**: `POST /api/reassessment/start`
- **Headers**: `Authorization: Bearer <jwt-token>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "studentId": "student_01",
    "preSessionId": "sess_1761902845123",
    "targetSkill": "ONES_REGROUPING"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "ok": true,
    "reassessmentSession": {
      "id": "sess_reassess_1761903050000",
      "studentId": "student_01",
      "assignmentId": "asgn_reassessment_subtraction",
      "status": "in_progress"
    }
  }
  ```

### 4.3. Compare Reassessment (Pre vs Post)
- **Endpoint**: `POST /api/reassessment/compare`
- **Request Body**:
  ```json
  {
    "preSessionId": "sess_1761902845123",
    "postSessionId": "sess_reassess_1761903050000"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "comparison": {
      "comparison_outcome": "IMPROVEMENT_OBSERVED",
      "misconception_trend": "RESOLVED",
      "pre_intervention_diagnosis": {
        "status": "SUPPORTED_HYPOTHESIS",
        "misconception": "SMALLER_FROM_LARGER"
      },
      "post_intervention_diagnosis": {
        "status": "NO_TARGET_PATTERN_DETECTED",
        "misconception": null
      },
      "teacher_summary": "Improvement observed after intervention. Student demonstrated accurate place value regrouping across reassessment probes including transfer problems. Continued practice recommended."
    }
  }
  ```

---

## 5. Needs-Based Groupings Endpoints

### 5.1. Get Classroom Needs-Based Groups
- **Endpoint**: `GET /api/groupings`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "groups": [
      {
        "id": "group_smaller_from_larger",
        "name": "Group A: Smaller-From-Larger Pattern",
        "targetMisconception": "SMALLER_FROM_LARGER",
        "pedagogicalGoal": "Build physical understanding that column digits cannot be subtracted upwards.",
        "recommendedActivity": "NCERT Maths Mela Ch. 3 - Rajma Seeds & Tens Bundles",
        "students": [
          { "id": "student_01", "name": "Aarav Sharma" }
        ]
      },
      {
        "id": "group_borrow_without_decrement",
        "name": "Group B: Borrow-Without-Decrement Pattern",
        "targetMisconception": "BORROW_WITHOUT_DECREMENT",
        "pedagogicalGoal": "Strengthen tens column decrement procedure after unbundling.",
        "recommendedActivity": "Banker's Exchange Game with Play Money",
        "students": []
      },
      {
        "id": "group_mastery",
        "name": "Group E: Secure Regrouping Understanding",
        "targetMisconception": "NONE",
        "pedagogicalGoal": "Challenge with three-digit regrouping and contextual bazaar word problems.",
        "recommendedActivity": "NCERT Maths Mela Multi-digit Puzzles",
        "students": []
      }
    ]
  }
  ```

### 5.2. Teacher Override of Student Grouping
- **Endpoint**: `POST /api/groupings/override`
- **Request Body**:
  ```json
  {
    "studentId": "student_01",
    "groupId": "group_mastery",
    "reason": "Student clarified regrouping steps on scratchpad during 1-on-1 check-in."
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "override": {
      "studentId": "student_01",
      "assignedGroup": "group_mastery",
      "timestamp": "2026-10-31T07:25:00.000Z"
    }
  }
  ```

---

## 6. Python ML Microservice Endpoints (Port 8000)

| Endpoint | Method | Input Payload | Output Summary |
| :--- | :--- | :--- | :--- |
| `/diagnose/session` | `POST` | `{"session_id": "...", "responses": [...]}` | Full multi-probe qualitative synthesis, evidence strength, skill mastery. |
| `/diagnose/reconcile`| `POST` | `{"candidate_misconception": "...", "student_explanation": "..."}` | Reconciled hypothesis status based on verbal math steps. |
| `/diagnose/reassess` | `POST` | `{"pre_diagnosis": {...}, "post_diagnosis": {...}}` | Pre/post comparison delta, observational narrative. |
| `/prerequisites` | `GET` | *(none)* | Complete NCERT Class 3 mathematical prerequisite DAG. |
| `/interventions` | `GET` | *(none)* | Complete catalogue of clinical concrete remediation protocols. |
| `/predict` | `POST` | `{"student_answer": 43, "correct_answer": 37, ...}` | Backward-compatible single-probe check (LOW confidence). |

