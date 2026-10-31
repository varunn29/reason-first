import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import StudentLogin from './pages/StudentLogin';
import TeacherDashboard from './pages/TeacherDashboard';
import Students from './pages/Students';
import CreateAssignment from './pages/CreateAssignment';
import StudentInterface from './pages/StudentInterface';
import QuestionSolving from './pages/QuestionSolving';
import DiagnosticReport from './pages/DiagnosticReport';
import ChatScreen from './pages/ChatScreen';
import Settings from './pages/Settings';
import TermsOfService from './pages/TermsOfService';
import DataSafety from './pages/DataSafety';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <Routes>
            {/* Kids / Student tablet entry point */}
            <Route path="/" element={<StudentLogin />} />
            <Route path="/student" element={<StudentInterface />} />
            <Route path="/solve" element={<QuestionSolving />} />
            <Route path="/quiz" element={<QuestionSolving />} />
            <Route path="/chat" element={<ChatScreen />} />

            {/* Teacher auth & dashboard routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<TeacherDashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/create" element={<CreateAssignment />} />
            <Route path="/report" element={<DiagnosticReport />} />
            <Route path="/reports" element={<DiagnosticReport />} />
            <Route path="/settings" element={<Settings />} />

            {/* Legal Pages */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<DataSafety />} />
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
