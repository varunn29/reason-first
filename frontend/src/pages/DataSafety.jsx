import React from 'react';
import { ArrowLeft, Lock, MicOff, Clock, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';

const DataSafety = () => {
  const navigate = useNavigate();

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-bgMain pb-12">
        {/* Header */}
        <div className="px-5 pt-8 pb-4 flex items-center gap-4 bg-bgMain sticky top-0 z-20">
          <button 
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)} 
            className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-primary transition active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-darkText">Privacy & Data Safety</h1>
        </div>

        <div className="px-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 space-y-4">
            <div className="flex items-center gap-2 text-secondary font-bold text-sm">
              <Lock size={18} />
              <span>Child Safety & Privacy Architecture</span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Reason-First is built with strict privacy-by-design standards tailored for primary school students (Classes 3–5, ages 8–10) under MIT Solve 2027 guidelines.
            </p>

            {/* 1. Pseudonyms */}
            <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
                <ShieldCheck size={16} />
                <span>1. Zero Personal Identifiers Collected</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                We do not collect real full names, email addresses, phone numbers, or government IDs. Students are identified solely by first names or school roll numbers (e.g. <code>student_01</code>).
              </p>
            </div>

            {/* 2. No Raw Audio */}
            <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1">
                <MicOff size={16} />
                <span>2. Zero Raw Audio Stored on Servers</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                When students use voice recognition to explain their math thinking, speech is transcribed in real-time on-device via the browser’s Web Speech API. No audio recordings or voice files are uploaded or stored.
              </p>
            </div>

            {/* 3. 30-Day Auto Deletion */}
            <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 mb-1">
                <Clock size={16} />
                <span>3. 30-Day Automated Transcript Deletion</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Chat logs between the student and Teacher Bot are automatically purged after 30 days. Only high-level mathematical mastery summaries are preserved for teacher records.
              </p>
            </div>

            {/* 4. Non-grading Notice */}
            <h2 className="text-xs font-bold text-darkText uppercase tracking-wider pt-1">
              4. Formative Diagnostics, Not Grading
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              The AI Teacher Bot is an observational tool. It does not grade, penalize, or score children. It serves exclusively to help teachers discover whether students struggle with conceptual regrouping or fraction denominators.
            </p>
          </div>
        </div>
      </div>
    </MobileWrapper>
  );
};

export default DataSafety;
