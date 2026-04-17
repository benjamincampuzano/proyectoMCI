import { useState } from 'react';
import { Funnel, X, MagnifyingGlass, UserCircleDashed, Network, Users, Crown, SlidersHorizontal, CaretCircleDownIcon } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import { AsyncSearchSelect } from '../ui';
import api from '../../utils/api';

// Configuración de colores por filtro
const FILTER_COLORS = {
    nombre: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200', ring: 'focus:ring-blue-500/20', focusBorder: 'focus:border-blue-500', icon: 'text-blue-500' },
    liderDoce: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200', ring: 'focus:ring-amber-500/20', focusBorder: 'focus:border-amber-500', icon: 'text-amber-500' },
    red: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-200', ring: 'focus:ring-purple-500/20', focusBorder: 'focus:border-purple-500', icon: 'text-purple-500' },
    sexo: { bg: 'bg-pink-500', text: 'text-pink-600', border: 'border-pink-200', ring: 'focus:ring-pink-500/20', focusBorder: 'focus:border-pink-500', icon: 'text-pink-500' },
    rol: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'focus:ring-emerald-500/20', focusBorder: 'focus:border-emerald-500', icon: 'text-emerald-500' },
    asignaciones: { bg: 'bg-cyan-500', text: 'text-cyan-600', border: 'border-cyan-200', ring: 'focus:ring-cyan-500/20', focusBorder: 'focus:border-cyan-500', icon: 'text-cyan-500' },
};

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

    const getInputClass = (colorKey) => {
        const colors = FILTER_COLORS[colorKey];
        return `w-full pl-11 pr-4 py-3 bg-white dark:bg-[var(--ln-input-bg)] border-2 ${colors.border} ${colors.focusBorder} ${colors.ring} text-[14px] weight-600 text-[var(--ln-text-primary)] rounded-xl outline-none transition-all placeholder:text-[var(--ln-text-tertiary)]/60 hover:shadow-lg hover:shadow-${colorKey === 'nombre' ? 'blue' : colorKey === 'liderDoce' ? 'amber' : colorKey === 'red' ? 'purple' : colorKey === 'sexo' ? 'pink' : colorKey === 'rol' ? 'emerald' : 'cyan'}-500/10`;
    };

    const getLabelClass = (colorKey) => {
        const colors = FILTER_COLORS[colorKey];
        return `block text-[11px] weight-800 ${colors.text} uppercase tracking-widest mb-2 pl-1 flex items-center gap-1.5`;
    };

    const getIconClass = (colorKey) => {
        const colors = FILTER_COLORS[colorKey];
        return `absolute left-4 top-1/2 -translate-y-1/2 ${colors.icon} transition-all duration-300 group-focus-within:scale-110`;
    };

    const FilterBadge = ({ color, children }) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] weight-700 text-white ${color} shadow-lg`}>
            {children}
        </span>
    );

    return (
        <div className="bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-[var(--ln-bg-panel)] dark:via-[var(--ln-bg-panel)] dark:to-[var(--ln-bg-panel)]/80 backdrop-blur-xl rounded-[24px] border-2 border-[var(--ln-border-standard)] shadow-xl shadow-black/5 dark:shadow-none overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
            {/* Header con toggle en móvil */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--ln-border-standard)] bg-gradient-to-r from-gray-50/80 to-white dark:from-[var(--ln-bg-panel)] dark:to-[var(--ln-bg-panel)]/80">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--ln-brand-indigo)] to-purple-600 shadow-lg shadow-indigo-500/30">
                        <SlidersHorizontal size={20} weight="bold" className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-[15px] weight-700 text-[var(--ln-text-primary)]">Filtros Avanzados</h3>
                        <p className="text-[11px] text-[var(--ln-text-tertiary)] hidden sm:block">Filtra usuarios por múltiples criterios</p>
                    </div>
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
                    {/* Botón toggle solo en móvil */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="sm:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--ln-brand-indigo)] text-white text-[13px] weight-600 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                    >
                        {isExpanded ? 'Ocultar' : 'Mostrar'}
                        <CaretCircleDownIcon size={16} weight="bold" className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Contenido de filtros - visible en PC siempre, en móvil según estado */}
            <div className={`transition-all duration-500 ease-out overflow-hidden ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 sm:max-h-[2000px] sm:opacity-100'}`}>
                <div className="p-4 sm:p-5 space-y-4">
                    <div className="flex flex-wrap gap-3 items-start">
                        {/* Filtro de Nombre - Azul */}
                        <div className="relative group flex-1 min-w-[200px]">
                            <label className={getLabelClass('nombre')}>
                                <div className="w-4 h-4 rounded-full bg-blue-500 shadow-md shadow-blue-500/30" />
                                Nombre
                            </label>
                            <div className="relative">
                                <MagnifyingGlass className={getIconClass('nombre')} size={18} weight="bold" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    className={getInputClass('nombre')}
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

                        {/* Filtro de Líder Doce - Ámbar */}
                        <div className="relative flex-[1.5] min-w-[260px] group">
                            <label className={getLabelClass('liderDoce')}>
                                <div className="w-4 h-4 rounded-full bg-amber-500 shadow-md shadow-amber-500/30" />
                                Líder Doce
                            </label>
                            <div className="relative">
                                <Crown className={getIconClass('liderDoce')} size={18} weight="bold" />
                                <AsyncSearchSelect
                                    fetchItems={(term) => api.get('/users/search', { params: { search: term, role: 'LIDER_DOCE' } }).then(res => res.data)}
                                    selectedValue={lideresDoce.find(l => l.id === parseInt(liderDoceFilter)) || (liderDoceFilter ? { id: parseInt(liderDoceFilter), fullName: 'Cargando...' } : null)}
                                    onSelect={(user) => setLiderDoceFilter(user?.id?.toString() || '')}
                                    placeholder="Buscar líder doce..."
                                    labelKey="fullName"
                                    className="bg-white dark:bg-[var(--ln-input-bg)] border-2 border-amber-200 focus:border-amber-500 rounded-xl"
                                />
                            </div>
                            {liderDoceFilter && (
                                <FilterBadge color="bg-amber-500">Líder seleccionado</FilterBadge>
                            )}
                        </div>

                        {/* Filtro de Red - Púrpura */}
                        <div className="relative flex-1 min-w-[180px] group">
                            <label className={getLabelClass('red')}>
                                <div className="w-4 h-4 rounded-full bg-purple-500 shadow-md shadow-purple-500/30" />
                                Red
                            </label>
                            <div className="relative">
                                <Network className={getIconClass('red')} size={18} weight="bold" />
                                <select 
                                    className={`${getInputClass('red')} appearance-none cursor-pointer`}
                                    value={redFilter} 
                                    onChange={(e) => setRedFilter(e.target.value)}
                                >
                                    <option value="">Todas las redes</option>
                                    <option value="MUJERES">🔴 Mujeres</option>
                                    <option value="HOMBRES">🔵 Hombres</option>
                                    <option value="KIDS">🟡 Kids (5-7)</option>
                                    <option value="ROCAS">🟢 Rocas (8-10)</option>
                                    <option value="TEENS">🟣 Teens (11-13)</option>
                                    <option value="JOVENES">⚫ Jóvenes (14+)</option>
                                </select>
                                <CaretCircleDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" size={16} weight="bold" />
                            </div>
                        </div>

                        {/* Filtro de Sexo - Rosa */}
                        <div className="relative flex-1 min-w-[140px] group">
                            <label className={getLabelClass('sexo')}>
                                <div className="w-4 h-4 rounded-full bg-pink-500 shadow-md shadow-pink-500/30" />
                                Sexo
                            </label>
                            <div className="relative">
                                <UserCircleDashed className={getIconClass('sexo')} size={18} weight="bold" />
                                <select 
                                    className={`${getInputClass('sexo')} appearance-none cursor-pointer`}
                                    value={sexoFilter} 
                                    onChange={(e) => setSexoFilter(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="HOMBRE">👨 Hombre</option>
                                    <option value="MUJER">👩 Mujer</option>
                                </select>
                                <CaretCircleDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-400 pointer-events-none" size={16} weight="bold" />
                            </div>
                        </div>

                        {/* Filtro de Rol - Esmeralda */}
                        <div className="relative flex-1 min-w-[180px] group">
                            <label className={getLabelClass('rol')}>
                                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/30" />
                                Rol / Perfil
                            </label>
                            <div className="relative">
                                <Funnel className={getIconClass('rol')} size={18} weight="bold" />
                                <select 
                                    className={`${getInputClass('rol')} appearance-none cursor-pointer`}
                                    value={rolFilter} 
                                    onChange={(e) => setRolFilter(e.target.value)}
                                >
                                    <option value="">Todos los roles</option>
                                    {['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'].map(r => (
                                        <option key={r} value={r}>
                                            {r === 'ADMIN' ? '👑' : r === 'PASTOR' ? '✝️' : r === 'LIDER_DOCE' ? '⭐' : r === 'LIDER_CELULA' ? '📍' : '🙏'} {r.replace(/_/g, ' ')}
                                        </option>
                                    ))}
                                </select>
                                <CaretCircleDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" size={16} weight="bold" />
                            </div>
                        </div>

                        {/* Filtro de Asignaciones - Cyan */}
                        <div className="relative flex-1 min-w-[200px] group">
                            <label className={getLabelClass('asignaciones')}>
                                <div className="w-4 h-4 rounded-full bg-cyan-500 shadow-md shadow-cyan-500/30" />
                                Asignaciones
                            </label>
                            <div className="relative">
                                <Users className={getIconClass('asignaciones')} size={18} weight="bold" />
                                <input
                                    type="text"
                                    placeholder="Ej: Profesor, Coord..."
                                    className={getInputClass('asignaciones')}
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
                                    {liderDoceFilter && <FilterBadge color="bg-amber-500">Líder Doce</FilterBadge>}
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
};

export default UserFilters;

