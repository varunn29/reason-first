import React, { useContext, useState } from 'react';
import { 
  ArrowLeft, 
  User, 
  Key, 
  LogOut, 
  ShieldCheck, 
  ChevronRight, 
  Copy, 
  Check, 
  Lock, 
  Volume2, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Sliders,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import BottomNav from '../components/BottomNav';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const Settings = () => {
  const navigate = useNavigate();
  const { currentUser, classroom, logout } = useAuth();
  const { activeTeacher } = useContext(AppContext);

  // Teacher Profile Data
  const teacherName = currentUser?.name || activeTeacher?.name || 'Educator';
  const teacherEmail = currentUser?.email || activeTeacher?.email || 'educator@school.edu';
  const schoolName = currentUser?.schoolName || classroom?.schoolName || 'Primary School';
  const teacherAvatar = activeTeacher?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(teacherName.split(' ')[0])}`;
  
  // Real Class Access Code
  const classCode = classroom?.classCode || classroom?.code || currentUser?.classCode || activeTeacher?.classCode || '3A';
  
  // Clean Grade / Section display (Fixes "Section undefined" bug)
  const getClassDisplayName = () => {
    if (classroom?.name && classroom.name !== 'Classroom' && !classroom.name.includes('Math Class')) {
      return classroom.name;
    }
    if (classroom?.grade) {
      if (classroom.grade.toLowerCase().includes('section')) {
        return classroom.grade;
      }
      if (classroom.section && classroom.section !== 'undefined') {
        return `${classroom.grade} - Section ${classroom.section}`;
      }
      return classroom.grade;
    }
    return 'Grade 3 - Section A';
  };

  const classGrade = getClassDisplayName();

  // State: Copy Code Feedback
  const [copied, setCopied] = useState(false);

  // State: Voice guidance preference (defaults to true)
  const [voiceGuidance, setVoiceGuidance] = useState(() => {
    const saved = localStorage.getItem('rf_pref_voice_guidance');
    return saved !== null ? saved === 'true' : true;
  });

  // State: Change Password Form
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, success: null, error: null });

  const handleCopyCode = () => {
    if (classCode) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(classCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleVoice = () => {
    const nextState = !voiceGuidance;
    setVoiceGuidance(nextState);
    localStorage.setItem('rf_pref_voice_guidance', String(nextState));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordStatus({ loading: true, success: null, error: null });

    if (newPassword.length < 6) {
      setPasswordStatus({ loading: false, success: null, error: 'New password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ loading: false, success: null, error: 'New passwords do not match.' });
      return;
    }

    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordStatus({
        loading: false,
        success: 'Password updated successfully!',
        error: null,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordStatus({ loading: false, success: null, error: null });
      }, 2500);
    } catch (err) {
      setPasswordStatus({
        loading: false,
        success: null,
        error: err.message || 'Failed to update password.',
      });
    }
  };

  const handleLogout = () => {
    if (logout) logout();
    navigate('/login');
  };

  return (
    <MobileWrapper>
      <div className="pb-32 min-h-screen bg-bgMain">
        {/* Header */}
        <div className="px-5 pt-8 pb-4 flex items-center justify-between bg-bgMain sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              aria-label="Back"
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-darkText shadow-sm hover:bg-gray-50 active:scale-95 transition cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-darkText">Settings & Profile</h1>
              <p className="text-[10px] text-gray-500 font-medium">Classroom & Teacher Account</p>
            </div>
          </div>
        </div>

        <div className="px-5 space-y-4">
          {/* Teacher Profile Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="relative">
              <img 
                src={teacherAvatar} 
                alt="Teacher" 
                className="w-16 h-16 rounded-full border-2 border-white shadow-sm bg-blue-50"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary rounded-full border-2 border-white flex items-center justify-center text-white" title="Verified Educator">
                <Check size={10} strokeWidth={3} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-darkText truncate">{teacherName}</h2>
              <p className="text-xs text-gray-500 font-medium truncate">{teacherEmail}</p>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-600 font-medium truncate">
                <Building2 size={12} className="text-gray-400 shrink-0" />
                <span className="truncate">{schoolName}</span>
              </div>
              <span className="inline-block mt-1.5 text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                Primary Mathematics Educator
              </span>
            </div>
          </div>

          {/* Active Class Access Code Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-darkText flex items-center gap-2">
                <Key size={16} className="text-primary" /> Active Class Access Code
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active
              </span>
            </div>
            
            <div className="p-3.5 bg-gray-50/90 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-darkText block">{classGrade}</span>
                <span className="text-[10px] text-gray-500 font-medium">Student Tablet Login Code</span>
              </div>
              
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-primary text-darkText hover:text-primary rounded-xl font-mono text-xs font-extrabold shadow-2xs active:scale-95 transition cursor-pointer"
                title="Tap to copy code"
              >
                <span>{classCode}</span>
                {copied ? (
                  <span className="text-[10px] font-sans font-bold text-secondary flex items-center gap-0.5">
                    <Check size={12} /> Copied!
                  </span>
                ) : (
                  <Copy size={13} className="text-gray-400" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-2.5 px-1 leading-relaxed">
              Share this unique code with students on classroom tablets to start formative diagnostic quizzes.
            </p>
          </div>

          {/* Account Security & Password Settings */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-darkText flex items-center gap-2">
                <Lock size={16} className="text-primary" /> Account & Security
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 px-1 border-b border-gray-50">
                <div>
                  <span className="text-xs font-medium text-darkText block">Email Address</span>
                  <span className="text-[11px] text-gray-400">{teacherEmail}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                  Verified
                </span>
              </div>

              {!isChangingPassword ? (
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full py-2.5 px-3 text-left flex justify-between items-center bg-gray-50 hover:bg-gray-100 rounded-xl transition text-xs font-bold text-darkText cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Lock size={14} className="text-gray-500" /> Change Account Password
                  </span>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="p-3 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-darkText">Update Password</span>
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      className="text-[11px] text-gray-500 hover:text-darkText font-medium"
                    >
                      Cancel
                    </button>
                  </div>

                  {passwordStatus.error && (
                    <div className="p-2 bg-red-50 text-danger text-[11px] font-medium rounded-lg flex items-center gap-1.5 border border-red-100">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{passwordStatus.error}</span>
                    </div>
                  )}

                  {passwordStatus.success && (
                    <div className="p-2 bg-green-50 text-secondary text-[11px] font-bold rounded-lg flex items-center gap-1.5 border border-green-100">
                      <CheckCircle2 size={13} className="shrink-0" />
                      <span>{passwordStatus.success}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Current Password</label>
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">New Password (min 6 characters)</label>
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Confirm New Password</label>
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordStatus.loading}
                    className="w-full mt-2 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-xs hover:bg-primary/90 transition disabled:opacity-50 cursor-pointer"
                  >
                    {passwordStatus.loading ? 'Updating Password...' : 'Save New Password'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Classroom Pedagogical Controls */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-darkText mb-3 flex items-center gap-2">
              <Sliders size={16} className="text-primary" /> Teaching & Assessment Controls
            </h3>

            <div className="space-y-3">
              {/* Voice Assistance Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-primary flex items-center justify-center shrink-0">
                    <Volume2 size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-darkText block">Student Voice Assistance</span>
                    <span className="text-[10px] text-gray-500 font-medium">Audio prompts in Hindi / Hinglish</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    voiceGuidance ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span 
                    className={`block w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform absolute top-1 ${
                      voiceGuidance ? 'left-6' : 'left-1'
                    }`} 
                  />
                </button>
              </div>

              {/* Curriculum Standard */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-darkText block">Curriculum Standard</span>
                    <span className="text-[10px] text-gray-500 font-medium">Class 3 Mathematics (FLN Place Value)</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  NCERT
                </span>
              </div>

              {/* Review Threshold */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 text-secondary flex items-center justify-center shrink-0">
                    <GraduationCap size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-darkText block">Diagnostic Sensitivity</span>
                    <span className="text-[10px] text-gray-500 font-medium">Flag for review below 75% accuracy</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-secondary bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  Standard
                </span>
              </div>
            </div>
          </div>

          {/* Legal, Policy & Privacy Compliance */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-darkText mb-2 flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" /> Data Governance & Policies
            </h3>
            <div className="divide-y divide-gray-100">
              <div 
                onClick={() => navigate('/terms')}
                className="py-3 flex justify-between items-center cursor-pointer hover:text-primary transition"
              >
                <div>
                  <span className="text-xs font-semibold text-gray-700 block">Terms of Service</span>
                  <span className="text-[10px] text-gray-400">Classroom ethics and assistive diagnostic guidelines</span>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
              
              <div 
                onClick={() => navigate('/privacy')}
                className="py-3 flex justify-between items-center cursor-pointer hover:text-primary transition"
              >
                <div>
                  <span className="text-xs font-semibold text-gray-700 block">Student Privacy & Data Safety</span>
                  <span className="text-[10px] text-gray-400">COPPA & FERPA compliant local data handling</span>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3.5 bg-red-50 text-danger hover:bg-red-100 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 border border-red-100 cursor-pointer shadow-2xs"
          >
            <LogOut size={16} /> Log Out of Teacher Account
          </button>

          {/* App Footer Info */}
          <div className="text-center pt-2 pb-4">
            <p className="text-[11px] font-medium text-gray-400">
              Reason-First • AI Diagnostic Co-Pilot v1.2
            </p>
            <p className="text-[10px] text-gray-400">
              Foundational Literacy & Numeracy Assessment
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </MobileWrapper>
  );
};

export default Settings;
