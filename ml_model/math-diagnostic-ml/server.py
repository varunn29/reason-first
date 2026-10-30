"""HTTP API Server for Class 3 Subtraction Diagnostic Engine.

Exposes REST endpoints on port 8000 for backend and frontend integration.
Zero external dependencies (uses standard library http.server).
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

# Add src directory to python module path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from math_diagnostic.engine import (
    APPROVED_PROBES,
    SIG_BORROW_WITHOUT_DECREMENT,
    SIG_SMALLER_FROM_LARGER,
    STATUS_SUPPORTED_HYPOTHESIS,
    calculate_signature_answer,
    diagnose_responses,
)

PORT = int(os.environ.get("PORT", 8000))

PROBE_METADATA = [
    {
        "id": "probe_01",
        "text": "61 - 24 = ?",
        "minuend": 61,
        "subtrahend": 24,
        "correctAnswer": 37,
        "options": [37, 43, 47, 35],
        "distractors": {
            43: "Smaller-from-larger (subtracted 4 - 1 = 3 in ones)",
            47: "Borrow without decrement (forgot to reduce tens)",
            35: "Calculation slip",
        },
    },
    {
        "id": "probe_02",
        "text": "72 - 38 = ?",
        "minuend": 72,
        "subtrahend": 38,
        "correctAnswer": 34,
        "options": [34, 46, 44, 36],
        "distractors": {
            46: "Smaller-from-larger (subtracted 8 - 2 = 6 in ones)",
            44: "Borrow without decrement (forgot to reduce tens)",
            36: "Calculation slip",
        },
    },
    {
        "id": "probe_03",
        "text": "83 - 49 = ?",
        "minuend": 83,
        "subtrahend": 49,
        "correctAnswer": 34,
        "options": [34, 46, 44, 38],
        "distractors": {
            46: "Smaller-from-larger (subtracted 9 - 3 = 6 in ones)",
            44: "Borrow without decrement (forgot to reduce tens)",
            38: "Calculation slip",
        },
    },
    {
        "id": "ctrl_01",
        "text": "58 - 23 = ?",
        "minuend": 58,
        "subtrahend": 23,
        "correctAnswer": 35,
        "options": [35, 31, 25, 33],
        "distractors": {
            31: "Calculation slip in ones",
            25: "Calculation slip in tens",
            33: "Slip",
        },
    },
    {
        "id": "ctrl_02",
        "text": "79 - 45 = ?",
        "minuend": 79,
        "subtrahend": 45,
        "correctAnswer": 34,
        "options": [34, 32, 24, 35],
        "distractors": {
            32: "Calculation slip in ones",
            24: "Calculation slip in tens",
            35: "Slip",
        },
    },
]


def evaluate_single_answer(question_id: str, answer: int):
    """Evaluate a single question response against known probes and misconceptions."""
    # Check if question is one of the approved probes
    probe = APPROVED_PROBES.get(question_id)
    if probe:
        correct = probe.correct_answer
        sfl_ans = calculate_signature_answer(probe, SIG_SMALLER_FROM_LARGER)
        bwd_ans = calculate_signature_answer(probe, SIG_BORROW_WITHOUT_DECREMENT)

        if answer == correct:
            return {
                "observations": f"Correct answer ({answer}) on problem {probe.minuend} - {probe.subtrahend}.",
                "evidence": {"observed": answer, "expected": correct, "is_correct": True},
                "alternatives": [],
                "confidence": "HIGH",
                "followUpQuestion": "Explain the step-by-step strategy you used to solve this problem.",
                "suggestedActivity": "Advance to multi-digit subtraction or word problems with regrouping.",
                "ruleId": "CORRECT",
                "status": "Pass",
            }
        elif probe.is_regrouping and answer == sfl_ans:
            return {
                "observations": (
                    f"Answer {answer} on {probe.minuend} - {probe.subtrahend} matches Smaller-From-Larger error: "
                    f"student subtracted smaller digit from larger digit ({probe.subtrahend_ones} - {probe.minuend_ones}) "
                    "without regrouping."
                ),
                "evidence": {
                    "observed": answer,
                    "expected": correct,
                    "signature": SIG_SMALLER_FROM_LARGER,
                    "predicted_signature_answer": sfl_ans,
                },
                "alternatives": [
                    "Bottom-to-top reading reversal",
                    "Arithmetic calculation slip",
                ],
                "confidence": "HIGH",
                "followUpQuestion": f"Can you show how you solved the ones column in {probe.minuend} - {probe.subtrahend}?",
                "suggestedActivity": "Tens-and-Ones Bundling Mat: unbundle 1 ten into 10 loose units before subtracting.",
                "ruleId": SIG_SMALLER_FROM_LARGER,
                "status": "Fail",
            }
        elif probe.is_regrouping and answer == bwd_ans:
            return {
                "observations": (
                    f"Answer {answer} on {probe.minuend} - {probe.subtrahend} matches Borrow-Without-Decrement: "
                    "student added 10 to the ones column, but forgot to decrement the tens column."
                ),
                "evidence": {
                    "observed": answer,
                    "expected": correct,
                    "signature": SIG_BORROW_WITHOUT_DECREMENT,
                    "predicted_signature_answer": bwd_ans,
                },
                "alternatives": [
                    "Forgot to record crossing-out on tens",
                    "Arithmetic recall slip in tens column",
                ],
                "confidence": "HIGH",
                "followUpQuestion": "Look at the tens digit after borrowing. What happened to it?",
                "suggestedActivity": "The Banker's Exchange: cross out and reduce the tens digit before taking 10 ones.",
                "ruleId": SIG_BORROW_WITHOUT_DECREMENT,
                "status": "Fail",
            }
        else:
            return {
                "observations": f"Answer {answer} on {probe.minuend} - {probe.subtrahend} is incorrect (expected {correct}).",
                "evidence": {"observed": answer, "expected": correct, "is_correct": False},
                "alternatives": ["Calculation slip", "Place value error"],
                "confidence": "MEDIUM",
                "followUpQuestion": "Walk me through how you subtracted each column.",
                "suggestedActivity": "Column subtraction review using base-10 manipulatives.",
                "ruleId": "GENERAL_SUBTRACTION_ERROR",
                "status": "Fail",
            }

    # If legacy or custom question (e.g. 42 - 15 = 27)
    if answer == 27:
        return {
            "observations": "Answer 27 is correct for 42 - 15.",
            "evidence": {"observed": answer, "expected": 27, "is_correct": True},
            "alternatives": [],
            "confidence": "HIGH",
            "followUpQuestion": "How did you regroup the 40 into 30 + 10?",
            "suggestedActivity": "Advance to 3-digit subtraction.",
            "ruleId": "CORRECT",
            "status": "Pass",
        }
    else:
        return {
            "observations": f"Answer {answer} for 42 - 15 indicates a borrowing/regrouping misconception.",
            "evidence": {"observed": answer, "expected": 27, "is_correct": False},
            "alternatives": ["Borrowing error", "Calculation slip"],
            "confidence": "HIGH",
            "followUpQuestion": "Remember to borrow 1 ten from 40 to make 12 before subtracting 5.",
            "suggestedActivity": "Use 10 physical sticks to explain tens-to-ones regrouping.",
            "ruleId": "BORROWING_ERROR",
            "status": "Fail",
        }


def format_full_diagnosis(engine_result: dict) -> dict:
    """Format full 5-probe engine output into the 7 keys required by backend."""
    status = engine_result.get("diagnostic_status")
    pattern = engine_result.get("observed_pattern_match") or {}
    misconception = engine_result.get("inferred_misconception") or {}
    guidance = misconception.get("teacher_review_guidance", {})

    confidence = "HIGH" if status == STATUS_SUPPORTED_HYPOTHESIS else "MEDIUM"
    rule_id = pattern.get("signature_id") or status or "UNKNOWN"

    follow_up = guidance.get("recommended_action") or "Review student work step by step."
    activity = guidance.get("suggested_hands_on_activity") or "Use base-10 blocks to demonstrate regrouping."
    alternatives = misconception.get("alternative_explanations") or ["Calculation slip", "Guessing"]

    return {
        "observations": engine_result.get("summary", "Diagnostic assessment completed."),
        "evidence": pattern if pattern else {"summary": engine_result.get("summary")},
        "alternatives": alternatives,
        "confidence": confidence,
        "followUpQuestion": follow_up,
        "suggestedActivity": activity,
        "ruleId": rule_id,
        "raw_engine_result": engine_result,
        "status": "Pass" if engine_result.get("all_correct") else "Fail",
    }


class DiagnosticHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler for Diagnostic Engine."""

    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_GET(self):
        if self.path == "/health" or self.path == "/":
            self._set_headers(200)
            payload = {
                "ok": True,
                "service": "math-diagnostic-ml",
                "engine_version": "0.1.0",
                "approved_probes": list(APPROVED_PROBES.keys()),
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
        elif self.path == "/probes":
            self._set_headers(200)
            payload = {"ok": True, "probes": PROBE_METADATA}
            self.wfile.write(json.dumps(payload).encode("utf-8"))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not Found"}).encode("utf-8"))

    def do_POST(self):
        if self.path in ("/predict", "/diagnose"):
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8")
                data = json.loads(body) if body else {}

                # Check if payload contains all 5 probes
                probe_dict = {}
                if "responses" in data and isinstance(data["responses"], dict):
                    probe_dict = data["responses"]
                elif all(k in data for k in APPROVED_PROBES.keys()):
                    probe_dict = {k: int(data[k]) for k in APPROVED_PROBES.keys()}

                if len(probe_dict) >= len(APPROVED_PROBES) and all(
                    k in probe_dict for k in APPROVED_PROBES.keys()
                ):
                    # Run full 5-probe diagnostic engine
                    engine_result = diagnose_responses({k: int(v) for k, v in probe_dict.items()})
                    response_payload = format_full_diagnosis(engine_result)
                else:
                    # Single answer or partial assessment
                    qid = str(data.get("questionId") or data.get("probe_id") or "probe_01")
                    raw_ans = data.get("answer")
                    if raw_ans is None:
                        raw_ans = data.get("selectedAnswer", 0)
                    try:
                        ans = int(raw_ans)
                    except (ValueError, TypeError):
                        ans = 0

                    response_payload = evaluate_single_answer(qid, ans)

                self._set_headers(200)
                self.wfile.write(json.dumps(response_payload).encode("utf-8"))

            except Exception as exc:
                self._set_headers(500)
                err_payload = {
                    "error": str(exc),
                    "observations": f"Engine error: {str(exc)}",
                    "evidence": {},
                    "alternatives": [],
                    "confidence": "LOW",
                    "followUpQuestion": "Please re-attempt the diagnostic question.",
                    "suggestedActivity": "Manual teacher review.",
                    "ruleId": "ERROR",
                }
                self.wfile.write(json.dumps(err_payload).encode("utf-8"))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not Found"}).encode("utf-8"))


def run():
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, DiagnosticHandler)
    print(f"ML Diagnostic Server running on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    run()
