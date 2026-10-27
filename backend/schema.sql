-- reason-first schema
-- One topic (fractions), one question, one assignment, many students.

CREATE TABLE IF NOT EXISTS students (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  class_label  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id      TEXT PRIMARY KEY,
  prompt  TEXT NOT NULL,
  topic   TEXT NOT NULL,
  grade   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
  id     TEXT PRIMARY KEY,
  title  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS responses (
  id            TEXT PRIMARY KEY,
  question_id   TEXT NOT NULL REFERENCES questions(id),
  student_id    TEXT NOT NULL REFERENCES students(id),
  assignment_id TEXT NOT NULL REFERENCES assignments(id),
  answer        TEXT NOT NULL,
  explanation   TEXT NOT NULL,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnoses (
  id                     TEXT PRIMARY KEY,
  response_id            TEXT NOT NULL UNIQUE REFERENCES responses(id) ON DELETE CASCADE,
  observations           TEXT NOT NULL,
  possible_misconception TEXT,
  evidence               JSONB NOT NULL,
  alternatives           JSONB NOT NULL,
  confidence             TEXT NOT NULL,
  follow_up_question     TEXT NOT NULL,
  suggested_activity     TEXT NOT NULL,
  rule_id                TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS overrides (
  id               TEXT PRIMARY KEY,
  response_id      TEXT NOT NULL UNIQUE REFERENCES responses(id) ON DELETE CASCADE,
  original_rule_id TEXT NOT NULL,
  teacher_decision TEXT NOT NULL,
  teacher_note     TEXT NOT NULL DEFAULT '',
  overridden_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS followup_responses (
  id                 TEXT PRIMARY KEY,
  parent_response_id TEXT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id        TEXT NOT NULL REFERENCES questions(id),
  student_id         TEXT NOT NULL REFERENCES students(id),
  answer             TEXT NOT NULL,
  explanation        TEXT NOT NULL,
  submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);