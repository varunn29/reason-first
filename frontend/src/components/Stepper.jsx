import React from 'react';
import { Check } from 'lucide-react';

const Stepper = ({ currentStep }) => {
  const steps = [
    { id: 1, label: 'Class' },
    { id: 2, label: 'Topic' },
    { id: 3, label: 'Questions' }
  ];

  return (
    <div className="flex items-center justify-between w-full px-4 py-6">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300
                ${isActive ? 'bg-primary text-white shadow-md' : 
                  isCompleted ? 'bg-secondary text-white' : 'bg-gray-200 text-gray-500'}`}>
                {isCompleted ? <Check size={16} /> : step.id}
              </div>
              <span className={`text-[10px] font-medium ${isActive || isCompleted ? 'text-darkText' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded ${currentStep > step.id ? 'bg-secondary' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;
