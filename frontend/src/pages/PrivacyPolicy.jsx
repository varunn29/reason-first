import React from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';

const PrivacyPolicy = () => {
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
          <h1 className="text-lg font-bold text-darkText">Privacy Policy</h1>
        </div>

        <div className="px-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 space-y-4">
            <div className="flex items-center gap-2 text-secondary font-bold text-sm">
              <Lock size={18} />
              <span>Student Privacy Commitment</span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Teacher Co-Pilot is built with privacy as a foundational principle. We believe children and students in foundational learning environments deserve the strongest data protections available.
            </p>

            <h2 className="text-xs font-bold text-darkText uppercase tracking-wider">1. Local-First Data Storage</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              All student activity logs, question answers, and diagnostic scores are processed locally on device or in an encrypted local school database. No student information is broadcast or sold to external advertisers or data aggregators.
            </p>

            <h2 className="text-xs font-bold text-darkText uppercase tracking-wider">2. Zero Third-Party Tracking</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              We do not embed third-party marketing pixels, analytics trackers, or social sharing SDKs. The application operates in isolated sandboxes to protect student anonymity and maintain focus on pedagogical outcomes.
            </p>

            <h2 className="text-xs font-bold text-darkText uppercase tracking-wider">3. Teacher Control & Retention</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Educators and authorized school administrators maintain full ownership and control over all classroom rosters and assessment history. Records can be reviewed, edited, or purged directly by the lead educator at any point.
            </p>
          </div>
        </div>
      </div>
    </MobileWrapper>
  );
};

export default PrivacyPolicy;
