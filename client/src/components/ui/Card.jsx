import React from 'react';

const Card = ({ 
    title, 
    action, 
    children, 
    variant = 'default',
    padding = 'default',
    hover = false,
    className = '' 
}) => {
    // Variantes de elevación Linear
    const variantClasses = {
        // Surface Level 2 - elevación estándar
        default: 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-lg shadow-[rgba(0,0,0,0.2)_0px_0px_0px_1px]',
        
        // Surface Level 3 - elevación más alta
        elevated: 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg shadow-[rgba(0,0,0,0.4)_0px_2px_4px]',
        
        // Featured card - mayor énfasis
        featured: 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-[rgba(0,0,0,0.4)_0px_2px_4px,rgba(0,0,0,0.2)_0px_0px_0px_1px]',
        
        // Large panel - para secciones importantes
        panel: 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[22px] shadow-[rgba(0,0,0,0.2)_0px_0px_0px_1px]',
        
        // Inset panel - efecto hundido
        inset: 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg shadow-[rgba(0,0,0,0.2)_0px_0px_12px_0px_inset]',
        
        // Subtle - mínima elevación
        subtle: 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-md'
    };

    // Padding options según sistema Linear
    const paddingClasses = {
        none: '',
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
        xl: 'p-10'
    };

    // Hover states
    const hoverClasses = hover ? 'hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.12)] hover:shadow-[rgba(0,0,0,0.4)_0px_2px_4px] transition-all duration-200 cursor-pointer' : '';

    return (
        <div className={`${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${className}`}>
            {(title || action) && (
                <div className="flex justify-between items-center mb-6">
                    {title && (
                        <h3 className="text-[20px] font-[590] text-[var(--ln-text-primary)] tracking-[-0.24px] leading-[1.33]">
                            {title}
                        </h3>
                    )}
                    {action && <div className="flex items-center gap-2">{action}</div>}
                </div>
            )}
            <div className="text-[15px] font-[400] text-[var(--ln-text-secondary)] leading-[1.60] tracking-[-0.165px]">
                {children}
            </div>
        </div>
    );
};

export default Card;
