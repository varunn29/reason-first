-- ============================================================================
-- Migration 003: ReasonFirst Diagnostic Intelligence Upgrade
-- Non-destructive additive migration: Adds assessment sessions, session diagnoses,
-- teacher intervention records, and reassessment comparisons.
-- ============================================================================

CREATE TABLE IF NOT EXISTS assessment_sessions (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES students(id),
  assignment_id TEXT NOT NULL REFERENCES assignments(id),
  status        TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'reconciled'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  metadata      JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS session_diagnoses (
  id                         TEXT PRIMARY KEY,
  session_id                 TEXT NOT NULL UNIQUE REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  diagnostic_status          TEXT NOT NULL,
  candidate_misconception    TEXT,
  evidence_strength          TEXT NOT NULL,
  confidence                 TEXT NOT NULL,
  all_correct                BOOLEAN NOT NULL DEFAULT false,
  probes_evaluated           INTEGER NOT NULL DEFAULT 0,
  correct_count              INTEGER NOT NULL DEFAULT 0,
  supporting_evidence        JSONB NOT NULL DEFAULT '[]'::jsonb,
  contradictory_evidence     JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_evidence           JSONB NOT NULL DEFAULT '[]'::jsonb,
  skill_mastery              JSONB NOT NULL DEFAULT '{}'::jsonb,
  related_prerequisite_skill JSONB,
  recommended_intervention   JSONB,
  raw_diagnosis_json         JSONB,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intervention_records (
  id                 TEXT PRIMARY KEY,
  student_id         TEXT NOT NULL REFERENCES students(id),
  session_id         TEXT REFERENCES assessment_sessions(id),
  target_skill       TEXT NOT NULL,
  misconception_id   TEXT,
  intervention_title TEXT NOT NULL,
  teacher_decision   TEXT NOT NULL DEFAULT 'accepted', -- 'accepted', 'modified', 'rejected'
  teacher_notes      TEXT NOT NULL DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'delivered', 'completed'
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reassessment_comparisons (
  id                  TEXT PRIMARY KEY,
  student_id          TEXT NOT NULL REFERENCES students(id),
  pre_session_id      TEXT NOT NULL REFERENCES assessment_sessions(id),
  post_session_id     TEXT NOT NULL REFERENCES assessment_sessions(id),
  comparison_outcome  TEXT NOT NULL,
  misconception_trend TEXT NOT NULL,
  teacher_summary     TEXT NOT NULL,
  raw_comparison_json JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add optional session_id to responses table if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='responses' AND column_name='session_id'
  ) THEN
    ALTER TABLE responses ADD COLUMN session_id TEXT REFERENCES assessment_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON assessment_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_session_diagnoses_session_id ON session_diagnoses(session_id);
CREATE INDEX IF NOT EXISTS idx_interventions_student_id ON intervention_records(student_id);

