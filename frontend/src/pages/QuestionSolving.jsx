import React, { useContext, useState, useEffect } from 'react';
import { ArrowLeft, Volume2, Bot, Loader2, Sparkles, Award, Star, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import CustomButton from '../components/CustomButton';
import { AppContext } from '../context/AppContext';
import { api } from '../services/api';

const QuestionSolving = () => {
  const navigate = useNavigate();
  const { 
    currentAssignment, 
    activeStudent, 
    setActiveStudent,
    studentAnswer, 
    setStudentAnswer, 
    setDiagnosticResult,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    completedQuizResults,
    setCompletedQuizResults,
  } = useContext(AppContext);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCheckedAnswer, setHasCheckedAnswer] = useState(false);
  const [currentQuestionResult, setCurrentQuestionResult] = useState(null);
  const [quizFinished, setQuizFinished] = useState(false);

  const questions = currentAssignment?.questions || [
    {
      id: 'probe_01',
      text: '61 - 24 = ?',
      options: [37, 43, 47, 35],
      correctAnswer: 37,
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
    try {
      const diag = await api.submitAnswer(
        activeStudent?.id || 'student_rahul',
        question.id,
        studentAnswer,
        correctAnswer,
        {
          questionText: question.text,
          assignmentId: currentAssignment?.id || 'asgn_class3_subtraction',
        }
      );
      setDiagnosticResult(diag);
      setCurrentQuestionResult(diag);

      // Accumulate into results list
      setCompletedQuizResults((prev) => [
        ...prev,
        {
          questionId: question.id,
          questionText: question.text,
          studentAnswer,
          correctAnswer,
          isCorrect: studentAnswer === correctAnswer,
          diagnosis: diag,
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
          : 'Place value regrouping practice recommended.',
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

  // 2. Next question or finish assessment
  const handleProceed = () => {
    if (isLastQuestion) {
      setQuizFinished(true);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  // Fixed text-to-speech replacing hyphen/minus with "minus"
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

  // Student completion screen (Child-Friendly & celebratory)
  if (quizFinished) {
    const totalCorrect = completedQuizResults.filter((r) => r.isCorrect).length;
    return (
      <MobileWrapper>
        <div className="min-h-screen bg-bgMain flex flex-col justify-between p-6 pb-12 text-center">
          <div>
            <div className="w-24 h-24 bg-green-100 rounded-full mx-auto flex items-center justify-center mt-10 mb-5 shadow-sm border-4 border-white">
              <Award className="text-secondary" size={48} />
            </div>
            <h1 className="text-3xl font-extrabold text-darkText mb-2">Mission Completed!</h1>
            <p className="text-sm text-gray-600 font-medium mb-6">
              Fantastic effort, {activeStudent?.displayName || 'Friend'}!
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
                {totalCorrect === totalQuestions 
                  ? "You've completely mastered tens-to-ones regrouping! Your teacher will be super proud!" 
                  : "You did great practicing tricky subtraction! Keep practicing regrouping 1 ten into 10 ones!"}
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

                // BUG-01 FIXED: Only reveal red/green after pressing "Check Answer"
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
              text={isLastQuestion ? "Finish Mission 🎉" : "Next Question"} 
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
