const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: true });
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const pool = require('./config/db');
const mlService = require('./services/mlService');

// Optional database models
let ResponseModel = null;
let DiagnosisModel = null;
let StudentModel = null;
let AssignmentModel = null;
let OverrideModel = null;
try {
  ResponseModel = require('./models/Response');
  DiagnosisModel = require('./models/Diagnosis');
  StudentModel = require('./models/Student');
  AssignmentModel = require('./models/Assignment');
  OverrideModel = require('./models/Override');
} catch (err) {
  console.warn('DB Models not loaded:', err.message);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Simple sliding window rate limiter
const rateLimitMap = new Map();
function rateLimiter({ windowMs = 60000, max = 300 } = {}) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    let record = rateLimitMap.get(key);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
    } else {
      record.count++;
    }
    rateLimitMap.set(key, record);
    if (record.count > max) {
      return res.status(429).json({ ok: false, error: 'Too many requests. Please try again shortly.' });
    }
    next();
  };
}
app.use('/api/', rateLimiter({ windowMs: 60000, max: 300 }));

// In-memory store fallback when running without postgres
const memoryStore = {
  responses: new Map(),
  diagnoses: new Map(),
  overrides: new Map(),
  sessions: new Map(),
  sessionDiagnoses: new Map(),
  interventions: new Map(),
  reassessments: new Map(),
  groupOverrides: new Map(),
  assignments: [
    {
      id: 'asgn_class3_subtraction',
      title: 'Class 3 Subtraction Diagnostic with Regrouping',
      topic: 'Math & Logic',
      classLabel: 'Grade 3 - Section A',
      questions: [
        { id: 'probe_01', text: '61 - 24 = ?', options: [37, 43, 47, 35], correctAnswer: 37 },
        { id: 'probe_02', text: '72 - 38 = ?', options: [34, 46, 44, 36], correctAnswer: 34 },
        { id: 'probe_03', text: '83 - 49 = ?', options: [34, 46, 44, 38], correctAnswer: 34 },
        { id: 'ctrl_01', text: '58 - 23 = ?', options: [35, 31, 25, 33], correctAnswer: 35 },
        { id: 'ctrl_02', text: '79 - 45 = ?', options: [34, 32, 24, 35], correctAnswer: 34 },
      ],
      createdAt: new Date().toISOString(),
    }
  ],
  students: [], // Fully dynamic - populated as real students join and submit answers
  stats: [
    { id: 1, label: 'Total Students', value: 0, icon: 'Users', bgColor: 'bg-blue-50', iconColor: 'text-blue-500' },
    { id: 2, label: 'Pending Reviews', value: 0, icon: 'Clock', bgColor: 'bg-orange-50', iconColor: 'text-orange-500' },
    { id: 3, label: 'Total Assignments', value: 1, icon: 'BookOpen', bgColor: 'bg-purple-50', iconColor: 'text-purple-500' },
  ]
};

