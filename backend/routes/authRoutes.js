// routes/authRoutes.js
// Express API routes for Teacher & Student authentication.

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// 1. Teacher Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, schoolName } = req.body;
    const result = await authService.registerTeacher({
      name,
      email,
      password,
      schoolName,
    });
    res.status(201).json({
      ok: true,
      token: result.token,
      user: result.user,
      classroom: result.classroom,
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err.message,
    });
  }
});

// 2. Teacher Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginTeacher(email, password);
    res.json({
      ok: true,
      token: result.token,
      user: result.user,
      classroom: result.classroom,
    });
  } catch (err) {
    res.status(401).json({
      ok: false,
      error: err.message,
    });
  }
});

// 3. Current Authenticated Profile (JWT verification)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Authorization header missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    const payload = authService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ ok: false, error: 'Session expired or invalid token' });
    }

    // If teacher, fetch fresh details and classroom
    if (payload.role === 'teacher') {
      const teacher = await authService.getTeacherById(payload.id);
      let classroom = null;
      if (process.env.DATABASE_URL) {
        try {
          const ClassroomModel = require('../models/Classroom');
          const classes = await ClassroomModel.getByTeacherId(payload.id);
          if (classes && classes.length > 0) {
            classroom = classes[0];
          }
        } catch (e) {}
      }

      return res.json({
        ok: true,
        user: {
          id: payload.id,
          name: teacher ? teacher.name : payload.name,
          email: teacher ? teacher.email : payload.email,
          schoolName: teacher ? (teacher.schoolName || '') : '',
          role: 'teacher',
          classCode: classroom ? classroom.classCode : undefined,
        },
        classroom: classroom || null,
      });
    }

    // Student session
    res.json({
      ok: true,
      user: payload,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 4. Student Class Code Login (Child-friendly, no password)
router.post('/student-login', async (req, res) => {
  try {
    const { classCode, studentName } = req.body;
    const result = await authService.loginStudent({ classCode, studentName });
    res.json({
      ok: true,
      token: result.token,
      user: result.user,
      classroom: result.classroom,
    });
  } catch (err) {
    res.status(404).json({
      ok: false,
      error: err.message,
    });
  }
});

// 5. Look up Classroom Info by Class Code
router.get('/classroom/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const classroom = await authService.getClassroom(code);
    if (!classroom) {
      return res.status(404).json({ ok: false, error: 'Classroom not found' });
    }
    res.json({ ok: true, classroom });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 6. Teacher Change Password
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    const payload = authService.verifyToken(token);
    if (!payload || payload.role !== 'teacher') {
      return res.status(401).json({ ok: false, error: 'Unauthorized. Teachers only.' });
    }

    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(payload.id, currentPassword, newPassword);

    res.json({
      ok: true,
      message: 'Password successfully changed.',
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err.message,
    });
  }
});

module.exports = router;
