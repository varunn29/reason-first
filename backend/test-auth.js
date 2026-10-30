// test-auth.js
// Verification script for Teacher & Student authentication service.

const authService = require('./services/authService');

async function runTests() {
  console.log('🧪 Starting Authentication Service Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Demo Teacher Login
  try {
    const res = await authService.loginTeacher('teacher@demo.com', 'password123');
    assert(res.token && res.user.email === 'teacher@demo.com', 'Demo teacher login with valid credentials');
    assert(res.user.role === 'teacher', 'Teacher role is assigned correctly');
  } catch (err) {
    assert(false, `Demo teacher login failed: ${err.message}`);
  }

  // 2. Reject Wrong Password
  try {
    await authService.loginTeacher('teacher@demo.com', 'wrongpassword');
    assert(false, 'Should reject invalid teacher password');
  } catch (err) {
    assert(err.message.includes('Invalid email or password'), 'Rejects invalid teacher password correctly');
  }

  // 3. Register New Teacher
  const testEmail = `newteacher_${Date.now()}@school.org`;
  try {
    const regRes = await authService.registerTeacher({
      name: 'Ravi Kumar',
      email: testEmail,
      password: 'mypassword123',
      schoolName: 'Delhi Public School',
    });
    assert(regRes.token && regRes.user.name === 'Ravi Kumar', 'Registers new teacher successfully');
    assert(regRes.classroom && regRes.classroom.classCode, 'Generates classroom code for registered teacher');

    // Login with new credentials
    const loginRes = await authService.loginTeacher(testEmail, 'mypassword123');
    assert(loginRes.user.name === 'Ravi Kumar', 'Logs in newly registered teacher');
  } catch (err) {
    assert(false, `Register new teacher failed: ${err.message}`);
  }

  // 4. Token Verification
  try {
    const token = authService.generateToken({ id: 'test_123', email: 'test@example.com', role: 'teacher' });
    const payload = authService.verifyToken(token);
    assert(payload && payload.id === 'test_123', 'HMAC Token generates and verifies accurately');
  } catch (err) {
    assert(false, `Token verification failed: ${err.message}`);
  }

  // 5. Student Login with Valid Class Code
  try {
    const studentRes = await authService.loginStudent({ classCode: '3A', studentName: 'Aarav' });
    assert(studentRes.token && studentRes.user.name === 'Aarav', 'Student login with valid class code');
    assert(studentRes.classroom.classCode === '3A', 'Student session binds to correct classroom');
  } catch (err) {
    assert(false, `Student login failed: ${err.message}`);
  }

  // 6. Student Login with Invalid Class Code
  try {
    await authService.loginStudent({ classCode: 'NONEXISTENT_999' });
    assert(false, 'Should reject non-existent class code');
  } catch (err) {
    assert(err.message.includes('not found'), 'Rejects non-existent class code correctly');
  }

  console.log(`\n========================================`);
  console.log(`Auth Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();

