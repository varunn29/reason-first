import React, { useContext, useState, useEffect } from 'react';
import { ArrowLeft, Volume2, Bot, Loader2, Sparkles, Award, Star, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import CustomButton from '../components/CustomButton';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const QuestionSolving = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    currentAssignment, 
    activeStudent, 
    setActiveStudent,
    studentAnswer, 
    setStudentAnswer, 
    setDiagnosticResult,
    diagnosticResult,
    setLatestResponseId,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    completedQuizResults,
    setCompletedQuizResults,
  } = useContext(AppContext);

  const studentId = currentUser?.id || activeStudent?.id || '';
  const studentName = currentUser?.name || activeStudent?.displayName || 'Student';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCheckedAnswer, setHasCheckedAnswer] = useState(false);
  const [currentQuestionResult, setCurrentQuestionResult] = useState(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Initialize unique assessment session
  useEffect(() => {
    let isMounted = true;
    async function initSession() {
      const assignmentId = currentAssignment?.id || 'asgn_class3_subtraction';
      try {
        const res = await api.startAssessmentSession(studentId, assignmentId, studentName);
        if (isMounted && res?.session?.id) {
          setActiveSessionId(res.session.id);
        }
      } catch (err) {
        console.warn('Session init fallback:', err);
      }
    }
    initSession();
    return () => { isMounted = false; };
  }, [studentId, studentName, currentAssignment?.id]);

  const questions = currentAssignment?.questions || [
    {
      id: 'probe_01',
      text: '61 - 24 = ?',
      options: [37, 43, 47, 35],
      correctAnswer: 37,
      topic: 'Subtraction',
      chapter: 'NCERT Class 3 Chapter 4',
      distractors: {
        43: 'Smaller-from-larger (subtracted 4 - 1 = 3 in ones)',
        47: 'Borrow without decrement (forgot to reduce tens)',
        35: 'Calculation slip',
      },
    }
  ];

  const totalQuestions = questions.length;
  const safeIndex = Math.min(currentQuestionIndex, totalQuestions - 1);
  const question = questions[safeIndex] || questions[0];
  const options = question.options || [];
  const correctAnswer = question.correctAnswer;
  const isLastQuestion = safeIndex === totalQuestions - 1;

  // Clear answer state when moving to a new question
  useEffect(() => {
    setStudentAnswer(null);
    setHasCheckedAnswer(false);
    setCurrentQuestionResult(null);
  }, [safeIndex, setStudentAnswer]);

  const handleSelect = (option) => {
    if (!hasCheckedAnswer && !isSubmitting) {
      setStudentAnswer(option);
    }
  };

  // 1. Submit answer to ML engine & verify
  const handleCheckAnswer = async () => {
    if (studentAnswer === null || hasCheckedAnswer || isSubmitting) return;

    setIsSubmitting(true);
    let submittedDiag = null;
    try {
      if (activeSessionId) {
        await api.submitSessionResponse(activeSessionId, {
          questionId: question.id,
          questionText: question.text,
          answer: studentAnswer,
          correctAnswer,
          studentId,
          studentName,
        });
      }

      const diag = await api.submitAnswer(
        studentId,
        question.id,
        studentAnswer,
        correctAnswer,
        {
          questionText: question.text,
          assignmentId: currentAssignment?.id || 'asgn_class3_subtraction',
          studentName: studentName,
          sessionId: activeSessionId,
        }
      );
      submittedDiag = diag;
      setDiagnosticResult(diag);
      setCurrentQuestionResult(diag);

      if (diag?.responseId && setLatestResponseId) {
        setLatestResponseId(diag.responseId);
      }

      // Accumulate into results list with topic and chapter for smart grouping
      setCompletedQuizResults((prev) => [
        ...prev,
        {
          questionId: question.id,
          questionText: question.text,
          studentAnswer,
          correctAnswer,
          isCorrect: studentAnswer === correctAnswer,
          diagnosis: diag,
          topic: question.topic || question.chapter || currentAssignment?.topic || 'Subtraction',
          chapter: question.chapter || question.topic || 'NCERT Class 3',
        }
      ]);

      // Award gamification stars for correct answers
      if (studentAnswer === correctAnswer) {
        setActiveStudent((prev) => ({
          ...prev,
          stars: (prev?.stars || 0) + 1,
          coins: (prev?.coins || 0) + 10,
        }));
      }
    } catch (err) {
      console.warn('Submission fallback:', err);
      const isPass = studentAnswer === correctAnswer;
      const fallbackDiag = {
        status: isPass ? 'Pass' : 'Fail',
        message: isPass
          ? 'No immediate gap detected. Student demonstrated mastery of this subtraction concept.'
          : `${studentName} needs help with 'Borrowing' concept in subtraction.`,
        gap: isPass ? 'CORRECT' : 'BORROWING',
        isLiveML: false,
      };
      setDiagnosticResult(fallbackDiag);
      setCurrentQuestionResult(fallbackDiag);
    } finally {
      setIsSubmitting(false);
      setHasCheckedAnswer(true);
    }
  };

  // 2. Next question or proceed to Transition Screen
  const handleProceed = async () => {
    if (isLastQuestion) {
      if (activeSessionId) {
        try {
          const comp = await api.completeAssessmentSession(activeSessionId);
          if (comp?.diagnosis) {
            setDiagnosticResult(comp.diagnosis);
          }
        } catch (compErr) {
          console.warn('Session completion error:', compErr);
        }
      }

      const isChatEnabled = import.meta.env.VITE_CHAT_FEATURE_ENABLED !== 'false';
      if (isChatEnabled) {
        setShowTransition(true);
      } else {
        navigate('/report', {
          state: {
            sessionId: activeSessionId,
            studentName,
            studentId,
          },
        });
      }
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const proceedToChat = () => {
    navigate('/chat', {
      state: {
        studentAnswer,
        responseId: currentQuestionResult?.responseId || null,
        sessionId: activeSessionId,
        questionId: question.id,
        questionText: question.text,
        studentId,
        studentName,
        existingDiagnosis: diagnosticResult || currentQuestionResult,
        quizResults: completedQuizResults,
      },
    });
  };

  // Text-to-speech replacing hyphen/minus with "minus"
  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = question.text
        .replace(/-/g, ' minus ')
        .replace(/=/g, ' equals ')
        .replace(/\?/g, ' what');
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Calculate dynamic feedback comment
  const getDynamicHint = () => {
    if (studentAnswer === correctAnswer) {
      return 'Great job! You regrouped from the tens column correctly!';
    }
    if (question.distractors && question.distractors[studentAnswer]) {
      return question.distractors[studentAnswer];
    }
    return currentQuestionResult?.message || 'Remember to borrow 1 ten from the tens column before subtracting the ones.';
  };

  // Transition Screen (Smart Focus)
  if (showTransition) {
    return (
      <MobileWrapper>
        <div className="min-h-screen bg-bgMain flex flex-col justify-between p-6 pb-12 text-center animate-fade-in">
          <div className="pt-16">
            <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-6 shadow-sm border-4 border-white">
              <Bot className="text-primary" size={48} />
            </div>
            <h1 className="text-2xl font-extrabold text-darkText mb-3">Great job finishing the test!</h1>
            <p className="text-sm text-gray-600 font-medium leading-relaxed max-w-xs mx-auto mb-8">
              Now, let's talk about some of your answers so I can help you better.
            </p>
          </div>

          <div className="space-y-3">
            <CustomButton 
              text="Talk with TeacherBot 💬" 
              onClick={proceedToChat} 
              variant="primary"
              icon={<ArrowRight size={18} />}
            />
          </div>
        </div>
      </MobileWrapper>
    );
  }

  // Student completion screen (Child-Friendly fallback)
  if (quizFinished) {
    const totalCorrect = completedQuizResults.filter((r) => r.isCorrect).length;
    return (
      <MobileWrapper>
        <div className="min-h-screen bg-bgMain flex flex-col justify-between p-6 pb-12 text-center">
          <div>
            <div className="w-24 h-24 bg-green-100 rounded-full mx-auto flex items-center justify-center mt-10 mb-5 shadow-sm border-4 border-white">
              <Award className="text-secondary" size={48} />
            </div>
            <h1 className="text-3xl font-extrabold text-darkText mb-2">Great job finishing the test!</h1>
            <p className="text-sm text-gray-600 font-medium mb-6">
              Fantastic effort, {studentName}!
            </p>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex justify-around items-center">
                <div className="text-center">
                  <span className="text-3xl font-extrabold text-primary block">{totalCorrect} / {totalQuestions}</span>
                  <span className="text-xs text-gray-500 font-semibold">Score</span>
                </div>
                <div className="border-r border-gray-100 h-10"></div>
                <div className="text-center">
                  <span className="text-3xl font-extrabold text-accent block">+{totalCorrect}</span>
                  <span className="text-xs text-gray-500 font-semibold">Stars Earned</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-100 text-left mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={18} className="text-primary" />
                <h4 className="text-xs font-bold text-darkText">Mascot Feedback</h4>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                Great job finishing the test! Now, let's talk about some of your answers so I can help you better.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <CustomButton 
              text="Return to Student Home" 
              onClick={() => navigate('/student')} 
              icon={<ArrowRight size={18} />}
            />
          </div>
        </div>
      </MobileWrapper>
    );
  }

  // Question solving view
  const progressPercent = ((safeIndex + 1) / totalQuestions) * 100;

  return (
    <MobileWrapper>
      <div className="min-h-screen bg-bgMain flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="px-5 pt-8 pb-4 flex justify-between items-center">
            <button 
              type="button"
              aria-label="Back to student tasks"
              onClick={() => navigate('/student')} 
              className="p-2 bg-white shadow-sm rounded-full text-gray-600 hover:text-primary transition active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 mx-4 bg-gray-200/70 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="text-xs font-bold text-gray-500">
              {safeIndex + 1}/{totalQuestions}
            </span>
            <button 
              type="button"
              aria-label="Read question aloud"
              onClick={handleReadAloud}
              className="p-2 ml-2 bg-blue-50 text-primary rounded-full hover:bg-blue-100 transition active:scale-95 shadow-sm"
            >
              <Volume2 size={20} />
            </button>
          </div>

          {/* Question Area */}
          <div className="flex flex-col items-center justify-center px-5 pt-8 pb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {currentAssignment?.topic || 'Class 3 Subtraction Diagnostic'}
            </p>
            <h1 className="text-5xl font-extrabold text-darkText tracking-wider mb-8 text-center">
              {question.text.includes('=') ? question.text.split('=')[0] : question.text} = <span className="text-primary">?</span>
            </h1>

            {/* Options Grid */}
            <div className="grid grid-cols-2 gap-3.5 w-full">
              {options.map((option) => {
                const isSelected = studentAnswer === option;
                const isCorrect = option === correctAnswer;

                const showCorrect = hasCheckedAnswer && isSelected && isCorrect;
                const showWrong = hasCheckedAnswer && isSelected && !isCorrect;
                const showSelectedOnly = !hasCheckedAnswer && isSelected;

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={hasCheckedAnswer || isSubmitting}
                    onClick={() => handleSelect(option)}
                    className={`py-5 rounded-2xl text-2xl font-bold border-2 transition-all duration-200 shadow-sm
                      ${showCorrect ? 'border-secondary bg-green-50 text-secondary' : 
                        showWrong ? 'border-danger bg-red-50 text-danger' : 
                        showSelectedOnly ? 'border-primary bg-blue-50 text-primary scale-[1.02]' : 
                        'border-gray-100 bg-white text-darkText hover:border-primary/40 active:scale-95'}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mascot Feedback & Actions */}
        <div className="px-5 pb-8 pt-4 bg-bgMain">
          {hasCheckedAnswer && (
            <div className="flex items-start gap-3 mb-5 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm animate-fade-in">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0 mt-0.5">
                <Bot className="text-primary" size={22} />
              </div>
              <div>
                <p className={`text-sm font-bold ${studentAnswer === correctAnswer ? 'text-secondary' : 'text-danger'}`}>
                  {studentAnswer === correctAnswer ? 'Great job! Correct!' : 'Need place value regrouping!'}
                </p>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  {getDynamicHint()}
                </p>
              </div>
            </div>
          )}
          
          {!hasCheckedAnswer ? (
            <CustomButton 
              text={isSubmitting ? "Checking..." : "Submit Answer"} 
              onClick={handleCheckAnswer} 
              disabled={isSubmitting || studentAnswer === null}
              variant={studentAnswer !== null ? 'primary' : 'outline'}
              icon={isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
            />
          ) : (
            <CustomButton 
              text={isLastQuestion ? "Next: Talk with Teacher 💬" : "Next Question"} 
              onClick={handleProceed} 
              variant="secondary"
              icon={<ArrowRight size={18} />}
            />
          )}
        </div>
      </div>
    </MobileWrapper>
  );
};

export default QuestionSolving;
