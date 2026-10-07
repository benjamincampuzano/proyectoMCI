import { useState } from 'react';
import PropTypes from 'prop-types';
import { CaretDown } from '@phosphor-icons/react';

/**
 * CollapsiblePanel allows modular grouping of stats, tables, or charts
 * with a clean toggle mechanism.
 */
const CollapsiblePanel = ({
    title,
    icon: Icon = null,
    badge = null,
    defaultOpen = false,
    children,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div
            className={`
                bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)]
                rounded-[20px] sm:rounded-[24px] overflow-hidden transition-all duration-300
                ${className}
            `}
        >
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-white/[0.02] transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="w-8 h-8 rounded-lg bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-brand-indigo)] flex items-center justify-center shrink-0 border border-[var(--ln-brand-indigo)]/20">
                            <Icon size={18} weight="bold" />
                        </div>
                    )}
                    <span className="text-sm sm:text-base weight-590 text-[var(--ln-text-primary)] tracking-tight">
                        {title}
                    </span>
                    {badge !== null && badge !== undefined && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] weight-590 bg-white/5 border border-white/10 text-[var(--ln-text-secondary)]">
                            {badge}
                        </span>
                    )}
                </div>

                <div
                    className={`w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[var(--ln-text-tertiary)] transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-[var(--ln-text-primary)]' : ''
                    }`}
                >
                    <CaretDown size={14} weight="bold" />
                </div>
            </button>

            {isOpen && (
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 border-t border-[var(--ln-border-standard)]/50 animate-in fade-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};

CollapsiblePanel.propTypes = {
    title: PropTypes.string.isRequired,
    icon: PropTypes.elementType,
    badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    defaultOpen: PropTypes.bool,
    children: PropTypes.node,
    className: PropTypes.string
};

export default CollapsiblePanel;
