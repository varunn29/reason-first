// backend/chat/chatModel.js
// Data layer for Chat sessions, messages, and teacher summaries.
// Persists to Neon Postgres, with in-memory fallback for local dev resilience.

const pool = require('../config/db');

// In-memory store fallback for offline local testing
const memoryStore = {
  sessions: new Map(),
  messages: new Map(),
  summaries: new Map(),
  feedback: new Map(),
};

async function createSession({ id, responseId, studentId, questionId, language = 'hi' }) {
  let persistedToDb = false;

  const sessionData = {
    id,
    responseId: responseId || null,
    studentId,
    questionId,
    language,
    status: 'active',
    turnCount: 0,
    createdAt: new Date().toISOString(),
  };

  memoryStore.sessions.set(id, sessionData);
  memoryStore.messages.set(id, []);

  if (process.env.DATABASE_URL && pool.query) {
    try {
      await pool.query(
        `INSERT INTO chat_sessions (id, response_id, student_id, question_id, language, status, turn_count)
         VALUES ($1, $2, $3, $4, $5, 'active', 0)`,
        [id, responseId || null, studentId, questionId, language]
      );
      persistedToDb = true;
      console.log(`\x1b[32m[DB SUCCESS] Created chat_sessions record in Neon Postgres: ${id}\x1b[0m`);
    } catch (err) {
      console.warn(`\x1b[33m⚠️  [DATABASE FALLBACK ACTIVE] Neon Postgres insert into chat_sessions failed: ${err.message}. Using in-memory store.\x1b[0m`);
    }
  } else {
    console.warn('\x1b[33m⚠️  [DATABASE NOT CONFIGURED] DATABASE_URL is missing. Storing chat session in memory.\x1b[0m');
  }

  return { ...sessionData, persistedToDb };
}

async function getSession(sessionId) {
  if (process.env.DATABASE_URL && pool.query) {
    try {
      const res = await pool.query('SELECT * FROM chat_sessions WHERE id = $1', [sessionId]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          responseId: row.response_id,
          studentId: row.student_id,
          questionId: row.question_id,
          language: row.language,
          status: row.status,
          turnCount: row.turn_count,
          createdAt: row.created_at,
          completedAt: row.completed_at,
          isFromDb: true,
        };
      }
    } catch (err) {
      console.warn(`\x1b[33m⚠️  [DB READ FALLBACK] Could not query chat_sessions: ${err.message}\x1b[0m`);
    }
  }

  const memSession = memoryStore.sessions.get(sessionId) || null;
  return memSession ? { ...memSession, isFromDb: false } : null;
}

async function getSessionByResponseId(responseId) {
  if (process.env.DATABASE_URL && pool.query && responseId) {
    try {
      const res = await pool.query(
        'SELECT * FROM chat_sessions WHERE response_id = $1 ORDER BY created_at DESC LIMIT 1',
        [responseId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          responseId: row.response_id,
          studentId: row.student_id,
          questionId: row.question_id,
          language: row.language,
          status: row.status,
          turnCount: row.turn_count,
          createdAt: row.created_at,
          completedAt: row.completed_at,
          isFromDb: true,
        };
      }
    } catch (err) {
      console.warn(`\x1b[33m⚠️  [DB READ FALLBACK] Could not query session by responseId: ${err.message}\x1b[0m`);
    }
  }

  for (const sess of memoryStore.sessions.values()) {
    if (sess.responseId === responseId) return { ...sess, isFromDb: false };
  }
  return null;
}

async function updateSession(sessionId, { status, turnCount, completedAt }) {
  const session = memoryStore.sessions.get(sessionId);
  if (session) {
    if (status) session.status = status;
    if (typeof turnCount === 'number') session.turnCount = turnCount;
    if (completedAt) session.completedAt = completedAt;
  }

  if (process.env.DATABASE_URL && pool.query) {
    try {
      await pool.query(
        `UPDATE chat_sessions 
         SET status = COALESCE($1, status),
             turn_count = COALESCE($2, turn_count),
             completed_at = COALESCE($3, completed_at)
         WHERE id = $4`,
        [status || null, typeof turnCount === 'number' ? turnCount : null, completedAt || null, sessionId]
      );
    } catch (err) {
      console.warn(`\x1b[33m⚠️  [DATABASE FALLBACK ACTIVE] Neon Postgres session update failed: ${err.message}\x1b[0m`);
    }
  }
}

