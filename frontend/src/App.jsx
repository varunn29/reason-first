import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import StudentLogin from './pages/StudentLogin';
import TeacherDashboard from './pages/TeacherDashboard';
import CreateAssignment from './pages/CreateAssignment';
import StudentInterface from './pages/StudentInterface';
import QuestionSolving from './pages/QuestionSolving';
import DiagnosticReport from './pages/DiagnosticReport';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Kids / Student tablet entry point */}
          <Route path="/" element={<StudentLogin />} />
          <Route path="/student" element={<StudentInterface />} />
          <Route path="/solve" element={<QuestionSolving />} />

          {/* Teacher auth & dashboard routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<TeacherDashboard />} />
          <Route path="/students" element={<TeacherDashboard />} />
          <Route path="/create" element={<CreateAssignment />} />
          <Route path="/report" element={<DiagnosticReport />} />
          <Route path="/reports" element={<DiagnosticReport />} />
          <Route path="/settings" element={<TeacherDashboard />} />

          {/* Legal Pages */}
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
