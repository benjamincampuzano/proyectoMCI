import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, UserPlus, BookOpen, GuitarIcon, Pencil, Trash } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { AsyncSearchSelect, ConfirmDialog } from './ui';

const ArtClassAttendanceTracker = ({ classId, enrollments, onRefresh, onConvert, canModify }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [selectedSession, setSelectedSession] = useState(null);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState(null);
    const [sessionDate, setSessionDate] = useState('');
    const [sessionTopic, setSessionTopic] = useState('');
    const [attendanceData, setAttendanceData] = useState({});

    useEffect(() => {
        if (classId) {
            fetchSessions();
        }
    }, [classId]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/arts/classes/${classId}/sessions`);
            setSessions(response.data);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            toast.error('Error cargando las sesiones');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        setIsEditing(false);
        setEditingSessionId(null);
        setSessionDate('');
        setSessionTopic('');
        setShowSessionModal(true);
    };

    const handleOpenEditModal = (session) => {
        setIsEditing(true);
        setEditingSessionId(session.id);
        setSessionDate(new Date(session.date).toISOString().split('T')[0]);
        setSessionTopic(session.topic || '');
        setShowSessionModal(true);
    };

    const handleSubmitSession = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/arts/sessions/${editingSessionId}`, {
                    date: sessionDate,
                    topic: sessionTopic
                });
                toast.success('Sesión actualizada exitosamente');
            } else {
                await api.post(`/arts/classes/${classId}/sessions`, {
                    date: sessionDate,
                    topic: sessionTopic
                });
                toast.success('Sesión creada exitosamente');
            }
            setShowSessionModal(false);
            setSessionDate('');
            setSessionTopic('');
            fetchSessions();
        } catch (error) {
            console.error('Error submitting session:', error);
            toast.error(isEditing ? 'Error actualizando la sesión' : 'Error creando la sesión');
        }
    };

    const handleDeleteSession = (session) => {
        setSessionToDelete(session);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!sessionToDelete) return;
        
        try {
            await api.delete(`/arts/sessions/${sessionToDelete.id}`);
            toast.success('Sesión eliminada correctamente');
            setShowDeleteConfirm(false);
            setSessionToDelete(null);
            fetchSessions();
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Error al eliminar la sesión');
        }
    };

    const handleOpenAttendance = (session) => {
        setSelectedSession(session);
        setAttendanceData({});
        setShowAttendanceModal(true);
    };

    const handleAttendanceChange = (enrollmentId, status) => {
        setAttendanceData(prev => ({
            ...prev,
            [enrollmentId]: status
        }));
    };

    const handleSaveAttendance = async () => {
        try {
            await api.post(`/arts/sessions/${selectedSession.id}/attendance`, {
                attendance: attendanceData
            });
            setShowAttendanceModal(false);
            setSelectedSession(null);
            setAttendanceData({});
            fetchSessions();
            toast.success('Asistencia guardada exitosamente');
        } catch (error) {
            console.error('Error saving attendance:', error);
            toast.error('Error guardando la asistencia');
        }
    };

    const getAttendanceStatus = (session, enrollmentId) => {
        const attendance = session.attendances?.find(a => a.enrollmentId === enrollmentId);
        return attendance?.status || 'AUSENTE';
    };

    const getAttendanceIcon = (status) => {
        switch (status) {
            case 'PRESENTE':
                return <CheckCircle size={16} className="text-emerald-500" />;
            case 'AUSENTE':
                return <XCircle size={16} className="text-red-500" />;
            case 'TARDE':
                return <Clock size={16} className="text-amber-500" />;
            default:
                return <XCircle size={16} className="text-gray-400" />;
        }
    };

    const getAttendanceBadge = (status) => {
        switch (status) {
            case 'PRESENTE':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
            case 'AUSENTE':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'TARDE':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BookOpen size={20} />
                        Seguimiento de Asistencia
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Gestiona las sesiones de clase y registra la asistencia de los estudiantes
                    </p>
                </div>
                {canModify && (
                    <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        <Calendar size={20} />
                        Nueva Sesión
                    </button>
                )}
            </div>

            {/* Sessions List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {sessions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <GuitarIcon size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No hay sesiones registradas aún.</p>
                            <p className="text-sm mt-2">Crea una nueva sesión para comenzar a registrar la asistencia.</p>
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div key={session.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {new Date(session.date).toLocaleDateString('es-CO', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </h4>
                                            {session.topic && (
                                                <p className="text-gray-600 dark:text-gray-400 mt-1">Tema: {session.topic}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {canModify && (
                                                <div className="flex items-center gap-1 mr-2 border-r border-gray-200 dark:border-gray-700 pr-3">
                                                    <button
                                                        onClick={() => handleOpenEditModal(session)}
                                                        className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                                        title="Editar sesión"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSession(session)}
                                                        className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                                        title="Eliminar sesión"
                                                    >
                                                        <Trash size={18} />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                <span className="font-medium">
                                                    {session.attendances?.filter(a => a.status === 'PRESENT').length || 0}
                                                </span>
                                                {' / '}
                                                <span>{enrollments.length} presentes</span>
                                            </div>
                                            {canModify && (
                                                <button
                                                    onClick={() => handleOpenAttendance(session)}
                                                    className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors"
                                                >
                                                    <CheckCircle size={16} />
                                                    Registrar Asistencia
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Attendance Overview */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                                                <div>
                                                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">Presentes</p>
                                                    <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                                                        {session.attendances?.filter(a => a.status === 'PRESENTE').length || 0}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800">
                                            <div className="flex items-center gap-2">
                                                <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                                                <div>
                                                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Tardanzas</p>
                                                    <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                                                        {session.attendances?.filter(a => a.status === 'TARDE').length || 0}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800">
                                            <div className="flex items-center gap-2">
                                                <XCircle size={16} className="text-red-600 dark:text-red-400" />
                                                <div>
                                                    <p className="text-xs font-medium text-red-800 dark:text-red-200">Ausentes</p>
                                                    <p className="text-lg font-bold text-red-900 dark:text-red-100">
                                                        {session.attendances?.filter(a => a.status === 'AUSENTE').length || 0}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Attendance View */}
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Asistencia Rápida:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {enrollments.slice(0, 10).map((enrollment) => {
                                                const status = getAttendanceStatus(session, enrollment.id);
                                                return (
                                                    <div
                                                        key={enrollment.id}
                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getAttendanceBadge(status)}`}
                                                    >
                                                        {enrollment.guest?.name || enrollment.user?.profile?.fullName || enrollment.user?.fullName}
                                                    </div>
                                                );
                                            })}
                                            {enrollments.length > 10 && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                                                    +{enrollments.length - 10} más...
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Create Session Modal */}
            {showSessionModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {isEditing ? 'Editar Sesión' : 'Nueva Sesión'}
                            </h3>
                            <button
                                onClick={() => setShowSessionModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitSession} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Fecha de la Sesión
                                </label>
                                <input
                                    type="date"
                                    value={sessionDate}
                                    onChange={(e) => setSessionDate(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tema de la Sesión (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={sessionTopic}
                                    onChange={(e) => setSessionTopic(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Ej: Danzas modulo inicial"
                                />
                            </div>
                            <div className="pt-4 flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowSessionModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    {isEditing ? 'Actualizar Sesión' : 'Crear Sesión'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Attendance Modal */}
            {showAttendanceModal && selectedSession && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Registrar Asistencia
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {new Date(selectedSession.date).toLocaleDateString('es-CO', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                    {selectedSession.topic && ` - ${selectedSession.topic}`}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAttendanceModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-3">
                                {enrollments.map((enrollment) => {
                                    const currentStatus = attendanceData[enrollment.id] || 
                                        getAttendanceStatus(selectedSession, enrollment.id);
                                    return (
                                        <div
                                            key={enrollment.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {enrollment.guest?.name || enrollment.user?.profile?.fullName || enrollment.user?.fullName}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAttendanceChange(enrollment.id, 'PRESENTE')}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        currentStatus === 'PRESENTE'
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                            : 'bg-gray-200 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-gray-600 dark:text-gray-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300'
                                                    }`}
                                                    title="Presente"
                                                >
                                                    <CheckCircle size={20} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAttendanceChange(enrollment.id, 'TARDE')}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        currentStatus === 'TARDE'
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                            : 'bg-gray-200 text-gray-600 hover:bg-amber-100 hover:text-amber-700 dark:bg-gray-600 dark:text-gray-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300'
                                                    }`}
                                                    title="Tardanza"
                                                >
                                                    <Clock size={20} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAttendanceChange(enrollment.id, 'AUSENTE')}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        currentStatus === 'AUSENTE'
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                            : 'bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-700 dark:bg-gray-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-300'
                                                    }`}
                                                    title="Ausente"
                                                >
                                                    <XCircle size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAttendanceModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveAttendance}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    Guardar Asistencia
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setSessionToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Eliminar Sesión"
                message={`¿Estás seguro de que deseas eliminar la sesión del tema "${sessionToDelete?.topic || 'Sin tema'}"? Todos los registros de asistencia asociados se perderán permanentemente.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default ArtClassAttendanceTracker;
