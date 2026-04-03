import { Calendar, Users, Pen, Trash, GuitarIcon, GraduationCap, Eye, Pencil, BookOpen } from '@phosphor-icons/react';

const formatCurrency = (amount) => {
    const value = parseFloat(amount) || 0;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
};

const ArtClassTable = ({ classes, onSelect, onDelete, onEdit, canModify }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Horario</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duración</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Personal (Prof/Aux)</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inscritos</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {classes.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    No hay clases registradas.
                                </td>
                            </tr>
                        ) : (
                            classes.map((cls) => (
                                <tr key={cls.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <GuitarIcon className="w-4 h-4 text-purple-600" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{cls.name}</p>
                                                {cls.description && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{cls.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                            {cls.schedule}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                                                <Calendar size={14} />
                                                {(cls.duration / 60).toFixed(1)} h / Clase
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                                                8 Clases Totales
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                            <Users size={14} />
                                            {cls._count?.enrollments || 0}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(cls.cost)}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1">
                                                <GraduationCap className="w-4 h-4 text-green-500" />
                                                <span className="font-medium text-gray-900 dark:text-gray-200">
                                                    {cls.professor?.profile?.fullName || cls.professor?.fullName || 'Sin Asignar'}
                                                </span>
                                            </div>
                                            {cls.coordinator && (
                                                <div className="flex items-center gap-1 opacity-80">
                                                    <Users className="w-4 h-4 text-blue-500" />
                                                    <span className="text-xs">
                                                        {cls.coordinator?.profile?.fullName || cls.coordinator?.fullName}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => onSelect(cls.id)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Ver clase e inscribir estudiantes"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {canModify && (
                                                <>
                                                    <button
                                                        onClick={() => onEdit(cls.id)}
                                                        className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                                        title="Editar información de la clase"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => onDelete(e, cls.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Eliminar clase"
                                                    >
                                                        <Trash size={16} />
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

export default ArtClassTable;
