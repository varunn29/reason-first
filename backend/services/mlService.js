// services/mlService.js
// Calls the ML API to diagnose one student response.
// If the ML API is not reachable, returns { status: "pending" } so the
// backend can store the response without a diagnosis and continue smoothly.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config();

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

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
      signal: AbortSignal.timeout(3000), // 3-second timeout protection
    });

    if (!res.ok) {
      console.warn(`[ML Service] ML API at ${ML_API_URL} returned HTTP ${res.status}. Diagnosis pending.`);
      return { status: 'pending' };
    }

    const data = await res.json();

    // The ML API must return the agreed diagnosis shape.
    // If it does not, treat it as pending rather than storing malformed data.
    const required = [
      'observations',
      'evidence',
      'alternatives',
      'confidence',
      'followUpQuestion',
      'suggestedActivity',
      'ruleId',
    ];
    const missing = required.filter((field) => !(field in data));
    if (missing.length > 0) {
      console.warn(`[ML Service] ML API response missing fields: ${missing.join(', ')}`);
      return { status: 'pending' };
    }

    return { status: 'ok', diagnosis: data };
  } catch (err) {
    // Connection refused, timeout, or DNS error -> backend does NOT crash
    console.warn(`\x1b[33m⚠️  [ML Service Offline] Could not reach ML engine at ${ML_API_URL} (${err.message}). Using local diagnostic fallback.\x1b[0m`);
    return { status: 'pending' };
  }
}

module.exports = { diagnose };
