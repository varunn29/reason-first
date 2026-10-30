-- ============================================================================
-- Migration 002: Teachers, Classrooms & Authentication
-- Safe & non-destructive: only creates new tables and indexes.
-- ============================================================================

-- 1. Teachers table: Stores authenticated educators
CREATE TABLE IF NOT EXISTS teachers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  school_name   TEXT DEFAULT 'Kendriya Vidyalaya',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Classrooms table: Maps teachers to unique student access codes
CREATE TABLE IF NOT EXISTS classrooms (
  id          TEXT PRIMARY KEY,
  teacher_id  TEXT REFERENCES teachers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  class_code  TEXT NOT NULL UNIQUE, -- e.g. "3A", "GRADE3A", "MATH4"
  grade       TEXT NOT NULL DEFAULT 'Grade 3 - Section A',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_classrooms_code ON classrooms(class_code);
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON classrooms(teacher_id);

