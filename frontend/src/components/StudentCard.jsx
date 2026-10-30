import React from 'react';
import { ChevronRight } from 'lucide-react';

const StudentCard = ({ student, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-gray-50 mb-3 hover:bg-gray-50 transition cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
          <img src={student.avatar} alt={student.name} className="w-10 h-10" />
        </div>
        <div>
          <h4 className="font-semibold text-sm text-darkText">{student.name}</h4>
          <p className="text-xs text-gray-500">{student.grade}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-primary mb-1">{student.progress}%</span>
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-secondary rounded-full" style={{ width: `${student.progress}%` }}></div>
          </div>
        </div>
        <ChevronRight size={16} className="text-gray-300" />
      </div>
    </div>
  );
};

export default StudentCard;
