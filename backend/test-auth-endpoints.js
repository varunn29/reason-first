// test-auth-endpoints.js
// End-to-end HTTP integration tests for Teacher & Student Auth routes.

const http = require('http');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Mount dashboard route to test token personalization
const authService = require('./services/authService');
app.get('/api/dashboard', async (req, res) => {
  let teacherName = 'Ms. Sharma';
  let schoolName = 'Kendriya Vidyalaya';
  let classCode = '3A';

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
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

  res.json({
    ok: true,
    teacher: {
      name: teacherName,
      schoolName,
      classCode,
    },
  });
});

async function runHttpTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(4099, resolve));
  const baseUrl = 'http://localhost:4099';

  console.log('🌐 Server running on test port 4099. Running Auth API tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failed++;
    }
  }

  try {
    // 1. Teacher Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@demo.com', password: 'password123' }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.ok && loginData.token, 'POST /api/auth/login returns token for demo teacher');
    const teacherToken = loginData.token;

    // 2. Reject Bad Password
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@demo.com', password: 'incorrect' }),
    });
    assert(badLoginRes.status === 401, 'POST /api/auth/login rejects wrong password with HTTP 401');

    // 3. Register New Teacher
    const uniqueEmail = `teacher_${Date.now()}@edumail.com`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Radhika Sen',
        email: uniqueEmail,
        password: 'securePass123',
        schoolName: 'St. Xavier High School',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.ok && regData.user.name === 'Dr. Radhika Sen', 'POST /api/auth/register creates new teacher account');
    const newTeacherToken = regData.token;

    // 4. GET /api/auth/me with Bearer token
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${newTeacherToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user.name === 'Dr. Radhika Sen', 'GET /api/auth/me returns authenticated teacher profile');

    // 5. GET /api/dashboard with personalized teacher name
    const dashRes = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Authorization: `Bearer ${newTeacherToken}` },
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200 && dashData.teacher.name === 'Dr. Radhika Sen', 'GET /api/dashboard dynamically personalizes teacher name');

    // 6. Student Login with valid class code '3A'
    const studentRes = await fetch(`${baseUrl}/api/auth/student-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classCode: '3A', studentName: 'Sneha Patel' }),
    });
    const studentData = await studentRes.json();
    assert(studentRes.status === 200 && studentData.ok && studentData.user.name === 'Sneha Patel', 'POST /api/auth/student-login authenticates student by class code');

    // 7. Student Login with invalid class code
    const badStudentRes = await fetch(`${baseUrl}/api/auth/student-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classCode: 'WRONG_CODE_999', studentName: 'Test' }),
    });
    assert(badStudentRes.status === 404, 'POST /api/auth/student-login rejects invalid class code with HTTP 404');

    // 8. Lookup Classroom info
    const classRes = await fetch(`${baseUrl}/api/auth/classroom/3A`);
    const classData = await classRes.json();
    assert(classRes.status === 200 && classData.ok && classData.classroom.classCode === '3A', 'GET /api/auth/classroom/:code returns classroom details');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    console.log(`\n========================================`);
    console.log(`HTTP Auth Endpoint Tests: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);
    if (failed > 0) process.exit(1);
  }
}

runHttpTests();

