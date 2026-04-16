import { FileSearchIcon, Funnel, X, MagnifyingGlass, UserCircleDashed } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import { AsyncSearchSelect } from '../ui';
import api from '../../utils/api';

const UserFilters = ({
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    sexFilter,
    setSexFilter,
    liderDoceFilter,
    setLiderDoceFilter,
    lideresDoce,
    totalCount,
    filteredCount,
}) => {
    const hasActiveFilters = searchTerm || roleFilter || sexFilter || liderDoceFilter;

    const clearAll = () => {
        setSearchTerm('');
        setRoleFilter('');
        setSexFilter('');
        setLiderDoceFilter('');
    };

    const inputWrapperClass = "relative group flex-1 min-w-[240px]";
    const commonInputClass = "w-full pl-10 pr-4 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[14px] weight-510 text-[var(--ln-text-primary)] rounded-xl focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 outline-none focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/40 hover:border-[var(--ln-border-primary)]";
    const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ln-text-tertiary)] group-focus-within:text-[var(--ln-brand-indigo)] transition-colors pointer-events-none";

    return (
        <div className="p-8 bg-[var(--ln-bg-panel)]/30 backdrop-blur-md rounded-[24px] border border-[var(--ln-border-standard)] space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap gap-4 items-end">
                {/* Búsqueda */}
                <div className={inputWrapperClass}>
                    <label className="block text-[10px] weight-700 text-[var(--ln-text-quaternary)] uppercase tracking-widest mb-2.5 pl-1 opacity-60">Buscar Usuario</label>
                    <div className="relative">
                        <MagnifyingGlass className={iconClass} size={16} weight="bold" />
                        <input
                            type="text"
                            placeholder="Nombre, email o documento..."
                            className={commonInputClass}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filtro de rol */}
                <div className="flex-1 min-w-[180px] group relative">
                    <label className="block text-[10px] weight-700 text-[var(--ln-text-quaternary)] uppercase tracking-widest mb-2.5 pl-1 opacity-60">Rol / Perfil</label>
                    <div className="relative">
                        <Funnel className={iconClass} size={16} weight="bold" />
                        <select 
                            className={`${commonInputClass} appearance-none`} 
                            value={roleFilter} 
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="">Todos los roles</option>
                            {['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'].map(r => (
                                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Filtro de sexo */}
                <div className="flex-1 min-w-[150px] group relative">
                    <label className="block text-[10px] weight-700 text-[var(--ln-text-quaternary)] uppercase tracking-widest mb-2.5 pl-1 opacity-60">Sexo</label>
                    <div className="relative">
                        <UserCircleDashed className={iconClass} size={16} weight="bold" />
                        <select 
                            className={`${commonInputClass} appearance-none`} 
                            value={sexFilter} 
                            onChange={(e) => setSexFilter(e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="HOMBRE">Hombre</option>
                            <option value="MUJER">Mujer</option>
                        </select>
                    </div>
                </div>

                {/* Filtro de Líder 12 */}
                <div className="flex-[1.5] min-w-[280px] group relative">
                    <label className="block text-[10px] weight-700 text-[var(--ln-text-quaternary)] uppercase tracking-widest mb-2.5 pl-1 opacity-60">Líder Doce</label>
                    <div className="relative">
                        <AsyncSearchSelect
                            fetchItems={(term) => api.get('/users/search', { params: { search: term, role: 'LIDER_DOCE' } }).then(res => res.data)}
                            selectedValue={lideresDoce.find(l => l.id === parseInt(liderDoceFilter)) || (liderDoceFilter ? { id: parseInt(liderDoceFilter), fullName: 'Cargando...' } : null)}
                            onSelect={(user) => setLiderDoceFilter(user?.id?.toString() || '')}
                            placeholder="Buscar por líder doce..."
                            labelKey="fullName"
                            className="bg-[var(--ln-input-bg)] border-[var(--ln-border-standard)] rounded-xl"
                        />
                    </div>
                </div>
            </div>

            {/* Barra de estado */}
            <div className="flex items-center justify-between py-3.5 px-1 border-t border-[var(--ln-border-standard)]/50">
                <div className="flex items-center gap-2.5">
                    <span className="text-[12px] weight-510 text-[var(--ln-text-tertiary)]">
                        {filteredCount !== undefined && totalCount !== undefined ? (
                            <>
                                Mostrando <span className="weight-590 text-[var(--ln-text-primary)]">{filteredCount}</span> de <span className="weight-590 text-[var(--ln-text-primary)]/40">{totalCount}</span> usuarios registrados
                            </>
                        ) : (
                            <span className="animate-pulse">Calculando registros de red...</span>
                        )}
                    </span>
                    {hasActiveFilters && (
                        <div className="h-1 w-1 rounded-full bg-[var(--ln-border-standard)] opacity-30" />
                    )}
                    {hasActiveFilters && (
                        <button
                            onClick={clearAll}
                            className="text-[11px] weight-700 text-red-500/80 hover:text-red-500 uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <X size={12} weight="bold" /> Limpiar Filtros
                        </button>
                    )}
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 opacity-60 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                        <span className="text-[10px] weight-700 text-[var(--ln-text-quaternary)] uppercase tracking-wider opacity-60">Activos</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

UserFilters.propTypes = {
    searchTerm: PropTypes.string.isRequired,
    setSearchTerm: PropTypes.func.isRequired,
    roleFilter: PropTypes.string.isRequired,
    setRoleFilter: PropTypes.func.isRequired,
    sexFilter: PropTypes.string.isRequired,
    setSexFilter: PropTypes.func.isRequired,
    liderDoceFilter: PropTypes.string.isRequired,
    setLiderDoceFilter: PropTypes.func.isRequired,
    lideresDoce: PropTypes.array.isRequired,
    totalCount: PropTypes.number,
    filteredCount: PropTypes.number,
};

export default UserFilters;

