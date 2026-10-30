require('dotenv').config();
const { Pool } = require('pg');

let pool = null;

if (process.env.DATABASE_URL) {
  const isLocal =
    process.env.DATABASE_URL.includes('localhost') ||
    process.env.DATABASE_URL.includes('127.0.0.1');

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
} else {
  // Safe mock pool to prevent crashing when running locally without a DB
  pool = {
    query: async () => {
      throw new Error(
        'DATABASE_URL is not set in backend/.env. Using development in-memory store.'
      );
    },
  };
}

module.exports = pool;