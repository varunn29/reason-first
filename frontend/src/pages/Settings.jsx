import React, { useContext, useEffect, useState } from 'react';
import { ArrowLeft, User, Key, Server, LogOut, ShieldCheck, Sparkles, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import BottomNav from '../components/BottomNav';
import { AppContext } from '../context/AppContext';

const Settings = () => {
  const navigate = useNavigate();
  const { activeTeacher } = useContext(AppContext);
  const [mlStatus, setMlStatus] = useState('Checking...');

  useEffect(() => {
    fetch('http://localhost:4000/health')
      .then((res) => res.json())
      .then((data) => {
        setMlStatus(data.mlService || 'Connected');
      })
      .catch(() => {
        setMlStatus('Local Fallback Mode');
      });
  }, []);

  return (
    <MobileWrapper>
      <div className="pb-28 min-h-screen bg-bgMain">
        {/* Header */}
        <div className="px-5 pt-8 pb-4 flex items-center justify-between bg-bgMain sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              aria-label="Back to Dashboard"
              onClick={() => navigate('/dashboard')} 
              className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-primary transition active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-darkText">Settings & Configuration</h1>
          </div>
        </div>

        <div className="px-5 space-y-4">
          {/* Teacher Profile Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 flex items-center gap-4">
            <img 
              src={activeTeacher?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sharma'} 
              alt="Teacher" 
              className="w-14 h-14 rounded-full border-2 border-white shadow-sm bg-blue-50"
            />
            <div>
              <h2 className="text-base font-bold text-darkText">{activeTeacher?.name || 'Ms. Sharma'}</h2>
              <p className="text-xs text-gray-500 font-medium">{activeTeacher?.email || 'teacher@demo.com'}</p>
              <span className="inline-block mt-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Primary Math Educator
              </span>
            </div>
          </div>

          {/* Class Codes */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
            <h3 className="text-sm font-bold text-darkText mb-3 flex items-center gap-2">
              <Key size={16} className="text-primary" /> Active Class Access Codes
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-darkText block">Grade 3 - Section A</span>
                  <span className="text-[10px] text-gray-500 font-medium">Classroom Tablets</span>
                </div>
                <code className="text-xs font-extrabold text-primary bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                  3A
                </code>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-darkText block">Grade 3 - Section B</span>
                  <span className="text-[10px] text-gray-500 font-medium">Classroom Tablets</span>
                </div>
                <code className="text-xs font-extrabold text-primary bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                  3B
                </code>
              </div>
            </div>
          </div>

          {/* ML Engine Status */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
            <h3 className="text-sm font-bold text-darkText mb-3 flex items-center gap-2">
              <Server size={16} className="text-primary" /> Diagnostic Engine Status
            </h3>
            <div className="flex justify-between items-center p-3 bg-green-50/60 rounded-2xl border border-green-100">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-secondary" />
                <div>
                  <span className="text-xs font-bold text-darkText block">Python Diagnostic ML</span>
                  <span className="text-[10px] text-gray-600 font-medium">{mlStatus}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-green-700 bg-white px-2 py-0.5 rounded-full border border-green-200">
                Port 8000
              </span>
            </div>
          </div>

          {/* Legal / Policy */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 divide-y divide-gray-100">
            <div 
              onClick={() => navigate('/terms')}
              className="py-2.5 flex justify-between items-center cursor-pointer hover:text-primary transition"
            >
              <span className="text-xs font-medium text-gray-700">Terms of Service</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
            <div 
              onClick={() => navigate('/privacy')}
              className="py-2.5 flex justify-between items-center cursor-pointer hover:text-primary transition"
            >
              <span className="text-xs font-medium text-gray-700">Privacy Policy (COPPA/FERPA)</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-3.5 bg-red-50 text-danger hover:bg-red-100 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 border border-red-100"
          >
            <LogOut size={16} /> Log Out of Teacher Portal
          </button>
        </div>
      </div>

      <BottomNav />
    </MobileWrapper>
  );
};

export default Settings;

