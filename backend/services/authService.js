// services/authService.js
// Production-grade authentication service for Teachers and Students.
// Zero external dependencies: uses Node.js standard library 'crypto'.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
let TeacherModel = null;
let ClassroomModel = null;

try {
  TeacherModel = require('../models/Teacher');
  ClassroomModel = require('../models/Classroom');
} catch (err) {
  console.warn('Teacher/Classroom models not loaded:', err.message);
}

const AUTH_SECRET = process.env.AUTH_SECRET || 'reason-first-secret-key-salt-2026';

// ---------------------------------------------------------------------------
// In-Memory Dev/Fallback Store
// ---------------------------------------------------------------------------
const inMemory = {
  teachers: new Map(),
  classrooms: new Map(),
};

// ---------------------------------------------------------------------------
// Crypto Utilities (Scrypt password hashing + HMAC-SHA256 Token)
// ---------------------------------------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  try {
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedBuffer = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
  } catch (err) {
    return false;
  }
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function generateToken(payload, expiresInSeconds = 7 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${headerB64}.${payloadB64}`;

  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const dataToSign = `${headerB64}.${payloadB64}`;

  const expectedSig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Unique Join Code Generator (e.g. "C505", checks DB & Memory for collisions)
// ---------------------------------------------------------------------------
async function generateUniqueClassCode() {
  for (let attempt = 0; attempt < 25; attempt++) {
    const num = Math.floor(100 + Math.random() * 900); // 100-999
    const candidate = `C${num}`;

    // Check DB for existing classroom code
    if (process.env.DATABASE_URL && ClassroomModel) {
      try {
        const existing = await ClassroomModel.getByCode(candidate);
        if (existing) continue; // Collision, try next number
      } catch (err) {}
    }

    // Check in-memory store
    if (inMemory.classrooms.has(candidate)) {
      continue;
    }

    return candidate;
  }

  // Fallback to 4 digits if 3-digit space encounters high density
  return 'C' + Math.floor(1000 + Math.random() * 9000);
}

// ---------------------------------------------------------------------------
// DB Migration on boot if DB is configured
// ---------------------------------------------------------------------------
async function initDatabase() {
  if (!process.env.DATABASE_URL) return;
  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', '002_auth_tables.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(sql);
    }
  } catch (err) {
    console.warn('DB auth tables initialization skipped or failed:', err.message);
  }
}

// Fire async DB init (non-blocking)
initDatabase().catch(() => {});

// ---------------------------------------------------------------------------
// Teacher Auth Methods
// ---------------------------------------------------------------------------
async function registerTeacher({ name, email, password, schoolName = 'Primary School' }) {
  if (!email || !password || !name) {
    throw new Error('Name, email, and password are required.');
  }

  const cleanEmail = email.toLowerCase().trim();
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // Check if teacher exists in DB or in-memory
  if (process.env.DATABASE_URL && TeacherModel) {
    try {
      const existing = await TeacherModel.getByEmail(cleanEmail);
      if (existing) {
        throw new Error('An account with this email already exists.');
      }
    } catch (err) {
      if (err.message.includes('already exists')) throw err;
    }
  }

  if (inMemory.teachers.has(cleanEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const teacherId = 'teacher_' + crypto.randomUUID().slice(0, 8);
  const passwordHash = hashPassword(password);
  const newTeacher = {
    id: teacherId,
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
    schoolName: schoolName.trim() || 'Primary School',
    createdAt: new Date().toISOString(),
  };

  // Generate verified collision-free join code
  let classCode = await generateUniqueClassCode();
  const classroomId = 'class_' + crypto.randomUUID().slice(0, 8);
  let newClassroom = {
    id: classroomId,
    teacherId,
    name: `${newTeacher.name}'s Math Class`,
    classCode,
    grade: 'Grade 3 - Section A',
    teacherName: newTeacher.name,
    schoolName: newTeacher.schoolName,
    createdAt: new Date().toISOString(),
  };

  // Save to DB if available
  if (process.env.DATABASE_URL && TeacherModel && ClassroomModel) {
    try {
      await TeacherModel.create({
        id: teacherId,
        name: newTeacher.name,
        email: cleanEmail,
        passwordHash,
        schoolName: newTeacher.schoolName,
      });

      let createdClass = await ClassroomModel.create({
        id: classroomId,
        teacherId,
        name: newClassroom.name,
        classCode,
        grade: newClassroom.grade,
      });

      // Handle race condition: if unique constraint triggered, re-roll code
      if (!createdClass) {
        classCode = await generateUniqueClassCode();
        newClassroom.classCode = classCode;
        createdClass = await ClassroomModel.create({
          id: classroomId,
          teacherId,
          name: newClassroom.name,
          classCode,
          grade: newClassroom.grade,
        });
      }
    } catch (dbErr) {
      console.warn('DB save for registered teacher failed, fallback to memory:', dbErr.message);
    }
  }

  // Always store in memory store as fallback
  inMemory.teachers.set(cleanEmail, newTeacher);
  inMemory.classrooms.set(classCode.toUpperCase(), newClassroom);

  const token = generateToken({
    id: teacherId,
    email: cleanEmail,
    name: newTeacher.name,
    role: 'teacher',
  });

  return {
    token,
    user: {
      id: teacherId,
      name: newTeacher.name,
      email: cleanEmail,
      schoolName: newTeacher.schoolName,
      role: 'teacher',
      classCode,
    },
    classroom: newClassroom,
  };
}

