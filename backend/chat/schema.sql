-- ============================================================================
-- Additive Migration: Chat with Teacher Bot Feature
-- Safe & non-destructive: only creates new tables and indexes.
-- Does NOT drop or alter any existing tables.
-- ============================================================================

-- 1. Chat Sessions: Tracks each 1-on-1 diagnostic dialogue after an answer submission
CREATE TABLE IF NOT EXISTS chat_sessions (
  id             TEXT PRIMARY KEY,
  response_id    TEXT, -- Soft link to responses(id)
  student_id     TEXT NOT NULL,
  question_id    TEXT NOT NULL,
  language       TEXT NOT NULL DEFAULT 'hi', -- 'hi', 'hinglish', 'en'
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  turn_count     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

-- 2. Chat Messages: Stores every conversation turn (student & teacher bot)
CREATE TABLE IF NOT EXISTS chat_messages (
  id                    TEXT PRIMARY KEY,
  session_id            TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender                TEXT NOT NULL CHECK (sender IN ('bot', 'student')),
  text                  TEXT NOT NULL,
  quick_replies         JSONB DEFAULT '[]'::jsonb,
  selected_quick_reply  TEXT,
  turn_number           INTEGER NOT NULL DEFAULT 1,
  metadata              JSONB DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Chat Summaries: Teacher AI summary generated once dialogue finishes
CREATE TABLE IF NOT EXISTS chat_summaries (
  id                             TEXT PRIMARY KEY,
  session_id                     TEXT NOT NULL UNIQUE REFERENCES chat_sessions(id) ON DELETE CASCADE,
  response_id                    TEXT, -- Soft link to responses(id)
  student_id                     TEXT NOT NULL,
  misconception_id               TEXT NOT NULL,
  evidence                       JSONB NOT NULL DEFAULT '[]'::jsonb,
  what_child_understands         TEXT NOT NULL,
  confidence                     TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  suggested_next_step            TEXT NOT NULL,
  agrees_with_existing_diagnosis BOOLEAN NOT NULL DEFAULT true,
  raw_summary_json               JSONB,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_student_id ON chat_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_response_id ON chat_sessions(response_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_summaries_session_id ON chat_summaries(session_id);

-- ============================================================================
-- PRIVACY & DATA SAFETY: 30-DAY AUTOMATED TRANSCRIPT AUTO-DELETION
-- ============================================================================
-- In compliance with our child data safety policy (PRIVACY.md), raw chat
-- transcripts must be purged after 30 days.
--
-- HOW TO ENABLE AUTO-DELETION IN PRODUCTION:
-- 
-- Option A: Periodic SQL Cleanup (Run nightly via cron/Neon Scheduled Queries):
--   DELETE FROM chat_sessions 
--   WHERE created_at < NOW() - INTERVAL '30 days';
--   (Cascades automatically to chat_messages via ON DELETE CASCADE).
--
-- Option B: Enable PostgreSQL pg_cron extension (Neon / Cloud Postgres):
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   SELECT cron.schedule('purge-30d-chat-logs', '0 3 * * *', 
--     $$DELETE FROM chat_sessions WHERE created_at < NOW() - INTERVAL '30 days'$$);
-- ============================================================================
