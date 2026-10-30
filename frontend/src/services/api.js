import { mockTeacher, mockStats, mockStudents } from '../data/mockData';

// Simulated API service for offline-first architecture
export const api = {
  // Fetch dashboard summary data
  getDashboardData: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          teacher: mockTeacher,
          stats: mockStats,
          students: mockStudents,
        });
      }, 600);
    });
  },

  // Submit student response and simulate AI diagnostic evaluation
  submitAnswer: async (studentId, questionId, selectedAnswer, correctAnswer) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const isCorrect = selectedAnswer === correctAnswer;
        resolve({
          studentId,
          questionId,
          status: isCorrect ? 'Pass' : 'Fail',
          gap: isCorrect ? null : 'Borrowing',
          recommendation: isCorrect 
            ? 'Advance to 3-digit subtraction' 
            : 'Use 10 physical sticks to explain tens-to-ones regrouping',
        });
      }, 400);
    });
  },
};

export default api;
