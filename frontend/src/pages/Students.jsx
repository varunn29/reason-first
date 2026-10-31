import React, { useState, useEffect, useContext } from 'react';
import { 
  Users, 
  Search, 
  KeyRound, 
  Copy, 
  Check, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ArrowLeft,
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import BottomNav from '../components/BottomNav';
import SkeletonLoader from '../components/SkeletonLoader';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const Students = () => {
  const navigate = useNavigate();
  const { currentUser, classroom } = useAuth();
  const { activeTeacher } = useContext(AppContext);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'PENDING' | 'MASTERED'
  const [copied, setCopied] = useState(false);

  const fetchStudents = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.getDashboardData();
      setDashboardData(data);
    } catch (err) {
      console.warn('Failed to fetch students:', err);
    } finally {
      if (!silent) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();

    // Auto-refresh when tab regains focus
    const handleFocus = () => fetchStudents(true);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const classCode = dashboardData?.teacher?.classCode || currentUser?.classCode || classroom?.classCode || activeTeacher?.classCode || '3A';
  const allStudents = dashboardData?.students || [];

  const handleCopyCode = () => {
    if (classCode) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(classCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter and search logic
  const filteredStudents = allStudents.filter((student) => {
    const studentName = (student.name || student.displayName || '').toLowerCase();
    const matchesSearch = studentName.includes(searchQuery.toLowerCase().trim());
    if (!matchesSearch) return false;

    if (filterTab === 'PENDING') {
      return student.hasMisconception || student.progress < 75;
    }
    if (filterTab === 'MASTERED') {
      return student.progress >= 75 && !student.hasMisconception;
    }
    return true;
  });

  const pendingCount = allStudents.filter((s) => s.hasMisconception || s.progress < 75).length;
  const masteredCount = allStudents.filter((s) => s.progress >= 75 && !s.hasMisconception).length;

  return (
    <MobileWrapper>
      <div className="pb-36 min-h-screen bg-bgMain">
        {/* Top Header */}
        <div className="px-5 pt-8 pb-4 flex items-center justify-between bg-bgMain sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-darkText shadow-sm hover:bg-gray-50 active:scale-95 transition"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-darkText">My Students</h1>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {allStudents.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Class Roster & Diagnostic Profiles</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setIsRefreshing(true); fetchStudents(); }}
              className={`p-2.5 bg-white rounded-full shadow-sm text-gray-500 hover:text-primary transition active:scale-95 ${isRefreshing ? 'animate-spin text-primary' : ''}`}
              title="Refresh student list"
              aria-label="Refresh student list"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Join Code Quick Card */}
        <div className="px-5 mb-4">
          <div className="bg-white rounded-2xl p-3 border border-blue-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
                <KeyRound size={16} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Class Join Code</span>
                <span className="text-xs font-bold text-darkText">Share with students</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-primary rounded-xl text-xs font-extrabold tracking-wider transition active:scale-95 border border-blue-200"
              title="Copy code"
            >
              <span>{classCode}</span>
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-5 mb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search students by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-10 pr-4 py-2.5 rounded-2xl text-xs font-medium text-darkText placeholder:text-gray-400 border border-gray-100 shadow-sm outline-none focus:border-primary transition"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-5 flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 whitespace-nowrap ${
              filterTab === 'ALL'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            All Students ({allStudents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 whitespace-nowrap ${
              filterTab === 'PENDING'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            Needs Review ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('MASTERED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 whitespace-nowrap ${
              filterTab === 'MASTERED'
                ? 'bg-secondary text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            Mastered ({masteredCount})
          </button>
        </div>

        {/* Student Cards List */}
        <div className="px-5">
          {isLoading ? (
            <div>
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
            </div>
          ) : allStudents.length === 0 ? (
            /* Clean Empty State when no students have joined yet */
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
          ) : filteredStudents.length === 0 ? (
            /* Search / filter returned 0 results */
            <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 my-4 shadow-sm">
              <p className="text-sm font-bold text-darkText mb-1">No matching students</p>
              <p className="text-xs text-gray-400 mb-4">No students match your filter or search query.</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setFilterTab('ALL'); }}
                className="px-4 py-2 bg-blue-50 text-primary text-xs font-bold rounded-xl hover:bg-blue-100 transition active:scale-95"
              >
                Clear Search & Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => {
                const sId = student.id || `student_${(student.name || 'user').toLowerCase().split(' ')[0]}`;
                const sName = student.name || student.displayName || 'Student';
                const hasGap = student.hasMisconception || student.progress < 75;
                const isMastered = student.progress >= 75 && !student.hasMisconception;
                const hasResponses = student.totalResponses > 0;

                return (
                  <div
                    key={student.id}
                    onClick={() => navigate(`/report?studentId=${sId}&name=${encodeURIComponent(sName)}`, {
                      state: { studentId: sId, studentName: sName }
                    })}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:border-blue-200 hover:shadow-md transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0">
                        <img 
                          src={student.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${sName.split(' ')[0]}`} 
                          alt={sName} 
                          className="w-10 h-10" 
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-darkText">{sName}</h3>
                        <p className="text-[11px] text-gray-400 font-medium mb-1">{student.grade || 'Grade 3'}</p>
                        
                        {/* Diagnostic Status Badge */}
                        {!hasResponses ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Joined · Awaiting Diagnostic
                          </span>
                        ) : hasGap ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertCircle size={11} className="text-amber-600" />
                            Needs Review
                          </span>
                        ) : isMastered ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                            <CheckCircle2 size={11} className="text-secondary" />
                            Mastered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`text-xs font-extrabold ${hasGap ? 'text-amber-600' : 'text-secondary'}`}>
                          {student.progress}%
                        </span>
                        <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div 
                            className={`h-full rounded-full ${hasGap ? 'bg-amber-500' : 'bg-secondary'}`} 
                            style={{ width: `${Math.max(student.progress, 5)}%` }}
                          />
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </MobileWrapper>
  );
};

export default Students;
