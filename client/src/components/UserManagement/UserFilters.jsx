import { useState } from 'react';
import { Funnel, X, MagnifyingGlass, UserCircleDashed, Network, Users, Crown, CaretCircleDownIcon, CheckCircle } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import { AsyncSearchSelect } from '../ui';
import api from '../../utils/api';

const UserFilters = ({
    nombreFilter,
    setNombreFilter,
    liderDoceFilter,
    setLiderDoceFilter,
    redFilter,
    setRedFilter,
    sexoFilter,
    setSexoFilter,
    rolFilter,
    setRolFilter,
    asignacionesFilter,
    setAsignacionesFilter,
    lideresDoce,
    totalCount,
    filteredCount,
    currentUser,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasActiveFilters = nombreFilter || liderDoceFilter || redFilter || sexoFilter || rolFilter || asignacionesFilter;
    const activeCount = [nombreFilter, liderDoceFilter, redFilter, sexoFilter, rolFilter, asignacionesFilter].filter(Boolean).length;

    const clearAll = () => {
        setNombreFilter('');
        setLiderDoceFilter('');
        setRedFilter('');
        setSexoFilter('');
        setRolFilter('');
        setAsignacionesFilter('');
    };

    const getInputClass = () => {
        return 'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 rounded-lg outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400 dark:placeholder:text-gray-500';
    };

    const getLabelClass = () => {
        return 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5';
    };

    const getIconClass = () => {
        return 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500';
    };

    const FilterBadge = ({ color, children }) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] weight-700 text-white ${color} shadow-lg`}>
            {children}
        </span>
    );

    return (
        <div className="bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-[var(--ln-bg-panel)] dark:via-[var(--ln-bg-panel)] dark:to-[var(--ln-bg-panel)]/80 backdrop-blur-xl rounded-[24px] shadow-xl shadow-black/5 dark:shadow-none overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
            {/* Header con toggle en móvil */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--ln-border-standard)] bg-gradient-to-r from-gray-50/80 to-white dark:from-[var(--ln-bg-panel)] dark:to-[var(--ln-bg-panel)]/80">
                <div className="flex items-center gap-3">
                    {activeCount > 0 && (
                        <span className="ml-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-[11px] weight-700 shadow-lg shadow-red-500/30">
                            {activeCount} activo{activeCount > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                        <button
                            onClick={clearAll}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] weight-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95"
                        >
                            <X size={14} weight="bold" /> Limpiar
                        </button>
                    )}
                    {/* Botón toggle para mostrar/ocultar filtros */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] weight-600 transition-all active:scale-95 ${
                            hasActiveFilters
                                ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-[var(--ln-bg-elevated)] text-[var(--ln-text-secondary)] border border-[var(--ln-border-standard)] hover:bg-white/5'
                        }`}
                    >
                        <Funnel size={16} weight={isExpanded ? "fill" : "bold"} />
                        {isExpanded ? 'Ocultar' : 'Filtros'}
                        {hasActiveFilters && (
                            <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-[11px] weight-700">
                                {activeCount}
                            </span>
                        )}
                        <CaretCircleDownIcon size={16} weight="bold" className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Contenido de filtros - mostrar/ocultar según estado */}
            <div className={`transition-all duration-500 ease-out overflow-hidden ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 sm:p-5 space-y-4">
                    <div className="flex flex-wrap gap-3 items-start">
                        {/* Filtro de Nombre - Azul */}
                        <div className="relative group flex-1 min-w-[200px]">
                            <label className={getLabelClass()}>
                                Nombre
                            </label>
                            <div className="relative">
                                <MagnifyingGlass className={getIconClass()} size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    className={getInputClass()}
                                    value={nombreFilter}
                                    onChange={(e) => setNombreFilter(e.target.value)}
                                />
                                {nombreFilter && (
                                    <button onClick={() => setNombreFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <X size={14} weight="bold" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filtro de Líder de 12 - Ámbar */}
                        <div className="relative flex-[1.5] min-w-[260px] group">
                            <label className={getLabelClass()}>
                                Líder de 12
                            </label>
                            <div className="relative">
                                <Crown className={getIconClass()} size={18} />
                                <AsyncSearchSelect
                                    fetchItems={(term) => {
                                        const roleFilter = currentUser?.roles?.includes('PASTOR') ? "LIDER_DOCE,PASTOR" : "LIDER_DOCE";
                                        return api.get('/users/search', {
                                            params: { search: term, role: roleFilter }
                                        }).then(res => res.data);
                                    }}
                                    selectedValue={lideresDoce.find(l => l.id === parseInt(liderDoceFilter)) || (liderDoceFilter ? { id: parseInt(liderDoceFilter), fullName: 'Cargando...' } : null)}
                                    onSelect={(user) => setLiderDoceFilter(user?.id?.toString() || '')}
                                    placeholder="Buscar líder de 12..."
                                    labelKey="fullName"
                                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                                />
                            </div>
                            {liderDoceFilter && (
                                <FilterBadge color="bg-amber-500">Líder de 12 seleccionado</FilterBadge>
                            )}
                        </div>

                        {/* Filtro de Red - Púrpura */}
                        <div className="relative flex-1 min-w-[180px] group">
                            <label className={getLabelClass()}>
                                Red
                            </label>
                            <div className="relative">
                                <Users className={getIconClass()} size={18} />
                                <select 
                                    className={`${getInputClass()} appearance-none cursor-pointer`}
                                    value={redFilter} 
                                    onChange={(e) => setRedFilter(e.target.value)}
                                >
                                    <option value="">Todas las redes</option>
                                    <option value="MUJERES">Mujeres</option>
                                    <option value="HOMBRES">Hombres</option>
                                    <option value="KIDS">Kids (5-7)</option>
                                    <option value="ROCAS">Rocas (8-10)</option>
                                    <option value="TEENS">Teens (11-13)</option>
                                    <option value="JOVENES">Jóvenes (14+)</option>
                                </select>
                                <CaretCircleDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Filtro de Sexo - Rosa */}
                        <div className="relative flex-1 min-w-[140px] group">
                            <label className={getLabelClass()}>
                                Sexo
                            </label>
                            <div className="relative">
                                <UserCircleDashed className={getIconClass()} size={18} />
                                <select 
                                    className={`${getInputClass()} appearance-none cursor-pointer`}
                                    value={sexoFilter} 
                                    onChange={(e) => setSexoFilter(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="HOMBRE">Hombre</option>
                                    <option value="MUJER">Mujer</option>
                                </select>
                                <CaretCircleDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Filtro de Rol - Esmeralda */}
                        <div className="relative flex-1 min-w-[180px] group">
                            <label className={getLabelClass()}>
                                Rol / Perfil
                            </label>
                            <div className="relative">
                                <Funnel className={getIconClass()} size={18} />
                                <select 
                                    className={`${getInputClass()} appearance-none cursor-pointer`}
                                    value={rolFilter} 
                                    onChange={(e) => setRolFilter(e.target.value)}
                                >
                                    <option value="">Todos los roles</option>
                                    {['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'].map(r => (
                                        <option key={r} value={r}>
                                            {r.replace(/_/g, ' ')}
                                        </option>
                                    ))}
                                </select>
                                <CaretCircleDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Filtro de Asignaciones - Cyan */}
                        <div className="relative flex-1 min-w-[200px] group">
                            <label className={getLabelClass()}>
                                Asignaciones
                            </label>
                            <div className="relative">
                                <Users className={getIconClass()} size={18} />
                                <input
                                    type="text"
                                    placeholder="Ej: Profesor, Coord..."
                                    className={getInputClass()}
                                    value={asignacionesFilter}
                                    onChange={(e) => setAsignacionesFilter(e.target.value)}
                                />
                                {asignacionesFilter && (
                                    <button onClick={() => setAsignacionesFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <X size={14} weight="bold" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Barra de estado y estadísticas */}
                <div className="px-4 sm:px-5 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-[var(--ln-bg-panel)]/50 dark:to-[var(--ln-bg-panel)] border-t border-[var(--ln-border-standard)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2.5 bg-white dark:bg-[var(--ln-input-bg)] px-3 py-2 rounded-lg border border-[var(--ln-border-standard)] shadow-sm">
                                <span className="text-[13px] weight-600 text-[var(--ln-text-secondary)]">
                                    <span className="text-[var(--ln-brand-indigo)] weight-800">{filteredCount || 0}</span>
                                    <span className="text-[var(--ln-text-tertiary)]"> / </span>
                                    <span className="text-[var(--ln-text-quaternary)]">{totalCount || 0}</span>
                                </span>
                                <span className="text-[11px] text-[var(--ln-text-tertiary)] weight-500">usuarios</span>
                            </div>
                            
                            {hasActiveFilters && (
                                <div className="flex flex-wrap gap-2">
                                    {nombreFilter && <FilterBadge color="bg-blue-500">Nombre</FilterBadge>}
                                    {liderDoceFilter && <FilterBadge color="bg-amber-500">Líder de 12</FilterBadge>}
                                    {redFilter && <FilterBadge color="bg-purple-500">Red</FilterBadge>}
                                    {sexoFilter && <FilterBadge color="bg-pink-500">Sexo</FilterBadge>}
                                    {rolFilter && <FilterBadge color="bg-emerald-500">Rol</FilterBadge>}
                                    {asignacionesFilter && <FilterBadge color="bg-cyan-500">Asignación</FilterBadge>}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                <span className="text-[11px] weight-700 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Activos</span>
                            </div>
                            
                            {hasActiveFilters && (
                                <button
                                    onClick={clearAll}
                                    className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] weight-600 text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 transition-all active:scale-95"
                                >
                                    <X size={14} weight="bold" /> Limpiar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

UserFilters.propTypes = {
    nombreFilter: PropTypes.string.isRequired,
    setNombreFilter: PropTypes.func.isRequired,
    liderDoceFilter: PropTypes.string.isRequired,
    setLiderDoceFilter: PropTypes.func.isRequired,
    redFilter: PropTypes.string.isRequired,
    setRedFilter: PropTypes.func.isRequired,
    sexoFilter: PropTypes.string.isRequired,
    setSexoFilter: PropTypes.func.isRequired,
    rolFilter: PropTypes.string.isRequired,
    setRolFilter: PropTypes.func.isRequired,
    asignacionesFilter: PropTypes.string.isRequired,
    setAsignacionesFilter: PropTypes.func.isRequired,
    lideresDoce: PropTypes.array.isRequired,
    totalCount: PropTypes.number,
    filteredCount: PropTypes.number,
    currentUser: PropTypes.object,
};

export default UserFilters;

