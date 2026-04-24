import { Calendar, Users, Eye, Trash, PencilSimple } from '@phosphor-icons/react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
};

// Fix timezone offset - formats date as YYYY-MM-DD without timezone shift
const formatDateLocal = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Display date for table - uses UTC to avoid day shift
const displayDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
        .toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
};

const EncuentroTable = ({ encuentros, onSelect, onDelete, onEdit, canModify }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Palabra Rhema</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fechas</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inscritos</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Coordinador</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {encuentros.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    No hay encuentros registrados.
                                </td>
                            </tr>
                        ) : (
                            encuentros.map((enc) => (
                                <tr key={enc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                            {enc.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p 
                                            className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                            onClick={() => onSelect(enc.id)}
                                        >{enc.name}</p>
                                        {enc.description && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{enc.description}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col text-sm text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {displayDate(enc.startDate)}
                                            </span>
                                            <span className="text-xs opacity-75">
                                                - {displayDate(enc.endDate)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                            <Users size={14} />
                                            {enc._count?.registrations || 0}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(enc.cost)}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {(() => {
                                            // Handle case where coordinator is an object with fullName
                                            const coord = enc.coordinator;
                                            if (coord?.fullName) return coord.fullName;
                                            if (coord?.name) return coord.name;
                                            if (coord?.email) return coord.email;
                                            // Handle case where API only returns coordinatorId
                                            if (enc.coordinatorId) {
                                                // If coordinatorId is an object (populated), get name
                                                const c = enc.coordinatorId;
                                                if (c?.fullName) return c.fullName;
                                                if (c?.name) return c.name;
                                                if (c?.email) return c.email;
                                                // If it's just a number/string, show as pending
                                                if (typeof c === 'number' || typeof c === 'string') {
                                                    return 'Asignado';
                                                }
                                            }
                                            return 'Sin Asignar';
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => onSelect(enc.id)}
                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Ver detalles"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {canModify && (
                                                <>
                                                    <button
                                                        onClick={(e) => onEdit(e, enc)}
                                                        className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                        title="Editar encuentro"
                                                    >
                                                        <PencilSimple size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => onDelete(e, enc.id)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EncuentroTable;
