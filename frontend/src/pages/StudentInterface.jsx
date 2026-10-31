import React, { useContext, useState } from 'react';
import { Star, Coins, Gamepad2, BookOpen, Calculator, Puzzle, ChevronRight, Home, ListTodo, Award, LogOut, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const StudentInterface = () => {
  const navigate = useNavigate();
  const { currentUser, classroom, logout } = useAuth();
  const { activeStudent, resetStudentQuiz } = useContext(AppContext);
  const [showRewardsModal, setShowRewardsModal] = useState(false);

  const studentName = currentUser?.name || activeStudent?.displayName || 'Student';
  const firstName = studentName.split(' ')[0] || 'Student';
  const gradeLabel = classroom?.grade || currentUser?.grade || activeStudent?.classLabel || 'Grade 3 - Section A';
  const avatarUrl = activeStudent?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(firstName)}`;

  const tasks = [
    { 
      id: 1, 
      title: 'Math Adventure', 
      desc: 'Solve, earn stars, level up with subtraction regrouping!', 
      icon: Calculator, 
      bg: 'bg-primary', 
      text: 'text-white', 
      route: '/solve',
      isAvailable: true,
      badge: 'Active Mission'
    },
    { 
      id: 2, 
      title: 'Spelling Bee', 
      desc: 'Improve your vocabulary & word formation', 
      icon: Gamepad2, 
      bg: 'bg-accent', 
      text: 'text-white', 
      route: null,
      isAvailable: false,
      badge: 'Coming in Term 2'
    },
    { 
      id: 3, 
      title: 'Logic Puzzles', 
      desc: 'Pattern matching & spatial reasoning', 
      icon: Puzzle, 
      bg: 'bg-secondary', 
      text: 'text-white', 
      route: null,
      isAvailable: false,
      badge: 'Unlocks at Lv 2'
    },
    { 
      id: 4, 
      title: 'Reading Quest', 
      desc: 'Short stories and comprehension', 
      icon: BookOpen, 
      bg: 'bg-purple-500', 
      text: 'text-white', 
      route: null,
      isAvailable: false,
      badge: 'Coming in Term 2'
    },
  ];

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
      <div className="min-h-screen bg-[#F0F4FF] pb-24">
        {/* Top Bar (Gamification) */}
        <div className="px-5 pt-8 pb-4 flex justify-between items-center bg-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
              <img 
                src={avatarUrl} 
                alt={studentName} 
                className="w-10 h-10"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-darkText">{studentName}</h2>
              <p className="text-[10px] text-gray-500 font-medium">{gradeLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm text-accent font-bold text-xs">
              <Star size={14} className="fill-accent" /> {activeStudent?.stars || 12}
            </div>
            <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm text-accent font-bold text-xs">
              <Coins size={14} className="fill-accent" /> {activeStudent?.coins || 350}
            </div>
            <button
              type="button"
              onClick={handleExit}
              title="Change student / exit"
              aria-label="Exit"
              className="p-1.5 bg-white rounded-full shadow-sm text-gray-400 hover:text-danger transition active:scale-95"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Mascot Area */}
        <div className="px-5 mb-6 relative">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-3xl p-5 relative overflow-hidden flex items-center shadow-soft">
             <div className="w-24 h-24 bg-white/60 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 shrink-0">
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Felix" alt="AI Mascot" className="w-20 h-20" />
             </div>
             <div className="ml-4 z-10">
                <div className="bg-white px-4 py-2.5 rounded-2xl rounded-bl-none shadow-sm mb-1">
                   <p className="text-sm font-bold text-primary">Hey {firstName}!</p>
                   <p className="text-xs text-gray-600">Ready for your subtraction challenge?</p>
                </div>
             </div>
          </div>
        </div>

        {/* Task Cards */}
        <div className="px-5 space-y-3.5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-darkText">Your Tasks</h3>
            <span className="text-xs text-gray-500 font-medium">1 Available</span>
          </div>

          {tasks.map((task) => {
            const Icon = task.icon;
            return (
              <div 
                key={task.id} 
                onClick={task.isAvailable ? handleStartMath : undefined}
                className={`${task.bg} ${task.text} p-4 rounded-3xl shadow-sm flex items-center justify-between transition-transform ${
                  task.isAvailable 
                    ? 'cursor-pointer hover:scale-[1.02] active:scale-95' 
                    : 'opacity-70 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Icon size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base">{task.title}</h4>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/25">
                        {task.badge}
                      </span>
                    </div>
                    <p className="text-xs opacity-90 mt-0.5">{task.desc}</p>
                  </div>
                </div>
                {task.isAvailable && <ChevronRight size={20} className="opacity-75 shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Rewards Modal */}
        {showRewardsModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl text-center animate-fade-in">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award size={36} />
              </div>
              <h3 className="text-xl font-bold text-darkText mb-1">Student Badge Showcase</h3>
              <p className="text-xs text-gray-500 mb-4">Complete subtraction regrouping to earn badges!</p>
              
              <div className="bg-gray-50 rounded-2xl p-3 flex justify-around mb-5">
                <div className="text-center">
                  <span className="text-xl font-extrabold text-accent block">{activeStudent?.stars || 12}</span>
                  <span className="text-[10px] text-gray-500 font-medium">Stars</span>
                </div>
                <div className="border-r border-gray-200"></div>
                <div className="text-center">
                  <span className="text-xl font-extrabold text-primary block">Level 1</span>
                  <span className="text-[10px] text-gray-500 font-medium">Rank</span>
                </div>
                <div className="border-r border-gray-200"></div>
                <div className="text-center">
                  <span className="text-xl font-extrabold text-secondary block">{activeStudent?.coins || 350}</span>
                  <span className="text-[10px] text-gray-500 font-medium">Coins</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowRewardsModal(false)}
                className="w-full py-3 bg-primary text-white font-bold rounded-2xl text-sm shadow-sm active:scale-95 transition"
              >
                Awesome!
              </button>
            </div>
          </div>
        )}

        {/* Student Bottom Navigation */}
        <nav aria-label="Student Navigation" className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-gray-100 flex justify-around items-center py-3 px-2 pb-safe z-50 rounded-t-3xl shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
          <div 
            onClick={() => { setShowRewardsModal(false); navigate('/student'); }}
            className="flex flex-col items-center gap-1 text-primary cursor-pointer"
          >
            <Home size={20} className="fill-primary/10" />
            <span className="text-[10px] font-bold">Home</span>
          </div>
          <div 
            onClick={handleStartMath}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <ListTodo size={20} />
            <span className="text-[10px] font-medium">Solve Math</span>
          </div>
          <div 
            onClick={() => setShowRewardsModal(true)}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <Award size={20} />
            <span className="text-[10px] font-medium">Rewards</span>
          </div>
        </nav>
      </div>
    </MobileWrapper>
  );
};

export default StudentInterface;