async function loginTeacher(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const cleanEmail = email.toLowerCase().trim();
  let teacher = null;

  // Try DB first
  if (process.env.DATABASE_URL && TeacherModel) {
    try {
      teacher = await TeacherModel.getByEmail(cleanEmail);
    } catch (err) {
      console.warn('DB error during login, falling back to memory store:', err.message);
    }
  }

  // Memory fallback
  if (!teacher && inMemory.teachers.has(cleanEmail)) {
    teacher = inMemory.teachers.get(cleanEmail);
  }

  if (!teacher) {
    throw new Error('Invalid email or password.');
  }

  const valid = verifyPassword(password, teacher.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password.');
  }

  // Fetch teacher classroom
  let classroom = null;
  if (process.env.DATABASE_URL && ClassroomModel) {
    try {
      const classes = await ClassroomModel.getByTeacherId(teacher.id);
      if (classes && classes.length > 0) {
        classroom = classes[0];
      }
    } catch (e) {}
  }

  if (!classroom) {
    // Look up in memory
    for (const cls of inMemory.classrooms.values()) {
      if (cls.teacherId === teacher.id) {
        classroom = cls;
        break;
      }
    }
  }

  const classCode = classroom ? classroom.classCode : null;

  const token = generateToken({
    id: teacher.id,
    email: teacher.email,
    name: teacher.name,
    role: 'teacher',
  });

  return {
    token,
    user: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      schoolName: teacher.schoolName || '',
      role: 'teacher',
      classCode,
    },
    classroom: classroom || null,
  };
}

async function getTeacherById(id) {
  if (!id) return null;

  if (process.env.DATABASE_URL && TeacherModel) {
    try {
      const t = await TeacherModel.getById(id);
      if (t) {
        const { passwordHash, ...safeTeacher } = t;
        return safeTeacher;
      }
    } catch (e) {}
  }

  for (const t of inMemory.teachers.values()) {
    if (t.id === id) {
      const { passwordHash, ...safeTeacher } = t;
      return safeTeacher;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Student Login Methods (Class Code + Student Name)
// ---------------------------------------------------------------------------
async function getClassroom(classCode) {
  if (!classCode) return null;
  const cleanCode = classCode.toUpperCase().trim();

  // Try DB
  if (process.env.DATABASE_URL && ClassroomModel) {
    try {
      const cls = await ClassroomModel.getByCode(cleanCode);
      if (cls) return cls;
    } catch (e) {}
  }

  // Memory fallback
  if (inMemory.classrooms.has(cleanCode)) {
    return inMemory.classrooms.get(cleanCode);
  }

  return null;
}

async function loginStudent({ classCode, studentName = 'Student' }) {
  if (!classCode) {
    throw new Error('Class code is required.');
  }

  const classroom = await getClassroom(classCode);
  if (!classroom) {
    throw new Error(`Class code "${classCode.toUpperCase().trim()}" not found. Please check with your teacher.`);
  }

  const cleanName = (studentName || 'Student').trim();
  const baseSlug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const studentId = 'student_' + (baseSlug || 'user');
  const classLabel = classroom.name || `Grade ${classroom.grade || 3} - Section ${classroom.classCode || ''}`;

  // Persist to Postgres students table with class_code and classroom_id
  if (process.env.DATABASE_URL) {
    try {
      await pool.query(
        `INSERT INTO students (id, display_name, class_label, class_code, classroom_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET 
           display_name = EXCLUDED.display_name, 
           class_label = EXCLUDED.class_label,
           class_code = EXCLUDED.class_code,
           classroom_id = EXCLUDED.classroom_id`,
        [studentId, cleanName, classLabel, classroom.classCode, classroom.id]
      );
    } catch (e) {
      // Fallback for earlier schema if migration has not run yet
      try {
        await pool.query(
          `INSERT INTO students (id, display_name, class_label)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, class_label = EXCLUDED.class_label`,
          [studentId, cleanName, classLabel]
        );
      } catch (fallbackErr) {
        console.warn('DB student upsert skipped in loginStudent:', fallbackErr.message);
      }
    }
  }

  const token = generateToken({
    id: studentId,
    name: cleanName,
    classCode: classroom.classCode,
    classroomId: classroom.id,
    role: 'student',
  }, 24 * 3600); // 24-hour token for student session

  return {
    token,
    user: {
      id: studentId,
      name: cleanName,
      classCode: classroom.classCode,
      className: classroom.name,
      grade: classroom.grade,
      teacherName: classroom.teacherName || 'Teacher',
      role: 'student',
    },
    classroom,
  };
}

async function changePassword(teacherId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword) {
    throw new Error('Current and new password are required.');
  }
  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  let teacher = null;
  if (process.env.DATABASE_URL && TeacherModel) {
    try {
      teacher = await TeacherModel.getById(teacherId);
    } catch (err) {
      console.warn('DB error fetching teacher for password change:', err.message);
    }
  }

  if (!teacher) {
    for (const t of inMemory.teachers.values()) {
      if (t.id === teacherId) {
        teacher = t;
        break;
      }
    }
  }

  if (!teacher) {
    throw new Error('Teacher account not found.');
  }

  if (!verifyPassword(currentPassword, teacher.passwordHash)) {
    throw new Error('Current password is incorrect.');
  }

  const newHash = hashPassword(newPassword);

  if (process.env.DATABASE_URL && TeacherModel && TeacherModel.updatePassword) {
    try {
      await TeacherModel.updatePassword(teacherId, newHash);
    } catch (err) {
      console.warn('DB error updating password:', err.message);
    }
  }

  teacher.passwordHash = newHash;
  return true;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateUniqueClassCode,
  registerTeacher,
  loginTeacher,
  getTeacherById,
  getClassroom,
  loginStudent,
  changePassword,
};