async function addMessage({
  id,
  sessionId,
  sender,
  text,
  quickReplies = [],
  selectedQuickReply = null,
  turnNumber = 1,
  metadata = {},
}) {
  let persistedToDb = false;

  const messageData = {
    id,
    sessionId,
    sender,
    text,
    quickReplies,
    selectedQuickReply,
    turnNumber,
    metadata,
    createdAt: new Date().toISOString(),
  };

  const list = memoryStore.messages.get(sessionId) || [];
  list.push(messageData);
  memoryStore.messages.set(sessionId, list);

  if (process.env.DATABASE_URL && pool.query) {
    try {
      await pool.query(
        `INSERT INTO chat_messages 
           (id, session_id, sender, text, quick_replies, selected_quick_reply, turn_number, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          sessionId,
          sender,
          text,
          JSON.stringify(quickReplies),
          selectedQuickReply,
          turnNumber,
          JSON.stringify(metadata),
        ]
      );
      persistedToDb = true;
    } catch (err) {
      console.warn(`\x1b[33m⚠️  [DATABASE FALLBACK ACTIVE] Neon Postgres message insert failed: ${err.message}\x1b[0m`);
    }
  }

  return { ...messageData, persistedToDb };
}

async function getMessages(sessionId) {
  if (process.env.DATABASE_URL && pool.query) {
    try {
      const res = await pool.query(
        'SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
      );
      if (res.rows.length > 0) {
        console.log(`\x1b[32m[DB READ SUCCESS] Loaded ${res.rows.length} chat messages from Neon Postgres for session: ${sessionId}\x1b[0m`);
        return res.rows.map((row) => ({
          id: row.id,
          sessionId: row.session_id,
          sender: row.sender,
          text: row.text,
          quickReplies: row.quick_replies,
          selectedQuickReply: row.selected_quick_reply,
          turnNumber: row.turn_number,
          metadata: row.metadata,
          createdAt: row.created_at,
          isFromDb: true,
        }));
      }
    } catch (err) {
      console.warn(`\x1b[33m⚠️  [DB READ FALLBACK] Could not query chat_messages from Neon Postgres: ${err.message}\x1b[0m`);
    }
  }

  return memoryStore.messages.get(sessionId) || [];
}

async function saveSummary({
  id,
  sessionId,
  responseId,
  studentId,
  misconceptionId,
  evidence = [],
  whatChildUnderstands,
  confidence,
  suggestedNextStep,
  agreesWithExistingDiagnosis = true,
  needsTeacherReview = false,
  rawSummaryJson = {},
}) {
  let persistedToDb = false;

  const summaryData = {
    id,
    sessionId,
    responseId: responseId || null,
    studentId,
    misconceptionId,
    evidence,
    whatChildUnderstands,
    confidence,
    suggestedNextStep,
    agreesWithExistingDiagnosis,
    needsTeacherReview,
    rawSummaryJson,
    createdAt: new Date().toISOString(),
  };

  memoryStore.summaries.set(sessionId, summaryData);

  if (process.env.DATABASE_URL && pool.query) {
    try {
      await pool.query(
        `INSERT INTO chat_summaries 
           (id, session_id, response_id, student_id, misconception_id, evidence, what_child_understands, confidence, suggested_next_step, agrees_with_existing_diagnosis, raw_summary_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (session_id) DO UPDATE 
         SET misconception_id = EXCLUDED.misconception_id,
             evidence = EXCLUDED.evidence,
             what_child_understands = EXCLUDED.what_child_understands,
             confidence = EXCLUDED.confidence,
             suggested_next_step = EXCLUDED.suggested_next_step,
             agrees_with_existing_diagnosis = EXCLUDED.agrees_with_existing_diagnosis,
             raw_summary_json = EXCLUDED.raw_summary_json`,
        [
          id,
          sessionId,
          responseId || null,
          studentId,
          misconceptionId,
          JSON.stringify(evidence),
          whatChildUnderstands,
          confidence,
          suggestedNextStep,
          agreesWithExistingDiagnosis,
          JSON.stringify(rawSummaryJson),
        ]
      );
      persistedToDb = true;
      console.log(`\x1b[32m[DB SUCCESS] Persisted Teacher AI Summary to Neon Postgres table "chat_summaries" for session: ${sessionId}\x1b[0m`);
    } catch (err) {
      console.warn(`\x1b[33m⚠️  [DATABASE FALLBACK ACTIVE] Neon Postgres insert into chat_summaries failed: ${err.message}. Using in-memory store.\x1b[0m`);
    }
  } else {
    console.warn('\x1b[33m⚠️  [DATABASE NOT CONFIGURED] DATABASE_URL missing. Summary saved in memory.\x1b[0m');
  }

  return { ...summaryData, persistedToDb };
}

async function getSummary(sessionId) {
  if (process.env.DATABASE_URL && pool.query) {
    try {
      const res = await pool.query('SELECT * FROM chat_summaries WHERE session_id = $1', [sessionId]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const rawJson = row.raw_summary_json || {};
        console.log(`\x1b[32m[DB READ SUCCESS] Loaded Teacher AI Summary from Neon Postgres for session: ${sessionId}\x1b[0m`);
        return {
          id: row.id,
          sessionId: row.session_id,
          responseId: row.response_id,
          studentId: row.student_id,
          misconceptionId: row.misconception_id,
          misconception_id: row.misconception_id,
          evidence: row.evidence,
          whatChildUnderstands: row.what_child_understands,
          what_child_understands: row.what_child_understands,
          confidence: row.confidence,
          suggestedNextStep: row.suggested_next_step,
          suggested_next_step: row.suggested_next_step,
          agreesWithExistingDiagnosis: row.agrees_with_existing_diagnosis,
          agrees_with_existing_diagnosis: row.agrees_with_existing_diagnosis,
          needsTeacherReview: rawJson.needs_teacher_review ?? (row.confidence === 'low'),
          needs_teacher_review: rawJson.needs_teacher_review ?? (row.confidence === 'low'),
          rawSummaryJson: rawJson,
          createdAt: row.created_at,
          isFromDb: true,
        };
      }
    } catch (err) {
      console.warn(`\x1b[33m⚠️  [DB READ FALLBACK] Could not fetch chat_summaries from Neon Postgres: ${err.message}\x1b[0m`);
    }
  }

  const memSummary = memoryStore.summaries.get(sessionId) || null;
  return memSummary ? { ...memSummary, isFromDb: false } : null;
}

async function getSummaryByResponseId(responseId) {
  if (process.env.DATABASE_URL && pool.query && responseId) {
    try {
      const res = await pool.query(
        'SELECT * FROM chat_summaries WHERE response_id = $1 ORDER BY created_at DESC LIMIT 1',
        [responseId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const rawJson = row.raw_summary_json || {};
        console.log(`\x1b[32m[DB READ SUCCESS] Loaded Teacher AI Summary from Neon Postgres for response: ${responseId}\x1b[0m`);
        return {
          id: row.id,
          sessionId: row.session_id,
          responseId: row.response_id,
          studentId: row.student_id,
          misconceptionId: row.misconception_id,
          misconception_id: row.misconception_id,
          evidence: row.evidence,
          whatChildUnderstands: row.what_child_understands,
          what_child_understands: row.what_child_understands,
          confidence: row.confidence,
          suggestedNextStep: row.suggested_next_step,
          suggested_next_step: row.suggested_next_step,
          agreesWithExistingDiagnosis: row.agrees_with_existing_diagnosis,
          agrees_with_existing_diagnosis: row.agrees_with_existing_diagnosis,
          needsTeacherReview: rawJson.needs_teacher_review ?? (row.confidence === 'low'),
          needs_teacher_review: rawJson.needs_teacher_review ?? (row.confidence === 'low'),
          rawSummaryJson: rawJson,
          createdAt: row.created_at,
          isFromDb: true,
        };
      }
    } catch (err) {
      console.warn(`\x1b[33m⚠️  [DB READ FALLBACK] Could not fetch chat_summaries by responseId from Neon Postgres: ${err.message}\x1b[0m`);
    }
  }

  for (const sum of memoryStore.summaries.values()) {
    if (sum.responseId === responseId) return { ...sum, isFromDb: false };
  }
  return null;
}

async function saveFeedback({ id, sessionId, responseId, feedback = 'disputed', note = '', originalRuleId = 'UNKNOWN' }) {
  const item = {
    id,
    sessionId,
    responseId: responseId || null,
    feedback,
    note,
    originalRuleId,
    createdAt: new Date().toISOString(),
  };

  memoryStore.feedback.set(id, item);

  if (process.env.DATABASE_URL && pool.query && responseId) {
    try {
      await pool.query(
        `INSERT INTO overrides (id, response_id, original_rule_id, teacher_decision, teacher_note)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (response_id) DO UPDATE 
         SET teacher_decision = EXCLUDED.teacher_decision,
             teacher_note = EXCLUDED.teacher_note,
             overridden_at = NOW()`,
        [id, responseId, originalRuleId, feedback, note]
      );
      console.log(`\x1b[32m[DB SUCCESS] Persisted teacher feedback to Neon Postgres table "overrides" for response: ${responseId}\x1b[0m`);
    } catch (err) {
      console.warn(`\x1b[33m⚠️  [DATABASE FALLBACK ACTIVE] Neon Postgres override insert failed: ${err.message}\x1b[0m`);
    }
  }

  return item;
}

module.exports = {
  createSession,
  getSession,
  getSessionByResponseId,
  updateSession,
  addMessage,
  getMessages,
  saveSummary,
  getSummary,
  getSummaryByResponseId,
  saveFeedback,
};
