import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, GraduationCap } from 'lucide-react';
import MobileWrapper from '../components/MobileWrapper';
import CustomButton from '../components/CustomButton';
import { AppContext } from '../context/AppContext';

const Login = () => {
  const navigate = useNavigate();
  const { setActiveTeacher } = useContext(AppContext);
  const [email, setEmail] = useState('teacher@demo.com');
  const [password, setPassword] = useState('password123');

  const handleLogin = (e) => {
    e.preventDefault();
    setActiveTeacher((prev) => ({
      ...prev,
      email,
      name: email.includes('vikram') ? 'Mr. Vikram Patel' : (prev?.name || 'Ms. Sharma'),
    }));
    navigate('/dashboard');
  };

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-bgMain flex flex-col justify-center px-6 pb-20">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-sm">
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Felix" alt="Mascot" className="w-14 h-14" />
          </div>
          <h1 className="text-3xl font-extrabold text-darkText mb-2">Welcome Back</h1>
          <p className="text-sm text-gray-500 font-medium">Log in to your Teacher Co-Pilot account.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <Mail className="text-gray-400" size={20} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-darkText"
              required
            />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <Lock className="text-gray-400" size={20} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-darkText"
              required
            />
          </div>

          <div className="pt-4">
            <CustomButton type="submit" text="Log In" icon={<ArrowRight size={18} />} />
          </div>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6 font-medium">
          Don't have an account? <Link to="/register" className="text-primary font-bold hover:underline">Sign up</Link>
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

export default Login;
