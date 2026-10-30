import React from 'react';

const CustomButton = ({ text, onClick, variant = 'primary', icon, fullWidth = true, type = 'button' }) => {
  const baseStyle = "py-3 px-6 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95";
  const variants = {
    primary: "bg-primary text-white hover:bg-indigo-700",
    secondary: "bg-secondary text-white hover:bg-green-600",
    outline: "bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white",
    danger: "bg-danger text-white hover:bg-red-600"
  };

  return (
    <button 
      type={type}
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : 'w-auto'}`} 
      onClick={onClick}
    >
      {icon && <span>{icon}</span>}
      {text}
    </button>
  );
};

export default CustomButton;
