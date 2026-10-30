import React from 'react';
import { AlertCircle } from 'lucide-react';

const AlertBox = ({ title, description }) => {
  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 items-start shadow-sm mb-6">
      <div className="text-danger mt-0.5 shrink-0">
        <AlertCircle size={20} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-danger mb-1">{title}</h3>
        <p className="text-xs text-red-700 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export default AlertBox;
