// models/Response.js
// Query helpers for responses and their diagnoses.

const pool = require('../config/db');

function mapResponse(row) {
  return {
    id: row.id,
    questionId: row.question_id,
    studentId: row.student_id,
    assignmentId: row.assignment_id,
    answer: row.answer,
    explanation: row.explanation,
    submittedAt: row.submitted_at,
  };
}

function mapDiagnosis(row) {
  if (!row.diagnosis_id) return null;
  return {
    responseId: row.id,
    observations: row.observations,
    possibleMisconception: row.possible_misconception,
    evidence: row.evidence,
    alternatives: row.alternatives,
    confidence: row.confidence,
    followUpQuestion: row.follow_up_question,
    suggestedActivity: row.suggested_activity,
    ruleId: row.rule_id,
  };
}

async function create({
  id,
  questionId,
  studentId,
  assignmentId,
  answer,
  explanation,
}) {
  await pool.query(
    `INSERT INTO responses
       (id, question_id, student_id, assignment_id, answer, explanation)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, questionId, studentId, assignmentId, answer, explanation]
  );
  return { id, questionId, studentId, assignmentId, answer, explanation };
}

async function getById(id) {
  const result = await pool.query(
    'SELECT * FROM responses WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) return null;
  return mapResponse(result.rows[0]);
}

async function listByAssignment(assignmentId) {
  // LEFT JOIN diagnoses so we return a response even before ML has filled a diagnosis.
  const result = await pool.query(
    `SELECT
       r.*,
       d.id AS diagnosis_id,
       d.observations,
       d.possible_misconception,
       d.evidence,
       d.alternatives,
       d.confidence,
       d.follow_up_question,
       d.suggested_activity,
       d.rule_id
     FROM responses r
     LEFT JOIN diagnoses d ON d.response_id = r.id
     WHERE r.assignment_id = $1
     ORDER BY r.submitted_at ASC`,
    [assignmentId]
  );
  return result.rows.map(row => ({
    response: mapResponse(row),
    diagnosis: mapDiagnosis(row),
  }));
}

module.exports = { create, getById, listByAssignment };