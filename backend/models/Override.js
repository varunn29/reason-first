// models/Override.js
// Query helpers for the overrides table.

const pool = require('../config/db');
const { randomUUID } = require('crypto');

async function create({ responseId, originalRuleId, teacherDecision, teacherNote }) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO overrides
       (id, response_id, original_rule_id, teacher_decision, teacher_note)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (response_id) DO UPDATE SET
       teacher_decision = EXCLUDED.teacher_decision,
       teacher_note = EXCLUDED.teacher_note,
       overridden_at = NOW()`,
    [id, responseId, originalRuleId, teacherDecision, teacherNote || '']
  );
  return { id, responseId, originalRuleId, teacherDecision, teacherNote };
}

async function getByResponseId(responseId) {
  const result = await pool.query(
    'SELECT * FROM overrides WHERE response_id = $1',
    [responseId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    responseId: row.response_id,
    originalRuleId: row.original_rule_id,
    teacherDecision: row.teacher_decision,
    teacherNote: row.teacher_note,
    overriddenAt: row.overridden_at,
  };
}

module.exports = { create, getByResponseId };

