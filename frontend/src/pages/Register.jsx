import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Building, ArrowRight, AlertCircle, GraduationCap } from 'lucide-react';
import MobileWrapper from '../components/MobileWrapper';
import CustomButton from '../components/CustomButton';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';

const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading, error: authError, clearError } = useAuth();
  const { setActiveTeacher } = useContext(AppContext);
  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (clearError) clearError();

    if (!name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (register) {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          schoolName: schoolName.trim() || 'Kendriya Vidyalaya',
        });
      }
      if (setActiveTeacher) {
        setActiveTeacher({
          name: name.trim(),
          greeting: 'Good Morning',
          email: email.trim() || 'teacher@demo.com',
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name.trim().split(' ')[0])}`,
        });
      }
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = formError || authError;

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-bgMain flex flex-col justify-center px-6 pb-20 pt-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-sm">
            <User className="text-primary" size={28} />
          </div>
          <h1 className="text-3xl font-extrabold text-darkText mb-1.5">Create Account</h1>
          <p className="text-sm text-gray-500 font-medium">Join Teacher Co-Pilot today.</p>
        </div>

        {/* Error Alert */}
        {activeError && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-fadeIn">
            <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{activeError}</div>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3.5">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 focus-within:border-primary transition">
            <User className="text-gray-400 shrink-0" size={20} />
            <input 
              type="text" 
              placeholder="Full Name (e.g. Ms. Anita Sharma)" 
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (activeError) setFormError(null);
              }}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-darkText"
              required
              autoComplete="name"
            />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 focus-within:border-primary transition">
            <Building className="text-gray-400 shrink-0" size={20} />
            <input 
              type="text" 
              placeholder="School Name (e.g. KV Sector 4)" 
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-darkText"
            />
          </div>

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
              placeholder="Create Password (min. 6 chars)" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (activeError) setFormError(null);
              }}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-darkText"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="pt-2">
            <CustomButton 
              type="submit" 
              text={isSubmitting || isLoading ? 'Creating account...' : 'Sign Up'} 
              icon={<ArrowRight size={18} />} 
              disabled={isSubmitting || isLoading}
            />
          </div>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6 font-medium">
          Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
        </p>

        <div className="mt-8 text-center border-t border-gray-100 pt-5">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary font-semibold transition">
            <GraduationCap size={16} /> Switch to Student Mode
          </Link>
        </div>
      </div>
    </MobileWrapper>
  );
};

export default Register;
