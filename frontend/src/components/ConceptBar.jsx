import React from 'react';

const ConceptBar = ({ label, percentage, color }) => {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className="text-xs font-bold text-darkText">{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${color}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ConceptBar;
