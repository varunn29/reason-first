import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const AlertBox = ({ title, description, variant = 'danger' }) => {
  const isSuccess = variant === 'success';

  return (
    <div 
      className={`rounded-2xl p-4 flex gap-3 items-start shadow-sm mb-6 border ${
        isSuccess 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-red-50 border-red-100 text-danger'
      }`}
    >
      <div className={`${isSuccess ? 'text-secondary' : 'text-danger'} mt-0.5 shrink-0`}>
        {isSuccess ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      </div>
      <div>
        <h3 className={`text-sm font-bold ${isSuccess ? 'text-green-800' : 'text-danger'} mb-1`}>
          {title}
        </h3>
        <p className={`text-xs ${isSuccess ? 'text-green-700' : 'text-red-700'} leading-relaxed`}>
          {description}
        </p>
      </div>
    </div>
  );
};

export default AlertBox;
