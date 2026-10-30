import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, Bot, Sparkles } from 'lucide-react';
import CustomButton from './CustomButton';

const TeacherConsentModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if teacher has already accepted the AI diagnostic consent
    const hasConsented = localStorage.getItem('teacher_ai_chat_consent');
    if (!hasConsented) {
      setIsOpen(true);
    }
  }, []);

  const handleAgree = () => {
    localStorage.setItem('teacher_ai_chat_consent', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 text-center relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-secondary"></div>

        {/* Mascot / Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-primary flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
          <Bot size={34} />
        </div>

        <h3 className="text-lg font-extrabold text-darkText mb-1.5 flex items-center justify-center gap-1.5">
          <span>Teacher Co-Pilot: AI Chat Notice</span>
          <Sparkles size={16} className="text-accent" />
        </h3>

        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">
          Pedagogical Diagnostic Guidelines
        </p>

        {/* Mandatory Core Statement */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 mb-4 text-left shadow-xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={20} className="text-primary mt-0.5 shrink-0" />
            <p className="text-xs font-bold text-darkText leading-relaxed">
              "This chat is monitored by AI to help understand student reasoning. It is not a test. It does not grade the student."
            </p>
          </div>
        </div>

        {/* Key Guarantees */}
        <div className="space-y-2 text-left mb-6 text-xs text-gray-600 bg-gray-50/60 p-3.5 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-secondary shrink-0" />
            <span>Used strictly to discover underlying misconceptions.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-secondary shrink-0" />
            <span>Voice input is transcribed on-device; no raw audio is saved.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-secondary shrink-0" />
            <span>Transcripts are automatically purged after 30 days.</span>
          </div>
        </div>

        {/* Consent Button */}
        <CustomButton
          text="I Agree & Continue (स्वीकार करें)"
          variant="primary"
          onClick={handleAgree}
          icon={<CheckCircle2 size={18} />}
        />
      </div>
    </div>
  );
};

export default TeacherConsentModal;

