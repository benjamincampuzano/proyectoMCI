import { FileSearchIcon, Funnel, X } from '@phosphor-icons/react';
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

    const selectClass = "w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm text-gray-900 dark:text-white transition-colors";
    const iconClass = "absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none";

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Búsqueda */}
                <div className="sm:col-span-2 lg:col-span-1 relative">
                    <FileSearchIcon className={iconClass} size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-white transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filtro de rol */}
                <div className="relative">
                    <Funnel className={iconClass} size={16} />
                    <select className={selectClass} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                        <option value="">Todos los roles</option>
                        {['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'].map(r => (
                            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                </div>

                {/* Filtro de sexo */}
                <div className="relative">
                    <Funnel className={iconClass} size={16} />
                    <select className={selectClass} value={sexFilter} onChange={(e) => setSexFilter(e.target.value)}>
                        <option value="">Todos los sexos</option>
                        <option value="HOMBRE">Hombre</option>
                        <option value="MUJER">Mujer</option>
                    </select>
                </div>

                {/* Filtro de Líder 12 */}
                <div className="relative">
                    <Funnel className={iconClass} size={16} />
                    <AsyncSearchSelect
                        fetchItems={(term) => api.get('/users/search', { params: { search: term, role: 'LIDER_DOCE' } }).then(res => res.data)}
                        selectedValue={lideresDoce.find(l => l.id === parseInt(liderDoceFilter)) || (liderDoceFilter ? { id: parseInt(liderDoceFilter), fullName: 'Cargando...' } : null)}
                        onSelect={(user) => setLiderDoceFilter(user?.id?.toString() || '')}
                        placeholder="Todos los Líderes 12"
                        labelKey="fullName"
                        className="text-sm"
                    />
                </div>
            </div>

            {/* Barra de estado */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700">
                <span>
                    {filteredCount !== undefined && totalCount !== undefined
                        ? <><span className="font-semibold text-gray-700 dark:text-gray-300">{filteredCount}</span> de <span className="font-semibold">{totalCount}</span> usuarios</>
                        : 'Cargando...'}
                </span>
                {hasActiveFilters && (
                    <button
                        onClick={clearAll}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                    >
                        <X size={12} /> Limpiar filtros
                    </button>
                )}
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

