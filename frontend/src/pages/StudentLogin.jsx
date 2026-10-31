import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, ArrowRight, User, AlertCircle } from 'lucide-react';
import MobileWrapper from '../components/MobileWrapper';
import CustomButton from '../components/CustomButton';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';

const StudentLogin = () => {
  const navigate = useNavigate();
  const { loginStudent, isLoading, error: authError, clearError } = useAuth();
  const { setStudentByCode, resetStudentQuiz } = useContext(AppContext);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (clearError) clearError();

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode) {
      setFormError('Please enter your class code.');
      return;
    }

    if (!cleanName) {
      setFormError('Please enter your first name or roll number.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (setStudentByCode) {
        setStudentByCode(cleanCode, cleanName);
      }
      if (resetStudentQuiz) {
        resetStudentQuiz();
      }
      if (loginStudent) {
        await loginStudent(cleanCode, cleanName);
      }
      navigate('/student');
    } catch (err) {
      setFormError(err.message || 'Could not find that class code. Please check with your teacher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = formError || authError;

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-[#F0F4FF] flex flex-col justify-center px-6 pb-20 pt-8">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center mb-3 shadow-lg border-4 border-blue-100">
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Felix" alt="Mascot" className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-extrabold text-darkText mb-1.5">Hi there! 👋</h1>
          <p className="text-sm text-gray-600 font-medium">Enter the code from your teacher to start.</p>
        </div>

        {/* Error Alert */}
        {activeError && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-fadeIn">
            <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{activeError}</div>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          {/* Class Code Input */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border-2 border-blue-100 flex items-center gap-3.5 focus-within:border-primary transition">
            <Hash className="text-primary shrink-0" size={26} />
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                Class Code
              </label>
              <input 
                type="text" 
                placeholder="Enter Class Code" 
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (activeError) setFormError(null);
                }}
                className="w-full bg-transparent outline-none text-xl font-extrabold tracking-widest text-darkText placeholder:font-medium placeholder:text-base placeholder:tracking-normal"
                required
                maxLength={10}
              />
            </div>
          </div>

          {/* Student Name Input */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border-2 border-blue-100 flex items-center gap-3.5 focus-within:border-primary transition">
            <User className="text-primary shrink-0" size={24} />
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                Your First Name / Roll No.
              </label>
              <input 
                type="text" 
                placeholder="Enter your name" 
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (activeError) setFormError(null);
                }}
                className="w-full bg-transparent outline-none text-base font-bold text-darkText placeholder:font-normal placeholder:text-sm"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <CustomButton 
              type="submit" 
              text={isSubmitting || isLoading ? 'Joining...' : 'Start Learning 🚀'} 
              icon={<ArrowRight size={18} />} 
              disabled={isSubmitting || isLoading}
            />
          </div>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-5">
          <button 
            type="button"
            onClick={() => navigate('/login')} 
            className="text-xs text-gray-400 font-semibold hover:text-primary transition"
          >
            I am a Teacher (Log In)
          </button>
        </div>
      </div>
    </MobileWrapper>
  );
};

export default StudentLogin;
