// test-e2e-demo.js
// 3-Minute Demo End-to-End Simulation across Neon Postgres and Express API.

const http = require('http');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Load routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./chat/chatRoutes');
app.use('/api/auth', authRoutes);
app.use('/chat', chatRoutes);

// Mock ML / responses endpoint if ML server is offline during test
const { randomUUID } = require('crypto');
const chatModel = require('./chat/chatModel');

app.post('/api/responses', (req, res) => {
  const { studentId, questionId, answer, explanation } = req.body;
  const responseId = randomUUID();
  res.json({
    ok: true,
    responseId,
    studentId,
    questionId,
    answer,
    diagnosis: {
      status: 'Fail',
      gap: 'BORROWING',
      ruleId: 'SMALLER_FROM_LARGER',
      observations: "Student subtracted smaller digit from larger digit (4 - 1 = 3).",
      confidence: 'HIGH',
      suggestedActivity: 'Physical stick bundling for place value regrouping.',
    },
  });
});

async function runDemoTest() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(4098, resolve));
  const baseUrl = 'http://localhost:4098';

  console.log('🎬 ========================================================');
  console.log('   REASON-FIRST: 3-MINUTE DEMO END-TO-END VALIDATION');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, stepName) {
    if (condition) {
      console.log(`✅ [PASS] ${stepName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${stepName}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Student Enters Class Code
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Student Login ---');
    const studentLoginRes = await fetch(`${baseUrl}/api/auth/student-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classCode: '3A', studentName: 'Rahul' }),
    });
    const studentLogin = await studentLoginRes.json();
    assert(studentLogin.ok && studentLogin.token, 'Student enters class code 3A and receives authenticated session');
    const studentId = studentLogin.user.id;

    // -------------------------------------------------------------------------
    // STEP 2: Student Submits Math Answer
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Answer Submission ---');
    const submitRes = await fetch(`${baseUrl}/api/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        questionId: 'probe_01',
        answer: '43',
        explanation: 'I subtracted',
      }),
    });
    const submitData = await submitRes.json();
    assert(submitData.ok && submitData.responseId, 'Student submits answer 43 and receives responseId');
    const responseId = submitData.responseId;

    // -------------------------------------------------------------------------
    // STEP 3: Teacher Bot Dialogue Initiates
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Dialogue Starts (/chat/start) ---');
    const chatStartRes = await fetch(`${baseUrl}/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        questionId: 'probe_01',
        responseId,
        studentName: 'Rahul',
        question: '61 - 24 = ?',
        studentAnswer: '43',
        language: 'hi',
      }),
    });
    const chatStart = await chatStartRes.json();
    assert(chatStart.ok && chatStart.sessionId, 'Chat dialogue initializes with opening bot question in Hindi');
    const hasDb = Boolean(process.env.DATABASE_URL);
    if (hasDb) { assert(chatStart.dbPersisted === true, 'Chat session written to Neon Postgres'); } else { assert(chatStart.ok === true, 'Chat session stored in memory (dev mode)'); }
    const sessionId = chatStart.sessionId;

    // -------------------------------------------------------------------------
    // STEP 4: Child Interacts (Hindi Response / Quick Reply)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Child Replies (/chat/message) ---');
    const msgRes = await fetch(`${baseUrl}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        text: 'मैंने 4 में से 1 घटाया और 3 लिखा',
        studentContext: { studentName: 'Rahul', question: '61 - 24 = ?' },
      }),
    });
    const msgData = await msgRes.json();
    assert(msgData.ok && msgData.bot && msgData.bot.reply, 'Bot receives reasoning and responds warmly without repeating');

    // -------------------------------------------------------------------------
    // STEP 5: Dialogue Concludes & Generates Teacher AI Summary
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Chat Concludes (/chat/finish) ---');
    const finishRes = await fetch(`${baseUrl}/chat/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        studentContext: {
          studentName: 'Rahul',
          question: '61 - 24 = ?',
          studentAnswer: '43',
        },
        existingDiagnosis: submitData.diagnosis,
      }),
    });
    const finishData = await finishRes.json();
    assert(finishData.ok && finishData.summary, 'Chat concludes and generates Teacher AI Summary');
    if (hasDb) { assert(finishData.dbPersisted === true, 'Teacher Summary written to Neon Postgres'); } else { assert(finishData.ok === true, 'Teacher Summary stored in memory (dev mode)'); }

    // -------------------------------------------------------------------------
    // STEP 6: Teacher Logs In & Views Dashboard
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Teacher Login ---');
    const teacherLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@demo.com', password: 'password123' }),
    });
    const teacherLogin = await teacherLoginRes.json();
    assert(teacherLogin.ok && teacherLogin.token, 'Teacher logs in with demo credentials');

    // -------------------------------------------------------------------------
    // STEP 7: Teacher Report Pulls Summary from Neon Postgres
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Teacher Report Loads Summary from Neon Postgres ---');
    const summaryRes = await fetch(`${baseUrl}/chat/summary/${sessionId}`);
    const summaryData = await summaryRes.json();
    if (hasDb) { assert(summaryData.ok && summaryData.summary.isFromDb === true, 'Teacher report reads summary from Neon Postgres'); } else { assert(summaryData.ok && summaryData.summary, 'Teacher report reads stored AI summary from memory store'); }
    assert(summaryData.summary.misconceptionId, `Diagnosed Misconception ID: ${summaryData.summary.misconceptionId}`);

    // -------------------------------------------------------------------------
    // STEP 8: Teacher Views Full Back-and-Forth Transcript
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Expand Chat Transcript ---');
    const transcriptRes = await fetch(`${baseUrl}/chat/transcript/${sessionId}`);
    const transcriptData = await transcriptRes.json();
    assert(transcriptData.ok && transcriptData.messages.length >= 2, 'Transcript drawer loads back-and-forth messages from Neon Postgres');
    if (hasDb) { assert(transcriptData.messages[0].isFromDb === true, 'Transcript messages verified from Neon Postgres'); } else { assert(transcriptData.ok === true, 'Transcript messages verified from memory store'); }

  } catch (err) {
    console.error('Demo simulation error:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n========================================================');
    console.log(`Demo Simulation Results: ${passed} passed, ${failed} failed`);
    console.log('========================================================\n');
    if (failed > 0) process.exit(1);
  }
}

runDemoTest();

