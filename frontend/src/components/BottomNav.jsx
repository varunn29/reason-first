import React from 'react';
import { Home, Users, FileText, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/students', icon: Users, label: 'Students' },
    { path: '/report', icon: FileText, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'More' },
  ];

  return (
    <nav aria-label="Bottom Navigation" className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-gray-100 flex justify-around items-center py-3 px-2 pb-safe z-50 rounded-t-3xl shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1 w-16 ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
            <Icon size={20} className={isActive ? 'fill-primary/10' : ''} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
