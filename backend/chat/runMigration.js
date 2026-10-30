// backend/chat/runMigration.js
// Safe, additive migration runner for chat tables.
// Can be executed via: npm run migrate:chat or node chat/runMigration.js

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration() {
  console.log('----------------------------------------------------');
  console.log('Running additive migration for Chat Feature...');
  console.log('----------------------------------------------------');

  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    // 1. Run the migration SQL
    await pool.query(sql);

    // 2. Verify tables exist
    const checkTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('chat_sessions', 'chat_messages', 'chat_summaries')
      ORDER BY table_name;
    `;
    const res = await pool.query(checkTablesQuery);
    const existing = res.rows.map(r => r.table_name);

    console.log(' Migration successfully applied!');
    console.log('Verified database tables in Postgres:');
    existing.forEach(t => console.log(`   - ${t}`));

    if (existing.length < 3) {
      console.warn('Warning: Some tables might not have been created. Found:', existing);
    }
  } catch (err) {
    console.error('Migration failed:');
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    if (pool.end) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;

