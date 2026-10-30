import React, { useState, useContext } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Calculator, 
  SpellCheck, 
  BookOpen, 
  Brain, 
  ListTodo, 
  PenTool, 
  HelpCircle, 
  CheckCircle2, 
  ChevronDown 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import Stepper from '../components/Stepper';
import CustomButton from '../components/CustomButton';
import { AppContext } from '../context/AppContext';

const CreateAssignment = () => {
  const navigate = useNavigate();
  const { setCurrentAssignment } = useContext(AppContext);

  const [selectedTopic, setSelectedTopic] = useState('math');
  const [selectedClass, setSelectedClass] = useState('Grade 3 - Section A');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  
  // Interactive question types toggles
  const [questionTypes, setQuestionTypes] = useState({
    mcq: true,
    shortAnswer: false,
    fillBlanks: false,
  });

  const availableClasses = [
    'Grade 3 - Section A',
    'Grade 3 - Section B',
    'Grade 2 - Combined Multigrade'
  ];

  const topics = [
    { id: 'math', name: 'Math & Logic', icon: Calculator, text: 'text-blue-600', iconBg: 'bg-blue-100' },
    { id: 'spelling', name: 'Spelling & Language', icon: SpellCheck, text: 'text-green-600', iconBg: 'bg-green-100' },
    { id: 'reading', name: 'Reading Comprehension', icon: BookOpen, text: 'text-orange-600', iconBg: 'bg-orange-100' },
    { id: 'logic', name: 'General Knowledge', icon: Brain, text: 'text-purple-600', iconBg: 'bg-purple-100' },
  ];

  // Dynamic stepper indicator
  const currentStep = (questionTypes.mcq || questionTypes.shortAnswer || questionTypes.fillBlanks) && selectedTopic ? 3 : selectedTopic ? 2 : 1;

  const toggleQuestionType = (key) => {
    setQuestionTypes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAssign = () => {
    const chosenTopicObj = topics.find((t) => t.id === selectedTopic);
    setCurrentAssignment({
      topic: chosenTopicObj ? chosenTopicObj.name : 'Math & Logic',
      class: selectedClass,
      questions: [
        { id: 1, text: '42 - 15 = ?', options: [25, 27, 26, 28], correctAnswer: 27 }
      ]
    });
    navigate('/dashboard');
  };

  return (
    <MobileWrapper>
      <div className="pb-28 min-h-screen bg-bgMain">
        {/* Header */}
        <div className="px-5 pt-8 pb-3 flex justify-between items-center bg-bgMain sticky top-0 z-20">
          <button 
            type="button"
            aria-label="Back to Dashboard"
            onClick={() => navigate('/dashboard')} 
            className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-primary transition active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-darkText">Create Assignment</h1>
          <button 
            type="button"
            aria-label="Search topics or questions"
            className="p-2 text-gray-400 hover:text-gray-600 transition"
          >
            <Search size={20} />
          </button>
        </div>

        {/* Stepper Indicator */}
        <Stepper currentStep={currentStep} />

        <div className="px-5 mt-1">
          {/* Step 1: Select Class */}
          <div className="mb-6 relative">
            <h2 className="text-sm font-semibold text-darkText mb-3">1. Select Class</h2>
            <div 
              onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between items-center cursor-pointer hover:border-primary/30 transition"
            >
              <span className="text-sm font-medium text-gray-700">{selectedClass}</span>
              <ChevronDown 
                size={16} 
                className={`text-gray-400 transition-transform duration-200 ${isClassDropdownOpen ? 'rotate-180' : ''}`} 
              />
            </div>

            {/* Dropdown Menu */}
            {isClassDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-soft border border-gray-100 py-2 z-30">
                {availableClasses.map((cls) => (
                  <div
                    key={cls}
                    onClick={() => {
                      setSelectedClass(cls);
                      setIsClassDropdownOpen(false);
                    }}
                    className={`px-4 py-2.5 text-xs font-medium cursor-pointer transition ${
                      cls === selectedClass ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cls}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Choose Topic */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-darkText mb-3">2. Choose Topic</h2>
            <div className="grid grid-cols-2 gap-3">
              {topics.map((topic) => {
                const Icon = topic.icon;
                const isSelected = selectedTopic === topic.id;
                return (
                  <div 
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`p-4 rounded-2xl cursor-pointer border-2 transition-all duration-200 flex flex-col gap-3 active:scale-95
                      ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent bg-white shadow-sm hover:shadow-md'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${topic.iconBg} flex items-center justify-center ${topic.text}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-darkText leading-tight">{topic.name}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Add Questions (Visual Toggles) */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-darkText mb-3">3. Add Questions</h2>
            <div className="space-y-3">
              {/* MCQ Toggle */}
              <div 
                onClick={() => toggleQuestionType('mcq')}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                    <ListTodo size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-darkText">MCQ (Multiple Choice)</h4>
                    <p className="text-[10px] text-gray-500">Best for objective questions</p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${questionTypes.mcq ? 'bg-primary' : 'bg-gray-200'}`}>
                  <div className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${questionTypes.mcq ? 'right-1' : 'left-1'}`} />
                </div>
              </div>

              {/* Short Answer Toggle */}
              <div 
                onClick={() => toggleQuestionType('shortAnswer')}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                    <PenTool size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-darkText">Short Answer</h4>
                    <p className="text-[10px] text-gray-500">For written responses</p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${questionTypes.shortAnswer ? 'bg-primary' : 'bg-gray-200'}`}>
                  <div className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${questionTypes.shortAnswer ? 'right-1' : 'left-1'}`} />
                </div>
              </div>

              {/* Fill in the blanks Toggle */}
              <div 
                onClick={() => toggleQuestionType('fillBlanks')}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center">
                    <HelpCircle size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-darkText">Fill in the Blanks</h4>
                    <p className="text-[10px] text-gray-500">Complete the missing words</p>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${questionTypes.fillBlanks ? 'bg-primary' : 'bg-gray-200'}`}>
                  <div className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${questionTypes.fillBlanks ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assign Button */}
        <div className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-gray-100 p-4 pb-safe z-50">
          <CustomButton 
            text="Assign" 
            icon={<CheckCircle2 size={18} />}
            onClick={handleAssign} 
          />
        </div>
      </div>
    </MobileWrapper>
  );
};

export default CreateAssignment;
