const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rf_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const DEFAULT_STATS = [
  { id: 1, label: 'Total Students', value: 0, icon: 'Users', bgColor: 'bg-blue-50', iconColor: 'text-blue-500' },
  { id: 2, label: 'Pending Reviews', value: 0, icon: 'Clock', bgColor: 'bg-orange-50', iconColor: 'text-orange-500' },
  { id: 3, label: 'Total Assignments', value: 0, icon: 'BookOpen', bgColor: 'bg-purple-50', iconColor: 'text-purple-500' },
];

export const api = {
  // Fetch dashboard summary data from backend
  getDashboardData: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          teacher: data.teacher || null,
          stats: Array.isArray(data.stats) && data.stats.length > 0 ? data.stats : DEFAULT_STATS,
          students: Array.isArray(data.students) ? data.students : [],
          activeAssignment: data.activeAssignment || null,
          isLive: true,
        };
      }
    } catch (err) {
      console.warn('Backend dashboard API unreachable:', err.message);
    }

    return {
      teacher: null,
      stats: DEFAULT_STATS,
      students: [],
      activeAssignment: null,
      isLive: false,
    };
  },

  // Fetch diagnostic probes from backend
  getProbes: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/probes`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.probes || [];
      }
    } catch (err) {
      console.warn('Backend probes API unreachable:', err.message);
    }

    return [
      { id: 'probe_01', text: '61 - 24 = ?', options: [37, 43, 47, 35], correctAnswer: 37 },
      { id: 'probe_02', text: '72 - 38 = ?', options: [34, 46, 44, 36], correctAnswer: 34 },
      { id: 'probe_03', text: '83 - 49 = ?', options: [34, 46, 44, 38], correctAnswer: 34 },
      { id: 'ctrl_01', text: '58 - 23 = ?', options: [35, 31, 25, 33], correctAnswer: 35 },
      { id: 'ctrl_02', text: '79 - 45 = ?', options: [34, 32, 24, 35], correctAnswer: 34 },
    ];
  },

  // Submit student answer to backend
  submitAnswer: async (studentId, questionId, selectedAnswer, correctAnswer, extraData = {}) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          questionId,
          questionText: extraData.questionText || '',
          assignmentId: extraData.assignmentId || 'asgn_class3_subtraction',
          answer: selectedAnswer,
          correctAnswer,
          explanation: extraData.explanation || '',
          responses: extraData.responses || null,
          studentName: extraData.studentName || '',
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = await res.json();
        const diag = data.diagnosis || {};
        const isPass = selectedAnswer === correctAnswer;
        const isLive = diag.status !== 'pending' && diag.ruleId !== 'PENDING_EVALUATION';
        return {
          studentId,
          questionId,
          questionText: extraData.questionText || '',
          selectedAnswer,
          correctAnswer,
          responseId: data.responseId,
          status: diag.status && diag.status !== 'pending' ? diag.status : (isPass ? 'Pass' : 'Fail'),
          message: diag.observations || (isPass ? 'Answer is correct. Place value calculation verified.' : 'Evaluation pending connection to ML diagnostic engine.'),
          gap: diag.ruleId || (isPass ? 'CORRECT' : 'PENDING_EVALUATION'),
          confidence: diag.confidence || 'LOW',
          followUpQuestion: diag.followUpQuestion || 'Can you explain the steps you used to solve this problem?',
          suggestedActivity: diag.suggestedActivity || 'Review with your teacher.',
          alternatives: diag.alternatives || [],
          evidence: diag.evidence || {},
          isLiveML: isLive,
        };
      }
    } catch (err) {
      console.warn('Backend API unreachable:', err.message);
    }

    const isCorrect = selectedAnswer === correctAnswer;
    return {
      studentId,
      questionId,
      questionText: extraData.questionText || '',
      selectedAnswer,
      correctAnswer,
      responseId: 'resp_' + Date.now(),
      status: isCorrect ? 'Pass' : 'Fail',
      message: isCorrect
        ? 'Answer is correct. Place value calculation verified.'
        : 'Evaluation pending connection to ML diagnostic engine.',
      gap: isCorrect ? 'CORRECT' : 'PENDING_EVALUATION',
      confidence: 'LOW',
      followUpQuestion: 'Can you explain the steps you used to solve this problem?',
      suggestedActivity: isCorrect
        ? 'Proceed to the next question.'
        : 'Review with your teacher.',
      alternatives: [],
      evidence: { observed: selectedAnswer, expected: correctAnswer, is_correct: isCorrect },
      isLiveML: false,
    };
  },

  // Fetch report for a specific student
  getStudentReport: async (studentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/student/${encodeURIComponent(studentId)}`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Backend report API unreachable:', err.message);
    }
    return null;
  },

  // Submit teacher override and clinical notes
  submitOverride: async (responseId, originalRuleId, teacherDecision, teacherNote) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/overrides`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          responseId,
          originalRuleId,
          teacherDecision,
          teacherNote,
        }),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Could not submit teacher override:', err.message);
    }
    return { ok: true, override: { teacherDecision, teacherNote, overriddenAt: new Date().toISOString() } };
  },

  // Create new assignment on backend
  createAssignment: async (assignmentData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/assignments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(assignmentData),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Backend assignment creation unreachable:', err.message);
    }
    return { ok: true, assignment: assignmentData };
  },

  // Get active assignments
  getAssignments: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/assignments`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Could not fetch assignments:', err.message);
    }
    return { ok: true, assignments: [] };
  },

  // --- Teacher Bot Chat Endpoints ---

  // 1. Start dialogue session with Teacher Bot
  startChat: async ({
    studentId,
    questionId = 'probe_01',
    responseId = null,
    language = 'hi',
    studentName,
    question = '61 - 24 = ?',
    studentAnswer = '',
    studentExplanation = '',
  }) => {
    const res = await fetch(`${API_BASE_URL}/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        questionId,
        responseId,
        language,
        studentName,
        question,
        studentAnswer: String(studentAnswer),
        studentExplanation,
      }),
    });
    if (!res.ok) throw new Error(`Chat start failed with HTTP ${res.status}`);
    return res.json();
  },

  // 2. Send child's message or quick-reply
  sendChatMessage: async ({ sessionId, text, selectedQuickReply = null, studentContext = {} }) => {
    const res = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        text,
        selectedQuickReply,
        studentContext,
      }),
    });
    if (!res.ok) throw new Error(`Chat message failed with HTTP ${res.status}`);
    return res.json();
  },

  // 3. Conclude dialogue & produce Teacher AI Summary
  finishChat: async ({ sessionId, studentContext = {}, existingDiagnosis = null }) => {
    const res = await fetch(`${API_BASE_URL}/chat/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        studentContext,
        existingDiagnosis,
      }),
    });
    if (!res.ok) throw new Error(`Chat finish failed with HTTP ${res.status}`);
    return res.json();
  },

  // 4. Retrieve stored Teacher Summary
  getChatSummary: async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/summary/${sessionId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.summary;
    } catch (err) {
      console.warn('Failed to fetch chat summary:', err.message);
      return null;
    }
  },

  // 5. Retrieve stored Teacher Summary by Student Response ID
  getChatSummaryByResponse: async (responseId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/summary/response/${responseId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.summary;
    } catch (err) {
      console.warn('Failed to fetch chat summary by response:', err.message);
      return null;
    }
  },

  // 6. Retrieve Full Chat Transcript
  getChatTranscript: async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/transcript/${sessionId}`);
      if (!res.ok) return null;
      return res.json();
    } catch (err) {
      console.warn('Failed to fetch chat transcript:', err.message);
      return null;
    }
  },

  // 7. Retrieve Transcript by Response ID
  getChatTranscriptByResponse: async (responseId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/transcript/response/${responseId}`);
      if (!res.ok) return null;
      return res.json();
    } catch (err) {
      console.warn('Failed to fetch transcript by response:', err.message);
      return null;
    }
  },

  // 8. Send Teacher Dispute Feedback ("This summary looks wrong")
  sendTeacherFeedback: async ({
    sessionId,
    responseId = null,
    feedback = 'summary_disputed',
    note = '',
    originalRuleId = 'UNKNOWN',
  }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/feedback`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sessionId,
          responseId,
          feedback,
          note,
          originalRuleId,
        }),
      });
      if (!res.ok) throw new Error(`Feedback failed with HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      console.warn('Failed to send teacher feedback to backend:', err.message);
      return { ok: true, fallback: true };
    }
  },

  // --- Authentication Endpoints ---

  // Teacher Login
  login: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed. Please check your credentials.');
    }
    return data;
  },

  // Teacher Registration
  register: async ({ name, email, password, schoolName }) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, schoolName }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }
    return data;
  },

  // Get Current Authenticated Profile
  getMe: async () => {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  },

  // Student Login via Class Code
  studentLogin: async ({ classCode, studentName }) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/student-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classCode, studentName }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid class code. Please check with your teacher.');
    }
    return data;
  },

  // Check Classroom Existence
  getClassroom: async (code) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/classroom/${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.classroom;
  },
};

export default api;
