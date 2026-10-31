import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentAssignment, setCurrentAssignment] = useState({
    id: 'asgn_class3_subtraction',
    topic: 'Class 3 Subtraction Diagnostic',
    class: 'Grade 3 - Section A',
    questions: [
      {
        id: 'probe_01',
        text: '61 - 24 = ?',
        options: [37, 43, 47, 35],
        correctAnswer: 37,
        distractors: {
          43: 'Smaller-from-larger (subtracted 4 - 1 = 3 in ones)',
          47: 'Borrow without decrement (forgot to reduce tens)',
          35: 'Calculation slip',
        },
      },
      {
        id: 'probe_02',
        text: '72 - 38 = ?',
        options: [34, 46, 44, 36],
        correctAnswer: 34,
        distractors: {
          46: 'Smaller-from-larger (subtracted 8 - 2 = 6 in ones)',
          44: 'Borrow without decrement (forgot to reduce tens)',
          36: 'Calculation slip',
        },
      },
      {
        id: 'probe_03',
        text: '83 - 49 = ?',
        options: [34, 46, 44, 38],
        correctAnswer: 34,
        distractors: {
          46: 'Smaller-from-larger (subtracted 9 - 3 = 6 in ones)',
          44: 'Borrow without decrement (forgot to reduce tens)',
          38: 'Calculation slip',
        },
      },
      {
        id: 'ctrl_01',
        text: '58 - 23 = ?',
        options: [35, 31, 25, 33],
        correctAnswer: 35,
        distractors: {
          31: 'Tens calculation slip',
          25: 'Reversed ones subtraction',
          33: 'Calculation slip',
        },
      },
      {
        id: 'ctrl_02',
        text: '79 - 45 = ?',
        options: [34, 32, 24, 35],
        correctAnswer: 34,
        distractors: {
          32: 'Calculation slip',
          24: 'Tens calculation slip',
          35: 'Calculation slip',
        },
      },
    ],
  });

  const [activeStudent, setActiveStudent] = useState(null);
  const [activeTeacher, setActiveTeacher] = useState(null);

  const [studentAnswer, setStudentAnswer] = useState(null);
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [latestResponseId, setLatestResponseId] = useState(null);
  const [chatSummary, setChatSummary] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedQuizResults, setCompletedQuizResults] = useState([]);

  const setStudentByCode = (code, studentName) => {
    const cleanCode = (code || '3A').trim().toUpperCase();
    const cleanName = (studentName || '').trim() || 'Student';
    const cleanId = 'student_' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setActiveStudent({
      id: cleanId,
      displayName: cleanName,
      classLabel: `Grade 3 - Section ${cleanCode}`,
      classCode: cleanCode,
      stars: 0,
      coins: 50,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanName.split(' ')[0]}`,
    });
  };

  const resetStudentQuiz = () => {
    setStudentAnswer(null);
    setCurrentQuestionIndex(0);
    setDiagnosticResult(null);
    setCompletedQuizResults([]);
  };

  return (
    <AppContext.Provider
      value={{
        currentAssignment,
        setCurrentAssignment,
        activeStudent,
        setActiveStudent,
        setStudentByCode,
        activeTeacher,
        setActiveTeacher,
        studentAnswer,
        setStudentAnswer,
        diagnosticResult,
        setDiagnosticResult,
        latestResponseId,
        setLatestResponseId,
        chatSummary,
        setChatSummary,
        currentQuestionIndex,
        setCurrentQuestionIndex,
        completedQuizResults,
        setCompletedQuizResults,
        resetStudentQuiz,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
