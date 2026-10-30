import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentAssignment, setCurrentAssignment] = useState({
    topic: 'Math & Logic',
    class: 'Grade 3 - Section A',
    questions: [
      { id: 1, text: '42 - 15 = ?', options: [25, 27, 26, 28], correctAnswer: 27 }
    ]
  });

  const [studentAnswer, setStudentAnswer] = useState(null);
  const [diagnosticResult, setDiagnosticResult] = useState(null);

  return (
    <AppContext.Provider value={{
      currentAssignment,
      setCurrentAssignment,
      studentAnswer,
      setStudentAnswer,
      diagnosticResult,
      setDiagnosticResult
    }}>
      {children}
    </AppContext.Provider>
  );
};
