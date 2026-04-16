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
  const baseClasses = 'inline-flex items-center justify-center font-[var(--font-sans)] transition-all duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] gap-2';
  
  const sizeClasses = {
    xs: 'px-2 py-1 text-[10px] font-[510] tracking-tight rounded-[2px]',
    sm: 'px-3 py-1.5 text-[12px] font-[510] tracking-tight rounded-[4px]',
    md: 'px-4 py-2 text-[14px] font-[510] rounded-[6px]',
    lg: 'px-6 py-2.5 text-[16px] font-[510] rounded-[6px]',
    xl: 'px-8 py-3 text-[18px] font-[510] rounded-[6px]',
    pill: 'px-4 py-1.5 text-[12px] font-[510] rounded-full'
  };

  const variantClasses = {
    // Linear Primary Brand Button
    primary: 'bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-accent-hover)] text-white shadow-[rgba(0,0,0,0.1)_0px_4px_12px] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] border border-transparent',
    
    // Linear Ghost Button (Default)
    ghost: 'bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] border border-[rgb(36,40,44)] text-[#e2e4e7] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px]',
    
    // Linear Subtle Button
    subtle: 'bg-[rgba(255,255,255,0.04)] text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.06)] focus:bg-[rgba(255,255,255,0.06)] border border-transparent',
    
    // Linear Icon Button (Circle)
    'icon-circle': 'bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#f7f8f8] rounded-full',
    
    // Linear Pill Button
    pill: 'bg-transparent text-[#d0d6e0] border border-[rgb(35,37,42)] rounded-full hover:bg-[rgba(255,255,255,0.02)]',
    
    // Linear Small Toolbar Button
    'toolbar': 'bg-[rgba(255,255,255,0.05)] text-[#62666d] border border-[rgba(255,255,255,0.05)] rounded-[2px] shadow-[rgba(0,0,0,0.03)_0px_1.2px_0px_0px]',
    
    // Success variant
    success: 'bg-[#10b981] hover:bg-[#059669] text-white shadow-[rgba(0,0,0,0.1)_0px_4px_12px]',
    
    // Warning variant
    warning: 'bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-[rgba(0,0,0,0.1)_0px_4px_12px]',
    
    // Error variant
    error: 'bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-[rgba(0,0,0,0.1)_0px_4px_12px]',
    
    // Outline variant
    outline: 'border border-[var(--ln-border-standard)] hover:border-[var(--ln-border-standard)]/20 hover:bg-[rgba(255,255,255,0.02)] text-[var(--ln-text-primary)]'
  };

  const iconSizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
    pill: 'w-4 h-4'
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
    if (Icon) return <Icon className={`${iconSizeClasses[size]} weight-[400]`} />;
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
