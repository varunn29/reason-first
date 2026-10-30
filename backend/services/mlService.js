// services/mlService.js
// Calls the ML API to diagnose one student response.
// If the ML API is not reachable, returns { status: "pending" } so the
// backend can store the response without a diagnosis and try again later.

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
    });

    if (!res.ok) {
      console.warn(`ML API returned ${res.status}. Diagnosis pending.`);
      return { status: 'pending' };
    }

    const data = await res.json();

    // The ML API must return the agreed diagnosis shape.
    // If it does not, treat it as pending rather than storing garbage.
    const required = [
      'observations',
      'evidence',
      'alternatives',
      'confidence',
      'followUpQuestion',
      'suggestedActivity',
      'ruleId',
    ];
    const missing = required.filter(field => !(field in data));
    if (missing.length > 0) {
      console.warn(`ML API response missing fields: ${missing.join(', ')}`);
      return { status: 'pending' };
    }

    return { status: 'ok', diagnosis: data };
  } catch (err) {
    // Connection refused, DNS error, timeout — all mean "ML not available yet".
    console.warn(`ML API unreachable: ${err.message}. Diagnosis pending.`);
    return { status: 'pending' };
  }
}

module.exports = { diagnose };