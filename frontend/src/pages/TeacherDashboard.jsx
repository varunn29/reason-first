import React, { useState, useEffect, useContext } from 'react';
import { Bell, LogOut, Plus, Users, Clock, BookOpen, KeyRound, CheckCircle2, ChevronRight, RefreshCw, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import BottomNav from '../components/BottomNav';
import StudentCard from '../components/StudentCard';
import SkeletonLoader from '../components/SkeletonLoader';
import CustomButton from '../components/CustomButton';
import TeacherConsentModal from '../components/TeacherConsentModal';
import { AppContext } from '../context/AppContext';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TeacherDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [studentFilter, setStudentFilter] = useState('ALL'); // 'ALL' or 'PENDING'
  const [showNotification, setShowNotification] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { currentUser, classroom, logout } = useAuth();

  const { activeTeacher, currentAssignment } = useContext(AppContext);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.getDashboardData();
      setDashboardData(data);
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      if (!silent) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Automatically refresh student list when window regains focus (e.g. after student quiz in another tab)
    const handleFocus = () => {
      fetchDashboard(true);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleCopyCode = () => {
    if (classCode) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(classCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statIcons = { Users, Clock, BookOpen };

  const teacher = activeTeacher?.name ? activeTeacher : dashboardData?.teacher;
  const stats = dashboardData?.stats || [
    { id: 1, label: 'Total Students', value: 0, icon: 'Users', bgColor: 'bg-blue-50', iconColor: 'text-blue-500' },
    { id: 2, label: 'Pending Reviews', value: 0, icon: 'Clock', bgColor: 'bg-orange-50', iconColor: 'text-orange-500' },
    { id: 3, label: 'Total Assignments', value: 1, icon: 'BookOpen', bgColor: 'bg-purple-50', iconColor: 'text-purple-500' },
  ];
  const allStudents = dashboardData?.students || [];

  // Filter students based on review status
  const students = studentFilter === 'PENDING'
    ? allStudents.filter((s) => s.progress < 75)
    : allStudents;

  const handleStatClick = (statLabel) => {
    if (statLabel === 'Pending Reviews') {
      setStudentFilter((prev) => (prev === 'PENDING' ? 'ALL' : 'PENDING'));
    } else if (statLabel === 'Total Students') {
      setStudentFilter('ALL');
    } else if (statLabel === 'Total Assignments') {
      navigate('/create');
    }
  };

  const displayName = currentUser?.name || teacher?.name || 'Educator';
  const schoolName = currentUser?.schoolName || teacher?.schoolName || 'Primary School';
  const classCode = dashboardData?.teacher?.classCode || currentUser?.classCode || classroom?.classCode || teacher?.classCode || '3A';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <MobileWrapper>
      {/* Teacher AI Consent Modal (shown once on first visit) */}
      <TeacherConsentModal />

      <div className="pb-36">
        {/* Header */}
        <div className="px-5 pt-8 pb-3 flex justify-between items-center bg-bgMain">
          <div>
            <p className="text-xs text-gray-500 font-medium">
              {teacher?.greeting || 'Good Morning'}, {schoolName}
            </p>
            <h1 className="text-2xl font-bold text-darkText">
              {displayName}
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button 
                type="button"
                aria-label="Notifications"
                onClick={() => setShowNotification(!showNotification)}
                className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-primary transition active:scale-95"
              >
                <Bell size={20} />
                {stats.find(s => s.label === 'Pending Reviews')?.value > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {showNotification && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50 text-left animate-fade-in">
                  <h4 className="text-xs font-bold text-darkText mb-1 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-primary" /> Active Class Alerts
                  </h4>
                  <p className="text-[11px] text-gray-600 leading-tight">
                    {stats.find(s => s.label === 'Pending Reviews')?.value || 0} student response(s) in Grade 3 ready for human-in-the-loop clinical review.
                  </p>
                </div>
              )}
            </div>

            <button 
              type="button"
              aria-label="Refresh Dashboard"
              onClick={() => { setIsRefreshing(true); fetchDashboard(); }}
              className={`p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-primary transition active:scale-95 ${isRefreshing ? 'animate-spin text-primary' : ''}`}
            >
              <RefreshCw size={20} />
            </button>
            <button 
              type="button"
              aria-label="Logout"
              onClick={handleLogout}
              className="p-2 bg-red-50 text-danger rounded-full shadow-sm hover:bg-red-100 transition active:scale-95 border border-red-100"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-5 grid grid-cols-3 gap-2.5 mb-6">
          {stats.map((stat) => {
            const IconComponent = statIcons[stat.icon] || Users;
            const isClickable = stat.label === 'Pending Reviews' || stat.label === 'Total Students' || stat.label === 'Total Assignments';
            const isActive = (stat.label === 'Pending Reviews' && studentFilter === 'PENDING') ||
                             (stat.label === 'Total Students' && studentFilter === 'ALL');

            return (
              <div 
                key={stat.id} 
                onClick={() => handleStatClick(stat.label)}
                className={`bg-white rounded-3xl p-3.5 flex flex-col justify-between shadow-sm border transition relative ${
                  isActive ? 'border-primary ring-2 ring-primary/20' : 'border-gray-50'
                } ${isClickable ? 'cursor-pointer hover:border-blue-200 active:scale-95' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xl font-extrabold text-darkText tracking-tight">{stat.value}</span>
                  <div className={`p-1.5 rounded-xl ${stat.bgColor} ${stat.iconColor}`}>
                    <IconComponent size={14} />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-[11px] font-semibold text-gray-600 leading-tight">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Class Assignment Banner */}
        <div className="px-5 mb-5">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">Active Assignment</span>
              <h2 className="text-sm font-bold text-darkText leading-tight">
                {currentAssignment?.topic || 'Class 3 Subtraction Diagnostic'}
              </h2>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                5 diagnostic probes active
              </p>
            </div>
            <button 
              type="button"
              onClick={() => navigate('/create')}
              className="p-2.5 bg-blue-50 text-primary hover:bg-blue-100 rounded-2xl transition active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Student Section Header */}
        <div className="px-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold text-darkText flex items-center gap-2">
              <span>Class Roster</span>
              <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {students.length}
              </span>
            </h2>

            {studentFilter === 'PENDING' && (
              <button 
                type="button"
                onClick={() => setStudentFilter('ALL')}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                Show All Students
              </button>
            )}
          </div>

          {isLoading ? (
            <div>
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border-2 border-dashed border-gray-200 my-4 mb-28 shadow-sm animate-fade-in relative z-10">
              <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <Users size={30} />
              </div>
              <h3 className="text-base font-bold text-darkText mb-1.5">No Students Have Joined Yet</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed mb-6">
                No students have joined your class yet. Share your Class Code to get started.
              </p>
              
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-2xl text-xs font-bold text-primary active:scale-95 transition shadow-sm cursor-pointer"
                  title="Click to copy join code"
                >
                  <KeyRound size={16} className="text-primary" />
                  Join Code: <span className="font-extrabold text-primary tracking-widest text-base">{classCode}</span>
                  {copied ? (
                    <span className="flex items-center gap-1 text-[11px] text-green-700 bg-green-100/90 px-2 py-0.5 rounded-full font-semibold ml-1">
                      <Check size={12} /> Copied!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full font-medium ml-1 border border-gray-200">
                      <Copy size={11} /> Tap to Copy
                    </span>
                  )}
                </button>
                <span className="text-[10px] text-gray-400 font-medium">Students enter this code on the student login screen</span>
              </div>
            </div>
          ) : (
            <div>
              {students.map((student) => {
                const sId = student.id || `student_${student.name?.toLowerCase().split(' ')[0]}`;
                const sName = student.name || student.displayName;
                return (
                  <StudentCard 
                    key={student.id} 
                    student={student} 
                    onClick={() => navigate(`/report?studentId=${sId}&name=${encodeURIComponent(sName)}`, { 
                      state: { studentId: sId, studentName: sName } 
                    })}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-20 w-full max-w-[480px] px-5 flex justify-end z-40 pointer-events-none">
          <div className="pointer-events-auto">
            <CustomButton 
              text="Create Assignment" 
              icon={<Plus size={18} />} 
              fullWidth={false}
              onClick={() => navigate('/create')} 
            />
          </div>
        </div>
      </div>
      
      <BottomNav />
    </MobileWrapper>
  );
};

export default TeacherDashboard;
