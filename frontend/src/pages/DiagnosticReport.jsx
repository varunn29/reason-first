import React, { useContext } from 'react';
import { ArrowLeft, ChevronRight, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import AlertBox from '../components/AlertBox';
import ConceptBar from '../components/ConceptBar';
import CustomButton from '../components/CustomButton';
import { AppContext } from '../context/AppContext';

const DiagnosticReport = () => {
  const navigate = useNavigate();
  const { diagnosticResult } = useContext(AppContext);

  const isPass = diagnosticResult?.status === 'Pass';

  const conceptData = [
    { label: 'Addition', percentage: 92, color: 'bg-secondary' },
    { label: 'Subtraction', percentage: isPass ? 94 : 68, color: 'bg-secondary' },
    { label: 'Multiplication', percentage: 75, color: 'bg-accent' },
    { label: 'Division', percentage: 54, color: 'bg-danger' },
    { label: 'Borrowing', percentage: isPass ? 88 : 32, color: isPass ? 'bg-secondary' : 'bg-danger' },
  ];

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-bgMain pb-28">
        {/* Header */}
        <div className="px-5 pt-8 pb-4 flex items-center gap-4 bg-bgMain sticky top-0 z-20">
          <button 
            type="button"
            aria-label="Back to Dashboard"
            onClick={() => navigate('/dashboard')} 
            className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-primary transition active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-darkText">AI Diagnostic Report</h1>
        </div>

        <div className="px-5">
          {/* Student Info */}
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm mb-5 border border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul" alt="Student" className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-darkText">Rahul Kumar</h3>
                <p className="text-xs text-gray-500">Grade 3 - Section A</p>
              </div>
            </div>
            <span className="text-xs font-medium text-gray-400">Oct 26, 2026</span>
          </div>

          {/* Dynamic Alert Box */}
          <AlertBox 
            title={isPass ? "Performance Good" : "Learning Gap Detected"} 
            description={
              diagnosticResult?.message || "Rahul needs help with 'Borrowing' concept in subtraction."
            } 
          />

          {/* Performance Overview (Donut Chart) */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 mb-5">
            <h2 className="text-sm font-bold text-darkText mb-4">Performance Overview</h2>
            <div className="flex items-center gap-6">
              {/* CSS Donut Chart */}
              <div className="w-20 h-20 rounded-full border-[8px] border-secondary flex items-center justify-center relative shrink-0 shadow-sm">
                <div className="text-center">
                  <span className="block text-xl font-extrabold text-darkText leading-none">
                    {isPass ? '92%' : '68%'}
                  </span>
                  <span className="block text-[8px] text-gray-400 font-medium mt-0.5">Overall</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
                  <span className="text-gray-600 flex-1 font-medium">Strong</span>
                  <span className="font-bold text-darkText">{isPass ? '85%' : '68%'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent"></div>
                  <span className="text-gray-600 flex-1 font-medium">Needs Practice</span>
                  <span className="font-bold text-darkText">{isPass ? '10%' : '22%'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-danger"></div>
                  <span className="text-gray-600 flex-1 font-medium">Weak</span>
                  <span className="font-bold text-darkText">{isPass ? '5%' : '10%'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Concept-wise Performance */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 mb-5">
            <h2 className="text-sm font-bold text-darkText mb-4">Concept-wise Performance</h2>
            {conceptData.map((concept, index) => (
              <ConceptBar 
                key={index} 
                label={concept.label} 
                percentage={concept.percentage} 
                color={concept.color} 
              />
            ))}
          </div>

          {/* Next Step Actions */}
          <div className="bg-blue-50/60 rounded-3xl p-5 shadow-sm border border-blue-100 mb-6">
            <div className="flex items-center gap-2 mb-3.5">
              <Bookmark size={18} className="text-primary" />
              <h2 className="text-sm font-bold text-darkText">Next-Step Actions</h2>
            </div>
            <ul className="space-y-2.5">
              {isPass ? (
                <>
                  <li className="flex gap-2.5 text-xs text-gray-700 items-baseline">
                    <span className="text-primary font-bold">1.</span>
                    <span>Advance Rahul to 3-digit subtraction and word problems.</span>
                  </li>
                  <li className="flex gap-2.5 text-xs text-gray-700 items-baseline">
                    <span className="text-primary font-bold">2.</span>
                    <span>Encourage peer-tutoring with classmates on borrowing techniques.</span>
                  </li>
                  <li className="flex gap-2.5 text-xs text-gray-700 items-baseline">
                    <span className="text-primary font-bold">3.</span>
                    <span>Assign the next Math Adventure quest.</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-2.5 text-xs text-gray-700 items-baseline">
                    <span className="text-primary font-bold">1.</span>
                    <span>Use 10 physical sticks to demonstrate tens-to-ones regrouping.</span>
                  </li>
                  <li className="flex gap-2.5 text-xs text-gray-700 items-baseline">
                    <span className="text-primary font-bold">2.</span>
                    <span>Practice borrowing with visual base-ten counting blocks.</span>
                  </li>
                  <li className="flex gap-2.5 text-xs text-gray-700 items-baseline">
                    <span className="text-primary font-bold">3.</span>
                    <span>Assign 5 targeted subtraction MCQs on borrowing.</span>
                  </li>
                  <li className="flex gap-2.5 text-xs text-gray-700 items-baseline">
                    <span className="text-primary font-bold">4.</span>
                    <span>Schedule a 3-day diagnostic re-test.</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Action Button */}
        <div className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-gray-100 p-4 pb-safe z-50">
          <CustomButton 
            text="Back to Dashboard" 
            icon={<ChevronRight size={18} />}
            onClick={() => navigate('/dashboard')} 
          />
        </div>
      </div>
    </MobileWrapper>
  );
};

export default DiagnosticReport;
