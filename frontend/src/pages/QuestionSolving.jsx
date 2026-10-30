import React, { useContext } from 'react';
import { ArrowLeft, Volume2, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import CustomButton from '../components/CustomButton';
import { AppContext } from '../context/AppContext';

const QuestionSolving = () => {
  const navigate = useNavigate();
  const { currentAssignment, studentAnswer, setStudentAnswer, setDiagnosticResult } = useContext(AppContext);

  const question = currentAssignment?.questions?.[0] || {
    id: 1,
    text: '42 - 15 = ?',
    options: [25, 27, 26, 28],
    correctAnswer: 27
  };
  const options = question.options;
  const correctAnswer = question.correctAnswer;

  const handleSelect = (option) => {
    setStudentAnswer(option);
  };

  const handleNext = () => {
    if (studentAnswer === correctAnswer) {
      setDiagnosticResult({ 
        status: 'Pass', 
        message: 'No immediate gap detected. Student demonstrated mastery of this subtraction concept.' 
      });
    } else {
      setDiagnosticResult({ 
        status: 'Fail', 
        message: "Rahul needs help with 'Borrowing' concept in subtraction." 
      });
    }
    navigate('/report');
  };

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = question.text.replace('=', 'equals').replace('?', 'what');
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

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
            <div className="flex-1 mx-4 bg-gray-200/70 rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-2 rounded-full w-[30%] transition-all duration-300"></div>
            </div>
            <span className="text-xs font-bold text-gray-500">1/1</span>
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
          <div className="flex flex-col items-center justify-center px-5 pt-12 pb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              {currentAssignment.topic}
            </p>
            <h1 className="text-5xl font-extrabold text-darkText tracking-wider mb-10 text-center">
              {question.text.split('=')[0]} = <span className="text-primary">?</span>
            </h1>

            {/* Options Grid */}
            <div className="grid grid-cols-2 gap-3.5 w-full">
              {options.map((option) => {
                const isSelected = studentAnswer === option;
                const isCorrect = option === correctAnswer;
                const showCorrect = isSelected && isCorrect;
                const showWrong = isSelected && !isCorrect;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`py-5 rounded-2xl text-2xl font-bold border-2 transition-all duration-200 active:scale-95 shadow-sm
                      ${showCorrect ? 'border-secondary bg-green-50 text-secondary' : 
                        showWrong ? 'border-danger bg-red-50 text-danger' : 
                        isSelected ? 'border-primary bg-blue-50 text-primary' : 
                        'border-gray-100 bg-white text-darkText hover:border-primary/40'}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mascot Feedback & Next Button */}
        <div className="px-5 pb-8 pt-4 bg-bgMain">
          {studentAnswer !== null && (
            <div className="flex items-center gap-3 mb-5 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm animate-fade-in">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                <Bot className="text-primary" size={24} />
              </div>
              <div>
                <p className={`text-sm font-bold ${studentAnswer === correctAnswer ? 'text-secondary' : 'text-danger'}`}>
                  {studentAnswer === correctAnswer ? 'Great job! You got it right!' : 'Oops, borrowing error!'}
                </p>
                <p className="text-[11px] text-gray-500">
                  {studentAnswer === correctAnswer 
                    ? 'Keep up the amazing momentum!' 
                    : 'Remember to borrow 1 ten from 40 to make 12 before subtracting.'}
                </p>
              </div>
            </div>
          )}
          
          <CustomButton 
            text="Next" 
            onClick={handleNext} 
            variant={studentAnswer !== null ? 'primary' : 'outline'}
          />
        </div>
      </div>
    </MobileWrapper>
  );
};

export default QuestionSolving;
