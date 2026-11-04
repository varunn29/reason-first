import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const NetworkStatusBar = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true
  );
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <aside
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs font-bold py-2 px-4 shadow-md flex items-center justify-center gap-2 transition-all animate-fadeIn"
      >
        <WifiOff size={16} className="animate-pulse" />
        <span>You are offline. Responses are saved locally.</span>
      </aside>
    );
  }

  if (showRestored) {
    return (
      <aside
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white text-xs font-bold py-2 px-4 shadow-md flex items-center justify-center gap-2 transition-all animate-fadeIn"
      >
        <Wifi size={16} />
        <span>Back online!</span>
      </aside>
    );
  }

  return null;
};

export default NetworkStatusBar;

