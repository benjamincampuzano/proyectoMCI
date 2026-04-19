import { useState, useEffect } from 'react';
import { Phone, House, User, WhatsappLogoIcon,ChatCircle, ChatCircleDots, WarningCircleIcon, X, Clock, CheckCircle, ClockCounterClockwiseIcon, HandsPrayingIcon, Plus, Trash } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ConfirmationModal from './ConfirmationModal';

const GuestTracking = () => {
    const { user, hasRole, isAdmin, isCoordinator } = useAuth();
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [modalType, setModalType] = useState(null); // 'call', 'visit', 'history'
    const [formData, setFormData] = useState({
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        observation: ''
    });
    const [showDeleteCallConfirm, setShowDeleteCallConfirm] = useState(false);
    const [showDeleteVisitConfirm, setShowDeleteVisitConfirm] = useState(false);
    const [callToDelete, setCallToDelete] = useState(null);
    const [visitToDelete, setVisitToDelete] = useState(null);
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalGuests, setTotalGuests] = useState(0);
    const [pageSize] = useState(10);

    useEffect(() => {
        fetchGuests();
    }, [currentPage]);

    const fetchGuests = async () => {
        try {
            setLoading(true);
            const response = await api.get('/guests', {
                params: {
                    page: currentPage,
                    limit: pageSize
                }
            });
            setGuests(response.data.guests || []);
            setTotalPages(response.data.totalPages || 1);
            setTotalGuests(response.data.pagination?.total || response.data.guests?.length || 0);
        } catch (error) {
            console.error('Error fetching guests:', error);
            toast.error('Error al cargar invitados. Por favor intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (guest, type) => {
        setSelectedGuest(guest);
        setModalType(type);
        setFormData({
            date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            observation: ''
        });
    };

    const handleAction = async () => {
        if (!formData.observation.trim()) {
            toast.error('La observación es obligatoria');
            return;
        }

        try {
            const endpoint = modalType === 'call' ? 'calls' : 'visits';
            await api.post(`/guests/${selectedGuest.id}/${endpoint}`, formData);
            setModalType(null);
            fetchGuests();
        } catch (error) {
            console.error(`Error saving ${modalType}:`, error);
            toast.error('Error al guardar: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteCall = (callId) => {
        const call = selectedGuest.calls.find(c => c.id === callId);
        setCallToDelete(call);
        setShowDeleteCallConfirm(true);
    };

    const performDeleteCall = async () => {
        try {
            await api.delete(`/guests/${selectedGuest.id}/calls/${callToDelete.id}`);
            toast.success('Llamada eliminada exitosamente');
            // Update the selected guest to reflect the changes
            const updatedGuest = { ...selectedGuest };
            updatedGuest.calls = updatedGuest.calls.filter(call => call.id !== callToDelete.id);
            setSelectedGuest(updatedGuest);
            fetchGuests();
            setShowDeleteCallConfirm(false);
            setCallToDelete(null);
        } catch (error) {
            console.error('Error deleting call:', error);
            toast.error('Error al eliminar llamada: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteVisit = (visitId) => {
        const visit = selectedGuest.visits.find(v => v.id === visitId);
        setVisitToDelete(visit);
        setShowDeleteVisitConfirm(true);
    };

    const performDeleteVisit = async () => {
        try {
            await api.delete(`/guests/${selectedGuest.id}/visits/${visitToDelete.id}`);
            toast.success('Visita eliminada exitosamente');
            // Update the selected guest to reflect the changes
            const updatedGuest = { ...selectedGuest };
            updatedGuest.visits = updatedGuest.visits.filter(visit => visit.id !== visitToDelete.id);
            setSelectedGuest(updatedGuest);
            fetchGuests();
            setShowDeleteVisitConfirm(false);
            setVisitToDelete(null);
        } catch (error) {
            console.error('Error deleting visit:', error);
            toast.error('Error al eliminar visita: ' + (error.response?.data?.message || error.message));
        }
    };

    const canDeleteRecords = () => {
        if (!user) return false;
        return isAdmin() || isCoordinator();
    };



    const getAlerts = (guest) => {
        const createdAt = new Date(guest.createdAt);
        const now = new Date();
        const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
        const hasCalls = guest.calls && guest.calls.length > 0;
        const hasVisits = guest.visits && guest.visits.length > 0;
        const alerts = [];

        if (diffDays >= 1 && !hasCalls) {
            alerts.push({ type: 'call', message: 'Llamada pendiente (1+ días)' });
        }
        if (diffDays >= 2 && !hasVisits) {
            alerts.push({ type: 'visit', message: 'Visita pendiente (2+ días)' });
        }

        return alerts;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse"></div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className="p-6 space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="space-y-3">
                                <div className="flex items-center space-x-4">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5 animate-pulse"></div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Seguimiento de Invitados</h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invitado</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contacto / Dirección</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quién Invitó / Petición</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Encuentro / Celula</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Llamada</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Visita</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {guests.map((guest) => {
                                const alerts = getAlerts(guest);
                                const callCount = guest.calls?.length || 0;
                                const visitCount = guest.visits?.length || 0;
                                const lastCall = guest.calls?.[0];
                                const lastVisit = guest.visits?.[0];

                                return (
                                    <tr key={guest.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{guest.name}</div>
                                            <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-semibold">
                                                <span className={`px-1.5 py-0.5 rounded-full ${guest.status === 'GANADO' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                                                    guest.status === 'CONSOLIDADO' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                                                        guest.status === 'CONTACTADO' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30' :
                                                            'bg-gray-100 text-gray-600 dark:bg-gray-700'
                                                    }`}>
                                                    {guest.status === 'GANADO' ? 'Consolidado' :
                                                        guest.status === 'CONSOLIDADO' ? 'Visitado' :
                                                            guest.status === 'CONTACTADO' ? 'Llamado' :
                                                                guest.status}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {alerts.map((alert, idx) => (
                                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                        <WarningCircleIcon className="w-3 h-3 mr-1" />
                                                        {alert.message}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                                <div className="flex items-center flex-1">
                                                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                                    {guest.phone}
                                                </div>
                                                {guest.phone && (
                                                    <a
                                                        href={`https://wa.me/57${guest.phone.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="ml-2 p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <WhatsappLogoIcon className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                <House className="w-4 h-4 mr-2 text-gray-400" />
                                                {guest.address || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                                <User className="w-4 h-4 mr-2 text-gray-400" />
                                                {guest.invitedBy?.fullName}
                                            </div>
                                            <div className="flex items-start mt-1 text-sm text-gray-500 dark:text-gray-400 italic">
                                                <HandsPrayingIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-400" />
                                                {guest.prayerRequest || 'Sin petición'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {/* Encuentro Registration Status */}
                                                {guest.encuentroRegistrations && guest.encuentroRegistrations.length > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Registrado a encuentro
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                                        Sin encuentro
                                                    </span>
                                                )}
                                                {/* Cell Alert - Show warning if not assigned to cell */}
                                                {!guest.cell ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                        <WarningCircleIcon className="w-3 h-3 mr-1" />
                                                        Sin celula asignada
                                                    </span>
                                                ) : (
                                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                                        <span className="font-medium">Celula:</span> {guest.cell.name}
                                                    </div>
                                                )}
                                                {/* Last Cell Attendance */}
                                                {guest.cell && (
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                        Ult. asistencia: Pendiente
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${callCount > 0
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                                                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                                                        }`}>
                                                        {callCount}
                                                    </span>
                                                    <button
                                                        onClick={() => handleOpenModal(guest, 'call')}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-600 transition-colors"
                                                        title="Agregar llamada"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {lastCall && (
                                                    <p className="text-[10px] text-gray-500 truncate max-w-[100px]" title={lastCall.observation}>
                                                        {lastCall.observation}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${visitCount > 0
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                                                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                                                        }`}>
                                                        {visitCount}
                                                    </span>
                                                    <button
                                                        onClick={() => handleOpenModal(guest, 'visit')}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-600 transition-colors"
                                                        title="Agregar visita"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {lastVisit && (
                                                    <p className="text-[10px] text-gray-500 truncate max-w-[100px]" title={lastVisit.observation}>
                                                        {lastVisit.observation}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleOpenModal(guest, 'history')}
                                                className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                title="Ver historial"
                                            >
                                                <ClockCounterClockwiseIcon className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                        Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalGuests)} de {totalGuests} invitados
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || loading}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Anterior
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                const isActive = currentPage === pageNum;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        disabled={loading}
                                        className={`min-w-[32px] h-8 px-2 text-sm font-medium rounded-md transition-colors ${
                                            isActive
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || loading}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}

            {/* Add Action Modal (Call or Visit) */}
            {(modalType === 'call' || modalType === 'visit') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {modalType === 'call' ? 'Registrar Llamada' : 'Registrar Visita'}
                            </h3>
                            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha y Hora</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="datetime-local"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Observación (Obligatoria)</label>
                                <textarea
                                    value={formData.observation}
                                    onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white resize-none"
                                    placeholder="Escribe lo que sucedió durante el contacto..."
                                    rows="4"
                                    required
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setModalType(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button onClick={handleAction} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Crear contacto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {modalType === 'history' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-outfit">Historial de Seguimiento</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Invitado: {selectedGuest?.name}</p>
                            </div>
                            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Calls History */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                                    <Phone className="w-4 h-4 text-green-500" />
                                    Llamadas Realizadas ({selectedGuest.calls?.length || 0})
                                </h4>
                                <div className="space-y-4">
                                    {selectedGuest.calls?.length > 0 ? (
                                        selectedGuest.calls.map((call, idx) => (
                                            <div key={idx} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                                                        {format(new Date(call.date), "PPP p", { locale: es })}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-gray-500 uppercase font-semibold">
                                                            Por: {call.caller?.fullName}
                                                        </span>
                                                        {canDeleteRecords() && (
                                                            <button
                                                                onClick={() => handleDeleteCall(call.id)}
                                                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                title="Eliminar llamada"
                                                            >
                                                                <Trash className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                                                    "{call.observation}"
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                            No hay registros de llamadas.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Visits History */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                                    <House className="w-4 h-4 text-blue-500" />
                                    Visitas Realizadas ({selectedGuest.visits?.length || 0})
                                </h4>
                                <div className="space-y-4">
                                    {selectedGuest.visits?.length > 0 ? (
                                        selectedGuest.visits.map((visit, idx) => (
                                            <div key={idx} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                                                        {format(new Date(visit.date), "PPP p", { locale: es })}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-gray-500 uppercase font-semibold">
                                                            Por: {visit.visitor?.fullName}
                                                        </span>
                                                        {canDeleteRecords() && (
                                                            <button
                                                                onClick={() => handleDeleteVisit(visit.id)}
                                                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                title="Eliminar visita"
                                                            >
                                                                <Trash className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                                                    "{visit.observation}"
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                            No hay registros de visitas.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                            <button
                                onClick={() => setModalType(null)}
                                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg active:scale-95"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Call Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteCallConfirm}
                onClose={() => {
                    setShowDeleteCallConfirm(false);
                    setCallToDelete(null);
                }}
                onConfirm={performDeleteCall}
                title="Eliminar Llamada"
                message="¿Estás seguro de que deseas eliminar este registro de llamada?"
                confirmText="Eliminar Llamada"
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            >
                {callToDelete && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {format(new Date(callToDelete.date), "PPP 'a las' p", { locale: es })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Realizada por:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {callToDelete.caller?.fullName || 'Usuario desconocido'}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-600 dark:text-gray-400 mb-1">Observación:</span>
                                <span className="font-medium text-gray-900 dark:text-white italic">
                                    "{callToDelete.observation}"
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="text-red-600 dark:text-red-400 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-red-800 dark:text-red-200 font-semibold mb-1">
                                ⚠️ Acción Irreversible
                            </h4>
                            <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                                <li>• Se eliminará el registro de la llamada</li>
                                <li>• Se actualizará el estado del invitado</li>
                                <li>• No se puede deshacer esta acción</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </ConfirmationModal>

            {/* Delete Visit Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteVisitConfirm}
                onClose={() => {
                    setShowDeleteVisitConfirm(false);
                    setVisitToDelete(null);
                }}
                onConfirm={performDeleteVisit}
                title="Eliminar Visita"
                message="¿Estás seguro de que deseas eliminar este registro de visita?"
                confirmText="Eliminar Visita"
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            >
                {visitToDelete && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {format(new Date(visitToDelete.date), "PPP 'a las' p", { locale: es })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Realizada por:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {visitToDelete.visitor?.fullName || 'Usuario desconocido'}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-600 dark:text-gray-400 mb-1">Observación:</span>
                                <span className="font-medium text-gray-900 dark:text-white italic">
                                    "{visitToDelete.observation}"
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="text-red-600 dark:text-red-400 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-red-800 dark:text-red-200 font-semibold mb-1">
                                ⚠️ Acción Irreversible
                            </h4>
                            <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                                <li>• Se eliminará el registro de la visita</li>
                                <li>• Se actualizará el estado del invitado</li>
                                <li>• No se puede deshacer esta acción</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </ConfirmationModal>
        </div>
    );
};

export default GuestTracking;
