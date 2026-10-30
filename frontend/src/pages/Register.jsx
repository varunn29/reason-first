import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';
import MobileWrapper from '../components/MobileWrapper';
import CustomButton from '../components/CustomButton';

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = (e) => {
    e.preventDefault();
    // Mock register: directly navigate to teacher dashboard
    navigate('/dashboard');
  };

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-bgMain flex flex-col justify-center px-6 pb-20 pt-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-darkText mb-2">Create Account</h1>
          <p className="text-sm text-gray-500 font-medium">Join Teacher Co-Pilot today.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <User className="text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Full Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-darkText"
              required
            />
          </div>

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
              placeholder="Create Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-darkText"
              required
            />
          </div>

          <div className="pt-4">
            <CustomButton type="submit" text="Sign Up" icon={<ArrowRight size={18} />} />
          </div>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6 font-medium">
          Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
        </p>
      </div>
    </MobileWrapper>
  );
};

export default Register;
