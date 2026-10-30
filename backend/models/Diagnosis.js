// models/Diagnosis.js
// Query helpers for the diagnoses table.

const pool = require('../config/db');
const { randomUUID } = require('crypto');

function mapDiagnosis(row) {
  if (!row) return null;
  return {
    id: row.id,
    responseId: row.response_id,
    observations: row.observations,
    possibleMisconception: row.possible_misconception,
    evidence: typeof row.evidence === 'string' ? JSON.parse(row.evidence) : (row.evidence || {}),
    alternatives: typeof row.alternatives === 'string' ? JSON.parse(row.alternatives) : (row.alternatives || []),
    confidence: row.confidence,
    followUpQuestion: row.follow_up_question,
    suggestedActivity: row.suggested_activity,
    ruleId: row.rule_id,
    createdAt: row.created_at,
  };
}

async function create({
  responseId,
  observations,
  possibleMisconception,
  evidence,
  alternatives,
  confidence,
  followUpQuestion,
  suggestedActivity,
  ruleId,
}) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO diagnoses
       (id, response_id, observations, possible_misconception,
        evidence, alternatives, confidence, follow_up_question,
        suggested_activity, rule_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (response_id) DO UPDATE SET
       observations = EXCLUDED.observations,
       possible_misconception = EXCLUDED.possible_misconception,
       evidence = EXCLUDED.evidence,
       alternatives = EXCLUDED.alternatives,
       confidence = EXCLUDED.confidence,
       follow_up_question = EXCLUDED.follow_up_question,
       suggested_activity = EXCLUDED.suggested_activity,
       rule_id = EXCLUDED.rule_id`,
    [
      id,
      responseId,
      observations,
      possibleMisconception,
      JSON.stringify(evidence),
      JSON.stringify(alternatives),
      confidence,
      followUpQuestion,
      suggestedActivity,
      ruleId,
    ]
  );
  return { id, responseId };
}

async function getByResponseId(responseId) {
  const result = await pool.query(
    'SELECT * FROM diagnoses WHERE response_id = $1',
    [responseId]
  );
  if (result.rows.length === 0) return null;
  return mapDiagnosis(result.rows[0]);
}

module.exports = { create, getByResponseId, mapDiagnosis };
