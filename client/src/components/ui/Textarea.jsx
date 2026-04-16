import React from 'react';

const Textarea = ({
    label,
    error,
    required = false,
    variant = 'default',
    className = '',
    ...props
}) => {
    // Variantes de textarea según Linear
    const textareaVariantClasses = {
        // Text Area standard - igual que input pero multilinea
        default: 'bg-[rgba(255,255,255,0.02)] text-[#d0d6e0] border border-[rgba(255,255,255,0.08)] rounded-md focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all duration-200 placeholder:text-[var(--ln-text-tertiary)] resize-vertical',
        
        // Minimal variant - menos padding
        minimal: 'bg-[rgba(255,255,255,0.02)] text-[#d0d6e0] border border-[rgba(255,255,255,0.05)] rounded-sm focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all duration-200 placeholder:text-[var(--ln-text-tertiary)] resize-vertical',
        
        // Inset variant - efecto hundido
        inset: 'bg-[rgba(255,255,255,0.01)] text-[#d0d6e0] border border-[rgba(255,255,255,0.05)] rounded-md focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.2)_0px_0px_12px_0px_inset,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all duration-200 placeholder:text-[var(--ln-text-tertiary)] resize-vertical'
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
            <textarea
                className={`w-full px-3.5 py-3 font-[var(--font-sans)] text-[16px] font-[400] leading-[1.50] ${textareaVariantClasses[variant]} ${errorClasses} ${className}`}
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

export default Textarea;
