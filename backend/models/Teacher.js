// models/Teacher.js
// Query helpers for the teachers table.

const pool = require('../config/db');

async function getByEmail(email) {
  if (!process.env.DATABASE_URL) return null;
  const result = await pool.query(
    'SELECT id, name, email, password_hash, school_name, created_at FROM teachers WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    schoolName: row.school_name,
    createdAt: row.created_at,
  };
}

async function getById(id) {
  if (!process.env.DATABASE_URL) return null;
  const result = await pool.query(
    'SELECT id, name, email, password_hash, school_name, created_at FROM teachers WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    schoolName: row.school_name,
    createdAt: row.created_at,
  };
}

async function create({ id, name, email, passwordHash, schoolName = 'Kendriya Vidyalaya' }) {
  if (!process.env.DATABASE_URL) return null;
  await pool.query(
    'INSERT INTO teachers (id, name, email, password_hash, school_name) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
    [id, name, email.toLowerCase().trim(), passwordHash, schoolName]
  );
  return { id, name, email: email.toLowerCase().trim(), schoolName };
}

module.exports = { getByEmail, getById, create };

