import React from 'react';

const Input = ({
    label,
    error,
    required = false,
    variant = 'default',
    className = '',
    ...props
}) => {
    // Variantes de input según Linear
    const inputVariantClasses = {
        // Text Area standard
        default: 'bg-[rgba(255,255,255,0.02)] text-[#d0d6e0] border border-[rgba(255,255,255,0.08)] rounded-md focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all duration-200 placeholder:text-[var(--ln-text-tertiary)]',
        
        // Search Input - background transparent
        search: 'bg-transparent text-[#f7f8f8] border-transparent focus:outline-none focus:ring-0 placeholder:text-[var(--ln-text-tertiary)]',
        
        // Button-style Input
        button: 'text-[#8a8f98] px-1 py-1 rounded-md focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] bg-transparent border-transparent transition-all duration-200'
    };

    const errorClasses = error ? '!border-[#ef4444]/50 !shadow-[rgba(239,68,68,0.4)_0px_0px_0px_2px] focus:!border-[#ef4444] focus:!shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(239,68,68,0.4)_0px_0px_0px_2px]' : '';

    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-[12px] font-[510] uppercase tracking-wider mb-1.5 text-[var(--ln-text-secondary)]">
                    {label}
                    {required && <span className="text-[#ef4444] ml-1 font-[590]">*</span>}
                </label>
            )}
            <input
                className={`w-full px-3.5 py-3 font-[var(--font-sans)] text-[16px] font-[400] leading-[1.50] ${inputVariantClasses[variant]} ${errorClasses} ${className}`}
                {...props}
            />
            {error && (
                <p className="text-[11px] font-[510] text-[#ef4444] px-1 tracking-tight">
                    {error}
                </p>
            )}
        </div>
    );
};

export default Input;
