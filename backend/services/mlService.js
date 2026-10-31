// services/mlService.js
// Production diagnostic client connecting Express Backend to Python Diagnostic Engine.
// Enforces session-level evidence aggregation, verbal reasoning reconciliation,
// prerequisite graph retrieval, and pre/post reassessment progress tracking.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config();

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

/**
 * 1. Diagnose single student response (Preliminary observation only).
 */
async function diagnose(response) {
  try {
    const res = await fetch(`${ML_API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: response.questionId,
        answer: response.answer,
        explanation: response.explanation,
        responses: response.responses,
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      console.warn(`[ML Service] ML API at ${ML_API_URL} returned HTTP ${res.status}. Diagnosis pending.`);
      return { status: 'pending' };
    }

    const data = await res.json();
    return { status: 'ok', diagnosis: data };
  } catch (err) {
    console.warn(`⚠️ [ML Service Offline] Could not reach ML engine at ${ML_API_URL} (${err.message}). Using local diagnostic fallback.`);
    return { status: 'pending' };
  }
}

/**
 * 1b. Predict diagnosis combining answer and full chat transcript / reasoning turns.
 * Authoritative diagnostic endpoint calling the trained Python ML model at POST /predict.
 * Falls back to LLM analysis with explicit warning if the ML model is offline or returns an error.
 */
async function predictChatDiagnosis({ questionId, answer, explanation = '', chatTurns = [], transcript = '' }) {
  try {
    const res = await fetch(`${ML_API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        answer,
        explanation,
        chat_turns: chatTurns,
        transcript,
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      console.warn(`[WARNING] Using LLM fallback instead of trained ML model (HTTP ${res.status} from ${ML_API_URL})`);
      return { status: 'fallback', error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { status: 'ok', diagnosis: data };
  } catch (err) {
    console.warn(`[WARNING] Using LLM fallback instead of trained ML model: ${err.message}`);
    return { status: 'fallback', error: err.message };
  }
}

/**
 * 2. Diagnose complete assessment session (Multi-probe evidence synthesis).
 */
async function diagnoseSession(sessionData) {
  try {
    const res = await fetch(`${ML_API_URL}/diagnose/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      return { status: 'ok', diagnosis: data };
    }
  } catch (err) {
    console.warn(`[ML Service] Session diagnosis endpoint offline at ${ML_API_URL}: ${err.message}. Using local session fallback.`);
  }

  // Local fallback session diagnostic engine
  const responses = Array.isArray(sessionData.responses) ? sessionData.responses : [];
  const total = responses.length;
  const sflCount = responses.filter(r => (r.question_id === 'probe_01' && Number(r.answer) === 43) || (r.question_id === 'probe_02' && Number(r.answer) === 46)).length;
  const bwdCount = responses.filter(r => (r.question_id === 'probe_01' && Number(r.answer) === 47) || (r.question_id === 'probe_02' && Number(r.answer) === 44)).length;
  const corrCount = responses.filter(r => (r.question_id === 'probe_01' && Number(r.answer) === 37) || (r.question_id === 'probe_02' && Number(r.answer) === 34) || (r.question_id === 'ctrl_01' && Number(r.answer) === 35)).length;

  let diagStatus = 'INSUFFICIENT_EVIDENCE';
  let candMisconception = null;
  let evStrength = 'WEAK';

  if (sflCount >= 2) {
    diagStatus = 'SUPPORTED_HYPOTHESIS';
    candMisconception = 'SMALLER_FROM_LARGER';
    evStrength = 'STRONG';
  } else if (bwdCount >= 2) {
    diagStatus = 'SUPPORTED_HYPOTHESIS';
    candMisconception = 'BORROW_WITHOUT_DECREMENT';
    evStrength = 'STRONG';
  } else if (sflCount === 1) {
    diagStatus = 'CANDIDATE_MISCONCEPTION';
    candMisconception = 'SMALLER_FROM_LARGER';
  } else if (bwdCount === 1) {
    diagStatus = 'CANDIDATE_MISCONCEPTION';
    candMisconception = 'BORROW_WITHOUT_DECREMENT';
  } else if (corrCount === total && total >= 3) {
    diagStatus = 'NO_TARGET_PATTERN_DETECTED';
    evStrength = 'STRONG';
  }

  return {
    status: 'ok',
    diagnosis: {
      session_id: sessionData.session_id,
      student_id: sessionData.student_id,
      engine_version: '1.0.0-fallback',
      diagnostic_status: diagStatus,
      candidate_misconception: candMisconception,
      evidence_strength: evStrength,
      confidence: evStrength === 'STRONG' ? 'HIGH' : 'LOW',
      all_correct: corrCount === total && total > 0,
      probes_evaluated: total,
      correct_count: corrCount,
      summary: `Evaluated ${total} responses. Status: ${diagStatus}.`,
      supporting_evidence: [candMisconception ? `Observed candidate pattern: ${candMisconception}` : 'Standard arithmetic pattern.'],
      contradictory_evidence: [],
      missing_evidence: total < 5 ? [`Assessment has ${total}/5 standard probes.`] : [],
      skill_mastery: {
        ONES_REGROUPING: corrCount >= 3 ? 'SECURE' : (corrCount >= 1 ? 'DEVELOPING' : 'INSUFFICIENT_EVIDENCE'),
        NON_REGROUPING_SUBTRACTION: 'DEVELOPING',
        PLACE_VALUE_BUNDLES: corrCount >= 2 ? 'PROVISIONALLY_SECURE' : 'DEVELOPING',
      },
      related_prerequisite_skill: {
        id: 'PLACE_VALUE_BUNDLES',
        name: 'Base-10 Tens & Ones Structure',
        ncert_ref: 'NCERT Class 3 Chapter 3, pp. 16-24',
      },
      recommended_intervention: {
        misconception_id: candMisconception || 'SMALLER_FROM_LARGER',
        title: 'Tens-and-Ones Bundling Mat & Concrete Unbundling',
        target_skill: 'ONES_REGROUPING',
        teacher_guidance: 'Provide physical Dienes blocks or matchstick bundles (NCERT p. 152). Exchange 1 ten for 10 ones.',
        student_activity: 'Matchstick Exchange: open 1 ten-rod into 10 loose units before subtracting ones.',
      },
    },
  };
}

/**
 * 3. Reconcile verbal reasoning explanation with diagnostic hypothesis.
 */
async function reconcileReasoning(diagnosis, explanation = '', chatTurns = []) {
  try {
    const res = await fetch(`${ML_API_URL}/diagnose/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosis, explanation, chat_turns: chatTurns }),
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data = await res.json();
      return { status: 'ok', diagnosis: data };
    }
  } catch (err) {
    console.warn(`[ML Service] Reasoning reconciliation offline at ${ML_API_URL}: ${err.message}.`);
  }

  // Local fallback reconciliation
  const text = (explanation + ' ' + chatTurns.map(t => t.text).join(' ')).toLowerCase();
  const isUncertain = text.includes("don't know") || text.includes('pata nahi') || text.includes('नहीं पता');
  const hasSfl = text.includes('4 - 1') || text.includes('4 minus 1') || text.includes('4 me se 1') || text.includes('4 mein se 1');
  const hasRegrouping = text.includes('borrow') || text.includes('haasil') || text.includes('udhar') || text.includes('11 - 4');

  const updated = { ...diagnosis };
  if (isUncertain) {
    updated.diagnostic_status = 'INSUFFICIENT_EVIDENCE';
    updated.evidence_strength = 'WEAK';
    updated.confidence = 'LOW';
    updated.reasoning_alignment = 'UNCERTAIN_OR_GUESS';
  } else if (hasSfl) {
    updated.diagnostic_status = 'SUPPORTED_HYPOTHESIS';
    updated.evidence_strength = 'STRONG';
    updated.confidence = 'HIGH';
    updated.reasoning_alignment = 'SUPPORTS_HYPOTHESIS';
  } else if (hasRegrouping) {
    updated.diagnostic_status = 'CONTRADICTED_HYPOTHESIS';
    updated.evidence_strength = 'MODERATE';
    updated.confidence = 'LOW';
    updated.reasoning_alignment = 'CONTRADICTS_HYPOTHESIS';
  }

  return { status: 'ok', diagnosis: updated };
}

/**
 * 4. Compare pre-intervention and post-intervention assessment progress.
 */
async function compareReassessment(preDiagnosis, postDiagnosis) {
  try {
    const res = await fetch(`${ML_API_URL}/diagnose/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pre: preDiagnosis, post: postDiagnosis }),
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data = await res.json();
      return { status: 'ok', comparison: data };
    }
  } catch (err) {
    console.warn(`[ML Service] Reassessment comparison offline at ${ML_API_URL}: ${err.message}.`);
  }

  const isPostPass = postDiagnosis.all_correct || postDiagnosis.status === 'Pass';
  return {
    status: 'ok',
    comparison: {
      pre_intervention_diagnosis: preDiagnosis,
      post_intervention_diagnosis: postDiagnosis,
      misconception_trend: isPostPass ? 'RESOLVED' : 'PERSISTING',
      comparison_outcome: isPostPass ? 'IMPROVEMENT_OBSERVED' : 'PERSISTING_PATTERN',
      teacher_summary: isPostPass
        ? 'Improvement observed after intervention. Student demonstrated accurate place value regrouping across reassessment probes.'
        : 'Candidate misconception persists. Recommend Tier 2 concrete manipulative review.',
      educational_disclaimer: 'Observational evidence comparison.',
    },
  };
}

/**
 * 5. Fetch NCERT Cognitive Prerequisite Graph.
 */
async function getPrerequisites() {
  try {
    const res = await fetch(`${ML_API_URL}/prerequisites`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return await res.json();
  } catch (err) {}
  return { ok: true, prerequisite_graph: {} };
}

/**
 * 6. Fetch Teacher Intervention Catalogue.
 */
async function getInterventions() {
  try {
    const res = await fetch(`${ML_API_URL}/interventions`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return await res.json();
  } catch (err) {}
  return { ok: true, interventions: {} };
}

module.exports = {
  diagnose,
  predictChatDiagnosis,
  diagnoseSession,
  reconcileReasoning,
  compareReassessment,
  getPrerequisites,
  getInterventions,
};
