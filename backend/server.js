const path = require('path');
// Guarantee loading of backend/.env with override: true so empty parent/shell envs don't override it
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
app.use(express.json());

// In-memory cache for offline/dev resilience when DB is not configured
const memoryStore = {
  responses: new Map(),
  diagnoses: new Map(),
  overrides: new Map(),
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

  if (latestResponse) {
    const diag = memoryStore.diagnoses.get(latestResponse.id);
    const override = memoryStore.overrides.get(latestResponse.id) || null;
    return res.json({
      ok: true,
      student,
      response: latestResponse,
      report: diag || null,
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`\n========================================================`);
  console.log(`🚀 Reason-First Backend running on http://localhost:${PORT}`);
  console.log(`========================================================`);

  // 1. LLM API Key Status Check
  const geminiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
  const openaiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '';

  if (geminiKey && geminiKey.length > 0) {
    const masked = geminiKey.length > 10
      ? geminiKey.slice(0, 6) + '...' + geminiKey.slice(-4)
      : '***';
    const model = process.env.CHAT_LLM_MODEL || 'gemini-3.8-flash';
    console.log(`\x1b[32m[LLM STATUS] Real API key detected (Google Gemini: ${masked}). Using live LLM (Model: ${model}).\x1b[0m`);
  } else if (openaiKey && openaiKey.length > 0) {
    const masked = openaiKey.length > 10
      ? openaiKey.slice(0, 6) + '...' + openaiKey.slice(-4)
      : '***';
    const model = process.env.CHAT_LLM_MODEL || 'gpt-4o-mini';
    console.log(`\x1b[32m[LLM STATUS] Real API key detected (OpenAI/Compatible: ${masked}). Using live LLM (Model: ${model}).\x1b[0m`);
  } else {
    console.log(`\x1b[33m[LLM STATUS] No API key found. Using deterministic simulator.\x1b[0m`);
  }

  // 2. Database Status Check
  if (process.env.DATABASE_URL) {
    try {
      const res = await pool.query('SELECT NOW()');
      console.log(`\x1b[32m[DB STATUS] Connected to Neon Postgres (Server time: ${res.rows[0].now.toISOString()}).\x1b[0m`);
    } catch (dbErr) {
      console.warn(`\x1b[33m[DB STATUS] Neon Postgres unreachable (${dbErr.message}). Using in-memory fallback.\x1b[0m`);
    }
  } else {
    console.log(`\x1b[33m[DB STATUS] DATABASE_URL not set. Running in development in-memory mode.\x1b[0m`);
  }

  // 3. ML Diagnostic Server Check
  const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';
  try {
    const mlRes = await fetch(`${ML_API_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (mlRes.ok) {
      const mlData = await mlRes.json();
      console.log(`\x1b[32m[ML SERVER STATUS] Connected to ML Diagnostic Engine at ${ML_API_URL} (v${mlData.engine_version || '0.1.0'}).\x1b[0m`);
    } else {
      console.log(`\x1b[33m[ML SERVER STATUS] ML Diagnostic Server returned HTTP ${mlRes.status}. Server will use local fallback.\x1b[0m`);
    }
  } catch (mlErr) {
    console.log(`\x1b[33m[ML SERVER STATUS] ML Diagnostic Engine not running at ${ML_API_URL} (${mlErr.message}). Server will use local fallback.\x1b[0m`);
  }

  console.log(`========================================================\n`);
});
