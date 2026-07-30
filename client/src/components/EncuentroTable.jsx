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
            {/* Vista Desktop (Tabla Horizontal) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Palabra Rhema</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fechas</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inscritos / Preinscritos</th>
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
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                <Users size={14} />
                                                {enc.stats?.registeredCount ?? enc._count?.registrations ?? 0} Inscritos
                                            </div>
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                <Users size={14} />
                                                {enc.stats?.pendingCount ?? 0} preinscritos
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(enc.cost)}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {(() => {
                                            const coord = enc.coordinator;
                                            if (coord?.fullName) return coord.fullName;
                                            if (coord?.name) return coord.name;
                                            if (coord?.email) return coord.email;
                                            if (enc.coordinatorId) {
                                                const c = enc.coordinatorId;
                                                if (c?.fullName) return c.fullName;
                                                if (c?.name) return c.name;
                                                if (c?.email) return c.email;
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

            {/* Vista Móvil (Tarjetas Verticales) */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {encuentros.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No hay encuentros registrados.
                    </div>
                ) : (
                    encuentros.map((enc) => {
                        const coordName = (() => {
                            const coord = enc.coordinator;
                            if (coord?.fullName) return coord.fullName;
                            if (coord?.name) return coord.name;
                            if (coord?.email) return coord.email;
                            if (enc.coordinatorId) {
                                const c = enc.coordinatorId;
                                if (c?.fullName) return c.fullName;
                                if (c?.name) return c.name;
                                if (c?.email) return c.email;
                                if (typeof c === 'number' || typeof c === 'string') return 'Asignado';
                            }
                            return 'Sin Asignar';
                        })();

                        const registeredCount = enc.stats?.registeredCount ?? enc._count?.registrations ?? 0;
                        const pendingCount = enc.stats?.pendingCount ?? 0;

                        return (
                            <div 
                                key={enc.id} 
                                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750/50 transition-colors"
                            >
                                {/* Header de la tarjeta móvil */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                {enc.type}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Calendar size={13} />
                                                {displayDate(enc.startDate)} - {displayDate(enc.endDate)}
                                            </span>
                                        </div>
                                        <h3 
                                            onClick={() => onSelect(enc.id)}
                                            className="text-base font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors leading-snug"
                                        >
                                            {enc.name}
                                        </h3>
                                        {enc.description && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                {enc.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Botones de acción */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => onSelect(enc.id)}
                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                            title="Ver detalles"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        {canModify && (
                                            <>
                                                <button
                                                    onClick={(e) => onEdit(e, enc)}
                                                    className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <PencilSimple size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => onDelete(e, enc.id)}
                                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Detalles en grid vertical */}
                                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                                    <div>
                                        <span className="text-gray-400 dark:text-gray-500 block text-[10px] uppercase font-medium">Coordinador</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{coordName}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 dark:text-gray-500 block text-[10px] uppercase font-medium">Costo</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(enc.cost)}</span>
                                    </div>
                                </div>

                                {/* Chips de Inscritos / Preinscritos */}
                                <div className="flex items-center gap-2 mt-2 pt-2">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                        <Users size={13} />
                                        {registeredCount} Inscritos
                                    </span>
                                    {pendingCount > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                            <Users size={13} />
                                            {pendingCount} preinscritos
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default EncuentroTable;
