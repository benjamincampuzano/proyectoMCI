import { useState, useEffect } from 'react';
import { Calendar, Check, X, Trash } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const ChurchAttendance = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [members, setMembers] = useState([]);
    const [attendances, setAttendances] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchMembers();
        fetchAttendance();
    }, [date]);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/consolidar/church-attendance/members/all');
            setMembers(response.data);
        } catch (error) {
            toast.error('Error al cargar miembros. Por favor intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendance = async () => {
        try {
            const response = await api.get(`/consolidar/church-attendance/${date}`);
            const data = response.data;

            const attendanceMap = {};
            data.forEach(att => {
                attendanceMap[att.userId] = att.status;
            });
            setAttendances(attendanceMap);
        } catch (error) {
            toast.error('Error al cargar asistencia. Por favor intenta nuevamente.');
        }
    };

    const handleAttendanceChange = (userId, status) => {
        setAttendances(prev => {
            const currentStatus = prev[userId];
            // Si hace click en el mismo estado, lo desmarca (vuelve a vacío)
            if (currentStatus === status) {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            }
            return {
                ...prev,
                [userId]: status
            };
        });
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            // Solo enviar registros que tengan estado definido
            const attendanceData = Object.entries(attendances).map(([userId, status]) => ({
                userId: parseInt(userId),
                status
            }));

            if (attendanceData.length === 0) {
                toast.error('No hay registros de asistencia para guardar');
                return;
            }

            await api.post('/consolidar/church-attendance', {
                date,
                attendances: attendanceData
            });

            toast.success('Asistencia guardada exitosamente');
        } catch (error) {
            toast.error('Error al guardar asistencia. Por favor intenta nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAttendance = async () => {
        try {
            setDeleting(true);
            await api.delete(`/consolidar/church-attendance/${date}`);
            setAttendances({});
            setShowDeleteConfirm(false);
            toast.success('Registros de asistencia eliminados exitosamente');
        } catch (error) {
            toast.error('Error al eliminar registros de asistencia. Por favor intenta nuevamente.');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8">Cargando...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={Object.keys(attendances).length === 0}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                    >
                        <Trash className="w-4 h-4" />
                        Eliminar Registros
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                        {saving ? 'Guardando...' : 'Guardar Asistencia'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nombre
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rol
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
                                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {member.fullName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {member.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {member.roles?.join(', ') || member.role}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleAttendanceChange(member.id, 'PRESENTE')}
                                                className={`
                                                    inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                                                    ${status === 'PRESENTE'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 ring-2 ring-green-500'
                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                    }
                                                `}
                                            >
                                                <Check className="w-4 h-4" />
                                                Presente
                                            </button>
                                            <button
                                                onClick={() => handleAttendanceChange(member.id, 'AUSENTE')}
                                                className={`
                                                    inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                                                    ${status === 'AUSENTE'
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 ring-2 ring-red-500'
                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                    }
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

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Eliminar Registros de Asistencia</h3>
                            <button 
                                onClick={() => setShowDeleteConfirm(false)} 
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <div className="text-red-600 dark:text-red-400 mt-0.5">
                                        <Trash className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-red-800 dark:text-red-200 font-semibold mb-2">
                                            ¿Estás seguro de eliminar todos los registros?
                                        </h4>
                                        <p className="text-red-700 dark:text-red-300 text-sm">
                                            Se eliminarán todos los registros de asistencia del día <strong>{new Date(date).toLocaleDateString()}</strong>. 
                                            Esta acción no se puede deshacer.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                <p>Registros a eliminar: <strong>{Object.keys(attendances).length}</strong></p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteAttendance}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-lg transition-colors flex items-center gap-2"
                            >
                                {deleting ? 'Eliminando...' : 'Eliminar Registros'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChurchAttendance;
