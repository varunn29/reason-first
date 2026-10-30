// models/Student.js
// Query helpers for the students table.

const pool = require('../config/db');

async function getAll() {
  const result = await pool.query(
    'SELECT id, display_name, class_label FROM students ORDER BY id'
  );
  return result.rows.map(row => ({
    id: row.id,
    displayName: row.display_name,
    classLabel: row.class_label,
  }));
}

async function getById(id) {
  const result = await pool.query(
    'SELECT id, display_name, class_label FROM students WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    displayName: row.display_name,
    classLabel: row.class_label,
  };
}

async function create({ id, displayName, classLabel }) {
  await pool.query(
    `INSERT INTO students (id, display_name, class_label) 
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET 
       display_name = EXCLUDED.display_name, 
       class_label = EXCLUDED.class_label`,
    [id, displayName, classLabel]
  );
  return { id, displayName, classLabel };
}

module.exports = { getAll, getById, create };
