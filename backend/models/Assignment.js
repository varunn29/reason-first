// models/Assignment.js
// Query helpers for the assignments table.

const pool = require('../config/db');

async function getById(id) {
  const result = await pool.query(
    'SELECT id, title FROM assignments WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) return null;
  return { id: result.rows[0].id, title: result.rows[0].title };
}

async function getAll() {
  const result = await pool.query(
    'SELECT id, title FROM assignments ORDER BY id DESC'
  );
  return result.rows.map(row => ({ id: row.id, title: row.title }));
}

async function create({ id, title }) {
  await pool.query(
    'INSERT INTO assignments (id, title) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
    [id, title]
  );
  return { id, title };
}

module.exports = { getById, getAll, create };
