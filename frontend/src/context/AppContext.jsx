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

  const [activeStudent, setActiveStudent] = useState({
    id: 'student_rahul',
    displayName: 'Rahul Kumar',
    classLabel: 'Grade 3 - Section A',
    classCode: '3A',
    stars: 12,
    coins: 350,
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul',
  });

  const [activeTeacher, setActiveTeacher] = useState({
    name: 'Ms. Sharma',
    greeting: 'Good Morning',
    email: 'teacher@demo.com',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sharma',
  });

  const [studentAnswer, setStudentAnswer] = useState(null);
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedQuizResults, setCompletedQuizResults] = useState([]);

  const setStudentByCode = (code) => {
    const cleanCode = (code || '').trim().toUpperCase();
    if (cleanCode.includes('3B')) {
      setActiveStudent({
        id: 'student_aarav',
        displayName: 'Aarav Patel',
        classLabel: 'Grade 3 - Section B',
        classCode: '3B',
        stars: 15,
        coins: 420,
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aarav',
      });
    } else if (cleanCode.includes('PRIYA') || cleanCode === '3A-P') {
      setActiveStudent({
        id: 'student_priya',
        displayName: 'Priya Singh',
        classLabel: 'Grade 3 - Section A',
        classCode: '3A',
        stars: 10,
        coins: 290,
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Priya',
      });
    } else {
      setActiveStudent({
        id: 'student_rahul',
        displayName: 'Rahul Kumar',
        classLabel: `Grade 3 - Section ${cleanCode || 'A'}`,
        classCode: cleanCode || '3A',
        stars: 12,
        coins: 350,
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul',
      });
    }
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
