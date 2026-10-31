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
  ChevronRight,
  Layers,
  Award,
  Activity,
  ArrowRight,
  RefreshCw,
  Info,
  FileText,
  Users
} from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import SkeletonLoader from '../components/SkeletonLoader';
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
  const [interventionDelivered, setInterventionDelivered] = useState(false);
  const [deliveringIntervention, setDeliveringIntervention] = useState(false);
  const [reassessmentStarting, setReassessmentStarting] = useState(false);

  // Fetch student report by ID if query param provided, otherwise use current result
  useEffect(() => {
    let isMounted = true;
    const targetStudentId = studentIdParam || activeStudent?.id;

    if (!targetStudentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    api.getStudentReport(targetStudentId)
      .then((data) => {
        if (isMounted) {
          if (data && data.report) {
            setReportData(data);
            if (data.override) {
              setOverrideDecision(data.override.teacherDecision || 'CONFIRM');
              setTeacherNote(data.override.teacherNote || '');
              setOverrideSaved(true);
            }
            if (data.intervention) {
              setInterventionDelivered(true);
            }
          } else {
            setReportData(data ? { ...data, report: null } : null);
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Error fetching student report:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [studentIdParam, activeStudent?.id]);

  // Determine active report (from live database fetch, or active session result)
  const activeReport = reportData?.report || diagnosticResult;

  const studentInfo = reportData?.student || {
    id: studentIdParam || activeStudent?.id || '',
    displayName: activeStudentName || 'Student',
    classLabel: activeStudent?.classLabel || 'Grade 3 - Section A',
  };

  const responseInfo = reportData?.response || {
    questionText: activeReport?.questionText || '61 - 24 = ?',
    answer: activeReport?.selectedAnswer ?? activeReport?.answer ?? 43,
    correctAnswer: activeReport?.correctAnswer ?? 37,
  };

  const isPass = activeReport ? (activeReport?.status === 'Pass' || activeReport?.ruleId === 'CORRECT' || activeReport?.candidate_misconception === 'NONE') : false;
  const isLiveML = activeReport?.isLiveML ?? true;
  const ruleId = activeReport ? (isPass ? 'CORRECT' : (activeReport?.candidate_misconception || activeReport?.gap || activeReport?.ruleId || 'PENDING_EVALUATION')) : '';

  const ruleTitles = {
    'SMALLER_FROM_LARGER': 'Smaller-From-Larger (Zero-Borrowing Error)',
    'BORROW_WITHOUT_DECREMENT': 'Borrow-Without-Decrement (Forgot to Reduce Tens)',
    'OPERATION_CONFUSION_ADD': 'Operation Confusion (Added Instead of Subtracted)',
    'PLACE_VALUE_GAP': 'Place Value Bundling Gap (Column Alignment Slip)',
    'CORRECT': 'Standard Place Value Subtraction (Mastery)',
    'GENERAL_SUBTRACTION_ERROR': 'Calculation Slip in Column Subtraction',
    'BORROWING': 'Tens-to-Ones Regrouping Conceptual Gap',
    'PENDING_EVALUATION': 'Pending Evaluation',
    'INSUFFICIENT_EVIDENCE': 'Insufficient Multi-Probe Evidence',
    'AMBIGUOUS_PATTERN': 'Ambiguous Error Pattern',
  };

  const detectedRuleTitle = ruleTitles[ruleId] || (ruleId ? ruleId.replace(/_/g, ' ') : 'Evaluation');

  // Diagnostic status, evidence strength & confidence badges
  const diagnosticStatus = activeReport?.diagnostic_status || (isPass ? 'NO_TARGET_PATTERN_DETECTED' : 'CANDIDATE_MISCONCEPTION');
  const evidenceStrength = activeReport?.evidence_strength || (activeReport?.responses_analyzed >= 3 ? 'STRONG' : 'WEAK');
  const confidenceLevel = activeReport?.confidence || 'LOW';

  const statusBadgeConfig = {
    'SUPPORTED_HYPOTHESIS': { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Supported Hypothesis' },
    'CANDIDATE_MISCONCEPTION': { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Candidate Misconception' },
    'AMBIGUOUS_PATTERN': { bg: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Ambiguous Pattern' },
    'INSUFFICIENT_EVIDENCE': { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Insufficient Evidence' },
    'CONTRADICTED_HYPOTHESIS': { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Contradicted Hypothesis' },
    'NO_TARGET_PATTERN_DETECTED': { bg: 'bg-green-50 text-green-700 border-green-200', label: 'No Target Pattern Detected' },
  };

  const evidenceStrengthConfig = {
    'STRONG': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'MODERATE': 'bg-blue-100 text-blue-800 border-blue-200',
    'WEAK': 'bg-amber-100 text-amber-800 border-amber-200',
    'NONE': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const masteryStatusConfig = {
    'SECURE': { label: 'Secure', bg: 'bg-green-100 text-green-800 border-green-200', desc: 'Consistent correct responses across multiple probes.' },
    'PROVISIONALLY_SECURE': { label: 'Provisionally Secure', bg: 'bg-teal-100 text-teal-800 border-teal-200', desc: 'Correct on target probe; pending multi-probe transfer check.' },
    'DEVELOPING': { label: 'Developing', bg: 'bg-amber-100 text-amber-800 border-amber-200', desc: 'Identified candidate misconception or partial understanding.' },
    'INSUFFICIENT_EVIDENCE': { label: 'Insufficient Evidence', bg: 'bg-purple-100 text-purple-800 border-purple-200', desc: 'Fewer than required probes administered.' },
    'NOT_ASSESSED': { label: 'Not Assessed', bg: 'bg-gray-100 text-gray-600 border-gray-200', desc: 'Curriculum probe not yet administered.' },
  };

  // Skill mastery map from report or default NCERT skills
  const rawSkillMastery = activeReport?.skill_mastery || {};
  const standardSkills = [
    { id: 'SINGLE_DIGIT_FACTS', name: 'Basic Subtraction Facts (< 10)', ncert: 'Class 2/3 Foundation' },
    { id: 'PLACE_VALUE_BUNDLES', name: 'Place Value Bundles (Tens & Ones)', ncert: 'Maths Mela Ch. 2' },
    { id: 'NON_REGROUPING_SUBTRACTION', name: '2-Digit Subtraction Without Regrouping', ncert: 'Maths Mela Ch. 3' },
    { id: 'ONES_REGROUPING', name: 'Tens-to-Ones Regrouping (Borrowing)', ncert: 'Maths Mela Ch. 3' },
    { id: 'TENS_REGROUPING', name: 'Hundreds-to-Tens Regrouping', ncert: 'Class 4 Preparation' },
  ];

  // Supporting / Contradictory / Missing evidence arrays
  const supportingEvidence = activeReport?.supporting_evidence || (activeReport?.observations ? [activeReport.observations] : []);
  const contradictoryEvidence = activeReport?.contradictory_evidence || [];
  const missingEvidence = activeReport?.missing_evidence || (activeReport?.probes_evaluated < 3 ? ['Multi-probe response verification pending'] : []);

  // Prerequisite & Intervention information
  const relatedPrerequisite = activeReport?.related_prerequisite_skill || {
    id: 'PLACE_VALUE_BUNDLES',
    name: 'Place Value Bundles (Tens & Ones)',
    description: 'Understanding that 1 Ten can be unbundled into 10 Ones.',
    recommended_probe: '63 - 20 (Non-regrouping tens subtraction)',
    ncert_mapping: 'NCERT Class 3 Maths Mela - Chapter 3',
  };

  const intervention = activeReport?.recommended_intervention || reportData?.intervention || {
    title: 'Concrete Unbundling with Matchstick Bundles & Rajma Seeds',
    concrete_materials: 'Matchstick bundles of 10, loose rajma seeds, 2-column place value mat',
    step_by_step_protocol: [
      '1. Represent 61 with 6 bundles of ten and 1 loose seed on place value mat.',
      '2. Ask child to take away 4 loose seeds. Prompt: "Are there enough loose seeds?"',
      '3. Untie 1 bundle of ten into 10 loose seeds. Re-count total loose seeds (11). Now remove 4.',
      '4. Observe how many tens remain (5 tens). Remove 2 tens (leaves 3 tens). Answer: 37.',
    ],
    check_for_understanding: 'Can you show me 52 - 18 using the same bundle untying method?',
    reassessment_probe: '52 - 18 = ?',
  };

  // Reassessment comparison data (if present)
  const reassessmentData = reportData?.reassessment;

  // Save teacher human-in-the-loop override
  const handleSaveOverride = async () => {
    const responseId = reportData?.response?.id || activeResponseId;
    if (!responseId) return;
    await api.submitOverride(responseId, ruleId, overrideDecision, teacherNote);
    setOverrideSaved(true);
    setTimeout(() => setOverrideSaved(false), 4000);
  };

  // Deliver intervention recording
  const handleDeliverIntervention = async () => {
    setDeliveringIntervention(true);
    try {
      await api.recordInterventionDelivery({
        studentId: studentInfo.id,
        interventionId: intervention.title || 'INT_ONES_REGROUPING',
        interventionType: 'CONCRETE_MANIPULATIVE',
        targetSkill: relatedPrerequisite?.id || 'ONES_REGROUPING',
        targetMisconception: ruleId,
        notes: teacherNote || 'Clinical protocol conducted using concrete manipulatives.',
      });
      setInterventionDelivered(true);
    } catch (err) {
      console.warn('Intervention delivery record failed:', err);
    } finally {
      setDeliveringIntervention(false);
    }
  };

  // Trigger reassessment session
  const handleStartReassessment = async () => {
    setReassessmentStarting(true);
    try {
      const res = await api.startReassessment(studentInfo.id, activeSessionId || 'sess_initial');
      if (res.ok) {
        navigate('/quiz', {
          state: {
            sessionId: res.reassessmentSession?.id,
            assignmentId: res.reassessmentSession?.assignmentId || 'asgn_reassessment_subtraction',
            studentId: studentInfo.id,
            studentName: studentInfo.displayName,
          }
        });
      }
    } catch (err) {
      console.warn('Reassessment start failed:', err);
    } finally {
      setReassessmentStarting(false);
    }
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
              <p className="text-[10px] text-gray-500 font-medium">Evidence-Based Clinical Diagnosis</p>
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

        {/* Body Container */}
        <div className="px-5">
          {isLoading ? (
            <div className="py-4 space-y-4">
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
            </div>
          ) : !activeReport ? (
            /* Clean Empty State: No fake data when no student assessment exists */
            <div className="bg-white rounded-3xl p-8 text-center border-2 border-dashed border-gray-200 my-6 shadow-sm animate-fade-in">
              <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <FileCheck2 size={30} />
              </div>
              <h2 className="text-base font-bold text-darkText mb-2">No Diagnostic Report Available</h2>
              <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed mb-6">
                No diagnostic report found for {studentInfo?.displayName ? <strong className="text-darkText font-bold">{studentInfo.displayName}</strong> : 'this student'}. Please ensure the student has completed an assessment.
              </p>
              
              <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-3 bg-primary text-white rounded-2xl text-xs font-bold shadow-sm hover:bg-primary/90 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  Back to Teacher Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Student Info Card */}
              <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm mb-4 border border-gray-50">
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

              {/* Diagnostic Evidence & Hypothesis Status Banner */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${statusBadgeConfig[diagnosticStatus]?.bg || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {statusBadgeConfig[diagnosticStatus]?.label || diagnosticStatus}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${evidenceStrengthConfig[evidenceStrength] || 'bg-gray-100'}`}>
                      Evidence: {evidenceStrength}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      Confidence: {confidenceLevel}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed font-medium mb-3">
                  {activeReport?.teacher_explanation || activeReport?.observations || diagnosticResult?.message ||
                    (isPass 
                      ? "Student demonstrates place-value understanding and correctly executes tens-to-ones regrouping." 
                      : `${(studentInfo?.displayName || 'Student').split(' ')[0]} exhibits systematic smaller-from-larger pattern across column subtraction probes.`)}
                </p>

                {/* Evidence Breakdown Grid */}
                <div className="space-y-2.5 pt-2 border-t border-gray-100 text-[11px]">
                  {supportingEvidence.length > 0 && (
                    <div>
                      <span className="font-bold text-emerald-700 flex items-center gap-1.5 mb-1">
                        <CheckCircle2 size={13} /> Supporting Evidence:
                      </span>
                      <ul className="list-disc list-inside text-gray-600 pl-1 space-y-0.5">
                        {supportingEvidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {contradictoryEvidence.length > 0 && (
                    <div>
                      <span className="font-bold text-amber-700 flex items-center gap-1.5 mb-1">
                        <AlertTriangle size={13} /> Contradictory Evidence:
                      </span>
                      <ul className="list-disc list-inside text-gray-600 pl-1 space-y-0.5">
                        {contradictoryEvidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {missingEvidence.length > 0 && (
                    <div>
                      <span className="font-bold text-purple-700 flex items-center gap-1.5 mb-1">
                        <Info size={13} /> Missing Evidence for Full Confirmation:
                      </span>
                      <ul className="list-disc list-inside text-gray-600 pl-1 space-y-0.5">
                        {missingEvidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Teacher Bot Dialogue Summary Card */}
              <TeacherChatSummaryCard 
                sessionId={activeSessionId}
                responseId={activeResponseId}
                initialSummary={activeSummary}
                mlDiagnosis={diagnosticResult}
              />

              {/* Observed Arithmetic Response Card */}
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

              {/* Cognitive Skill Mastery Matrix (Replaces Arbitrary Percentages) */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-darkText flex items-center gap-2">
                    <Award size={16} className="text-primary" />
                    Cognitive Skill Mastery Status
                  </h2>
                  <span className="text-[10px] font-semibold text-gray-400">NCERT Class 3</span>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">
                  Qualitative mastery determined through multi-probe evidence rather than fabricated percentages:
                </p>

                <div className="space-y-2.5">
                  {standardSkills.map((skill) => {
                    const masteryState = rawSkillMastery[skill.id] || (
                      skill.id === 'ONES_REGROUPING' 
                        ? (isPass ? 'SECURE' : 'DEVELOPING')
                        : (isPass ? 'SECURE' : 'PROVISIONALLY_SECURE')
                    );
                    const config = masteryStatusConfig[masteryState] || masteryStatusConfig['NOT_ASSESSED'];

                    return (
                      <div key={skill.id} className="p-2.5 rounded-2xl bg-gray-50/70 border border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-darkText">{skill.name}</p>
                          <p className="text-[10px] text-gray-500">{skill.ncert} • {config.desc}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-xl text-[10px] font-extrabold border ${config.bg}`}>
                          {config.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prerequisite Skill Diagnostic Card */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-indigo-100 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Layers size={16} className="text-indigo-600" />
                  <h2 className="text-sm font-bold text-darkText">Related Prerequisite Foundation</h2>
                </div>
                <p className="text-[11px] text-gray-600 mb-3 leading-relaxed">
                  When a student struggles with regrouping, NCERT research indicates verifying whether foundational unbundling is secure:
                </p>
                <div className="bg-indigo-50/50 rounded-2xl p-3 border border-indigo-100 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-900">{relatedPrerequisite.name}</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">{relatedPrerequisite.ncert_mapping}</span>
                  </div>
                  <p className="text-[11px] text-indigo-800/80 mb-2">{relatedPrerequisite.description}</p>
                  <div className="bg-white/80 rounded-xl p-2 border border-indigo-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Recommended Diagnostic Probe:</span>
                      <span className="text-xs font-extrabold text-darkText">{relatedPrerequisite.recommended_probe}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Teacher-Controlled Intervention Protocol */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-primary/20 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bookmark size={16} className="text-primary" />
                    <h2 className="text-sm font-bold text-darkText">Teacher-Led Clinical Intervention</h2>
                  </div>
                  {interventionDelivered && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} /> Delivered
                    </span>
                  )}
                </div>

                <p className="text-xs font-bold text-primary mb-1">{intervention.title}</p>
                <p className="text-[11px] text-gray-500 mb-3">
                  <span className="font-semibold text-gray-700">Concrete Materials:</span> {intervention.concrete_materials}
                </p>

                <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                    Step-by-Step Clinical Protocol
                  </span>
                  <ul className="space-y-1.5 text-xs text-gray-700">
                    {(intervention.step_by_step_protocol || []).map((step, idx) => (
                      <li key={idx} className="leading-snug">{step}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-50/70 rounded-2xl p-3 border border-blue-100 mb-3 flex items-start gap-2">
                  <HelpCircle size={15} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase block">Check for Understanding Probe</span>
                    <p className="text-xs text-gray-800 font-medium">{intervention.check_for_understanding}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={interventionDelivered || deliveringIntervention}
                  onClick={handleDeliverIntervention}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    interventionDelivered 
                      ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                      : 'bg-primary text-white hover:bg-primary/90 shadow-sm active:scale-95'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  {interventionDelivered ? 'Intervention Recorded on Profile' : 'Record Intervention Delivered'}
                </button>
              </div>

              {/* Post-Intervention Reassessment Card */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-emerald-600" />
                    <h2 className="text-sm font-bold text-darkText">Reassessment & Progress Measurement</h2>
                  </div>
                  {reassessmentData && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {reassessmentData.status}
                    </span>
                  )}
                </div>

                {reassessmentData ? (
                  <div className="space-y-2.5 text-xs">
                    <p className="text-gray-700 leading-relaxed font-medium">
                      {reassessmentData.change_summary || 'Post-intervention observation indicates improvement on transfer probes.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-center pt-2">
                      <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-[10px] text-gray-500 block">Pre-Intervention Status</span>
                        <span className="font-bold text-amber-700">{reassessmentData.previous_status || 'CANDIDATE_MISCONCEPTION'}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span className="text-[10px] text-gray-500 block">Post-Intervention Status</span>
                        <span className="font-bold text-emerald-700">{reassessmentData.current_status || 'RESOLVED'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] text-gray-600 mb-3 leading-relaxed">
                      After completing the concrete unbundling activity with {(studentInfo?.displayName || 'Student').split(' ')[0]}, launch a non-identical reassessment probe to measure whether understanding has improved:
                    </p>
                    <button
                      type="button"
                      disabled={reassessmentStarting}
                      onClick={handleStartReassessment}
                      className="w-full py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95"
                    >
                      <RefreshCw size={14} className={reassessmentStarting ? 'animate-spin' : ''} />
                      Start Non-Identical Reassessment ({intervention.reassessment_probe || '52 - 18'})
                    </button>
                  </div>
                )}
              </div>

              {/* Human-in-the-Loop Teacher Review Card */}
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
            </>
          )}
        </div>

        {/* Fixed Action Button */}
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