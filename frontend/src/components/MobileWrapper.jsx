import React from 'react';

const MobileWrapper = ({ children }) => {
  return (
    <div className="min-h-screen bg-bgMain flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen bg-bgMain relative shadow-soft overflow-x-hidden">
        {children}
      </div>
    </div>
  );
};

export default MobileWrapper;
