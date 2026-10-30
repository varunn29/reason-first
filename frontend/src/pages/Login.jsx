import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, Sparkles, GraduationCap } from 'lucide-react';
import MobileWrapper from '../components/MobileWrapper';
import CustomButton from '../components/CustomButton';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, error: authError, clearError } = useAuth();
  const { setActiveTeacher } = useContext(AppContext);
  const [email, setEmail] = useState('teacher@demo.com');
  const [password, setPassword] = useState('password123');
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (clearError) clearError();

    if (!email.trim() || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (login) {
        await login(email, password);
      }
      if (setActiveTeacher) {
        setActiveTeacher((prev) => ({
          ...prev,
          email,
          name: email.includes('vikram') ? 'Mr. Vikram Patel' : (prev?.name || 'Ms. Sharma'),
        }));
      }
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = () => {
    setEmail('teacher@demo.com');
    setPassword('password123');
    setFormError(null);
    if (clearError) clearError();
  };

  const activeError = formError || authError;

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-bgMain flex flex-col justify-center px-6 pb-20">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-sm">
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Felix" alt="Mascot" className="w-14 h-14" />
          </div>
          <h1 className="text-3xl font-extrabold text-darkText mb-2">Welcome Back</h1>
          <p className="text-sm text-gray-500 font-medium">Log in to your Teacher Co-Pilot account.</p>
        </div>

        {/* Demo Credentials Quick-Fill Pill */}
        <div className="mb-4 text-center">
          <button
            type="button"
            onClick={fillDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-primary hover:bg-blue-100 transition active:scale-95"
          >
            <Sparkles size={13} />
            Use Demo: teacher@demo.com
          </button>
        </div>

        {/* Error Alert */}
        {activeError && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-fadeIn">
            <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{activeError}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 focus-within:border-primary transition">
            <Mail className="text-gray-400 shrink-0" size={20} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (activeError) setFormError(null);
              }}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-darkText"
              required
              autoComplete="email"
            />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 focus-within:border-primary transition">
            <Lock className="text-gray-400 shrink-0" size={20} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (activeError) setFormError(null);
              }}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-darkText"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="pt-2">
            <CustomButton 
              type="submit" 
              text={isSubmitting || isLoading ? 'Logging in...' : 'Log In'} 
              icon={<ArrowRight size={18} />} 
              disabled={isSubmitting || isLoading}
            />
          </div>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6 font-medium">
          Don't have an account? <Link to="/register" className="text-primary font-bold hover:underline">Sign up</Link>
        </p>

        <div className="mt-8 text-center border-t border-gray-100 pt-5">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary font-semibold transition">
            <GraduationCap size={16} /> Switch to Student Mode (Enter Class Code)
          </Link>
        </div>
      </div>
    </MobileWrapper>
  );
};

export default Login;
