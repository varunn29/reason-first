import { mockTeacher, mockStats, mockStudents } from '../data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = {
  // Fetch dashboard summary data from backend, with local fallback
  getDashboardData: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          teacher: data.teacher || mockTeacher,
          stats: data.stats || mockStats,
          students: data.students || mockStudents,
          activeAssignment: data.activeAssignment || null,
          isLive: true,
        };
      }
    } catch (err) {
      console.warn('Backend dashboard API unreachable, using local fallback:', err.message);
    }

    return {
      teacher: mockTeacher,
      stats: mockStats,
      students: mockStudents,
      activeAssignment: null,
      isLive: false,
    };
  },

  // Fetch diagnostic probes from backend / ML
  getProbes: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/probes`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.probes || [];
      }
    } catch (err) {
      console.warn('Backend probes API unreachable, using local fallback:', err.message);
    }

    return [
      { id: 'probe_01', text: '61 - 24 = ?', options: [37, 43, 47, 35], correctAnswer: 37 },
      { id: 'probe_02', text: '72 - 38 = ?', options: [34, 46, 44, 36], correctAnswer: 34 },
      { id: 'probe_03', text: '83 - 49 = ?', options: [34, 46, 44, 38], correctAnswer: 34 },
      { id: 'ctrl_01', text: '58 - 23 = ?', options: [35, 31, 25, 33], correctAnswer: 35 },
      { id: 'ctrl_02', text: '79 - 45 = ?', options: [34, 32, 24, 35], correctAnswer: 34 },
    ];
  },

  // Submit student answer to backend, which triggers ML diagnostic engine
  submitAnswer: async (studentId, questionId, selectedAnswer, correctAnswer, extraData = {}) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId || 'student_rahul',
          questionId: questionId || 'probe_01',
          questionText: extraData.questionText || '',
          assignmentId: extraData.assignmentId || 'asgn_class3_subtraction',
          answer: selectedAnswer,
          correctAnswer,
          explanation: extraData.explanation || '',
          responses: extraData.responses || null,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = await res.json();
        const diag = data.diagnosis || {};
        const isPass = selectedAnswer === correctAnswer;
        return {
          studentId,
          questionId,
          questionText: extraData.questionText || '',
          selectedAnswer,
          correctAnswer,
          responseId: data.responseId,
          status: diag.status || (isPass ? 'Pass' : 'Fail'),
          message: diag.observations || (isPass ? 'No immediate gap detected. Student demonstrated mastery of this subtraction concept.' : 'Misconception detected.'),
          gap: diag.ruleId || (isPass ? 'CORRECT' : 'BORROWING'),
          confidence: diag.confidence || 'HIGH',
          followUpQuestion: diag.followUpQuestion || 'Can you explain how you subtracted the ones column?',
          suggestedActivity: diag.suggestedActivity || 'Practice tens-and-ones place value regrouping.',
          alternatives: diag.alternatives || [],
          evidence: diag.evidence || {},
          isLiveML: true,
        };
      }
    } catch (err) {
      console.warn('Backend API unreachable, using local diagnostic simulation:', err.message);
    }

    // Offline simulation fallback if backend/ML is not running
    const isCorrect = selectedAnswer === correctAnswer;
    return {
      studentId,
      questionId,
      questionText: extraData.questionText || '',
      selectedAnswer,
      correctAnswer,
      responseId: 'offline_response',
      status: isCorrect ? 'Pass' : 'Fail',
      message: isCorrect
        ? 'No immediate gap detected. Student demonstrated mastery of this subtraction concept.'
        : "Student needs review with tens-to-ones regrouping concept.",
      gap: isCorrect ? 'CORRECT' : 'BORROWING',
      confidence: 'MEDIUM',
      followUpQuestion: 'Can you show your regrouping step with base-10 blocks?',
      suggestedActivity: isCorrect
        ? 'Advance to 3-digit subtraction'
        : 'Use 10 physical counters to explain unbundling 1 ten into 10 ones',
      alternatives: ['Calculation slip'],
      evidence: { observed: selectedAnswer, expected: correctAnswer, is_correct: isCorrect },
      isLiveML: false,
    };
  },

  // Fetch report for a specific student
  getStudentReport: async (studentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/student/${studentId}`, {
        signal: AbortSignal.timeout(3000),
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Could not fetch assignments:', err.message);
    }
    return { ok: true, assignments: [] };
  },
};

export default api;
