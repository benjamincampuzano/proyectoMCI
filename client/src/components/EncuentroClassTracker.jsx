import { useState } from 'react';
import { Check, X, UserPlus } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const EncuentroClassTracker = ({ registrations, onRefresh, onConvert, canModify }) => {
    const [updating, setUpdating] = useState({});
    const isRestricted = !canModify;

    const handleToggle = async (registrationId, classNumber, currentStatus) => {
        const key = `${registrationId}-${classNumber}`;
        setUpdating(prev => ({ ...prev, [key]: true }));

        try {
            await api.put(`/encuentros/registrations/${registrationId}/classes/${classNumber}`, {
                attended: !currentStatus
            });
            onRefresh();
        } catch {
            toast.error('Error al actualizar asistencia. Por favor intenta nuevamente.');
        } finally {
            setUpdating(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleToggleBaptism = async (registrationId, currentStatus) => {
        const key = `baptism-${registrationId}`;
        setUpdating(prev => ({ ...prev, [key]: true }));

        try {
            await api.put(`/encuentros/registrations/${registrationId}`, {
                isBaptized: !currentStatus
            });
            onRefresh();
        } catch {
            toast.error('Error al actualizar bautismo. Por favor intenta nuevamente.');
        } finally {
            setUpdating(prev => ({ ...prev, [key]: false }));
        }
    };

    const isAttended = (reg, classNum) => {
        return reg.classAttendances?.some(c => c.classNumber === classNum && c.attended);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-900 z-10 w-64">
                                Participante
                            </th>
                            {/* Pre-Encuentro Headers */}
                            {[0, 1, 2, 3, 4].map(num => (
                                <th key={num} className="px-2 py-4 text-center text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider min-w-[50px]">
                                    Pre {num}
                                </th>
                            ))}
                            {/* Spacer for Event */}
                            <th className="px-4 py-4 text-center text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider bg-yellow-50 dark:bg-yellow-900/10">
                                ENCUENTRO
                            </th>
                            {/* Post-Encuentro Headers */}
                            {[5, 6, 7, 8, 9].map(num => (
                                <th key={num} className="px-2 py-4 text-center text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider min-w-[50px]">
                                    Pos {num}
                                </th>
                            ))}
                            {/* Bautizo Header */}
                            <th className="px-4 py-4 text-center text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider bg-purple-50 dark:bg-purple-900/10 min-w-[80px]">
                                Bautizo
                            </th>
                            {/* Actions Header */}
                            {!isRestricted && (
                                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Acciones
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {registrations.map((reg) => (
                            <tr key={reg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800 z-10">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {reg.guest?.name || reg.user?.fullName}
                                    </div>
                                    <div className="text-xs text-gray-500">{reg.guest?.status || 'Discípulo'}</div>
                                </td>

                                {/* Pre-Encuentro Cells */}
                                {[1, 2, 3, 4, 5].map(num => {
                                    const attended = isAttended(reg, num);
                                    const loading = updating[`${reg.id}-${num}`];
                                    return (
                                        <td key={num} className="px-2 py-4 text-center">
                                            <button
                                                onClick={() => handleToggle(reg.id, num, attended)}
                                                disabled={loading || isRestricted}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${attended
                                                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500'
                                                    } ${loading || isRestricted ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
                                            >
                                                {attended ? <Check size={16} /> : <span className="text-xs">{num}</span>}
                                            </button>
                                        </td>
                                    );
                                })}

                                {/* Event Spacer Cell */}
                                <td className="px-4 py-4 text-center bg-yellow-50 dark:bg-yellow-900/10 border-l border-r border-gray-200 dark:border-gray-700">
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-gray-400">ENC</span>
                                    </div>
                                </td>

                                {/* Post-Encuentro Cells */}
                                {[6, 7, 8, 9, 10].map(num => {
                                    const attended = isAttended(reg, num);
                                    const loading = updating[`${reg.id}-${num}`];
                                    return (
                                        <td key={num} className="px-2 py-4 text-center">
                                            <button
                                                onClick={() => handleToggle(reg.id, num, attended)}
                                                disabled={loading || isRestricted}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${attended
                                                    ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500'
                                                    } ${loading || isRestricted ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
                                            >
                                                {attended ? <Check size={16} /> : <span className="text-xs">{num - 5}</span>}
                                            </button>
                                        </td>
                                    );
                                })}

                                {/* Bautizo Cell */}
                                <td className="px-4 py-4 text-center bg-purple-50 dark:bg-purple-900/10 border-l border-r border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => handleToggleBaptism(reg.id, reg.isBaptized)}
                                        disabled={updating[`baptism-${reg.id}`] || isRestricted}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all mx-auto ${reg.isBaptized
                                            ? 'bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400'
                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500'
                                            } ${updating[`baptism-${reg.id}`] || isRestricted ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
                                        title="Marcar como bautizado"
                                    >
                                        {reg.isBaptized ? <Check size={16} /> : <span className="text-xs">✝</span>}
                                    </button>
                                </td>

                                {/* Actions Cell */}
                                {canModify && (
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        {reg.guest && (
                                            <button
                                                onClick={() => onConvert && onConvert(reg)}
                                                className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 inline-flex items-center"
                                                title="Convertir a Discípulo"
                                            >
                                                <UserPlus size={18} />
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                        {registrations.length === 0 && (
                            <tr>
                                <td colSpan={isRestricted ? 12 : 13} className="px-6 py-8 text-center text-gray-500">
                                    No hay registros aún.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {registrations.map((reg) => (
                    <div key={reg.id} className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white">
                                    {reg.guest?.name || reg.user?.fullName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{reg.guest?.status || 'Discípulo'}</div>
                            </div>
                            {canModify && reg.guest && (
                                <button
                                    onClick={() => onConvert && onConvert(reg)}
                                    className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                    title="Convertir a Discípulo"
                                >
                                    <UserPlus size={18} />
                                </button>
                            )}
                        </div>

                        {/* Pre-Encuentro grid */}
                        <div>
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight block mb-1.5">
                                Pre-Encuentro (Clases 1 - 5)
                            </span>
                            <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 3, 4, 5].map(num => {
                                    const attended = isAttended(reg, num);
                                    const loading = updating[`${reg.id}-${num}`];
                                    return (
                                        <button
                                            key={num}
                                            onClick={() => handleToggle(reg.id, num, attended)}
                                            disabled={loading || isRestricted}
                                            className={`h-9 rounded-lg flex flex-col items-center justify-center transition-all ${attended
                                                ? 'bg-blue-100 text-blue-700 font-bold dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                                                : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400 border border-transparent'
                                            } ${loading || isRestricted ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                                        >
                                            {attended ? <Check size={14} weight="bold" /> : <span className="text-xs font-semibold">{num}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Pos-Encuentro grid */}
                        <div>
                            <span className="text-[11px] font-bold text-green-600 dark:text-green-400 uppercase tracking-tight block mb-1.5">
                                Pos-Encuentro (Clases 1 - 5)
                            </span>
                            <div className="grid grid-cols-5 gap-2">
                                {[6, 7, 8, 9, 10].map(num => {
                                    const attended = isAttended(reg, num);
                                    const loading = updating[`${reg.id}-${num}`];
                                    return (
                                        <button
                                            key={num}
                                            onClick={() => handleToggle(reg.id, num, attended)}
                                            disabled={loading || isRestricted}
                                            className={`h-9 rounded-lg flex flex-col items-center justify-center transition-all ${attended
                                                ? 'bg-green-100 text-green-700 font-bold dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-700'
                                                : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400 border border-transparent'
                                            } ${loading || isRestricted ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                                        >
                                            {attended ? <Check size={14} weight="bold" /> : <span className="text-xs font-semibold">{num - 5}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Bautizo action */}
                        <div className="pt-2 flex justify-between items-center border-t border-gray-100 dark:border-gray-700/60">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                Bautismo:
                            </span>
                            <button
                                onClick={() => handleToggleBaptism(reg.id, reg.isBaptized)}
                                disabled={updating[`baptism-${reg.id}`] || isRestricted}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${reg.isBaptized
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-700'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                } ${updating[`baptism-${reg.id}`] || isRestricted ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                            >
                                <Check size={14} className={reg.isBaptized ? 'opacity-100' : 'opacity-0'} />
                                <span>{reg.isBaptized ? 'Bautizado' : 'Marcar Bautizo'}</span>
                            </button>
                        </div>
                    </div>
                ))}
                {registrations.length === 0 && (
                    <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No hay registros aún.
                    </div>
                )}
            </div>
        </div>
    );
};

export default EncuentroClassTracker;
