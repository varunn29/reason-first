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
try {
  ResponseModel = require('./models/Response');
  DiagnosisModel = require('./models/Diagnosis');
  StudentModel = require('./models/Student');
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
  students: [
    { id: '1', displayName: 'Rahul Kumar', classLabel: 'Grade 3 - Section A', progress: 78, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul' },
    { id: '2', displayName: 'Priya Singh', classLabel: 'Grade 3 - Section A', progress: 64, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Priya' },
    { id: '3', displayName: 'Aarav Patel', classLabel: 'Grade 3 - Section B', progress: 52, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aarav' },
    { id: '4', displayName: 'Sneha Yadav', classLabel: 'Grade 3 - Section B', progress: 88, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sneha' },
    { id: '5', displayName: 'Rohan Gupta', classLabel: 'Grade 3 - Section A', progress: 71, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rohan' },
  ],
  stats: [
    { id: 1, label: 'Total Students', value: 24, icon: 'Users', bgColor: 'bg-blue-50', iconColor: 'text-blue-500' },
    { id: 2, label: 'Pending Reviews', value: 5, icon: 'Clock', bgColor: 'bg-orange-50', iconColor: 'text-orange-500' },
    { id: 3, label: 'Total Assignments', value: 12, icon: 'BookOpen', bgColor: 'bg-purple-50', iconColor: 'text-purple-500' },
  ]
};

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
      studentId = 'student_01',
      questionId = 'probe_01',
      assignmentId = 'asgn_01',
      answer,
      explanation = '',
      responses = null,
    } = req.body;

    const responseId = randomUUID();

    // Call ML service
    const mlResult = await mlService.diagnose({
      questionId,
      answer,
      explanation,
      responses,
    });

    const diagnosisData = mlResult.status === 'ok' ? mlResult.diagnosis : {
      status: 'pending',
      observations: 'ML diagnosis is pending evaluation.',
      evidence: {},
      alternatives: [],
      confidence: 'LOW',
      followUpQuestion: 'Review the problem with your teacher.',
      suggestedActivity: 'Concept review with physical manipulatives.',
      ruleId: 'PENDING',
    };

    // Store in Memory Cache
    memoryStore.responses.set(responseId, {
      id: responseId,
      studentId,
      questionId,
      assignmentId,
      answer,
      explanation,
      submittedAt: new Date().toISOString(),
    });
    memoryStore.diagnoses.set(responseId, diagnosisData);

    // Persist to Postgres if available
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

        if (mlResult.status === 'ok') {
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
        }
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
  if (process.env.DATABASE_URL && DiagnosisModel) {
    try {
      const diag = await DiagnosisModel.getByResponseId(responseId);
      if (diag) {
        return res.json({ ok: true, report: diag });
      }
    } catch (err) {
      console.warn('DB report query error:', err.message);
    }
  }

  // Memory store fallback
  const cached = memoryStore.diagnoses.get(responseId);
  if (cached) {
    return res.json({ ok: true, report: cached });
  }

  res.status(404).json({ ok: false, error: 'Report not found' });
});

// 5. Get Teacher Dashboard Summary
app.get('/api/dashboard', async (req, res) => {
  let teacherName = 'Ms. Sharma';
  let schoolName = 'Kendriya Vidyalaya';
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
      }
    } catch (e) {}
  }

  let students = memoryStore.students;

  if (process.env.DATABASE_URL && StudentModel) {
    try {
      const dbStudents = await StudentModel.getAll();
      if (dbStudents && dbStudents.length > 0) {
        students = dbStudents.map((s, idx) => ({
          id: s.id,
          name: s.displayName,
          grade: s.classLabel,
          progress: 70 + (idx * 5) % 25,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.displayName.split(' ')[0]}`,
        }));
      }
    } catch (err) {
      console.warn('DB student query skipped:', err.message);
    }
  }

  res.json({
    ok: true,
    teacher: {
      name: teacherName,
      greeting: 'Good Morning',
      schoolName,
      classCode,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${teacherName.split(' ')[0]}`,
    },
    stats: memoryStore.stats,
    students,
  });
});

// 6. Teacher Bot Chat Routes (Feature Flag Protected)
try {
  const chatRoutes = require('./chat/chatRoutes');
  app.use('/chat', chatRoutes);
} catch (err) {
  console.warn('Chat routes not loaded:', err.message);
}

// 7. Authentication Routes (Teachers & Students)
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
