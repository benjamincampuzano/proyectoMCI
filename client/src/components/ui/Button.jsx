import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-normal rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  
  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-2.5 text-lg',
    xl: 'px-8 py-3 text-xl'
  };

  const variantClasses = {
    primary: 'bg-[#0071e3] hover:bg-[#0077ed] text-white focus:ring-[#0071e3]',
    secondary: 'bg-[#f5f5f7] hover:bg-[#ededf2] text-[#1d1d1f] focus:ring-[#0071e3] dark:bg-[#272729] dark:hover:bg-[#2a2a2d] dark:text-white',
    success: 'bg-[#34c759] hover:bg-[#30d158] text-white focus:ring-[#34c759]',
    warning: 'bg-[#ff9500] hover:bg-[#ff9f2a] text-white focus:ring-[#ff9500]',
    error: 'bg-[#ff3b30] hover:bg-[#ff453a] text-white focus:ring-[#ff3b30]',
    outline: 'border border-[#d1d1d6] hover:border-[#86868b] text-[#1d1d1f] focus:ring-[#0071e3] dark:border-[#3a3a3c] dark:hover:border-[#48484a] dark:text-white',
    ghost: 'text-[#1d1d1f] hover:bg-[#f5f5f7] focus:ring-[#0071e3] dark:text-white dark:hover:bg-[#272729]',
    dark: 'bg-[#1d1d1f] hover:bg-[#2c2c2e] text-white focus:ring-[#0071e3]'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  };

  const loadingSpinner = (
    <svg 
      className={`animate-spin ${iconSizeClasses[size]}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderIcon = () => {
    if (loading) return loadingSpinner;
    if (Icon) return <Icon className={iconSizeClasses[size]} weight="regular" />;
    return null;
  };

  const iconElement = renderIcon();

  return (
    <button
      type={type}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {iconPosition === 'left' && iconElement}
      {children}
      {iconPosition === 'right' && iconElement}
    </button>
  );
};

export default Button;
