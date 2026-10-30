import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, ArrowRight } from 'lucide-react';
import MobileWrapper from '../components/MobileWrapper';
import CustomButton from '../components/CustomButton';

const StudentLogin = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    // Mock validation: navigate directly to student dashboard
    navigate('/student');
  };

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-[#F0F4FF] flex flex-col justify-center px-6 pb-20">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg border-4 border-blue-100">
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Felix" alt="Mascot" className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-extrabold text-darkText mb-2">Hi there!</h1>
          <p className="text-sm text-gray-600 font-medium">Enter the code from your teacher to start.</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-blue-100 flex items-center gap-4">
            <Hash className="text-primary shrink-0" size={28} />
            <input 
              type="text" 
              placeholder="Enter Class Code (e.g. 3A)" 
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="flex-1 bg-transparent outline-none text-xl font-bold tracking-widest text-darkText placeholder:font-medium placeholder:text-base placeholder:tracking-normal"
              required
            />
          </div>

          <div className="pt-4">
            <CustomButton type="submit" text="Let's Go!" icon={<ArrowRight size={20} />} />
          </div>
        </form>

        {/* Small teacher link at the bottom */}
        <button 
          type="button"
          onClick={() => navigate('/login')} 
          className="mt-8 text-center text-xs text-gray-400 font-semibold hover:text-primary transition active:scale-95"
        >
          I am a Teacher
        </button>
      </div>
    </MobileWrapper>
  );
};

export default StudentLogin;