// Dynamic helper: registers or updates student in memoryStore
function registerStudentInMemory(id, displayName, classLabel, classCode = '', classroomId = '') {
  if (!id) return;
  const cleanName = displayName || id.replace(/^student_/, '').replace(/_/g, ' ') || 'Student';
  const existing = memoryStore.students.find(s => s.id === id);
  if (!existing) {
    memoryStore.students.push({
      id,
      displayName: cleanName,
      classLabel: classLabel || 'Grade 3 - Section A',
      classCode: classCode || '',
      classroomId: classroomId || '',
      progress: 0,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanName.split(' ')[0]}`,
    });
  } else {
    if (displayName) existing.displayName = cleanName;
    if (classLabel) existing.classLabel = classLabel;
    if (classCode) existing.classCode = classCode;
    if (classroomId) existing.classroomId = classroomId;
  }
}

// 1. Health check: Checks DB and ML Service status
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbTime = null;

  try {
    if (process.env.DATABASE_URL) {
      const result = await pool.query('SELECT NOW()');
      dbStatus = 'connected';
      dbTime = result.rows[0].now;
    } else {
      dbStatus = 'not_configured (running in dev fallback mode)';
    }
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  // Check ML API connectivity
  let mlStatus = 'unreachable';
  const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';
  try {
    const mlRes = await fetch(`${ML_API_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (mlRes.ok) {
      const mlData = await mlRes.json();
      mlStatus = `connected (engine v${mlData.engine_version || '0.1.0'})`;
    }
  } catch (err) {
    mlStatus = `unreachable at ${ML_API_URL}`;
  }

  res.json({
    ok: true,
    server: 'backend',
    database: dbStatus,
    dbTime,
    mlService: mlStatus,
    timestamp: new Date().toISOString(),
  });
});

// 2. Fetch Curated Assessment Probes (from ML service or fallback)
app.get('/api/probes', async (req, res) => {
  const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';
  try {
    const mlRes = await fetch(`${ML_API_URL}/probes`, { signal: AbortSignal.timeout(3000) });
    if (mlRes.ok) {
      const data = await mlRes.json();
      return res.json(data);
    }
  } catch (err) {
    console.warn('Could not fetch probes from ML server, using fallback probe definitions.');
  }

  // Fallback probe definitions
  res.json({
    ok: true,
    probes: [
      { id: 'probe_01', text: '61 - 24 = ?', options: [37, 43, 47, 35], correctAnswer: 37 },
      { id: 'probe_02', text: '72 - 38 = ?', options: [34, 46, 44, 36], correctAnswer: 34 },
      { id: 'probe_03', text: '83 - 49 = ?', options: [34, 46, 44, 38], correctAnswer: 34 },
      { id: 'ctrl_01', text: '58 - 23 = ?', options: [35, 31, 25, 33], correctAnswer: 35 },
      { id: 'ctrl_02', text: '79 - 45 = ?', options: [34, 32, 24, 35], correctAnswer: 34 },
    ],
  });
});

// 3. Submit Student Response & Diagnose via ML Engine
app.post('/api/responses', async (req, res) => {
  try {
    const {
      studentId = 'student_guest',
      questionId = 'probe_01',
      questionText = '',
      assignmentId = 'asgn_class3_subtraction',
      answer,
      correctAnswer = null,
      explanation = '',
      responses = null,
      studentName = '',
    } = req.body;

    const responseId = randomUUID();
    const cleanStudentName = studentName || studentId.replace(/^student_/, '').replace(/_/g, ' ') || 'Student';
    const classLabel = 'Grade 3 - Section 3A';

    // 1. Ensure foreign key dependencies exist in PostgreSQL
    if (process.env.DATABASE_URL) {
      try {
        await pool.query(
          `INSERT INTO assignments (id, title) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
          [assignmentId, 'Class 3 Subtraction Diagnostic with Regrouping']
        );
        await pool.query(
          `INSERT INTO questions (id, prompt, topic, grade) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
          [questionId, questionText || '61 - 24 = ?', 'Subtraction', 3]
        );
        await pool.query(
          `INSERT INTO students (id, display_name, class_label) VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name`,
          [studentId, cleanStudentName, classLabel]
        );
      } catch (fkErr) {
        console.warn('DB foreign key preparation skipped:', fkErr.message);
      }
    }

    // 2. Register student in memory
    registerStudentInMemory(studentId, cleanStudentName, classLabel);

    // 3. Call ML service
    const mlResult = await mlService.diagnose({
      questionId,
      answer,
      explanation,
      responses,
    });

    const isPass = correctAnswer !== null ? Number(answer) === Number(correctAnswer) : false;
    if (mlResult.status !== 'ok') {
      console.warn("[ML Engine Offline] ML server offline or unavailable. Using fallback diagnosis: status=" + (isPass ? "Pass" : "Fail") + ", ruleId=" + (isPass ? "CORRECT" : "PENDING_EVALUATION"));
    }

    const diagnosisData = mlResult.status === 'ok' ? mlResult.diagnosis : {
      status: isPass ? 'Pass' : 'Fail',
      observations: isPass
        ? 'No immediate gap detected. Student demonstrated mastery of place value regrouping.'
        : `Student response ${answer} indicates a need for place value review.`,
      evidence: { observed: answer, expected: correctAnswer, is_correct: isPass },
      alternatives: ['Calculation slip'],

      followUpQuestion: 'Can you explain the strategy you used to solve this problem?',
      suggestedActivity: isPass
        ? 'Advance to 3-digit subtraction problems.'
        : 'Practice regrouping with base-10 manipulatives.',
      confidence: 'LOW',
      ruleId: isPass ? 'CORRECT' : 'PENDING_EVALUATION',
    };

    // 4. Store in Memory Cache
    memoryStore.responses.set(responseId, {
      id: responseId,
      studentId,
      questionId,
      questionText,
      assignmentId,
      answer,
      correctAnswer,
      explanation,
      submittedAt: new Date().toISOString(),
    });
    memoryStore.diagnoses.set(responseId, diagnosisData);

    // Update real progress in memory
    const studentResponses = Array.from(memoryStore.responses.values()).filter(r => r.studentId === studentId);
    const correctCount = studentResponses.filter(r => r.correctAnswer !== null && Number(r.answer) === Number(r.correctAnswer)).length;
    const progressPct = studentResponses.length > 0 ? Math.round((correctCount / studentResponses.length) * 100) : (isPass ? 100 : 0);
    const memStudent = memoryStore.students.find(s => s.id === studentId);
    if (memStudent) {
      memStudent.progress = progressPct;
    }

    // 5. Persist to Postgres if available
    let dbSaved = false;
    if (process.env.DATABASE_URL && ResponseModel && DiagnosisModel) {
      try {
        await ResponseModel.create({
          id: responseId,
          questionId,
          studentId,
          assignmentId,
          answer: String(answer),
          explanation,
        });

        await DiagnosisModel.create({
          responseId,
          observations: diagnosisData.observations,
          possibleMisconception: diagnosisData.ruleId,
          evidence: diagnosisData.evidence,
          alternatives: diagnosisData.alternatives,
          confidence: diagnosisData.confidence,
          followUpQuestion: diagnosisData.followUpQuestion,
          suggestedActivity: diagnosisData.suggestedActivity,
          ruleId: diagnosisData.ruleId,
        });
        dbSaved = true;
      } catch (dbErr) {
        console.warn('Database save skipped:', dbErr.message);
      }
    }

    res.json({
      ok: true,
      responseId,
      studentId,
      questionId,
      answer,
      diagnosis: diagnosisData,
      dbSaved,
    });
  } catch (err) {
    console.error('Error handling response submission:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 4. Get Diagnosis Report by Response ID
// Assessment sessions & evidence collection

// S1. Start a New Assessment Session
app.post('/api/sessions/start', async (req, res) => {
  try {
    const { studentId = 'student_guest', assignmentId = 'asgn_class3_subtraction', studentName = '' } = req.body;
    const sessionId = `sess_${randomUUID()}`;
    const cleanStudentName = studentName || studentId.replace(/^student_/, '').replace(/_/g, ' ') || 'Student';
    const classLabel = 'Grade 3 - Section 3A';

    registerStudentInMemory(studentId, cleanStudentName, classLabel);

    const newSession = {
      id: sessionId,
      studentId,
      assignmentId,
      status: 'in_progress',
      responses: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    memoryStore.sessions.set(sessionId, newSession);

    if (process.env.DATABASE_URL) {
      try {
        await pool.query(
          `INSERT INTO assessment_sessions (id, student_id, assignment_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
          [sessionId, studentId, assignmentId, 'in_progress']
        );
      } catch (dbErr) {
        console.warn('DB session start query skipped:', dbErr.message);
      }
    }

    res.status(201).json({ ok: true, session: newSession });
  } catch (err) {
    console.error('Error starting assessment session:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// S2. Submit Response to Assessment Session
app.post('/api/sessions/:sessionId/responses', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      questionId,
      questionText = '',
      answer,
      correctAnswer = null,
      explanation = '',
      studentId = 'student_guest',
      studentName = '',
    } = req.body;

    let session = memoryStore.sessions.get(sessionId);
    if (!session) {
      // Auto-recover session if not found in memory (dev resilience)
      session = {
        id: sessionId,
        studentId,
        assignmentId: 'asgn_class3_subtraction',
        status: 'in_progress',
        responses: [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      memoryStore.sessions.set(sessionId, session);
    }

    if (session.status === 'completed') {
      return res.status(400).json({ ok: false, error: 'Cannot submit responses to a completed assessment session' });
    }

    // Prevent duplicate submission of same question in this session
    const existing = session.responses.find(r => r.questionId === questionId);
    if (existing) {
      return res.status(409).json({ ok: false, error: `Question '${questionId}' has already been submitted in this session.` });
    }

    const responseId = randomUUID();
    const isPass = correctAnswer !== null ? Number(answer) === Number(correctAnswer) : false;

    // Single item preliminary diagnosis (Strictly LOW confidence, candidate observation only)
    const singleDiag = await mlService.diagnose({
      questionId,
      answer,
      explanation,
    });

    const preliminaryDiagnosis = singleDiag.status === 'ok' ? singleDiag.diagnosis : {
      status: isPass ? 'Pass' : 'Fail',
      diagnostic_status: isPass ? 'NO_TARGET_PATTERN_DETECTED' : 'CANDIDATE_MISCONCEPTION',
      confidence: 'LOW',
      evidence_strength: 'WEAK',
      observations: `Response ${answer} recorded. Preliminary observation only. Complete assessment evaluation required for diagnostic conclusion.`,
      evidence: { observed: answer, expected: correctAnswer, is_correct: isPass },
      ruleId: isPass ? 'CORRECT' : 'CANDIDATE_OBSERVATION',
    };

    const responseRecord = {
      id: responseId,
      sessionId,
      studentId: session.studentId,
      assignmentId: session.assignmentId,
      questionId,
      questionText,
      answer,
      correctAnswer,
      explanation,
      isCorrect: isPass,
      submittedAt: new Date().toISOString(),
    };

    session.responses.push(responseRecord);
    memoryStore.responses.set(responseId, responseRecord);
    memoryStore.diagnoses.set(responseId, preliminaryDiagnosis);

    if (process.env.DATABASE_URL) {
      try {
        await pool.query(
          `INSERT INTO responses (id, question_id, student_id, assignment_id, answer, explanation, session_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
          [responseId, questionId, session.studentId, session.assignmentId, String(answer), explanation, sessionId]
        );
      } catch (dbErr) {
        console.warn('DB response save skipped:', dbErr.message);
      }
    }

    res.status(201).json({
      ok: true,
      responseId,
      sessionId,
      preliminaryDiagnosis,
      totalResponsesInSession: session.responses.length,
    });
  } catch (err) {
    console.error('Error submitting session response:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// S3. Complete Assessment Session & Run Multi-Probe Evidence Synthesis
app.post('/api/sessions/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = memoryStore.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'Assessment session not found' });
    }

    if (session.responses.length === 0) {
      return res.status(400).json({ ok: false, error: 'Cannot complete an empty assessment session. No responses submitted.' });
    }

    // Call Python multi-response diagnostic engine with complete session response set
    const sessionPayload = {
      session_id: sessionId,
      student_id: session.studentId,
      responses: session.responses.map(r => ({
        question_id: r.questionId,
        answer: Number(r.answer),
        explanation: r.explanation || '',
      })),
    };

    const diagResult = await mlService.diagnoseSession(sessionPayload);
    const diagnosis = diagResult.diagnosis;

    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    session.diagnosis = diagnosis;
    memoryStore.sessionDiagnoses.set(sessionId, diagnosis);

    // Update student in memoryStore
    const student = memoryStore.students.find(s => s.id === session.studentId);
    if (student) {
      const correctCount = session.responses.filter(r => r.isCorrect).length;
      student.progress = Math.round((correctCount / session.responses.length) * 100);
      student.lastSessionId = sessionId;
      student.latestDiagnosis = diagnosis;
    }

    if (process.env.DATABASE_URL) {
      try {
        await pool.query(
          `UPDATE assessment_sessions SET status = 'completed', completed_at = NOW() WHERE id = $1`,
          [sessionId]
        );
        if (diagnosis) {
          const diagId = `sdiag_${randomUUID()}`;
          await pool.query(
            `INSERT INTO session_diagnoses (
              id, session_id, diagnostic_status, candidate_misconception,
              evidence_strength, confidence, all_correct, probes_evaluated,
              correct_count, supporting_evidence, contradictory_evidence,
              missing_evidence, skill_mastery, related_prerequisite_skill,
              recommended_intervention, raw_diagnosis_json
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            ) ON CONFLICT (session_id) DO UPDATE SET
              diagnostic_status = EXCLUDED.diagnostic_status,
              candidate_misconception = EXCLUDED.candidate_misconception,
              evidence_strength = EXCLUDED.evidence_strength,
              confidence = EXCLUDED.confidence,
              all_correct = EXCLUDED.all_correct,
              probes_evaluated = EXCLUDED.probes_evaluated,
              correct_count = EXCLUDED.correct_count,
              supporting_evidence = EXCLUDED.supporting_evidence,
              contradictory_evidence = EXCLUDED.contradictory_evidence,
              missing_evidence = EXCLUDED.missing_evidence,
              skill_mastery = EXCLUDED.skill_mastery,
              related_prerequisite_skill = EXCLUDED.related_prerequisite_skill,
              recommended_intervention = EXCLUDED.recommended_intervention,
              raw_diagnosis_json = EXCLUDED.raw_diagnosis_json;`,
            [
              diagId,
              sessionId,
              diagnosis.diagnostic_status || 'INSUFFICIENT_EVIDENCE',
              diagnosis.candidate_misconception || null,
              diagnosis.evidence_strength || 'WEAK',
              diagnosis.confidence || 'LOW',
              !!diagnosis.all_correct,
              diagnosis.probes_evaluated || 0,
              diagnosis.correct_count || 0,
              JSON.stringify(diagnosis.supporting_evidence || []),
              JSON.stringify(diagnosis.contradictory_evidence || []),
              JSON.stringify(diagnosis.missing_evidence || []),
              JSON.stringify(diagnosis.skill_mastery || {}),
              JSON.stringify(diagnosis.related_prerequisite_skill || null),
              JSON.stringify(diagnosis.recommended_intervention || null),
              JSON.stringify(diagnosis),
            ]
          );
        }
      } catch (dbErr) {
        console.warn('DB session complete update skipped:', dbErr.message);
      }
    }

    res.json({
      ok: true,
      sessionId,
      session,
      diagnosis,
    });
  } catch (err) {
    console.error('Error completing assessment session:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// S4. Get Assessment Session Details
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    let session = memoryStore.sessions.get(sessionId);
    let diagnosis = memoryStore.sessionDiagnoses.get(sessionId) || session?.diagnosis || null;

    if (!session && process.env.DATABASE_URL) {
      try {
        const sRes = await pool.query('SELECT * FROM assessment_sessions WHERE id = $1', [sessionId]);
        if (sRes.rows.length > 0) {
          const row = sRes.rows[0];
          const rRes = await pool.query('SELECT * FROM responses WHERE session_id = $1 ORDER BY submitted_at ASC', [sessionId]);
          session = {
            id: row.id,
            studentId: row.student_id,
            assignmentId: row.assignment_id,
            status: row.status,
            createdAt: row.created_at,
            completedAt: row.completed_at,
            responses: rRes.rows.map(r => ({
              id: r.id,
              questionId: r.question_id,
              answer: r.answer,
              explanation: r.explanation,
              submittedAt: r.submitted_at,
            })),
          };
          memoryStore.sessions.set(sessionId, session);
        }

        const dRes = await pool.query('SELECT * FROM session_diagnoses WHERE session_id = $1', [sessionId]);
        if (dRes.rows.length > 0) {
          diagnosis = dRes.rows[0].raw_diagnosis_json || dRes.rows[0];
          memoryStore.sessionDiagnoses.set(sessionId, diagnosis);
        }
      } catch (dbErr) {
        console.warn('DB session fetch error:', dbErr.message);
      }
    }

    if (!session) {
      return res.status(404).json({ ok: false, error: 'Assessment session not found' });
    }

    res.json({ ok: true, session, diagnosis });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Prerequisite skills & intervention recommendations

// I1. Get Cognitive Prerequisite Graph
app.get('/api/prerequisites', async (req, res) => {
  try {
    const data = await mlService.getPrerequisites();
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// I2. Get Teacher Intervention Catalogue
app.get('/api/interventions', async (req, res) => {
  try {
    const data = await mlService.getInterventions();
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// I3. Record Teacher Intervention Delivery
app.post('/api/interventions/deliver', async (req, res) => {
  try {
    const {
      studentId,
      sessionId = null,
      targetSkill = 'ONES_REGROUPING',
      misconceptionId = null,
      interventionTitle,
      teacherDecision = 'accepted', // 'accepted', 'modified', 'rejected'
      teacherNotes = '',
      status = 'delivered', // 'planned', 'delivered', 'completed'
    } = req.body;

    const recordId = `intv_${randomUUID()}`;
    const record = {
      id: recordId,
      studentId,
      sessionId,
      targetSkill,
      misconceptionId,
      interventionTitle: interventionTitle || 'Tens-and-Ones Bundling Mat & Concrete Unbundling',
      teacherDecision,
      teacherNotes,
      status,
      deliveredAt: new Date().toISOString(),
    };

    if (!memoryStore.interventions.has(studentId)) {
      memoryStore.interventions.set(studentId, []);
    }
    memoryStore.interventions.get(studentId).push(record);

    if (process.env.DATABASE_URL) {
      try {
        await pool.query(
          `INSERT INTO intervention_records (
            id, student_id, session_id, target_skill, misconception_id,
            intervention_title, teacher_decision, teacher_notes, status, delivered_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (id) DO NOTHING;`,
          [recordId, studentId, sessionId, targetSkill, misconceptionId, record.interventionTitle, teacherDecision, teacherNotes, status]
        );
      } catch (dbErr) {
        console.warn('DB intervention save error:', dbErr.message);
      }
    }

    res.status(201).json({ ok: true, intervention: record });
  } catch (err) {
    console.error('Error recording intervention:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// I4. Get Student Intervention History
app.get('/api/interventions/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    let history = memoryStore.interventions.get(studentId) || [];

    if (history.length === 0 && process.env.DATABASE_URL) {
      try {
        const dbRes = await pool.query(
          'SELECT * FROM intervention_records WHERE student_id = $1 ORDER BY delivered_at DESC NULLS LAST, created_at DESC',
          [studentId]
        );
        if (dbRes.rows.length > 0) {
          history = dbRes.rows.map(row => ({
            id: row.id,
            studentId: row.student_id,
            sessionId: row.session_id,
            targetSkill: row.target_skill,
            misconceptionId: row.misconception_id,
            interventionTitle: row.intervention_title,
            teacherDecision: row.teacher_decision,
            teacherNotes: row.teacher_notes,
            status: row.status,
            deliveredAt: row.delivered_at || row.created_at,
          }));
          memoryStore.interventions.set(studentId, history);
        }
      } catch (dbErr) {
        console.warn('DB fetch interventions error:', dbErr.message);
      }
    }

    res.json({ ok: true, interventions: history });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Post-intervention reassessment

// R1. Start Post-Intervention Reassessment
app.post('/api/reassessment/start', async (req, res) => {
  try {
    const { studentId, preSessionId, targetSkill = 'ONES_REGROUPING' } = req.body;
    const reassessSessionId = `reassess_${randomUUID()}`;

    // Target probes + transfer probe
    const questions = [
      { id: 'probe_02', text: '72 - 38 = ?', options: [34, 46, 44, 36], correctAnswer: 34 },
      { id: 'probe_03', text: '83 - 49 = ?', options: [34, 46, 44, 38], correctAnswer: 34 },
      { id: 'ncert_ch12_herbs_270_36', text: '270 - 36 = ?', options: [234, 246, 244, 306], correctAnswer: 234 },
      { id: 'ctrl_01', text: '58 - 23 = ?', options: [35, 31, 25, 33], correctAnswer: 35 },
    ];

    const session = {
      id: reassessSessionId,
      studentId,
      preSessionId,
      isReassessment: true,
      targetSkill,
      assignmentId: 'asgn_reassessment_subtraction',
      status: 'in_progress',
      questions,
      responses: [],
      createdAt: new Date().toISOString(),
    };

    memoryStore.sessions.set(reassessSessionId, session);

    res.status(201).json({
      ok: true,
      reassessmentSession: session,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// R2. Compare Pre & Post Reassessment Evidence
app.post('/api/reassessment/compare', async (req, res) => {
  try {
    const { preSessionId, postSessionId } = req.body;
    const preDiag = memoryStore.sessionDiagnoses.get(preSessionId) || {};
    const postDiag = memoryStore.sessionDiagnoses.get(postSessionId) || {};

    const comparisonResult = await mlService.compareReassessment(preDiag, postDiag);
    const comparison = comparisonResult.comparison;

    const compRecord = {
      id: `comp_${randomUUID()}`,
      preSessionId,
      postSessionId,
      comparison,
      createdAt: new Date().toISOString(),
    };

    memoryStore.reassessments.set(postSessionId, compRecord);

    if (process.env.DATABASE_URL) {
      try {
        const studentId = comparison?.student_id || 'student_guest';
        await pool.query(
          `INSERT INTO reassessment_comparisons (
            id, student_id, pre_session_id, post_session_id, comparison_outcome,
            misconception_trend, teacher_summary, raw_comparison_json
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;`,
          [
            compRecord.id,
            studentId,
            preSessionId,
            postSessionId,
            comparison?.outcome || 'REASSESSMENT_EVALUATED',
            comparison?.trend || 'STABLE',
            comparison?.teacher_summary || '',
            JSON.stringify(comparison),
          ]
        );
      } catch (dbErr) {
        console.warn('DB reassessment save error:', dbErr.message);
      }
    }

    res.json({ ok: true, comparison: compRecord });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Student groupings by misconception

// G1. Get Students Grouped by Diagnosed Learning Needs
app.get('/api/groupings', async (req, res) => {
  try {
    const students = memoryStore.students;

    const groups = [
      {
        groupId: 'SFL_BUNDLE_GROUP',
        name: 'Tens-and-Ones Regrouping (Smaller-From-Larger)',
        targetSkill: 'ONES_REGROUPING',
        prerequisiteSkill: 'PLACE_VALUE_BUNDLES',
        recommendedActivity: 'Tens-and-Ones Bundling Mat & Dienes Exchange (NCERT p. 152)',
        description: 'Students who subtracted smaller ones digits from larger ones digits without decomposing a ten.',
        students: [],
      },
      {
        groupId: 'BWD_DECREMENT_GROUP',
        name: 'Crossing-Out Routine (Borrow-Without-Decrement)',
        targetSkill: 'ONES_REGROUPING',
        prerequisiteSkill: 'PLACE_VALUE_BUNDLES',
        recommendedActivity: "The Banker's Exchange Token Surrender (NCERT p. 156-160)",
        description: 'Students who unbundled into 10 ones but omitted decrementing the higher tens column.',
        students: [],
      },
      {
        groupId: 'PLACE_VALUE_GAP_GROUP',
        name: 'Foundational Base-10 Bundling & Facts Check',
        targetSkill: 'PLACE_VALUE_BUNDLES',
        prerequisiteSkill: 'SINGLE_DIGIT_FACTS',
        recommendedActivity: 'Ginladi Bead String Landmark Jumps (NCERT Chapter 3, pp. 23-28)',
        description: 'Students with baseline non-regrouping errors or place-value decomposition gaps.',
        students: [],
      },
      {
        groupId: 'INSUFFICIENT_EVIDENCE_GROUP',
        name: 'Pending Clinical Check-in / Inconclusive Evidence',
        targetSkill: 'DIAGNOSTIC_INQUIRY',
        prerequisiteSkill: 'SINGLE_DIGIT_FACTS',
        recommendedActivity: '1-on-1 Think-Aloud Verbal Diagnostic Check-in',
        description: 'Students with incomplete assessment evidence or pervasive hesitancy/guessing.',
        students: [],
      },
      {
        groupId: 'SECURE_EXTENSION_GROUP',
        name: 'Place Value Subtraction Secure (Extensions)',
        targetSkill: 'WORD_PROBLEM_APPLICATION',
        prerequisiteSkill: 'ONES_REGROUPING',
        recommendedActivity: '3-Digit Subtraction and Multi-Step Word Problems (NCERT p. 154)',
        description: 'Students demonstrating consistent accuracy across canonical and transfer subtraction probes.',
        students: [],
      },
    ];

    for (const s of students) {
      // Check manual teacher override
      const manualGroup = memoryStore.groupOverrides.get(s.id);
      if (manualGroup) {
        const targetG = groups.find(g => g.groupId === manualGroup.groupId);
        if (targetG) {
          targetG.students.push({
            ...s,
            reason: `Manually placed by teacher: ${manualGroup.reason || 'Instructional tier adaptation.'}`,
            isManualOverride: true,
          });
          continue;
        }
      }

      // Check latest session diagnosis
      const diag = s.latestDiagnosis || (s.lastSessionId ? memoryStore.sessionDiagnoses.get(s.lastSessionId) : null);
      const misc = diag ? (diag.candidate_misconception || diag.ruleId) : null;
      const status = diag ? diag.diagnostic_status : null;
      const allCorr = diag ? diag.all_correct : (s.progress === 100);

      if (misc === 'SMALLER_FROM_LARGER' || status === 'SUPPORTED_HYPOTHESIS' && misc === 'SMALLER_FROM_LARGER') {
        groups[0].students.push({
          ...s,
          reason: 'Matches systematic Smaller-From-Larger pattern across regrouping probes.',
        });
      } else if (misc === 'BORROW_WITHOUT_DECREMENT' || status === 'SUPPORTED_HYPOTHESIS' && misc === 'BORROW_WITHOUT_DECREMENT') {
        groups[1].students.push({
          ...s,
          reason: 'Matches Borrow-Without-Decrement pattern (forgot to reduce tens column).',
        });
      } else if (allCorr || status === 'NO_TARGET_PATTERN_DETECTED') {
        groups[4].students.push({
          ...s,
          reason: 'Demonstrated consistent accuracy across all subtraction probes.',
        });
      } else if (status === 'AMBIGUOUS_PATTERN' || s.progress < 50) {
        groups[2].students.push({
          ...s,
          reason: 'Non-regrouping errors or inconsistent patterns indicate foundational place value review needed.',
        });
      } else {
        groups[3].students.push({
          ...s,
          reason: 'Awaiting complete assessment session or verbal reasoning verification.',
        });
      }
    }

    res.json({ ok: true, groups });
  } catch (err) {
    console.error('Error grouping students:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// G2. Teacher Manual Grouping Override
app.post('/api/groupings/override', async (req, res) => {
  try {
    const { studentId, groupId, reason = '' } = req.body;
    if (!studentId || !groupId) {
      return res.status(400).json({ ok: false, error: 'studentId and groupId are required.' });
    }
    memoryStore.groupOverrides.set(studentId, {
      groupId,
      reason,
      overriddenAt: new Date().toISOString(),
    });
    res.json({ ok: true, studentId, groupId, reason });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/reports/:responseId', async (req, res) => {
  const { responseId } = req.params;

  // Try DB first if available
  if (process.env.DATABASE_URL && ResponseModel && DiagnosisModel) {
    try {
      const response = await ResponseModel.getById(responseId);
      if (response) {
        const diagnosis = await DiagnosisModel.getByResponseId(responseId);
        const override = OverrideModel ? await OverrideModel.getByResponseId(responseId) : null;
        return res.json({
          ok: true,
          response,
          report: diagnosis,
          override,
        });
      }
    } catch (dbErr) {
      console.warn('Database fetch failed, falling back to memory store:', dbErr.message);
    }
  }

  // Memory store fallback
  const response = memoryStore.responses.get(responseId);
  const report = memoryStore.diagnoses.get(responseId);
  const override = memoryStore.overrides.get(responseId) || null;

  if (!response) {
    return res.status(404).json({ ok: false, error: 'Report not found' });
  }

  res.json({
    ok: true,
    response,
    report,
    override,
  });
});

// 5. Get Diagnosis Report by Student ID (Returns student's real submission & diagnosis)
app.get('/api/reports/student/:studentId', async (req, res) => {
  const { studentId } = req.params;

  // 1. Try DB first if available
  if (process.env.DATABASE_URL) {
    try {
      const studentRes = await pool.query('SELECT * FROM students WHERE id = $1', [studentId]);
      const student = studentRes.rows[0] ? {
        id: studentRes.rows[0].id,
        displayName: studentRes.rows[0].display_name,
        classLabel: studentRes.rows[0].class_label,
      } : null;

      const respRes = await pool.query(
        `SELECT r.*, q.prompt as question_prompt, d.observations, d.possible_misconception, d.evidence, d.alternatives, d.confidence,
                d.follow_up_question, d.suggested_activity, d.rule_id, d.created_at as diag_created_at,
                o.teacher_decision, o.teacher_note, o.overridden_at
         FROM responses r
         LEFT JOIN questions q ON r.question_id = q.id
         LEFT JOIN diagnoses d ON r.id = d.response_id
         LEFT JOIN overrides o ON r.id = o.response_id
         WHERE r.student_id = $1
         ORDER BY r.submitted_at DESC
         LIMIT 1`,
        [studentId]
      );

      if (respRes.rows.length > 0) {
        const row = respRes.rows[0];
        const isPass = row.rule_id === 'CORRECT';
        return res.json({
          ok: true,
          student: student || {
            id: studentId,
            displayName: studentId.replace(/^student_/, '').replace(/_/g, ' '),
            classLabel: 'Grade 3 - Section 3A',
          },
          response: {
            id: row.id,
            questionId: row.question_id,
            questionText: row.question_prompt || (memoryStore.responses.get(row.id)?.questionText) || 'Class 3 Math Diagnostic',
            correctAnswer: (row.evidence && row.evidence.expected !== undefined) ? row.evidence.expected : (memoryStore.responses.get(row.id)?.correctAnswer ?? 37),
            answer: row.answer,

            submittedAt: row.submitted_at,
          },
          report: {
            status: isPass ? 'Pass' : 'Fail',
            observations: row.observations || (isPass ? 'Mastery demonstrated.' : 'Misconception detected.'),
            ruleId: row.rule_id || (isPass ? 'CORRECT' : 'BORROWING'),
            confidence: row.confidence || 'HIGH',
            followUpQuestion: row.follow_up_question || 'Can you explain how you subtracted the ones column?',
            suggestedActivity: row.suggested_activity || 'Practice regrouping with base-10 manipulatives.',
            evidence: row.evidence || {},
            alternatives: row.alternatives || [],
          },
          override: row.teacher_decision ? {
            teacherDecision: row.teacher_decision,
            teacherNote: row.teacher_note,
            overriddenAt: row.overridden_at,
          } : null,
        });
      }
    } catch (dbErr) {
      console.warn('DB student report query skipped:', dbErr.message);
    }
  }

  // 2. Try memoryStore
  let latestResponse = null;
  for (const resp of memoryStore.responses.values()) {
    if (resp.studentId === studentId || resp.studentId.includes(studentId)) {
      if (!latestResponse || new Date(resp.submittedAt) > new Date(latestResponse.submittedAt)) {
        latestResponse = resp;
      }
    }
  }

  const student = memoryStore.students.find(s => s.id === studentId || s.id.includes(studentId)) || {
    id: studentId,
    displayName: studentId.replace(/^student_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Student',
    classLabel: 'Grade 3 - Section 3A',
  };

  // Check if student has a completed assessment session
  let latestSession = null;
  for (const sess of memoryStore.sessions.values()) {
    if (sess.studentId === studentId || sess.studentId.includes(studentId)) {
      if (!latestSession || new Date(sess.createdAt) > new Date(latestSession.createdAt)) {
        latestSession = sess;
      }
    }
  }

  const sessionDiag = latestSession ? memoryStore.sessionDiagnoses.get(latestSession.id) : null;
  const interventions = memoryStore.interventions.get(studentId) || [];
  const reassessmentComp = latestSession ? memoryStore.reassessments.get(latestSession.id) : null;

  if (latestSession && sessionDiag) {
    const override = latestResponse ? (memoryStore.overrides.get(latestResponse.id) || null) : null;
    return res.json({
      ok: true,
      student,
      session: latestSession,
      response: latestResponse || (latestSession.responses.length > 0 ? latestSession.responses[latestSession.responses.length - 1] : null),
      responses: latestSession.responses,
      report: {
        status: sessionDiag.all_correct ? 'Pass' : 'Fail',
        diagnostic_status: sessionDiag.diagnostic_status,
        ruleId: sessionDiag.candidate_misconception || (sessionDiag.all_correct ? 'CORRECT' : 'PENDING_EVALUATION'),
        candidate_misconception: sessionDiag.candidate_misconception,
        evidence_strength: sessionDiag.evidence_strength || 'WEAK',
        confidence: sessionDiag.confidence || 'LOW',
        observations: sessionDiag.summary,
        evidence: {
          supporting: sessionDiag.supporting_evidence || [],
          contradictory: sessionDiag.contradictory_evidence || [],
          missing: sessionDiag.missing_evidence || [],
        },
        skill_mastery: sessionDiag.skill_mastery || {},
        related_prerequisite_skill: sessionDiag.related_prerequisite_skill || null,
        recommended_intervention: sessionDiag.recommended_intervention || null,
        followUpQuestion: sessionDiag.recommended_follow_up_question || 'Can you explain the steps you used?',
        suggestedActivity: sessionDiag.recommended_intervention?.teacher_guidance || 'Practice column regrouping with physical base-10 materials.',
        alternatives: ['Calculation slip', 'Guessing'],
      },
      interventions,
      reassessmentComparison: reassessmentComp || null,
      override,
    });
  }

  if (latestResponse) {
    const diag = memoryStore.diagnoses.get(latestResponse.id);
    const override = memoryStore.overrides.get(latestResponse.id) || null;
    return res.json({
      ok: true,
      student,
      response: latestResponse,
      report: diag || null,
      interventions,
      reassessmentComparison: null,
      override,
    });
  }

  // Graceful response if no submission exists yet
  res.json({
    ok: true,
    student,
    response: null,
    report: null,
    override: null,
  });
});

// 6. Record Teacher Override & Clinical Notes
app.post('/api/overrides', async (req, res) => {
  try {
    const { responseId, originalRuleId, teacherDecision, teacherNote } = req.body;
    if (!responseId) {
      return res.status(400).json({ ok: false, error: 'responseId is required' });
    }

    const overrideRecord = {
      responseId,
      originalRuleId: originalRuleId || 'UNKNOWN',
      teacherDecision: teacherDecision || 'CONFIRMED',
      teacherNote: teacherNote || '',
      overriddenAt: new Date().toISOString(),
    };

    memoryStore.overrides.set(responseId, overrideRecord);

    // Persist to Postgres if available
    if (process.env.DATABASE_URL && OverrideModel) {
      try {
        await OverrideModel.create({
          responseId,
          originalRuleId,
          teacherDecision,
          teacherNote,
        });
      } catch (dbErr) {
        console.warn('DB override save skipped:', dbErr.message);
      }
    }

    res.json({ ok: true, override: overrideRecord });
  } catch (err) {
    console.error('Error saving override:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 7. Get All Assignments
app.get('/api/assignments', async (req, res) => {
  res.json({
    ok: true,
    assignments: memoryStore.assignments,
  });
});

// 8. Create New Assignment
app.post('/api/assignments', async (req, res) => {
  try {
    const { title, topic, classLabel, questions } = req.body;
    const assignmentId = `asgn_${randomUUID().slice(0, 8)}`;

    const newAssignment = {
      id: assignmentId,
      title: title || `${topic || 'Math'} Assignment for ${classLabel || 'Class 3'}`,
      topic: topic || 'Math & Logic',
      classLabel: classLabel || 'Grade 3 - Section A',
      questions: questions && questions.length > 0 ? questions : [
        { id: 'probe_01', text: '61 - 24 = ?', options: [37, 43, 47, 35], correctAnswer: 37 },
        { id: 'probe_02', text: '72 - 38 = ?', options: [34, 46, 44, 36], correctAnswer: 34 },
        { id: 'probe_03', text: '83 - 49 = ?', options: [34, 46, 44, 38], correctAnswer: 34 },
        { id: 'ctrl_01', text: '58 - 23 = ?', options: [35, 31, 25, 33], correctAnswer: 35 },
        { id: 'ctrl_02', text: '79 - 45 = ?', options: [34, 32, 24, 35], correctAnswer: 34 },
      ],
      createdAt: new Date().toISOString(),
    };

    memoryStore.assignments.unshift(newAssignment);

    // Persist to Postgres if available
    if (process.env.DATABASE_URL && AssignmentModel) {
      try {
        await AssignmentModel.create({
          id: assignmentId,
          title: newAssignment.title,
        });
      } catch (dbErr) {
        console.warn('DB assignment save skipped:', dbErr.message);
      }
    }

    res.json({ ok: true, assignment: newAssignment });
  } catch (err) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 9. Get Teacher Dashboard Summary (Fully Dynamic)
app.get('/api/dashboard', async (req, res) => {
  let teacherName = 'Educator';
  let schoolName = 'Primary School';
  let classCode = '3A';

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const authService = require('./services/authService');
      const token = authHeader.split(' ')[1];
      const payload = authService.verifyToken(token);
      if (payload && payload.role === 'teacher') {
        const teacher = await authService.getTeacherById(payload.id);
        if (teacher) {
          teacherName = teacher.name;
          schoolName = teacher.schoolName || schoolName;
        }
        let ClassroomModel = null;
        try { ClassroomModel = require('./models/Classroom'); } catch (err) {}
        if (ClassroomModel) {
          const classes = await ClassroomModel.getByTeacherId(payload.id);
          if (classes && classes.length > 0) {
            classCode = classes[0].classCode;
          }
        }
      }
    } catch (e) {}
  }

  let students = [];

  // 1. Try real PostgreSQL students first
  if (process.env.DATABASE_URL) {
    try {
      const dbRes = await pool.query(`
        SELECT 
          s.id, 
          s.display_name, 
          s.class_label,
          s.class_code,
          COUNT(r.id) as total_responses,
          SUM(CASE WHEN d.rule_id = 'CORRECT' OR d.status = 'Pass' THEN 1 ELSE 0 END) as correct_responses,
          BOOL_OR(d.rule_id != 'CORRECT' AND d.status = 'Fail') as has_misconception,
          MAX(r.submitted_at) as last_submission
        FROM students s
        LEFT JOIN responses r ON s.id = r.student_id
        LEFT JOIN diagnoses d ON r.id = d.response_id
        WHERE ($1::text IS NULL OR s.class_code = $1 OR s.class_label ILIKE '%' || $1 || '%')
        GROUP BY s.id, s.display_name, s.class_label, s.class_code
        ORDER BY last_submission DESC NULLS LAST, s.display_name ASC
      `, [classCode || null]);

      if (dbRes.rows && dbRes.rows.length > 0) {
        students = dbRes.rows.map(row => {
          const total = parseInt(row.total_responses, 10) || 0;
          const correct = parseInt(row.correct_responses, 10) || 0;
          const progress = total > 0 ? Math.round((correct / total) * 100) : 0;
          return {
            id: row.id,
            name: row.display_name,
            grade: row.class_label,
            classCode: row.class_code,
            progress,
            totalResponses: total,
            hasMisconception: !!row.has_misconception,
            avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${row.display_name.split(' ')[0]}`,
          };
        });
      }
    } catch (err) {
      console.warn('DB student query skipped:', err.message);
    }
  }

  // 2. Fall back to memoryStore students if DB returned none
  if (students.length === 0 && memoryStore.students.length > 0) {
    const memList = memoryStore.students.filter(s => !classCode || s.classCode === classCode || (s.classLabel && s.classLabel.includes(classCode)));
    students = memList.map(s => {
      const studentResponses = Array.from(memoryStore.responses.values()).filter(r => r.studentId === s.id);
      const correct = studentResponses.filter(r => r.correctAnswer !== null && Number(r.answer) === Number(r.correctAnswer)).length;
      const progress = studentResponses.length > 0 ? Math.round((correct / studentResponses.length) * 100) : (s.progress || 0);
      const hasMisconception = studentResponses.some(r => {
        const diag = memoryStore.diagnoses.get(r.id);
        return diag && diag.status === 'Fail';
      });
      return {
        id: s.id,
        name: s.displayName,
        grade: s.classLabel,
        progress,
        totalResponses: studentResponses.length,
        hasMisconception,
        avatar: s.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.displayName.split(' ')[0]}`,
      };
    });
  }

  // Dynamic calculation of stats
  const pendingReviewsCount = students.filter(s => s.progress < 75 || s.hasMisconception).length;
  const stats = [
    { id: 1, label: 'Total Students', value: students.length, icon: 'Users', bgColor: 'bg-blue-50', iconColor: 'text-blue-500' },
    { id: 2, label: 'Pending Reviews', value: pendingReviewsCount, icon: 'Clock', bgColor: 'bg-orange-50', iconColor: 'text-orange-500' },
    { id: 3, label: 'Total Assignments', value: memoryStore.assignments.length || 1, icon: 'BookOpen', bgColor: 'bg-purple-50', iconColor: 'text-purple-500' },
  ];

  res.json({
    ok: true,
    teacher: {
      name: teacherName,
      greeting: 'Good Morning',
      schoolName,
      classCode,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${teacherName.split(' ')[0]}`,
    },
    stats,
    students,
    activeAssignment: memoryStore.assignments[0] || null,
  });
});

// 10. Teacher Bot Chat Routes (Feature Flag Protected)
try {
  const chatRoutes = require('./chat/chatRoutes');
  app.use('/chat', chatRoutes);
} catch (err) {
  console.warn('Chat routes not loaded:', err.message);
}

// 11. Authentication Routes (Teachers & Students)
try {
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
} catch (err) {
  console.warn('Auth routes not loaded:', err.message);
}

// 12. Centralized Production Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[UNHANDLED EXPRESS ERROR]', err);
  res.status(err.status || 500).json({
    ok: false,
    error: process.env.NODE_ENV === 'production' ? 'An internal server error occurred' : err.message,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`ReasonFirst backend listening on http://localhost:${PORT}`);

  const geminiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
  const openaiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '';

  if (geminiKey) {
    const model = process.env.CHAT_LLM_MODEL || 'gemini-2.5-flash';
    console.log(`[LLM] Google Gemini active (model: ${model})`);
  } else if (openaiKey) {
    const model = process.env.CHAT_LLM_MODEL || 'gpt-4o-mini';
    console.log(`[LLM] OpenAI active (model: ${model})`);
  } else {
    console.log(`[LLM] No API key configured. Using local reasoning simulator.`);
  }

  if (process.env.DATABASE_URL) {
    try {
      await pool.query('SELECT NOW()');
      console.log(`[Database] Connected to PostgreSQL`);
      const migrateAll = require('./config/migrateAll');
      await migrateAll();
    } catch (dbErr) {
      console.warn(`[Database] PostgreSQL connection failed (${dbErr.message}). Using in-memory store.`);
    }
  } else {
    console.log(`[Database] DATABASE_URL not set. Running in development in-memory mode.`);
  }

  const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';
  try {
    const mlRes = await fetch(`${ML_API_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (mlRes.ok) {
      console.log(`[ML Engine] Connected to diagnostic engine at ${ML_API_URL}`);
    } else {
      console.log(`[ML Engine] Diagnostic server returned HTTP ${mlRes.status}. Using local fallback.`);
    }
  } catch (mlErr) {
    console.log(`[ML Engine] Diagnostic server offline at ${ML_API_URL}. Using local fallback.`);
  }
});
