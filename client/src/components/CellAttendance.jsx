import { useState, useEffect, useMemo } from 'react';
import { Calendar, Check, X, Users, MapPin, Clock, User, XCircle } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import useCellAttendance from '../hooks/useCellAttendance';
import { useAuth } from '../context/AuthContext';
import CellMap from './CellMap';
import ModalAttendance from './ModalAttendance';

const CellAttendance = ({ moduleCoordinator, moduleSubCoordinator, moduleTreasurer }) => {
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
    const [showReportModal, setShowReportModal] = useState(false);
    const { user, isAdmin, hasAnyRole } = useAuth();

    // Check if user is a standard member (DISCIPULO or MIEMBRO) without administrative roles
    // or being the leader of the selected cell
    const currentCell = useMemo(() => cells.find(c => c.id === selectedCell), [cells, selectedCell]);

    const isModuleCoordinator = moduleCoordinator?.id === user?.id;
    const isModuleSubCoordinator = moduleSubCoordinator?.id === user?.id;
    const isModuleTreasurer = moduleTreasurer?.id === user?.id;
    const isLeadership = isAdmin() ||
        hasAnyRole(['PASTOR', 'LIDER_DOCE']) ||
        isModuleCoordinator ||
        isModuleSubCoordinator ||
        isModuleTreasurer;
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

    const handleSaveReport = async (report) => {
      try {
        await api.post('/attendance/self-report', {
          type: report.type,
          date: report.date,
          attended: report.attended,
        });
        toast.success(`Asistencia a ${report.type === 'church' ? 'Iglesia' : 'Célula'} registrada`);
        setShowReportModal(false);
      } catch (error) {
        const msg = error.response?.data?.error || 'Error al registrar asistencia';
        toast.error(msg);
      }
    };

    return (
        <div className="space-y-6">
            {/* Header with Map Toggle */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <select
                            value={selectedCell || ''}
                            onChange={(e) => setSelectedCell(parseInt(e.target.value))}
                            disabled={!canEdit}
                            className="w-full sm:w-72 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {cells.map(cell => (
                                <option key={cell.id} value={cell.id} className="truncate">
                                    {cell.name} - {cell.leader.fullName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                    <button
                        onClick={() => setShowReportModal(true)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <User className="w-4 h-4" />
                        Mi asistencia
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !selectedCell || !canEdit}
                        className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                        {saving ? 'Guardando...' : (!canEdit ? 'Solo Lectura' : 'Guardar Asistencia')}
                    </button>
                </div>
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
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[200px]" title={currentCell.address}>
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
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
                    {members.map((member) => {
                        const status = attendances[member.id]; // undefined, 'PRESENTE', 'AUSENTE'

                        return (
                            <div key={member.id} className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{member.fullName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                        status === 'PRESENTE'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            : status === 'AUSENTE'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                    }`}>
                                        {status === 'PRESENTE' ? 'Presente' : status === 'AUSENTE' ? 'Ausente' : 'Sin registrar'}
                                    </span>
                                    <button
                                        onClick={() => toggleAttendance(member.id, 'PRESENTE')}
                                        disabled={!canEdit}
                                        className={`
                                            flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors text-sm
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
                                            flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors text-sm
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
                                    {status && (
                                        <button
                                            onClick={() => toggleAttendance(member.id, null)}
                                            disabled={!canEdit}
                                            className="inline-flex items-center justify-center px-3 py-2 rounded-lg font-medium transition-colors text-sm bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {members.length === 0 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">No hay discípulos en esta célula.</div>
                    )}
                </div>
            )}

            <ModalAttendance
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                initialType="cell"
                user={user}
                onSave={handleSaveReport}
                requireReport={false}
                allowOutsideClose={true}
            />
        </div>
    );
};

export default CellAttendance;
