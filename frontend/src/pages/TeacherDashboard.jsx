import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Plus, Users, Clock, BookOpen, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import BottomNav from '../components/BottomNav';
import StudentCard from '../components/StudentCard';
import SkeletonLoader from '../components/SkeletonLoader';
import CustomButton from '../components/CustomButton';
import TeacherConsentModal from '../components/TeacherConsentModal';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TeacherDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const navigate = useNavigate();
  const { currentUser, classroom, logout } = useAuth();

  useEffect(() => {
    let isMounted = true;
    api.getDashboardData().then((data) => {
      if (isMounted) {
        setDashboardData(data);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const statIcons = { Users, Clock, BookOpen };

  const teacher = dashboardData?.teacher;
  const stats = dashboardData?.stats || [];
  const students = dashboardData?.students || [];

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
          <div className="flex items-center gap-2">
            <button 
              type="button"
              aria-label="Notifications"
              className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-primary transition active:scale-95"
            >
              <Bell size={18} />
            </button>
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
        <div className="px-5 mb-4">
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

        {/* Stats Cards */}
        <div className="px-5 grid grid-cols-3 gap-3 mb-6">
          {stats.map((stat) => {
            const Icon = statIcons[stat.icon] || Users;
            return (
              <div key={stat.id} className={`p-3 rounded-2xl ${stat.bgColor} flex flex-col justify-between`}>
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
            <h2 className="text-lg font-bold text-darkText">My Students</h2>
            <button 
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View All
            </button>
          </div>

          {isLoading ? (
            <div>
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
            </div>
          ) : (
            <div>
              {students.map((student) => (
                <StudentCard 
                  key={student.id} 
                  student={student} 
                  onClick={() => navigate('/report', { state: { studentId: student.id, studentName: student.name } })}
                />
              ))}
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
