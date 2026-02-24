import { useState, useEffect, useMemo } from 'react';
import { Calendar, Check, X, Users, Map as MapIcon, MapPin, Clock, Info } from 'lucide-react';
import { sileo as toast } from 'sileo';
import useCellAttendance from '../hooks/useCellAttendance';
import { useAuth } from '../context/AuthContext';
import CellMap from './CellMap';

const CellAttendance = () => {
    const {
        date,
        setDate,
        cells,
        selectedCell,
        setSelectedCell,
        members,
        attendances,
        toggleAttendance,
        loading,
        saving,
        saveAttendance,
    } = useCellAttendance();
    const [showMap, setShowMap] = useState(false);
    const { user, isAdmin, hasAnyRole } = useAuth();

    // Check if user is a standard member (DISCIPULO or MIEMBRO) without administrative roles
    // or being the leader of the selected cell
    const currentCell = useMemo(() => cells.find(c => c.id === selectedCell), [cells, selectedCell]);

    const isLeadership = isAdmin() || hasAnyRole(['PASTOR', 'LIDER_DOCE']);
    const isCellLeader = currentCell?.leaderId === user?.id;
    const isStandardMember = hasAnyRole(['DISCIPULO', 'MIEMBRO']);

    // canEdit is true if they have leadership roles, are the leader of this cell,
    // or are a standard member (they will only see themselves anyway)
    const canEdit = isLeadership || isCellLeader || isStandardMember;

    // Auto-select cell for disciple users
    useEffect(() => {
        if (isStandardMember && !isCellLeader && cells.length > 0 && !selectedCell) {
            // Find the cell the disciple belongs to
            const userCell = cells.find(cell =>
                cell.members?.some(memberId => memberId === user?.id) ||
                cell.leaderId === user?.id
            );
            if (userCell) {
                setSelectedCell(userCell.id);
            } else if (cells.length > 0) {
                setSelectedCell(cells[0].id);
            }
        }
    }, [isStandardMember, isCellLeader, cells, user, selectedCell, setSelectedCell]);

    const handleSubmit = async () => {
        if (!canEdit) return;

        const res = await saveAttendance();
        if (res.success) {
            toast.success('Asistencia de célula guardada exitosamente');
            return;
        }
        toast.error(res.message || 'Error al guardar asistencia');
    };

    return (
        <div className="space-y-6">
            {/* Header with Map Toggle */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <MapIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white">Georreferenciación</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ubicación de células</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowMap(!showMap)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${showMap
                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                        }`}
                >
                    {showMap ? 'Ocultar Mapa' : 'Ver Mapa'}
                </button>
            </div>

            {showMap && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <CellMap cells={cells} />
                </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <Users className="w-6 h-6 text-blue-600" />
                    <select
                        value={selectedCell || ''}
                        onChange={(e) => setSelectedCell(parseInt(e.target.value))}
                        disabled={!canEdit}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {cells.map(cell => (
                            <option key={cell.id} value={cell.id}>
                                {cell.name} - {cell.leader.fullName}
                            </option>
                        ))}
                    </select>
                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={saving || !selectedCell || !canEdit}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                    {saving ? 'Guardando...' : (!canEdit ? 'Solo Lectura' : 'Guardar Asistencia')}
                </button>
            </div>

            {/* Cell Basic Info Section */}
            {currentCell && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <Users className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Líder y Anfitrión</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">L: {currentCell.leader?.fullName || 'N/A'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">A: {currentCell.host?.fullName || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Dirección</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate" title={currentCell.address}>
                                {currentCell.address || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{currentCell.city || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <Calendar className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Día de Reunión</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{currentCell.dayOfWeek || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <Clock className="w-5 h-5 text-orange-500 mt-0.5" />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Hora</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{currentCell.time || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-8">Cargando Discípulos...</div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Asistencia
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {members.map((member) => {
                                const status = attendances[member.id]; // undefined, 'PRESENTE', 'AUSENTE'

                                return (
                                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {member.fullName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {member.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => toggleAttendance(member.id, 'PRESENTE')}
                                                    disabled={!canEdit}
                                                    className={`
                                                      inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors
                                                      ${status === 'PRESENTE'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 ring-2 ring-green-500'
                                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                        }
                                                        ${!canEdit ? 'cursor-not-allowed opacity-80' : ''}
                                                    `}
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Presente
                                                </button>
                                                <button
                                                    onClick={() => toggleAttendance(member.id, 'AUSENTE')}
                                                    disabled={!canEdit}
                                                    className={`
                                                      inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors
                                                      ${status === 'AUSENTE'
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 ring-2 ring-red-500'
                                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                        }
                                                        ${!canEdit ? 'cursor-not-allowed opacity-80' : ''}
                                                    `}
                                                >
                                                    <X className="w-4 h-4" />
                                                    Ausente
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CellAttendance;
