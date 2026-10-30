import React, { useState, useEffect, useContext } from 'react';
import { Bell, LogOut, Plus, Users, Clock, BookOpen, KeyRound, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';
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

  const displayName = currentUser?.name || teacher?.name || 'Ms. Sharma';
  const schoolName = currentUser?.schoolName || teacher?.schoolName || 'Kendriya Vidyalaya';
  const classCode = currentUser?.classCode || classroom?.classCode || teacher?.classCode || '3A';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <MobileWrapper>
      {/* Teacher AI Consent Modal (shown once on first visit) */}
      <TeacherConsentModal />

      <div className="pb-28">
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
              aria-label="Logout"
              onClick={handleLogout} 
              title="Log out"
              className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-danger transition active:scale-95"
            >
              <LogOut size={18} />
            </button>
            <img 
              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${displayName.split(' ')[0]}`} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-blue-50 ml-1" 
            />
          </div>
        </div>

        {/* Active Class Code Banner */}
        <div className="px-5 mb-3">
          <div className="bg-white rounded-2xl p-3 border border-blue-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <KeyRound size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Student Join Code</p>
                <p className="text-xs font-semibold text-darkText">Tell students to enter this code:</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-primary text-white text-sm font-extrabold tracking-wider shadow-sm">
              {classCode}
            </span>
          </div>
        </div>

        {/* Active Assignment Pill */}
        <div className="px-5 mb-4">
          <div 
            onClick={() => navigate('/create')}
            className="bg-primary/5 border border-primary/20 rounded-2xl p-3 flex justify-between items-center cursor-pointer hover:bg-primary/10 transition"
          >
            <div>
              <span className="text-[10px] font-bold text-primary tracking-wider uppercase block">Active Diagnostic Track</span>
              <p className="text-xs font-bold text-darkText mt-0.5">
                {currentAssignment?.title || 'Class 3 Subtraction Diagnostic with Regrouping'}
              </p>
            </div>
            <span className="text-[10px] font-semibold text-primary bg-white px-2.5 py-1 rounded-full shadow-xs">
              {currentAssignment?.questions?.length || 5} Probes
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-5 grid grid-cols-3 gap-3 mb-6">
          {stats.map((stat) => {
            const Icon = statIcons[stat.icon] || Users;
            const isFilterActive = stat.label === 'Pending Reviews' && studentFilter === 'PENDING';
            return (
              <div 
                key={stat.id} 
                onClick={() => handleStatClick(stat.label)}
                className={`p-3 rounded-2xl ${stat.bgColor} flex flex-col justify-between cursor-pointer transition-transform hover:scale-[1.03] active:scale-95 ${
                  isFilterActive ? 'ring-2 ring-orange-400 shadow-sm' : ''
                }`}
                title={`Click to filter by ${stat.label}`}
              >
                <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center ${stat.iconColor} mb-2 shadow-sm`}>
                  <Icon size={16} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-darkText">{stat.value}</h3>
                  <p className="text-[10px] text-gray-600 font-medium leading-tight mt-1">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Student List */}
        <div className="px-5">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-darkText">My Students</h2>
              <button 
                type="button" 
                onClick={() => { setIsRefreshing(true); fetchDashboard(); }}
                title="Refresh student list"
                className={`p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-primary transition ${isRefreshing ? 'animate-spin text-primary' : ''}`}
              >
                <RefreshCw size={14} />
              </button>
              {studentFilter === 'PENDING' && (
                <span className="text-[10px] text-orange-600 font-semibold">Filtering: Needs Review</span>
              )}
            </div>
            {allStudents.length > 0 && (
              <button 
                type="button"
                onClick={() => setStudentFilter((prev) => (prev === 'PENDING' ? 'ALL' : 'PENDING'))}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                {studentFilter === 'PENDING' ? 'Show All Students' : 'Filter Pending'}
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
            <div className="bg-white rounded-3xl p-8 text-center border-2 border-dashed border-gray-200 my-4 shadow-sm animate-fade-in">
              <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <Users size={30} />
              </div>
              <h3 className="text-base font-bold text-darkText mb-1.5">No Students Have Joined Yet</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed mb-5">
                No students have joined your class yet. Share class code <span className="font-extrabold text-primary px-2 py-0.5 bg-blue-50 rounded-lg">{classCode}</span> to get started.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-700">
                <KeyRound size={15} className="text-primary" />
                Join Code: <span className="font-extrabold text-primary tracking-widest">{classCode}</span>
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
