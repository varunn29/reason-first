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
    ALL_PROBES,
    APPROVED_PROBES,
    FOUNDATION_PROBES,
    CH03_CH04_PROBES,
    CH05_CH06_PROBES,
    CH07_CH08_PROBES,
    CH09_CH10_PROBES,
    CH11_CH13_CH14_PROBES,
    SIG_BORROW_WITHOUT_DECREMENT,
    SIG_OPERATION_CONFUSION_ADD,
    SIG_SMALLER_FROM_LARGER,
    SIG_ZERO_ACROSS_BORROW,
    STATUS_SUPPORTED_HYPOTHESIS,
    TEXTBOOK_PROBES,
    calculate_signature_answer,
    diagnose_responses,
    diagnose_single_response,
    get_calibrated_model,
)

PORT = int(os.environ.get("PORT", 8000))

# Canonical 5 probes
CANONICAL_PROBES_METADATA = [
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

# Load unified aligned master curriculum dataset
curriculum_json_path = os.path.join(current_dir, "data", "ncert_class3_mathematics_full_curriculum.json")
ncert_probe_details = {}
COMBINED_PROBE_METADATA = []

if os.path.exists(curriculum_json_path):
    try:
        with open(curriculum_json_path, "r", encoding="utf-8") as f:
            curr_raw = json.load(f)
            for p in curr_raw.get("probes", []):
                ncert_probe_details[p["id"]] = p
                dist_map = {}
                for opt_val, dist_data in p.get("distractors", {}).items():
                    if isinstance(dist_data, dict):
                        dist_map[int(opt_val) if str(opt_val).lstrip('-').isdigit() else opt_val] = dist_data.get("explanation", dist_data.get("signature", "Distractor"))
                    else:
                        dist_map[int(opt_val) if str(opt_val).lstrip('-').isdigit() else opt_val] = str(dist_data)

                COMBINED_PROBE_METADATA.append({
                    "id": p["id"],
                    "chapter": p.get("chapter", "NCERT Class 3"),
                    "text": p.get("prompt") or p.get("text", ""),
                    "context": p.get("context", ""),
                    "page": p.get("page", 1),
                    "domain": p.get("domain", "GENERAL"),
                    "correctAnswer": p.get("correctAnswer", 0),
                    "options": p.get("options", []),
                    "optionLabels": p.get("optionLabels", []),
                    "distractors": dist_map,
                    "is_regrouping": p.get("is_regrouping", False),
                    "minuend": p.get("minuend", 0),
                    "subtrahend": p.get("subtrahend", 0),
                    "dienes_blocks_scaffolding": p.get("dienes_blocks_scaffolding", ""),
                    "number_line_jumps": p.get("number_line_jumps", []),
                })
    except Exception as err:
        print(f"Warning: could not load master aligned curriculum dataset: {err}")

# Fallback to canonical probes if master dataset failed
if not COMBINED_PROBE_METADATA:
    COMBINED_PROBE_METADATA = list(CANONICAL_PROBES_METADATA)

# Maintain backward compatibility
PROBE_METADATA = COMBINED_PROBE_METADATA


def evaluate_single_answer(question_id: str, answer: int):
    """Evaluate a single question response against known probes using calibrated cognitive engine."""
    result = diagnose_single_response(question_id, answer)

    # Enrich with textbook scaffolding if applicable
    details = ncert_probe_details.get(question_id)
    if details:
        result["chapter"] = details.get("chapter", "NCERT Class 3")
        result["context"] = details.get("context", "")
        result["page"] = details.get("page", 1)
        result["dienesBlocksScaffolding"] = details.get("dienes_blocks_scaffolding", "")
        result["numberLineJumps"] = details.get("number_line_jumps", [])

    return result


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

    evidence_dict = pattern if pattern else {"summary": engine_result.get("summary")}
    if "cognitive_skill_mastery" in engine_result:
        evidence_dict["cognitive_skill_mastery"] = engine_result["cognitive_skill_mastery"]

    return {
        "observations": engine_result.get("summary", "Diagnostic assessment completed."),
        "evidence": evidence_dict,
        "alternatives": alternatives,
        "confidence": confidence,
        "followUpQuestion": follow_up,
        "suggestedActivity": activity,
        "ruleId": rule_id,
        "raw_engine_result": engine_result,
        "status": "Pass" if engine_result.get("all_correct") else "Fail",
        "cognitive_skill_mastery": engine_result.get("cognitive_skill_mastery", {}),
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
            model = get_calibrated_model()
            payload = {
                "ok": True,
                "service": "math-diagnostic-ml",
                "engine_version": "0.3.0",
                "model_version": model.get("model_metadata", {}).get("model_version", "2.0.0"),
                "curriculum": "NCERT Class 3 Mathematics (Maths Mela)",
                "chapters": [
                    "Chapter 1: What's in a Name?",
                    "Chapter 2: Toy Joy",
                    "Chapter 3: Double Century",
                    "Chapter 4: Vacation with My Nani Maa",
                    "Chapter 5: Fun with Shapes",
                    "Chapter 6: House of Hundreds - I",
                    "Chapter 7: Raksha Bandhan",
                    "Chapter 8: Fair Share",
                    "Chapter 9: House of Hundreds - II",
                    "Chapter 10: Fun at Class Party!",
                    "Chapter 11: Filling and Lifting",
                    "Chapter 12: Give and Take",
                    "Chapter 13: Time Goes On",
                    "Chapter 14: The Surajkund Fair",
                ],
                "approved_probes": list(APPROVED_PROBES.keys()),
                "textbook_probes": list(TEXTBOOK_PROBES.keys()),
                "foundation_probes": list(FOUNDATION_PROBES.keys()),
                "ncert_ch03_ch04_probes": list(CH03_CH04_PROBES.keys()),
                "ncert_ch05_ch06_probes": list(CH05_CH06_PROBES.keys()),
                "ncert_ch07_ch08_probes": list(CH07_CH08_PROBES.keys()),
                "ncert_ch09_ch10_probes": list(CH09_CH10_PROBES.keys()),
                "ncert_ch11_ch13_ch14_probes": list(CH11_CH13_CH14_PROBES.keys()),
                "total_probes": len(ALL_PROBES),
                "model_connected": bool(model),
                "total_calibrated_items": len(model.get("calibrated_items", {})),
                "total_latent_skills": len(model.get("latent_cognitive_skills", [])),
                "total_misconception_signatures": len(model.get("pedagogical_catalog", {})),
                "calibration_metrics": model.get("calibration_metrics", {}),
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
        elif self.path == "/model":
            self._set_headers(200)
            model = get_calibrated_model()
            payload = {
                "ok": True,
                "model_metadata": model.get("model_metadata", {}),
                "latent_cognitive_skills": model.get("latent_cognitive_skills", []),
                "calibration_metrics": model.get("calibration_metrics", {}),
                "priors": model.get("priors", {}),
                "total_items": len(model.get("calibrated_items", {})),
                "total_signatures": len(model.get("pedagogical_catalog", {})),
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
        elif self.path == "/probes":
            self._set_headers(200)
            payload = {
                "ok": True,
                "curriculum": "NCERT Class 3 Mathematics (Maths Mela)",
                "total_probes": len(COMBINED_PROBE_METADATA),
                "probes": COMBINED_PROBE_METADATA,
            }
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
                    qid = str(data.get("questionId") or data.get("probe_id") or "")
                    raw_ans = data.get("answer")
                    if raw_ans is None:
                        raw_ans = data.get("selectedAnswer")

                    if not qid and len(probe_dict) == 1:
                        qid, raw_ans = next(iter(probe_dict.items()))
                    elif not qid:
                        qid = "probe_01"

                    if raw_ans is None:
                        raw_ans = 0

                    try:
                        ans = int(raw_ans)
                    except (ValueError, TypeError):
                        ans = 0

                    response_payload = evaluate_single_answer(qid, ans)

                self._set_headers(200)
                self.wfile.write(json.dumps(response_payload).encode("utf-8"))

            except Exception as exc:
                import traceback
                traceback.print_exc()
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
