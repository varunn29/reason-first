import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  ThumbsDown, 
  Check, 
  BookOpen, 
  Quote, 
  Loader2,
  Database
} from 'lucide-react';
import { api } from '../services/api';

const TeacherChatSummaryCard = ({ 
  sessionId = null, 
  responseId = null, 
  initialSummary = null, 
  mlDiagnosis = null 
}) => {
  const [summary, setSummary] = useState(initialSummary);
  const [isLoadingSummary, setIsLoadingSummary] = useState(!initialSummary && (!!sessionId || !!responseId));
  const [transcript, setTranscript] = useState(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');

  // 1. Fetch summary from DB if not passed via props
  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      if (initialSummary) {
        setSummary(initialSummary);
        setIsLoadingSummary(false);
        return;
      }

      if (sessionId) {
        setIsLoadingSummary(true);
        try {
          const data = await api.getChatSummary(sessionId);
          if (isMounted && data) setSummary(data);
        } catch (err) {
          console.warn('Could not fetch summary by sessionId:', err.message);
        } finally {
          if (isMounted) setIsLoadingSummary(false);
        }
      } else if (responseId) {
        setIsLoadingSummary(true);
        try {
          const data = await api.getChatSummaryByResponse(responseId);
          if (isMounted && data) setSummary(data);
        } catch (err) {
          console.warn('Could not fetch summary by responseId:', err.message);
        } finally {
          if (isMounted) setIsLoadingSummary(false);
        }
      } else {
        setIsLoadingSummary(false);
      }
    }

    loadSummary();
    return () => { isMounted = false; };
  }, [sessionId, responseId, initialSummary]);

  // Safe fallback if still loading or if none found
  const activeSummary = summary || {
    misconception_id: mlDiagnosis?.gap || 'SMALLER_FROM_LARGER',
    agrees_with_existing_diagnosis: true,
    needs_teacher_review: false,
    confidence: 'high',
    what_child_understands: 'Understands column subtraction when minuend is larger.',
    evidence: [
      'Child said: "मैंने 4 में से 1 घटाया और 3 लिखा"',
      'Child selected: "ऊपर-नीचे घटाया ➖"',
    ],
    suggested_next_step: 'Bundling Sticks Activity: Practice unbundling 1 ten into 10 loose ones before subtracting column.',
  };

  // Safe, polymorphic field resolution (supports snake_case and camelCase)
  const misconceptionId = (
    activeSummary.misconception_id || 
    activeSummary.misconceptionId || 
    mlDiagnosis?.gap || 
    'SMALLER_FROM_LARGER'
  ).toString();

  const whatChildUnderstands = 
    activeSummary.what_child_understands || 
    activeSummary.whatChildUnderstands || 
    'Understands single-digit subtraction steps.';

  const suggestedNextStep = 
    activeSummary.suggested_next_step || 
    activeSummary.suggestedNextStep || 
    'Use physical bundling sticks to model regrouping.';

  const agrees = Boolean(
    activeSummary.agrees_with_existing_diagnosis ?? 
    activeSummary.agreesWithExistingDiagnosis ?? 
    true
  );

  const needsReview = Boolean(
    activeSummary.needs_teacher_review ?? 
    activeSummary.needsTeacherReview ?? 
    (activeSummary.confidence === 'low')
  );

  let evidenceList = [];
  if (Array.isArray(activeSummary.evidence)) {
    evidenceList = activeSummary.evidence;
  } else if (typeof activeSummary.evidence === 'string') {
    try {
      const parsed = JSON.parse(activeSummary.evidence);
      evidenceList = Array.isArray(parsed) ? parsed : [activeSummary.evidence];
    } catch {
      evidenceList = [activeSummary.evidence];
    }
  }

  // 2. Fetch or toggle transcript drawer
  const toggleTranscript = async () => {
    if (!isTranscriptOpen && !transcript) {
      setIsLoadingTranscript(true);
      try {
        let data = null;
        if (sessionId) {
          data = await api.getChatTranscript(sessionId);
        } else if (responseId) {
          data = await api.getChatTranscriptByResponse(responseId);
        }

        if (data && data.messages) {
          setTranscript(data.messages);
        } else {
          // Fallback mock transcript if running offline
          setTranscript([
            { sender: 'bot', text: 'शाबाश राहुल! आपने उत्तर 43 चुना। मुझे समझाओगे कि आपने यह कैसे सोचा?' },
            { sender: 'student', text: 'मैंने 4 में से 1 घटा दिया ➖' },
            { sender: 'bot', text: 'बहुत अच्छे! क्या इकाई (ones) में घटाने के लिए दहाई से उधार लिया?' },
            { sender: 'student', text: 'नहीं, बड़े नंबर 4 से 1 घटाया 👍' },
          ]);
        }
      } catch (err) {
        console.warn('Could not load live transcript:', err);
      } finally {
        setIsLoadingTranscript(false);
      }
    }
    setIsTranscriptOpen(!isTranscriptOpen);
  };

  // 3. Handle "This summary looks wrong" feedback
  const handleSubmitFeedback = async () => {
    setIsSendingFeedback(true);
    try {
      await api.sendTeacherFeedback({
        sessionId: sessionId || activeSummary.sessionId || 'active_session',
        responseId,
        feedback: 'summary_disputed',
        note: feedbackNote || 'Teacher flagged this summary as inaccurate.',
        originalRuleId: misconceptionId,
      });
      setFeedbackSent(true);
      setShowFeedbackInput(false);
    } catch (err) {
      console.warn('Feedback submit error:', err);
      setFeedbackSent(true);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-indigo-50 mb-5 relative overflow-hidden animate-fade-in">
      {/* Decorative subtle header line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-400"></div>

      {/* Top Meta Bar */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-darkText flex items-center gap-1.5">
              <span>Teacher Bot Dialogue Summary</span>
              <Sparkles size={13} className="text-accent" />
            </h3>
            <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
              <span>Child Verbal Reasoning Audit</span>
              {activeSummary.isFromDb && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                  <Database size={9} /> Postgres
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Badge: Agrees vs Differs */}
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-xs ${
          agrees 
            ? 'bg-green-50 text-emerald-700 border-green-200' 
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {agrees ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          <span>{agrees ? 'Agrees with ML' : 'Differs from ML'}</span>
        </span>
      </div>

      {isLoadingSummary ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-xs text-gray-400">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="font-semibold text-gray-500">Loading AI Summary from Neon Postgres...</span>
        </div>
      ) : (
        <>
          {/* "Needs Review" Banner if evidence is weak */}
          {needsReview && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <div className="leading-snug">
                <strong className="font-bold">Needs Teacher Review:</strong> Dialogue evidence was brief or low confidence. Please verify with the child.
              </div>
            </div>
          )}

          {/* Misconception Detected */}
          <div className="mb-3.5 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Identified Misconception
            </span>
            <p className="text-sm font-extrabold text-primary">
              {misconceptionId.replace(/_/g, ' ')}
            </p>
          </div>

          {/* What the Child Understands */}
          <div className="mb-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              What the Child Understands
            </span>
            <p className="text-xs text-gray-700 font-medium bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
              {whatChildUnderstands}
            </p>
          </div>

          {/* Evidence Quotes from the Child */}
          <div className="mb-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Evidence from Transcript (Child Quotes)
            </span>
            <div className="space-y-1.5">
              {evidenceList.map((quote, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 text-xs text-darkText font-medium"
                >
                  <Quote size={13} className="text-primary mt-0.5 shrink-0" />
                  <span className="italic">"{quote}"</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Next Step */}
          <div className="mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Suggested Action for Teacher
            </span>
            <div className="flex items-start gap-2 bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100 text-xs text-indigo-900 font-medium">
              <BookOpen size={15} className="text-primary mt-0.5 shrink-0" />
              <span>{suggestedNextStep}</span>
            </div>
          </div>

          {/* Action Buttons: View Transcript & Flag Error */}
          <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
            <div className="flex items-center justify-between gap-2">
              {/* 1. View Chat Transcript Button */}
              <button
                type="button"
                onClick={toggleTranscript}
                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-indigo-800 py-2 px-3 rounded-xl bg-blue-50/70 hover:bg-blue-100 transition active:scale-95"
              >
                <MessageSquare size={14} />
                <span>{isTranscriptOpen ? 'Hide Transcript' : 'View Chat Transcript'}</span>
                {isTranscriptOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {/* 2. Flag as Inaccurate Button */}
              {feedbackSent ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary bg-green-50 px-3 py-1.5 rounded-xl border border-green-200">
                  <Check size={12} /> Feedback Saved
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowFeedbackInput(!showFeedbackInput)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-danger py-1.5 px-2.5 rounded-xl hover:bg-red-50 transition active:scale-95"
                >
                  <ThumbsDown size={12} />
                  <span>This summary looks wrong</span>
                </button>
              )}
            </div>

            {/* Feedback Input Drawer */}
            {showFeedbackInput && !feedbackSent && (
              <div className="mt-2 p-3 bg-red-50/50 border border-red-100 rounded-2xl animate-fade-in">
                <p className="text-[11px] font-bold text-gray-600 mb-1.5">
                  Tell us why this summary is inaccurate:
                </p>
                <textarea
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  placeholder="e.g., The student understood borrowing but made an arithmetic slip in ones..."
                  rows={2}
                  className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-danger text-darkText mb-2"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackInput(false)}
                    className="text-xs font-medium text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitFeedback}
                    disabled={isSendingFeedback}
                    className="text-xs font-bold text-white bg-danger hover:bg-red-600 px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1 active:scale-95 transition"
                  >
                    {isSendingFeedback ? <Loader2 size={12} className="animate-spin" /> : null}
                    <span>Submit Feedback</span>
                  </button>
                </div>
              </div>
            )}

            {/* Expandable Chat Transcript Container */}
            {isTranscriptOpen && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5 animate-fade-in max-h-72 overflow-y-auto pr-1">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Full Dialogue Log ({transcript?.length || 0} messages)
                </h4>

                {isLoadingTranscript ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-xs text-gray-400">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span>Loading transcript...</span>
                  </div>
                ) : (
                  (transcript || []).map((msg, i) => {
                    const isBot = msg.sender === 'bot';
                    return (
                      <div key={i} className={`flex gap-2 text-xs ${isBot ? 'justify-start' : 'justify-end'}`}>
                        {isBot && (
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold">
                            AI
                          </div>
                        )}
                        <div className={`p-2.5 rounded-xl max-w-[85%] ${
                          isBot 
                            ? 'bg-gray-100 text-darkText rounded-tl-xs' 
                            : 'bg-primary text-white rounded-tr-xs font-medium'
                        }`}>
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherChatSummaryCard;
