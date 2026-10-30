import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';

const TermsOfService = () => {
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
          <h1 className="text-lg font-bold text-darkText">Terms of Service</h1>
        </div>

        <div className="px-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <ShieldCheck size={18} />
              <span>Educational Use Agreement</span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Welcome to Teacher Co-Pilot. By accessing or utilizing this diagnostic educational platform, you agree to comply with and be bound by the following terms and conditions of use.
            </p>

            <h2 className="text-xs font-bold text-darkText uppercase tracking-wider">1. Intended Purpose</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Teacher Co-Pilot is designed exclusively to support educators in multigrade classrooms and primary learning environments. The tool facilitates local diagnosis of foundational literacy and mathematics concepts to recommend curriculum-aligned offline interventions.
            </p>

            <h2 className="text-xs font-bold text-darkText uppercase tracking-wider">2. Ethical Classroom Standards</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Educators and authorized school facilitators agree to use this platform responsibly to uplift students. Diagnostic reports and learning gap markers are intended solely for instructional guidance and must never be employed punitively or shared outside authorized academic circles.
            </p>

            <h2 className="text-xs font-bold text-darkText uppercase tracking-wider">3. Offline-First Operation & Liability</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Teacher Co-Pilot operates on an edge-first model designed for intermittent network connectivity. Diagnostic heuristics provide pedagogical suggestions to support teacher judgment rather than substitute professional evaluation.
            </p>
          </div>
        </div>
      </div>
    </MobileWrapper>
  );
};

export default TermsOfService;
