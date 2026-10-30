import React, { useState, useEffect, useContext } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Calculator, 
  SpellCheck, 
  BookOpen, 
  Brain, 
  ListTodo, 
  CheckCircle2, 
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../components/MobileWrapper';
import Stepper from '../components/Stepper';
import CustomButton from '../components/CustomButton';
import { AppContext } from '../context/AppContext';
import { api } from '../services/api';

const CreateAssignment = () => {
  const navigate = useNavigate();
  const { setCurrentAssignment } = useContext(AppContext);

  const [selectedTopic, setSelectedTopic] = useState('math');
  const [selectedClass, setSelectedClass] = useState('Grade 3 - Section A');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default calibrated diagnostic probe set
  const initialProbes = [
    { id: 'probe_01', text: '61 - 24 = ?', options: [37, 43, 47, 35], correctAnswer: 37, tag: 'Unit Diff 3 (Regroup)', selected: true },
    { id: 'probe_02', text: '72 - 38 = ?', options: [34, 46, 44, 36], correctAnswer: 34, tag: 'Unit Diff 6 (Regroup)', selected: true },
    { id: 'probe_03', text: '83 - 49 = ?', options: [34, 46, 44, 38], correctAnswer: 34, tag: 'Unit Diff 6 (Consistency)', selected: true },
    { id: 'ctrl_01', text: '58 - 23 = ?', options: [35, 31, 25, 33], correctAnswer: 35, tag: 'Non-Regrouping Control', selected: true },
    { id: 'ctrl_02', text: '79 - 45 = ?', options: [34, 32, 24, 35], correctAnswer: 34, tag: 'Non-Regrouping Control', selected: true },
  ];

  const [probeList, setProbeList] = useState(initialProbes);
  const [selectedChapter, setSelectedChapter] = useState('All Chapters');
  const [isChapterDropdownOpen, setIsChapterDropdownOpen] = useState(false);
  const [isLoadingProbes, setIsLoadingProbes] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadCurriculumProbes() {
      setIsLoadingProbes(true);
      try {
        const remoteProbes = await api.getProbes();
        if (isMounted && remoteProbes && remoteProbes.length > 0) {
          setProbeList(
            remoteProbes.map((p, idx) => ({
              id: p.id,
              text: p.text || p.prompt,
              options: p.options,
              optionLabels: p.optionLabels || [],
              correctAnswer: p.correctAnswer,
              chapter: p.chapter || 'NCERT Class 3',
              domain: p.domain || 'GENERAL',
              tag: p.domain || (p.is_regrouping ? 'Regrouping' : 'Concept Probe'),
              selected: idx < 5,
            }))
          );
        }
      } catch (err) {
        console.warn('Probe loading fallback:', err);
      } finally {
        if (isMounted) setIsLoadingProbes(false);
      }
    }
    loadCurriculumProbes();
    return () => { isMounted = false; };
  }, []);

  const availableChapters = ['All Chapters', ...Array.from(new Set(probeList.map(p => p.chapter || 'Canonical Diagnostic Baseline')))];
  const filteredProbes = selectedChapter === 'All Chapters'
    ? probeList
    : probeList.filter(p => (p.chapter || 'Canonical Diagnostic Baseline') === selectedChapter);

  const availableClasses = [
    'Grade 3 - Section A',
    'Grade 3 - Section B',
    'Grade 2 - Combined Multigrade'
  ];

  const topics = [
    { id: 'math', name: 'Math & Logic', icon: Calculator, text: 'text-blue-600', iconBg: 'bg-blue-100', active: true },
    { id: 'spelling', name: 'Spelling & Language', icon: SpellCheck, text: 'text-green-600', iconBg: 'bg-green-100', active: false },
    { id: 'reading', name: 'Reading Comprehension', icon: BookOpen, text: 'text-orange-600', iconBg: 'bg-orange-100', active: false },
    { id: 'logic', name: 'General Knowledge', icon: Brain, text: 'text-purple-600', iconBg: 'bg-purple-100', active: false },
  ];

  const toggleProbe = (probeId) => {
    setProbeList((prev) => 
      prev.map((p) => p.id === probeId ? { ...p, selected: !p.selected } : p)
    );
  };

  const handleAssign = async () => {
    setIsSubmitting(true);
    const chosenTopicObj = topics.find((t) => t.id === selectedTopic);
    const activeProbes = probeList.filter((p) => p.selected);

    const newAssignment = {
      title: `${chosenTopicObj ? chosenTopicObj.name : 'Math'} Diagnostic for ${selectedClass}`,
      topic: chosenTopicObj ? chosenTopicObj.name : 'Math & Logic',
      classLabel: selectedClass,
      questions: activeProbes.length > 0 ? activeProbes : initialProbes,
    };

    try {
      // BUG-02 & BUG-03 FIXED: Persist assignment to backend database & memory
      const result = await api.createAssignment(newAssignment);
      if (result && result.assignment) {
        setCurrentAssignment(result.assignment);
      } else {
        setCurrentAssignment(newAssignment);
      }
    } catch (err) {
      console.warn('Assignment API save fallback:', err);
      setCurrentAssignment(newAssignment);
    } finally {
      setIsSubmitting(false);
      navigate('/dashboard');
    }
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
          <div className="w-8"></div>
        </div>

        {/* Stepper Indicator */}
        <Stepper currentStep={3} />

        <div className="px-5 mt-1">
          {/* Step 1: Select Class */}
          <div className="mb-6 relative">
            <h2 className="text-sm font-semibold text-darkText mb-3">1. Select Target Class</h2>
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
            <h2 className="text-sm font-semibold text-darkText mb-3">2. Choose Subject</h2>
            <div className="grid grid-cols-2 gap-3">
              {topics.map((topic) => {
                const Icon = topic.icon;
                const isSelected = selectedTopic === topic.id;
                return (
                  <div 
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`p-4 rounded-2xl cursor-pointer border-2 transition-all duration-200 flex flex-col gap-3 active:scale-95
                      ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent bg-white shadow-sm hover:shadow-md'}
                      ${!topic.active ? 'opacity-60' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${topic.iconBg} flex items-center justify-center ${topic.text}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-darkText leading-tight">{topic.name}</h3>
                      {!topic.active && <span className="text-[9px] text-gray-400 font-medium">Term 2</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Diagnostic Probes (Select from all 14 NCERT chapters) */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-darkText flex items-center gap-1.5">
                <Sparkles size={16} className="text-primary" />
                3. Calibrated Diagnostic Probes
              </h2>
              <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                {probeList.filter(p => p.selected).length} Selected
              </span>
            </div>

            {/* Chapter Filter Dropdown */}
            <div className="mb-3">
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Filter by NCERT Chapter:</label>
              <div 
                onClick={() => setIsChapterDropdownOpen(!isChapterDropdownOpen)}
                className="bg-white rounded-xl shadow-xs border border-gray-200 p-2.5 flex justify-between items-center cursor-pointer hover:border-primary/40 transition"
              >
                <span className="text-xs font-medium text-darkText truncate">{selectedChapter}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isChapterDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
              {isChapterDropdownOpen && (
                <div className="mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                  {availableChapters.map((chap) => (
                    <div 
                      key={chap}
                      onClick={() => {
                        setSelectedChapter(chap);
                        setIsChapterDropdownOpen(false);
                      }}
                      className={`px-3 py-2 text-xs font-medium cursor-pointer transition ${
                        selectedChapter === chap ? 'bg-primary/10 text-primary font-bold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {chap}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-500 mb-3">
              Showing {filteredProbes.length} probe(s) from <strong>{selectedChapter}</strong>:
            </p>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredProbes.map((probe) => (
                <div 
                  key={probe.id}
                  onClick={() => toggleProbe(probe.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    probe.selected 
                      ? 'bg-white border-primary/40 shadow-xs' 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                      probe.selected ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white'
                    }`}>
                      {probe.selected && <CheckCircle2 size={14} />}
                    </div>
                    <div>
                      <span className="text-sm font-extrabold text-darkText block">{probe.text}</span>
                      <span className="text-[10px] text-gray-500 font-medium">{probe.chapter} • {probe.tag}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-secondary bg-green-50 px-2 py-1 rounded-lg">
                    Ans: {probe.correctAnswer}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assign Button */}
        <div className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-gray-100 p-4 pb-safe z-50">
          <CustomButton 
            text={isSubmitting ? "Creating Assignment..." : "Assign to Class"} 
            icon={<CheckCircle2 size={18} />}
            disabled={isSubmitting || probeList.filter(p => p.selected).length === 0}
            onClick={handleAssign} 
          />
        </div>
      </div>
    </MobileWrapper>
  );
};

export default CreateAssignment;
