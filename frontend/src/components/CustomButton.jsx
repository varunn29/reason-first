import React from 'react';

const CustomButton = ({ 
  text, 
  onClick, 
  variant = 'primary', 
  icon, 
  fullWidth = true, 
  type = 'button',
  disabled = false,
}) => {
  const baseStyle = `py-3 px-6 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
    disabled 
      ? 'opacity-50 cursor-not-allowed pointer-events-none' 
      : 'active:scale-95 cursor-pointer'
  }`;

  const variants = {
    primary: "bg-primary text-white hover:bg-indigo-700",
    secondary: "bg-secondary text-white hover:bg-green-600",
    outline: "bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white",
    danger: "bg-danger text-white hover:bg-red-600",
  };

  return (
    <button 
      type={type}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant] || variants.primary} ${fullWidth ? 'w-full' : 'w-auto'}`} 
      onClick={disabled ? undefined : onClick}
    >
      {icon && <span>{icon}</span>}
      {text}
    </button>
  );
};

export default CustomButton;
