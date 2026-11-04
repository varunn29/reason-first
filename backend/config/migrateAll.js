// backend/config/migrateAll.js
// Runs database schemas and default seed data.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('./db');

async function migrateAll() {
  if (!process.env.DATABASE_URL) {
    return { ok: false, message: 'DATABASE_URL not configured. Using in-memory fallback.' };
  }

  console.log('[Migration] Checking database tables...');

  const migrationFiles = [
    { name: 'Core Schema (schema.sql)', path: path.join(__dirname, '..', 'schema.sql') },
    { name: 'Auth & Classrooms (002_auth_tables.sql)', path: path.join(__dirname, '..', 'migrations', '002_auth_tables.sql') },
    { name: 'Diagnostic Intelligence (003_diagnostic_intelligence.sql)', path: path.join(__dirname, '..', 'migrations', '003_diagnostic_intelligence.sql') },
    { name: 'Chat Reasoning (chat/schema.sql)', path: path.join(__dirname, '..', 'chat', 'schema.sql') },
  ];

  for (const file of migrationFiles) {
    if (fs.existsSync(file.path)) {
      try {
        const sql = fs.readFileSync(file.path, 'utf8');
        await pool.query(sql);
        console.log(`[DB MIGRATION] Applied: ${file.name}`);
      } catch (err) {
        console.warn(`[DB MIGRATION WARNING] Error applying ${file.name}: ${err.message}`);
      }
    }
  }

  // Seed default assignment and probes to guarantee foreign keys succeed
  try {
    await pool.query(`
      INSERT INTO assignments (id, title)
      VALUES ('asgn_class3_subtraction', 'Class 3 Subtraction Diagnostic with Regrouping')
      ON CONFLICT (id) DO NOTHING;
    `);

    const probes = [
      { id: 'probe_01', prompt: '61 - 24 = ?', topic: 'Subtraction with Regrouping', grade: 3 },
      { id: 'probe_02', prompt: '72 - 38 = ?', topic: 'Subtraction with Regrouping', grade: 3 },
      { id: 'probe_03', prompt: '83 - 49 = ?', topic: 'Subtraction with Regrouping', grade: 3 },
      { id: 'ctrl_01', prompt: '58 - 23 = ?', topic: 'Subtraction without Regrouping', grade: 3 },
      { id: 'ctrl_02', prompt: '79 - 45 = ?', topic: 'Subtraction without Regrouping', grade: 3 },
    ];

    for (const p of probes) {
      await pool.query(`
        INSERT INTO questions (id, prompt, topic, grade)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET prompt = EXCLUDED.prompt;
      `, [p.id, p.prompt, p.topic, p.grade]);
    }

    // Seed default demo teacher & classroom if not existing
    const demoSalt = crypto.randomBytes(16).toString('hex');
    const demoKey = crypto.scryptSync('password123', demoSalt, 64).toString('hex');
    const passwordHash = `${demoSalt}:${demoKey}`;

    await pool.query(`
      INSERT INTO teachers (id, name, email, password_hash, school_name)
      VALUES ('teacher_demo_default', 'Anita Sharma', 'teacher@demo.com', $1, 'Govt. Primary School, Ward 4')
      ON CONFLICT (email) DO NOTHING;
    `, [passwordHash]);

    await pool.query(`
      INSERT INTO classrooms (id, teacher_id, name, class_code, grade)
      VALUES ('class_demo_3a', 'teacher_demo_default', 'Grade 3 - Section 3A', '3A', 'Grade 3 - Section A')
      ON CONFLICT (class_code) DO NOTHING;
    `);

    // Seed guest student
    await pool.query(`
      INSERT INTO students (id, display_name, class_label, class_code)
      VALUES ('student_guest', 'Guest Student', 'Grade 3 - Section 3A', '3A')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[Migration] Database tables and default records verified.');
    return { ok: true };
  } catch (seedErr) {
    console.warn('[Migration] Note on initial data:', seedErr.message);
    return { ok: true, warning: seedErr.message };
  }
}

if (require.main === module) {
  migrateAll().then(() => {
    if (pool.end) pool.end();
  });
}

module.exports = migrateAll;

