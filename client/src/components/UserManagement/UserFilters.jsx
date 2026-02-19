import { Search, Filter } from 'lucide-react';
import PropTypes from 'prop-types';

const UserFilters = ({
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    sexFilter,
    setSexFilter,
    liderDoceFilter,
    setLiderDoceFilter,
    lideresDoce
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-row flex-wrap items-center gap-4">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="relative min-w-[200px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-gray-900 dark:text-white"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                >
                    <option value="">Todos los roles</option>
                    {['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'].map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                    ))}
                </select>
            </div>
            <div className="relative min-w-[150px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-gray-900 dark:text-white"
                    value={sexFilter}
                    onChange={(e) => setSexFilter(e.target.value)}
                >
                    <option value="">Todos los sexos</option>
                    <option value="HOMBRE">Hombre</option>
                    <option value="MUJER">Mujer</option>
                </select>
            </div>
            <div className="relative min-w-[200px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-gray-900 dark:text-white"
                    value={liderDoceFilter}
                    onChange={(e) => setLiderDoceFilter(e.target.value)}
                >
                    <option value="">Todos los Líderes 12</option>
                    {lideresDoce.map(l => (
                        <option key={l.id} value={l.id}>{l.fullName}</option>
                    ))}
                </select>
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
};

export default UserFilters;
