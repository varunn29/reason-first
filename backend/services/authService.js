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
// Pre-seed Demo Accounts (runs synchronously in memory & checks DB)
// ---------------------------------------------------------------------------
const DEMO_TEACHER = {
  id: 'teacher_demo_01',
  name: 'Ms. Sharma',
  email: 'teacher@demo.com',
  passwordHash: hashPassword('password123'),
  schoolName: 'Kendriya Vidyalaya',
  createdAt: new Date().toISOString(),
};

const DEMO_CLASSROOM = {
  id: 'class_demo_01',
  teacherId: 'teacher_demo_01',
  name: 'Class 3 - Section A',
  classCode: '3A',
  grade: 'Grade 3 - Section A',
  teacherName: 'Ms. Sharma',
  schoolName: 'Kendriya Vidyalaya',
  createdAt: new Date().toISOString(),
};

inMemory.teachers.set(DEMO_TEACHER.email.toLowerCase(), DEMO_TEACHER);
inMemory.classrooms.set(DEMO_CLASSROOM.classCode.toUpperCase(), DEMO_CLASSROOM);

// Try running DB migration on boot if DB is configured
async function initDatabase() {
  if (!process.env.DATABASE_URL) return;
  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', '002_auth_tables.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(sql);
      // Ensure demo teacher exists in DB
      await pool.query(
        `INSERT INTO teachers (id, name, email, password_hash, school_name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING`,
        [DEMO_TEACHER.id, DEMO_TEACHER.name, DEMO_TEACHER.email, DEMO_TEACHER.passwordHash, DEMO_TEACHER.schoolName]
      );
      // Ensure demo classroom exists in DB
      await pool.query(
        `INSERT INTO classrooms (id, teacher_id, name, class_code, grade)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (class_code) DO NOTHING`,
        [DEMO_CLASSROOM.id, DEMO_CLASSROOM.teacherId, DEMO_CLASSROOM.name, DEMO_CLASSROOM.classCode, DEMO_CLASSROOM.grade]
      );
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
async function registerTeacher({ name, email, password, schoolName = 'Kendriya Vidyalaya' }) {
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
    schoolName: schoolName.trim() || 'Kendriya Vidyalaya',
    createdAt: new Date().toISOString(),
  };

  // Create default classroom for this teacher
  const classCode = 'C' + Math.floor(100 + Math.random() * 900); // e.g. C345
  const classroomId = 'class_' + crypto.randomUUID().slice(0, 8);
  const newClassroom = {
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
      await ClassroomModel.create({
        id: classroomId,
        teacherId,
        name: newClassroom.name,
        classCode,
        grade: newClassroom.grade,
      });
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

  const classCode = classroom ? classroom.classCode : '3A';

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
      schoolName: teacher.schoolName || 'Kendriya Vidyalaya',
      role: 'teacher',
      classCode,
    },
    classroom: classroom || DEMO_CLASSROOM,
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

  // Special match for default code "3A" or "GRADE3A"
  if (cleanCode === '3A' || cleanCode === 'GRADE3A') {
    return DEMO_CLASSROOM;
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
  const classLabel = classroom.name || `Grade ${classroom.grade || 3} - Section ${classroom.classCode || '3A'}`;

  // Persist to Postgres students table if connected
  if (process.env.DATABASE_URL) {
    try {
      await pool.query(
        `INSERT INTO students (id, display_name, class_label)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, class_label = EXCLUDED.class_label`,
        [studentId, cleanName, classLabel]
      );
    } catch (e) {
      console.warn('DB student upsert skipped in loginStudent:', e.message);
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
      teacherName: classroom.teacherName || 'Ms. Sharma',
      role: 'student',
    },
    classroom,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  registerTeacher,
  loginTeacher,
  getTeacherById,
  getClassroom,
  loginStudent,
  DEMO_TEACHER,
  DEMO_CLASSROOM,
};
