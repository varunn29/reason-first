import React, { useContext, useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Bookmark, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle, 
  FileCheck2, 
  Save, 
  Printer, 
  UserCheck, 
  ChevronRight 
} from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import AlertBox from '../components/AlertBox';
import ConceptBar from '../components/ConceptBar';
import CustomButton from '../components/CustomButton';
import TeacherChatSummaryCard from '../components/TeacherChatSummaryCard';
import { AppContext } from '../context/AppContext';
import { api } from '../services/api';

const DiagnosticReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { diagnosticResult, chatSummary, latestResponseId, activeStudent } = useContext(AppContext);

  const studentIdParam = searchParams.get('studentId');
  const studentNameParam = searchParams.get('name') || searchParams.get('studentName');
  const activeStudentName = location.state?.studentName || studentNameParam || activeStudent?.displayName || 'Student';
  const activeSessionId = location.state?.sessionId || searchParams.get('sessionId') || chatSummary?.sessionId;
  const activeResponseId = location.state?.responseId || searchParams.get('responseId') || latestResponseId || diagnosticResult?.responseId;
  const activeSummary = location.state?.summary || chatSummary;

  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [overrideDecision, setOverrideDecision] = useState('CONFIRM');
  const [teacherNote, setTeacherNote] = useState('');
  const [overrideSaved, setOverrideSaved] = useState(false);

  // Fetch student report by ID if query param provided, otherwise use current result
  useEffect(() => {
    let isMounted = true;
    const targetStudentId = studentIdParam || activeStudent?.id;
    if (!targetStudentId) return;

    setIsLoading(true);
    api.getStudentReport(targetStudentId).then((data) => {
      if (isMounted) {
        if (data && data.report) {
          setReportData(data);
          if (data.override) {
            setOverrideDecision(data.override.teacherDecision || 'CONFIRM');
            setTeacherNote(data.override.teacherNote || '');
            setOverrideSaved(true);
          }
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [studentIdParam, activeStudent?.id]);

  // Merge loaded report or context result
  const activeReport = reportData?.report || diagnosticResult;
  const studentInfo = reportData?.student || {
    id: studentIdParam || activeStudent?.id || '',
    displayName: activeStudentName,
    classLabel: activeStudent?.classLabel || 'Grade 3 - Section A',
  };
  const responseInfo = reportData?.response || {
    questionText: activeReport?.questionText || '61 - 24 = ?',
    answer: activeReport?.selectedAnswer ?? 43,
    correctAnswer: 37,
  };

  const isPass = activeReport?.status === 'Pass' || activeReport?.ruleId === 'CORRECT';
  const isLiveML = activeReport?.isLiveML ?? true;
  const ruleId = isPass ? 'CORRECT' : (activeReport?.gap || activeReport?.ruleId || 'PENDING_EVALUATION');

  const ruleTitles = {
    'SMALLER_FROM_LARGER': 'Smaller-From-Larger (Zero-Borrowing Error)',
    'BORROW_WITHOUT_DECREMENT': 'Borrow-Without-Decrement (Forgot to Reduce Tens)',
    'DENOMINATOR_ADDITION': 'Denominator Addition Bug (1+1 / 2+4)',
    'CORRECT': 'Standard Place Value Subtraction (Mastery)',
    'GENERAL_SUBTRACTION_ERROR': 'Calculation Slip in Column Subtraction',
    'BORROWING': 'Tens-to-Ones Regrouping Conceptual Gap',
  };

  const detectedRuleTitle = ruleTitles[ruleId] || ruleId;

  const conceptData = [
    { label: 'Place Value Concept (Tens/Ones)', percentage: isPass ? 96 : 42, color: isPass ? 'bg-secondary' : 'bg-danger' },
    { label: 'Two-Digit Regrouping Procedure', percentage: isPass ? 94 : 35, color: isPass ? 'bg-secondary' : 'bg-danger' },
    { label: 'Basic Subtraction Facts (< 10)', percentage: isPass ? 92 : 78, color: 'bg-secondary' },
    { label: 'Single-Digit Recall Speed', percentage: 85, color: 'bg-accent' },
  ];

  // Save teacher human-in-the-loop override
  const handleSaveOverride = async () => {
    const responseId = reportData?.response?.id || activeResponseId;
    if (!responseId) return;
    await api.submitOverride(responseId, ruleId, overrideDecision, teacherNote);
    setOverrideSaved(true);
    setTimeout(() => setOverrideSaved(false), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-bgMain pb-28 print:p-0 print:bg-white">
        {/* Header */}
        <div className="px-5 pt-8 pb-4 flex items-center justify-between bg-bgMain sticky top-0 z-20 print:static">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              aria-label="Back to Dashboard"
              onClick={() => navigate('/dashboard')} 
              className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-primary transition active:scale-95 print:hidden"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-darkText">AI Diagnostic Report</h1>
              <p className="text-[10px] text-gray-500 font-medium">Teacher Clinical Review</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print Report"
              className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-primary transition active:scale-95 print:hidden"
              title="Print / Save PDF"
            >
              <Printer size={16} />
            </button>
            {isLiveML && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-green-100 text-green-700 rounded-full border border-green-200 shadow-xs">
                <Sparkles size={12} /> ML Active
              </span>
            )}
          </div>
        </div>

        <div className="px-5">
          {/* Student Info Card */}
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm mb-5 border border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                <img 
                  src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${(studentInfo?.displayName || 'Student').split(' ')[0]}`} 
                  alt="Student" 
                  className="w-10 h-10" 
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-darkText">{studentInfo?.displayName || 'Student'}</h3>
                <p className="text-xs text-gray-500">{studentInfo?.classLabel || 'Grade 3 - Section A'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-[11px] font-bold block ${isPass ? 'text-secondary' : 'text-primary'}`}>
                {detectedRuleTitle}
              </span>
              <span className="text-[10px] text-gray-400">Class 3 Subtraction Diagnostic</span>
            </div>
          </div>

          {/* Dynamic Alert Box (BUG-04 Fixed: Green on Pass, Red on Misconception) */}
          <AlertBox 
            variant={isPass ? 'success' : 'danger'}
            title={isPass ? "Concept Mastery Demonstrated" : "Diagnostic Misconception Identified"} 
            description={
              activeReport?.observations || diagnosticResult?.message ||
              (isPass 
                ? "Student demonstrates place-value understanding and correctly executes tens-to-ones regrouping." 
                : `${activeStudentName.split(' ')[0]} requires targeted scaffolding with column subtraction unbundling.`)
            } 
          />

          {/* Teacher Bot Dialogue Summary Card */}
          <TeacherChatSummaryCard 
            sessionId={activeSessionId}
            responseId={activeResponseId}
            initialSummary={activeSummary}
            mlDiagnosis={diagnosticResult}
          />

          {/* Raw Evidence Card (BUG-10 Fixed: Shows problem, student answer, expected answer) */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 mb-5">
            <h2 className="text-sm font-bold text-darkText mb-3 flex items-center gap-2">
              <FileCheck2 size={16} className="text-primary" />
              Observed Arithmetic Response
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center bg-gray-50/80 rounded-2xl p-3 border border-gray-100">
              <div>
                <span className="text-[10px] text-gray-500 font-medium block">Problem</span>
                <span className="text-base font-extrabold text-darkText mt-0.5 block">
                  {responseInfo?.questionText || '61 - 24'}
                </span>
              </div>
              <div className="border-x border-gray-200">
                <span className="text-[10px] text-gray-500 font-medium block">Student Answer</span>
                <span className={`text-base font-extrabold mt-0.5 block ${isPass ? 'text-secondary' : 'text-danger'}`}>
                  {responseInfo?.answer ?? 43}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-medium block">Expected</span>
                <span className="text-base font-extrabold text-secondary mt-0.5 block">
                  {responseInfo?.correctAnswer ?? 37}
                </span>
              </div>
            </div>
          </div>

          {/* Human-in-the-Loop Teacher Review Card (BUG-04 Fixed) */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-indigo-100 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-darkText flex items-center gap-2">
                <UserCheck size={16} className="text-primary" />
                Teacher Clinical Review & Override
              </h2>
              {overrideSaved && (
                <span className="text-[10px] text-secondary font-bold flex items-center gap-1 animate-fade-in">
                  <CheckCircle2 size={12} /> Saved!
                </span>
              )}
            </div>
            
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
              NCERT guidelines advise treating automated flags as tentative hypotheses. Confirm or adjust based on observed scrap paper:
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Teacher Decision</label>
                <select 
                  value={overrideDecision}
                  onChange={(e) => setOverrideDecision(e.target.value)}
                  className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-primary"
                >
                  <option value="CONFIRM">Confirm AI Hypothesis ({ruleId})</option>
                  <option value="CALCULATION_SLIP">Override: Isolated Calculation Slip</option>
                  <option value="READING_REVERSAL">Override: Visual Reading Reversal</option>
                  <option value="CARELESS_ERROR">Override: Careless Number Transcription</option>
                  <option value="STUDENT_EXPLAINED_CORRECT">Override: Student Explained Correctly Orally</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Clinical Observation Notes</label>
                <textarea 
                  rows={2}
                  placeholder="e.g. Student crossed out tens column on scratch paper; error was a basic single-digit recall slip (4-1=3)."
                  value={teacherNote}
                  onChange={(e) => setTeacherNote(e.target.value)}
                  className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-primary resize-none placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveOverride}
              className="w-full py-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Save size={14} />
              Save Teacher Decision
            </button>
          </div>

          {/* Concept-wise Subtraction Performance */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 mb-5">
            <h2 className="text-sm font-bold text-darkText mb-4">Class 3 Subtraction Component Breakdown</h2>
            {conceptData.map((concept, index) => (
              <ConceptBar 
                key={index} 
                label={concept.label} 
                percentage={concept.percentage} 
                color={concept.color} 
              />
            ))}
          </div>

          {/* ML Pedagogical Guidance */}
          <div className="bg-blue-50/70 rounded-3xl p-5 shadow-sm border border-blue-100 mb-6">
            <div className="flex items-center gap-2 mb-3.5">
              <Bookmark size={18} className="text-primary" />
              <h2 className="text-sm font-bold text-darkText">Curriculum Pedagogical Scaffolding</h2>
            </div>
            <ul className="space-y-3">
              {activeReport?.followUpQuestion && (
                <li className="flex gap-2.5 text-xs text-gray-700 items-baseline">
                  <span className="text-primary font-bold shrink-0">1. Verbal Probe:</span>
                  <span>{activeReport.followUpQuestion}</span>
                </li>
              )}
              {activeReport?.suggestedActivity && (
                <li className="flex gap-2.5 text-xs text-gray-700 items-baseline">
                  <span className="text-primary font-bold shrink-0">2. Hands-on Activity:</span>
                  <span>{activeReport.suggestedActivity}</span>
                </li>
              )}
              {activeReport?.alternatives && activeReport.alternatives.length > 0 && (
                <li className="flex gap-2.5 text-xs text-gray-700 items-baseline">
                  <span className="text-primary font-bold shrink-0">3. Alternate Causes:</span>
                  <span>{activeReport.alternatives.join(', ')}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Action Button */}
        <div className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-gray-100 p-4 pb-safe z-50 print:hidden">
          <CustomButton 
            text="Back to Teacher Dashboard" 
            icon={<ChevronRight size={18} />}
            onClick={() => navigate('/dashboard')} 
          />
        </div>
      </div>
    </MobileWrapper>
  );
};

export default DiagnosticReport;
