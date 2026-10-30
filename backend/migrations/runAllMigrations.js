// backend/migrations/runAllMigrations.js
// Runs base schema, chat schema, and auth schema in Neon Postgres.

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function run() {
  console.log('🚀 Checking and applying all migrations to Neon Postgres...\n');
  try {
    // 1. Base schema (responses, diagnoses, students, assignments, overrides)
    const baseSchemaPath = path.join(__dirname, '..', 'schema.sql');
    if (fs.existsSync(baseSchemaPath)) {
      console.log('Applying base schema (schema.sql)...');
      const baseSql = fs.readFileSync(baseSchemaPath, 'utf8');
      await pool.query(baseSql);
    }

    // 2. Chat schema (chat_sessions, chat_messages, chat_summaries)
    const chatSchemaPath = path.join(__dirname, '..', 'chat', 'schema.sql');
    if (fs.existsSync(chatSchemaPath)) {
      console.log('Applying chat schema (chat/schema.sql)...');
      const chatSql = fs.readFileSync(chatSchemaPath, 'utf8');
      await pool.query(chatSql);
    }

    // 3. Auth schema (teachers, classrooms)
    const authSchemaPath = path.join(__dirname, '002_auth_tables.sql');
    if (fs.existsSync(authSchemaPath)) {
      console.log('Applying auth schema (migrations/002_auth_tables.sql)...');
      const authSql = fs.readFileSync(authSchemaPath, 'utf8');
      await pool.query(authSql);
    }

    // 4. Verify all tables in Postgres
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('\n✅ Verified tables in Neon Postgres:');
    res.rows.forEach((r) => console.log(`   - ${r.table_name}`));
    console.log('\n🎉 All Neon Postgres migrations up to date!\n');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    if (pool.end) await pool.end();
  }
}

run();

