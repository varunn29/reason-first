import React from 'react';
import { Star, Coins, Gamepad2, BookOpen, Calculator, Puzzle, ChevronRight, Home, ListTodo, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';

const StudentInterface = () => {
  const navigate = useNavigate();

  const tasks = [
    { id: 1, title: 'Math Adventure', desc: 'Solve, earn stars, level up!', icon: Calculator, bg: 'bg-primary', text: 'text-white', route: '/solve' },
    { id: 2, title: 'Spelling Bee', desc: 'Improve your vocabulary!', icon: Gamepad2, bg: 'bg-accent', text: 'text-white', route: '/solve' },
    { id: 3, title: 'Logic Puzzles', desc: 'Think - Solve - Grow', icon: Puzzle, bg: 'bg-secondary', text: 'text-white', route: '/solve' },
    { id: 4, title: 'Reading Quest', desc: 'Explore new worlds!', icon: BookOpen, bg: 'bg-purple-500', text: 'text-white', route: '/solve' },
  ];

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-[#F0F4FF] pb-24">
        {/* Top Bar (Gamification) */}
        <div className="px-5 pt-8 pb-4 flex justify-between items-center bg-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white shadow-sm overflow-hidden">
              <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul" alt="Student" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-darkText">Rahul Kumar</h2>
              <p className="text-[10px] text-gray-500 font-medium">Grade 3 - Section A</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm text-accent font-bold text-xs">
              <Star size={14} className="fill-accent" /> 12
            </div>
            <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm text-accent font-bold text-xs">
              <Coins size={14} className="fill-accent" /> 350
            </div>
          </div>
        </div>

        {/* Mascot Area */}
        <div className="px-5 mb-6 relative">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-3xl p-5 relative overflow-hidden flex items-center shadow-soft">
             {/* Mascot Image */}
             <div className="w-24 h-24 bg-white/60 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 shrink-0">
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Felix" alt="AI Mascot" className="w-20 h-20" />
             </div>
             <div className="ml-4 z-10">
                <div className="bg-white px-4 py-2.5 rounded-2xl rounded-bl-none shadow-sm mb-1">
                   <p className="text-sm font-bold text-primary">Hey Rahul!</p>
                   <p className="text-xs text-gray-600">Ready for a new challenge?</p>
                </div>
             </div>
          </div>
        </div>

        {/* Task Cards */}
        <div className="px-5 space-y-3.5">
          <h3 className="text-lg font-bold text-darkText mb-2">Your Tasks</h3>
          {tasks.map((task) => {
            const Icon = task.icon;
            return (
              <div 
                key={task.id} 
                onClick={() => navigate(task.route)}
                className={`${task.bg} ${task.text} p-4 rounded-3xl shadow-sm cursor-pointer flex items-center justify-between hover:scale-[1.02] active:scale-95 transition-transform`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{task.title}</h3>
                    <p className="text-xs opacity-90">{task.desc}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="opacity-75" />
              </div>
            );
          })}
        </div>

        {/* Student Bottom Navigation */}
        <nav aria-label="Student Navigation" className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-gray-100 flex justify-around items-center py-3 px-2 pb-safe z-50 rounded-t-3xl shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
          <div 
            onClick={() => navigate('/student')}
            className="flex flex-col items-center gap-1 text-primary cursor-pointer"
          >
            <Home size={20} className="fill-primary/10" />
            <span className="text-[10px] font-bold">Home</span>
          </div>
          <div 
            onClick={() => navigate('/solve')}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <ListTodo size={20} />
            <span className="text-[10px] font-medium">My Tasks</span>
          </div>
          <div 
            onClick={() => navigate('/student')}
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
