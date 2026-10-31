import React, { useContext } from 'react';
import { 
  Star, 
  Coins, 
  Calculator, 
  ChevronRight, 
  Home, 
  LogOut, 
  Sparkles, 
  BookOpen, 
  MessageSquare,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const StudentInterface = () => {
  const navigate = useNavigate();
  const { currentUser, classroom, logout, role } = useAuth();
  const { activeStudent, resetStudentQuiz } = useContext(AppContext);

  // Derive real student identity from authenticated session or login input
  const isStudent = role === 'student' || currentUser?.role === 'student';
  const studentName = (isStudent ? currentUser?.name : null) || activeStudent?.displayName || 'Student';
  const firstName = studentName !== 'Student' ? studentName.split(' ')[0] : 'there';
  
  const rawGrade = classroom?.grade || (isStudent ? currentUser?.grade : null) || activeStudent?.classLabel || 'Grade 3 - Section A';
  const gradeLabel = rawGrade.includes('undefined') ? 'Grade 3 - Section A' : rawGrade;
  
  const avatarUrl = activeStudent?.avatar || (studentName !== 'Student' 
    ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(firstName)}` 
    : 'https://api.dicebear.com/7.x/adventurer/svg?seed=Explorer');

  // Real gamification metrics (starts at 0 for fresh student, increases as they solve correctly)
  const stars = activeStudent?.stars ?? (isStudent ? currentUser?.stars : 0) ?? 0;
  const coins = activeStudent?.coins ?? (isStudent ? currentUser?.coins : 0) ?? 0;

  const handleExit = () => {
    if (logout) logout();
    navigate('/');
  };

  const handleStartMath = () => {
    if (resetStudentQuiz) resetStudentQuiz();
    navigate('/solve');
  };

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-[#F0F4FF] pb-28">
        {/* Top Header: Real Student Profile & Live Stats */}
        <div className="px-5 pt-8 pb-4 flex justify-between items-center bg-transparent">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
              <img 
                src={avatarUrl} 
                alt={studentName} 
                className="w-11 h-11"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-darkText leading-tight">{studentName}</h2>
              <p className="text-[10px] text-gray-500 font-medium">{gradeLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div 
              className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full shadow-xs text-accent font-bold text-xs border border-amber-100"
              title="Stars earned by solving questions correctly"
            >
              <Star size={14} className="fill-accent text-accent" /> {stars}
            </div>
            
            <div 
              className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full shadow-xs text-secondary font-bold text-xs border border-green-100"
              title="Coins earned from learning sessions"
            >
              <Coins size={14} className="fill-secondary text-secondary" /> {coins}
            </div>

            <button
              type="button"
              onClick={handleExit}
              title="Switch student / exit"
              aria-label="Exit"
              className="p-1.5 bg-white rounded-full shadow-xs text-gray-400 hover:text-danger transition active:scale-95 cursor-pointer border border-gray-100"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Mascot Greeting Banner */}
        <div className="px-5 mb-5 relative">
          <div className="bg-gradient-to-r from-blue-100 via-indigo-50 to-purple-100 rounded-3xl p-5 relative overflow-hidden flex items-center shadow-soft border border-blue-50">
            <div className="w-20 h-20 bg-white/70 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 shrink-0">
              <img 
                src="https://api.dicebear.com/7.x/bottts/svg?seed=Felix" 
                alt="TeacherBot Mascot" 
                className="w-16 h-16" 
              />
            </div>
            <div className="ml-4 z-10">
              <div className="bg-white px-4 py-2.5 rounded-2xl rounded-bl-none shadow-xs mb-1 border border-gray-100">
                <p className="text-sm font-bold text-primary">Hey {firstName}! 👋</p>
                <p className="text-xs text-gray-600 font-medium">Ready for your subtraction mission?</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Mission Container (Exclusively Class 3 Mathematics) */}
        <div className="px-5 space-y-3.5">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-base font-bold text-darkText flex items-center gap-2">
              <Calculator size={18} className="text-primary" />
              <span>Assigned by Teacher</span>
            </h3>
            <span className="text-[10px] font-bold text-primary bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              1 Active
            </span>
          </div>

          {/* Hero Math Adventure Card */}
          <div 
            onClick={handleStartMath}
            className="bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-white p-5 rounded-3xl shadow-md cursor-pointer hover:shadow-lg active:scale-[0.99] transition relative overflow-hidden group"
          >
            {/* Background Decorative Rings */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xs pointer-events-none"></div>
            <div className="absolute right-12 top-4 w-16 h-16 bg-white/10 rounded-full blur-xs pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-xs">
                  <Sparkles size={11} className="text-amber-300" /> Teacher Assigned
                </span>
                <span className="text-xs font-semibold text-white/80">Class 3 NCERT</span>
              </div>

              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
                  <Calculator size={26} className="text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-extrabold text-white leading-snug">Math Adventure</h4>
                  <p className="text-[11px] text-white/80 font-medium">
                    Assigned by your teacher • Class 3 NCERT
                  </p>
                  <p className="text-xs text-white/90 font-medium mt-0.5">
                    2-Digit Subtraction with Column Regrouping
                  </p>
                </div>
              </div>

              <p className="text-xs text-white/85 leading-relaxed mb-4">
                Solve 5 arithmetic puzzles and explain your thinking step-by-step with TeacherBot!
              </p>

              {/* Mission Details Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-[10px] font-bold bg-white/15 px-2.5 py-1 rounded-lg">
                  ✓ 5 Diagnostic Questions
                </span>
                <span className="text-[10px] font-bold bg-white/15 px-2.5 py-1 rounded-lg">
                  ✓ Place Value Practice
                </span>
                <span className="text-[10px] font-bold bg-white/15 px-2.5 py-1 rounded-lg">
                  ✓ Voice & Text Dialogue
                </span>
              </div>

              {/* Call to action button */}
              <div className="w-full py-3 bg-white text-primary rounded-2xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 group-hover:bg-blue-50 transition active:scale-95">
                <span>Start Assigned Test</span>
                <ArrowRight size={15} />
              </div>
            </div>
          </div>

          {/* Educational Note */}
          <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-darkText">TeacherBot is ready to help!</p>
              <p className="text-[11px] text-gray-500">
                You can type or speak in Hindi/Hinglish to explain your answers.
              </p>
            </div>
          </div>
        </div>

        {/* Clean, Functional Student Navigation */}
        <nav aria-label="Student Navigation" className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-gray-100 flex justify-around items-center py-3 px-6 pb-safe z-50 rounded-t-3xl shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
          <button 
            type="button"
            onClick={() => navigate('/student')}
            className="flex flex-col items-center gap-1 text-primary cursor-pointer transition active:scale-95"
          >
            <Home size={22} className="fill-primary/15 stroke-[2.5px]" />
            <span className="text-[11px] font-bold text-primary">Home</span>
          </button>
          
          <button 
            type="button"
            onClick={handleStartMath}
            className="flex flex-col items-center gap-1 text-gray-500 hover:text-primary cursor-pointer transition active:scale-95"
          >
            <Calculator size={22} className="stroke-2" />
            <span className="text-[11px] font-medium">Assigned Test</span>
          </button>
        </nav>
      </div>
    </MobileWrapper>
  );
};

export default StudentInterface;
