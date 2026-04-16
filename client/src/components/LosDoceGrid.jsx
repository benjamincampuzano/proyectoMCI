import React, { useState } from 'react';
import { Users, CaretRight } from '@phosphor-icons/react';

const LosDoceGrid = React.memo(({ losDoce, onSelectLeader }) => {
    const [selectedId, setSelectedId] = useState(null);

    const handleClick = (leader) => {
        setSelectedId(leader.id);
        onSelectLeader(leader);
    };

    if (!losDoce || losDoce.length === 0) {
        return (
            <div className="text-center py-20 flex flex-col items-center bg-[var(--ln-bg-panel)]/30 rounded-[24px] border border-dashed border-[var(--ln-border-standard)]">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-[var(--ln-text-tertiary)] opacity-30" />
                </div>
                <p className="text-[var(--ln-text-tertiary)] text-sm weight-510 leading-relaxed">No hay Pastores registrados en el sistema.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {losDoce.map((leader) => (
                <div
                    key={leader.id}
                    onClick={() => handleClick(leader)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick(leader)}
                    role="button"
                    tabIndex={0}
                    className={`
                        group p-4 rounded-xl border transition-all duration-300 relative overflow-hidden
                        ${selectedId === leader.id
                            ? 'border-[var(--ln-brand-indigo)] bg-[var(--ln-brand-indigo)]/[0.04] shadow-[0_0_20px_rgba(94,106,210,0.1)]'
                            : 'border-[var(--ln-border-standard)] bg-[var(--ln-bg-panel)]/50 hover:border-[var(--ln-text-primary)]/20 hover:bg-white/[0.02] hover:shadow-lg'
                        }
                    `}
                >
                    <div className="flex flex-col gap-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[14px] weight-590 text-[var(--ln-text-primary)] tracking-tight truncate mb-0.5" title={leader.fullName}>
                                {leader.fullName}
                            </h3>
                            <p className="text-[11px] text-[var(--ln-text-tertiary)] truncate opacity-60 font-mono">
                                {leader.email}
                            </p>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                            <span className={`
                                px-2 py-0.5 text-[9px] weight-590 uppercase tracking-widest rounded-md border
                                ${leader.roles?.includes('ADMIN')
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                    : leader.roles?.includes('PASTOR')
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                        : 'bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-brand-indigo)] border-[var(--ln-brand-indigo)]/20'}
                            `}>
                                {leader.roles?.includes('ADMIN')
                                    ? 'Administrador'
                                    : leader.roles?.includes('PASTOR')
                                        ? (leader.isCouple ? 'Pastores' : 'Pastor')
                                        : 'Líder 12'}
                            </span>
                            
                            <div className={`
                                w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-300
                                ${selectedId === leader.id 
                                    ? 'bg-[var(--ln-brand-indigo)] text-white rotate-90 scale-110 shadow-lg shadow-[var(--ln-brand-indigo)]/20' 
                                    : 'bg-white/5 text-[var(--ln-text-tertiary)] group-hover:text-[var(--ln-text-primary)]'
                                }
                            `}>
                                <CaretRight size={12} weight="bold" />
                            </div>
                        </div>
                    </div>

                    {/* Active indicator bar */}
                    {selectedId === leader.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--ln-brand-indigo)]" />
                    )}
                </div>
            ))}
        </div>
    );
});

export default LosDoceGrid;
