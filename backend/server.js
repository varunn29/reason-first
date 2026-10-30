require('dotenv').config();
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
  students: [
    { id: 'student_rahul', displayName: 'Rahul Kumar', classLabel: 'Grade 3 - Section A', progress: 78, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul' },
    { id: 'student_priya', displayName: 'Priya Singh', classLabel: 'Grade 3 - Section A', progress: 64, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Priya' },
    { id: 'student_aarav', displayName: 'Aarav Patel', classLabel: 'Grade 3 - Section B', progress: 52, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aarav' },
    { id: 'student_sneha', displayName: 'Sneha Yadav', classLabel: 'Grade 3 - Section B', progress: 88, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sneha' },
    { id: 'student_rohan', displayName: 'Rohan Gupta', classLabel: 'Grade 3 - Section A', progress: 71, avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rohan' },
  ],
  stats: [
    { id: 1, label: 'Total Students', value: 24, icon: 'Users', bgColor: 'bg-blue-50', iconColor: 'text-blue-500' },
    { id: 2, label: 'Pending Reviews', value: 4, icon: 'Clock', bgColor: 'bg-orange-50', iconColor: 'text-orange-500' },
    { id: 3, label: 'Total Assignments', value: 1, icon: 'BookOpen', bgColor: 'bg-purple-50', iconColor: 'text-purple-500' },
  ]
};

// Seed realistic initial student diagnostic responses so teacher dashboard shows real data for all students
function seedInitialStudentReports() {
  const seeds = [
    {
      studentId: 'student_rahul',
      responseId: 'resp_rahul_01',
      questionId: 'probe_01',
      questionText: '61 - 24 = ?',
      answer: 43,
      correctAnswer: 37,
      status: 'Fail',
      ruleId: 'SMALLER_FROM_LARGER',
      observations: 'Answer 43 on 61 - 24 matches Smaller-From-Larger error: student subtracted 4 - 1 = 3 in ones without regrouping.',
      evidence: { observed: 43, expected: 37, signature: 'SMALLER_FROM_LARGER' },
      alternatives: ['Bottom-to-top reading reversal', 'Arithmetic calculation slip'],
      confidence: 'HIGH',
      followUpQuestion: 'Can you show how you solved the ones column in 61 - 24?',
      suggestedActivity: 'Tens-and-Ones Bundling Mat: unbundle 1 ten into 10 loose units before subtracting.',
    },
    {
      studentId: 'student_priya',
      responseId: 'resp_priya_01',
      questionId: 'probe_01',
      questionText: '61 - 24 = ?',
      answer: 47,
      correctAnswer: 37,
      status: 'Fail',
      ruleId: 'BORROW_WITHOUT_DECREMENT',
      observations: 'Answer 47 on 61 - 24 matches Borrow-Without-Decrement: student added 10 to ones column, but forgot to reduce the tens column.',
      evidence: { observed: 47, expected: 37, signature: 'BORROW_WITHOUT_DECREMENT' },
      alternatives: ['Forgot to record crossing-out on tens', 'Arithmetic recall slip in tens column'],
      confidence: 'HIGH',
      followUpQuestion: 'Look at the tens digit after borrowing. What happened to it?',
      suggestedActivity: "The Banker's Exchange: cross out and reduce the tens digit before taking 10 ones.",
    },
    {
      studentId: 'student_aarav',
      responseId: 'resp_aarav_01',
      questionId: 'probe_02',
      questionText: '72 - 38 = ?',
      answer: 46,
      correctAnswer: 34,
      status: 'Fail',
      ruleId: 'SMALLER_FROM_LARGER',
      observations: 'Answer 46 on 72 - 38 matches Smaller-From-Larger error: student subtracted 8 - 2 = 6 in ones column without unbundling.',
      evidence: { observed: 46, expected: 34, signature: 'SMALLER_FROM_LARGER' },
      alternatives: ['Digit inversion', 'Calculation slip'],
      confidence: 'HIGH',
      followUpQuestion: 'Can you explain step-by-step how you calculated 2 - 8 in the ones column?',
      suggestedActivity: 'Base-10 manipulative exchange practice with subtraction story problems.',
    },
    {
      studentId: 'student_sneha',
      responseId: 'resp_sneha_01',
      questionId: 'probe_01',
      questionText: '61 - 24 = ?',
      answer: 37,
      correctAnswer: 37,
      status: 'Pass',
      ruleId: 'CORRECT',
      observations: 'Answer 37 is correct for 61 - 24. Student demonstrated mastery of place value regrouping.',
      evidence: { observed: 37, expected: 37, is_correct: true },
      alternatives: [],
      confidence: 'HIGH',
      followUpQuestion: 'Explain the strategy you used to solve this problem.',
      suggestedActivity: 'Advance to 3-digit subtraction and two-step arithmetic word problems.',
    },
    {
      studentId: 'student_rohan',
      responseId: 'resp_rohan_01',
      questionId: 'probe_01',
      questionText: '61 - 24 = ?',
      answer: 35,
      correctAnswer: 37,
      status: 'Fail',
      ruleId: 'GENERAL_SUBTRACTION_ERROR',
      observations: 'Answer 35 on 61 - 24 is incorrect (expected 37). Likely a mental arithmetic calculation slip.',
      evidence: { observed: 35, expected: 37, is_correct: false },
      alternatives: ['Calculation slip', 'Recall error'],
      confidence: 'MEDIUM',
      followUpQuestion: 'Walk me through how you subtracted each column.',
      suggestedActivity: 'Column subtraction review with open number lines.',
    },
  ];

  for (const s of seeds) {
    memoryStore.responses.set(s.responseId, {
      id: s.responseId,
      studentId: s.studentId,
      questionId: s.questionId,
      questionText: s.questionText,
      assignmentId: 'asgn_class3_subtraction',
      answer: s.answer,
      correctAnswer: s.correctAnswer,
      explanation: '',
      submittedAt: new Date(Date.now() - 3600000).toISOString(),
    });

    memoryStore.diagnoses.set(s.responseId, {
      status: s.status,
      observations: s.observations,
      evidence: s.evidence,
      alternatives: s.alternatives,
      confidence: s.confidence,
      followUpQuestion: s.followUpQuestion,
      suggestedActivity: s.suggestedActivity,
      ruleId: s.ruleId,
    });
  }
}
seedInitialStudentReports();

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
      studentId = 'student_rahul',
      questionId = 'probe_01',
      questionText = '',
      assignmentId = 'asgn_class3_subtraction',
      answer,
      correctAnswer = null,
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

    const isPass = correctAnswer !== null ? Number(answer) === Number(correctAnswer) : false;

    const diagnosisData = mlResult.status === 'ok' ? mlResult.diagnosis : {
      status: isPass ? 'Pass' : 'Fail',
      observations: isPass
        ? 'No immediate gap detected. Student demonstrated mastery of place value regrouping.'
        : `Student response ${answer} indicates a need for place value review.`,
      evidence: { observed: answer, expected: correctAnswer, is_correct: isPass },
      alternatives: ['Calculation slip'],
      confidence: 'MEDIUM',
      followUpQuestion: 'Can you explain the strategy you used to solve this problem?',
      suggestedActivity: isPass
        ? 'Advance to 3-digit subtraction problems.'
        : 'Practice regrouping with base-10 manipulatives.',
      ruleId: isPass ? 'CORRECT' : 'BORROW_WITHOUT_DECREMENT',
    };

    // Store in Memory Cache
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
    const resp = memoryStore.responses.get(responseId) || {};
    const override = memoryStore.overrides.get(responseId) || null;
    return res.json({
      ok: true,
      report: {
        ...cached,
        response: resp,
        override,
      }
    });
  }

  res.status(404).json({ ok: false, error: 'Report not found' });
});

// 5. Get Diagnosis Report by Student ID (Returns student's latest submission & diagnosis)
app.get('/api/reports/student/:studentId', async (req, res) => {
  const { studentId } = req.params;

  // Find latest response for this student
  let latestResponse = null;
  for (const resp of memoryStore.responses.values()) {
    if (resp.studentId === studentId || resp.studentId.includes(studentId)) {
      if (!latestResponse || new Date(resp.submittedAt) > new Date(latestResponse.submittedAt)) {
        latestResponse = resp;
      }
    }
  }

  // Find student metadata
  const student = memoryStore.students.find(s => s.id === studentId || s.id.includes(studentId)) || {
    id: studentId,
    displayName: 'Student',
    classLabel: 'Grade 3 - Section A',
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

  // Default fallback if no submission yet
  res.json({
    ok: true,
    student,
    response: {
      id: 'default_resp',
      questionId: 'probe_01',
      questionText: '61 - 24 = ?',
      answer: 43,
      correctAnswer: 37,
      submittedAt: new Date().toISOString(),
    },
    report: {
      status: 'Fail',
      observations: 'Answer 43 on 61 - 24 matches Smaller-From-Larger error: student subtracted smaller digit from larger digit (4 - 1 = 3) without regrouping.',
      evidence: { observed: 43, expected: 37, signature: 'SMALLER_FROM_LARGER' },
      alternatives: ['Bottom-to-top reading reversal', 'Arithmetic calculation slip'],
      confidence: 'HIGH',
      followUpQuestion: 'Can you show how you solved the ones column in 61 - 24?',
      suggestedActivity: 'Tens-and-Ones Bundling Mat: unbundle 1 ten into 10 loose units before subtracting.',
      ruleId: 'SMALLER_FROM_LARGER',
    },
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

    // Decrement pending reviews if greater than 0
    const pendingStat = memoryStore.stats.find(s => s.id === 2);
    if (pendingStat && pendingStat.value > 0) {
      pendingStat.value -= 1;
    }

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

    // Increment Total Assignments stat
    const assignStat = memoryStore.stats.find(s => s.id === 3);
    if (assignStat) {
      assignStat.value = memoryStore.assignments.length;
    }

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

// 9. Get Teacher Dashboard Summary
app.get('/api/dashboard', async (req, res) => {
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
      name: 'Ms. Sharma',
      greeting: 'Good Morning',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sharma',
    },
    stats: memoryStore.stats,
    students,
    activeAssignment: memoryStore.assignments[0] || null,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});
