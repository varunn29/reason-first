// models/Classroom.js
// Query helpers for the classrooms table.

const pool = require('../config/db');

async function getByCode(classCode) {
  if (!process.env.DATABASE_URL) return null;
  const result = await pool.query(
    `SELECT c.id, c.teacher_id, c.name, c.class_code, c.grade, c.created_at,
            t.name AS teacher_name, t.school_name
     FROM classrooms c
     LEFT JOIN teachers t ON c.teacher_id = t.id
     WHERE UPPER(TRIM(c.class_code)) = UPPER(TRIM($1))`,
    [classCode]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    teacherId: row.teacher_id,
    name: row.name,
    classCode: row.class_code,
    grade: row.grade,
    teacherName: row.teacher_name,
    schoolName: row.school_name,
    createdAt: row.created_at,
  };
}

async function getByTeacherId(teacherId) {
  if (!process.env.DATABASE_URL) return [];
  const result = await pool.query(
    'SELECT id, teacher_id, name, class_code, grade, created_at FROM classrooms WHERE teacher_id = $1 ORDER BY created_at ASC',
    [teacherId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    teacherId: row.teacher_id,
    name: row.name,
    classCode: row.class_code,
    grade: row.grade,
    createdAt: row.created_at,
  }));
}

async function create({ id, teacherId, name, classCode, grade = 'Grade 3 - Section A' }) {
  if (!process.env.DATABASE_URL) return null;
  await pool.query(
    'INSERT INTO classrooms (id, teacher_id, name, class_code, grade) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (class_code) DO NOTHING',
    [id, teacherId, name, classCode.toUpperCase().trim(), grade]
  );
  return { id, teacherId, name, classCode: classCode.toUpperCase().trim(), grade };
}

module.exports = { getByCode, getByTeacherId, create };

