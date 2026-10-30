import React from 'react';

const SkeletonLoader = () => {
  return (
    <div className="animate-pulse flex space-x-4 p-4 bg-white rounded-2xl mb-3 border border-gray-50">
      <div className="rounded-full bg-gray-200 h-12 w-12"></div>
      <div className="flex-1 space-y-3 py-1">
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
