import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentAssignment, setCurrentAssignment] = useState({
    topic: 'Class 3 Subtraction Diagnostic',
    class: 'Grade 3 - Section A',
    questions: [
      {
        id: 'probe_01',
        text: '61 - 24 = ?',
        options: [37, 43, 47, 35],
        correctAnswer: 37,
      },
      {
        id: 'probe_02',
        text: '72 - 38 = ?',
        options: [34, 46, 44, 36],
        correctAnswer: 34,
      },
      {
        id: 'probe_03',
        text: '83 - 49 = ?',
        options: [34, 46, 44, 38],
        correctAnswer: 34,
      },
      {
        id: 'ctrl_01',
        text: '58 - 23 = ?',
        options: [35, 31, 25, 33],
        correctAnswer: 35,
      },
      {
        id: 'ctrl_02',
        text: '79 - 45 = ?',
        options: [34, 32, 24, 35],
        correctAnswer: 34,
      },
    ],
  });

  const [studentAnswer, setStudentAnswer] = useState(null);
  const [diagnosticResult, setDiagnosticResult] = useState(null);

  return (
    <AppContext.Provider
      value={{
        currentAssignment,
        setCurrentAssignment,
        studentAnswer,
        setStudentAnswer,
        diagnosticResult,
        setDiagnosticResult,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
