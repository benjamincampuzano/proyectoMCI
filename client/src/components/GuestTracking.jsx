import { useState, useEffect, useCallback } from 'react';
import { Phone, House, User, WhatsappLogoIcon, ChatCircle, ChatCircleDots, WarningCircleIcon, X, Clock, CheckCircle, ClockCounterClockwiseIcon, HandsPrayingIcon, Plus, Trash, Calendar, Funnel, MagnifyingGlass } from '@phosphor-icons/react';
import AsyncSearchSelect from './ui/AsyncSearchSelect';
import Pagination from './ui/Pagination';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ConfirmationModal from './ConfirmationModal';
import { getWhatsAppPhone } from '../utils/phone';
import PropTypes from 'prop-types';

const GuestTracking = ({ refreshTrigger }) => {
    const { user, hasRole, isAdmin, isCoordinator, isDoceLeader } = useAuth();
    const isModuleCoordinator = isCoordinator('ganar');
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
    const [whatsappData, setWhatsappData] = useState({
        stage: '',
        templateKey: '',
        previewText: ''
    });
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalGuests, setTotalGuests] = useState(0);
    const [pageSize] = useState(10);

    // Filter states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [liderDoceFilter, setLiderDoceFilter] = useState(null);
    const [pendingCalls, setPendingCalls] = useState(false);
    const [pendingVisits, setPendingVisits] = useState(false);
    const [alreadyCalled, setAlreadyCalled] = useState(false);
    const [alreadyVisited, setAlreadyVisited] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Auto-apply filter for LIDER_DOCE who are not coordinators
    useEffect(() => {
        if (isDoceLeader() && !isModuleCoordinator && user) {
            void Promise.resolve().then(() => {
                setLiderDoceFilter({
                    id: user.id,
                    fullName: user.profile?.fullName || user.email
                });
            });
        }

        return () => {
            setLiderDoceFilter(null);
        };
    }, [isDoceLeader, isModuleCoordinator, user]);

    const fetchGuests = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: pageSize
            };

            // Add filters to params
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (liderDoceFilter) params.liderDoceId = liderDoceFilter.id;
            if (pendingCalls) params.pendingCalls = 'true';
            if (pendingVisits) params.pendingVisits = 'true';
            if (alreadyCalled) params.alreadyCalled = 'true';
            if (alreadyVisited) params.alreadyVisited = 'true';

            const response = await api.get('/guests', { params });

            // Filter guests client-side for pending calls/visits if needed
            let filteredGuests = response.data.guests || [];

            setGuests(filteredGuests);
            setTotalPages(response.data.pagination?.totalPages || 1);
            setTotalGuests(response.data.pagination?.total || filteredGuests.length || 0);
        } catch (error) {
            console.error('Error fetching guests:', error);
            toast.error('Error al cargar invitados. Por favor intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    }, [currentPage, startDate, endDate, liderDoceFilter, pendingCalls, pendingVisits, alreadyCalled, alreadyVisited, pageSize]);

    useEffect(() => {
        void Promise.resolve().then(() => fetchGuests());
    }, [currentPage, startDate, endDate, liderDoceFilter, pendingCalls, pendingVisits, alreadyCalled, alreadyVisited, refreshTrigger, fetchGuests]);

    // Check if liderDoceFilter is auto-applied (for non-coordinator LIDER_DOCE)
    const isLiderDoceFilterAutoApplied = isDoceLeader() && !isModuleCoordinator && liderDoceFilter?.id === user?.id;

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        // Don't clear liderDoceFilter if it's auto-applied
        if (!isLiderDoceFilterAutoApplied) {
            setLiderDoceFilter(null);
        }
        setPendingCalls(false);
        setPendingVisits(false);
        setAlreadyCalled(false);
        setAlreadyVisited(false);
        setCurrentPage(1);
    };

    const hasActiveFilters = startDate || endDate || (liderDoceFilter && !isLiderDoceFilterAutoApplied) || pendingCalls || pendingVisits || alreadyCalled || alreadyVisited;

    const handleOpenModal = (guest, type) => {
        setSelectedGuest(guest);
        setModalType(type);
        setFormData({
            date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            observation: ''
        });
        if (type === 'whatsapp') {
            setWhatsappData({
                stage: '',
                templateKey: '',
                previewText: ''
            });
        }
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
        return isAdmin() || isModuleCoordinator;
    };



    const getAlerts = (guest) => {
        const createdAt = new Date(guest.createdAt);
        const now = new Date();
        const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
        const hasCalls = guest.calls && guest.calls.length > 0;
        const hasVisits = guest.visits && guest.visits.length > 0;
        
        // Asistencia a la iglesia
        const lastChurchAttendance = guest.churchAttendances && guest.churchAttendances.length > 0 ? new Date(guest.churchAttendances[0].date) : null;
        const daysSinceLastChurch = lastChurchAttendance ? Math.floor((now - lastChurchAttendance) / (1000 * 60 * 60 * 24)) : diffDays;

        const alerts = [];

        if (diffDays >= 1 && !hasCalls) {
            alerts.push({ type: 'call', message: 'Llamada pendiente (1+ días)' });
        }
        if (diffDays >= 2 && !hasVisits) {
            alerts.push({ type: 'visit', message: 'Visita pendiente (2+ días)' });
        }
        
        // Alerta de más de un mes sin asistir
        if (daysSinceLastChurch > 30) {
            alerts.push({ type: 'attendance', message: 'Inasistencia a iglesia/célula (+1 mes)' });
        }

        return alerts;
    };

    const WHATSAPP_TEMPLATES = {
        Bienvenida: {
            A: "¡Hola [Nombre]! 👋 Qué alegría que nos acompañaras hoy en [Nombre de la Iglesia]. Esperamos que te hayas sentido como en casa. ¡Bendiciones!",
            B: "Hola [Nombre], soy [Nombre del Líder] de la iglesia. Me dio mucho gusto conocerte hoy. Si tienes alguna duda o necesitas algo, aquí estoy para servirte. 😊",
            C: "¡Hola [Nombre]! Gracias por venir hoy con [Nombre de la persona que lo invitó]. Fue un gusto tenerte con nosotros. ¡Te esperamos el próximo domingo!"
        },
        Consolidacion: {
            A: "Hola [Nombre], espero que estés teniendo una excelente semana. ✨ Me quedé pensando en ti y quería saludarte. ¿Cómo va todo?",
            B: "¡Hola [Nombre]! En la iglesia tenemos grupos pequeños llamados 'Células' donde nos conorcemos mejor y estudiamos la Biblia. Tenemos una muy cerca de tu casa, ¿te gustaría visitarla esta semana?",
            C: "Hola [Nombre], te saludo con mucho cariño. Queríamos saber si hay algo por lo que podamos estar orando por ti o tu familia esta semana. 🙏"
        },
        Integracion: {
            A: "¡Hola [Nombre]! Estamos iniciando un curso básico para conocer más sobre la fe y la Biblia. Creo que te gustaría mucho. ¿Te gustaría que te enviara la información? 📖",
            B: "¡Hola [Nombre]! Se acerca nuestra [Nombre de la Convención/Evento] y me encantaría que fueras mi invitado especial. Será un tiempo increíble. ¿Cuento contigo? 🎫"
        },
        Recuperacion: {
            A: "¡Hola [Nombre]! Te hemos extrañado los últimos domingos. Espero que todo esté bien. ¡Te enviamos un abrazo fuerte! 🤗",
            B: "Hola [Nombre], pasaba por aquí para decirte que te recordamos con cariño en la iglesia. Ojalá podamos vernos pronto. ¡Dios te bendiga!"
        }
    };

    const getCleanName = (name) => {
        if (!name) return '';
        const firstName = name.trim().split(' ')[0].toLowerCase();
        return firstName.charAt(0).toUpperCase() + firstName.slice(1);
    };

    const generateWhatsappMessage = (stage, templateKey, guest) => {
        if (!stage || !templateKey || !guest) return '';
        let msg = WHATSAPP_TEMPLATES[stage][templateKey];

        const guestName = getCleanName(guest.name);
        msg = msg.replace(/\[Nombre\]/g, guestName);

        if (user) {
            const leaderName = getCleanName(user.profile?.fullName || user.email);
            msg = msg.replace(/\[Nombre del Líder\]/g, leaderName);
        }

        if (guest.invitedBy && guest.invitedBy.fullName) {
            const inviterName = getCleanName(guest.invitedBy.fullName);
            msg = msg.replace(/\[Nombre de la persona que lo invitó\]/g, inviterName);
        } else {
            msg = msg.replace(/ con \[Nombre de la persona que lo invitó\]/g, '');
            msg = msg.replace(/\[Nombre de la persona que lo invitó\]/g, 'nosotros');
        }

        // Generic replacements
        msg = msg.replace(/\[Nombre de la Iglesia\]/g, 'la iglesia');
        msg = msg.replace(/\[Nombre de la Convención\/Evento\]/g, 'próxima reunión');

        return msg;
    };

    const handleWhatsappStageChange = (stage) => {
        setWhatsappData(prev => ({ ...prev, stage, templateKey: '', previewText: '' }));
    };

    const handleWhatsappTemplateChange = (templateKey) => {
        const text = generateWhatsappMessage(whatsappData.stage, templateKey, selectedGuest);
        setWhatsappData(prev => ({ ...prev, templateKey, previewText: text }));
    };

    const handleSendWhatsapp = async () => {
        if (!whatsappData.previewText.trim()) {
            toast.error('El mensaje no puede estar vacío');
            return;
        }

        // 1. Log in the backend
        try {
            await api.post(`/guests/${selectedGuest.id}/calls`, {
                date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                observation: `[WhatsApp - ${whatsappData.stage || 'Personalizado'}] ${whatsappData.previewText}`
            });
            toast.success('Mensaje registrado exitosamente');
            fetchGuests(); // Refresh list to show "CONTACTADO" status
        } catch (error) {
            console.error('Error saving whatsapp log:', error);
            toast.error('El mensaje se abrirá, pero hubo un error al registrarlo en el sistema.');
        }

        // 2. Open WhatsApp
        const text = encodeURIComponent(whatsappData.previewText);
        const whatsappPhone = getWhatsAppPhone(selectedGuest.phone);
        window.open(`https://wa.me/${whatsappPhone}?text=${text}`, '_blank');

        setModalType(null);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="h-8 bg-[var(--ln-bg-secondary)] rounded-md w-48 animate-pulse"></div>
                    <div className="h-10 bg-[var(--ln-bg-secondary)] rounded-md w-32 animate-pulse"></div>
                </div>
                <div className="bg-[var(--ln-bg-panel)] rounded-xl border border-[var(--ln-border-subtle)] overflow-hidden">
                    <div className="p-6 space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="space-y-3">
                                <div className="flex items-center space-x-4">
                                    <div className="h-4 bg-[var(--ln-bg-secondary)] rounded w-1/4 animate-pulse"></div>
                                    <div className="h-4 bg-[var(--ln-bg-secondary)] rounded w-1/6 animate-pulse"></div>
                                    <div className="h-4 bg-[var(--ln-bg-secondary)] rounded w-1/5 animate-pulse"></div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="h-3 bg-[var(--ln-bg-secondary)] rounded w-1/3 animate-pulse"></div>
                                    <div className="h-3 bg-[var(--ln-bg-secondary)] rounded w-1/4 animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex items-start sm:items-center justify-between gap-3">
                <h2 className="text-xl md:text-2xl font-[590] text-[var(--ln-text-primary)] tracking-[-0.288px]">Seguimiento de Invitados</h2>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-[510] transition-all shrink-0 ${hasActiveFilters
                        ? 'bg-[var(--ln-brand-indigo)] text-white shadow-[rgba(94,106,210,0.3)_0px_4px_12px]'
                        : 'bg-[var(--ln-btn-ghost)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] border border-[var(--ln-border-subtle)]'
                        }`}
                >
                    <Funnel size={16} weight={showFilters ? "fill" : "bold"} />
                    Filtros
                    {hasActiveFilters && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                            {[startDate, endDate, (liderDoceFilter && !isLiderDoceFilterAutoApplied), pendingCalls, pendingVisits, alreadyCalled, alreadyVisited].filter(Boolean).length}
                        </span>
                    )}
                </button>
            </div>

            {/* Panel de Filtros */}
            {showFilters && (
                <div className="bg-[var(--ln-bg-panel)] rounded-xl border border-[var(--ln-border-subtle)] p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row flex-wrap items-end gap-4">
                        {/* Filtro por Fecha - Desde */}
                        <div className="flex-1 min-w-[140px] w-full sm:w-auto">
                            <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">
                                Fecha Desde
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ln-text-quaternary)]" size={16} />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-10 pr-3.5 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-sm text-[var(--ln-text-primary)] placeholder:text-[var(--ln-text-tertiary)] focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all"
                                />
                            </div>
                        </div>

                        {/* Filtro por Fecha - Hasta */}
                        <div className="flex-1 min-w-[140px] w-full sm:w-auto">
                            <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">
                                Fecha Hasta
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ln-text-quaternary)]" size={16} />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-10 pr-3.5 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-sm text-[var(--ln-text-primary)] placeholder:text-[var(--ln-text-tertiary)] focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all"
                                />
                            </div>
                        </div>

                        {/* Filtro por Líder de 12 - solo visible para admin/coordinadores/pastores */}
                        {(!isDoceLeader() || isModuleCoordinator) && (
                            <div className="flex-[2] min-w-[150px] w-full sm:w-auto">
                                <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">
                                    Líder de 12
                                </label>
                                <AsyncSearchSelect
                                    fetchItems={(term) => {
                                        const roleFilter = user?.roles?.includes('PASTOR') ? "LIDER_DOCE,PASTOR" : "LIDER_DOCE";
                                        return api.get('/users/search', {
                                            params: { search: term, role: roleFilter }
                                        }).then(res => res.data);
                                    }}
                                    selectedValue={liderDoceFilter}
                                    onSelect={(user) => {
                                        setLiderDoceFilter(user || null);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Buscar líder de 12..."
                                    labelKey="fullName"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4 pt-2 border-t border-[var(--ln-border-subtle)]">
                        {/* Checkbox - Pendientes por llamadas */}
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`relative flex items-center justify-center w-4 h-4 rounded border transition-all ${pendingCalls
                                ? 'bg-[var(--ln-btn-subtle)] border-[var(--ln-border-primary)]'
                                : 'bg-[var(--ln-input-bg)] border-[var(--ln-border-standard)] group-hover:border-[var(--ln-text-quaternary)]'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={pendingCalls}
                                    onChange={(e) => {
                                        setPendingCalls(e.target.checked);
                                        setCurrentPage(1);
                                    }}
                                    className="absolute opacity-0 w-full h-full cursor-pointer"
                                />
                                {pendingCalls && <CheckCircle size={12} className="text-[var(--ln-text-primary)]" weight="fill" />}
                            </div>
                            <span className={`text-sm font-[510] ${pendingCalls ? 'text-[var(--ln-text-primary)]' : 'text-[var(--ln-text-secondary)]'}`}>
                                Pendientes por llamadas
                            </span>
                        </label>

                        {/* Checkbox - Pendientes por visitas */}
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`relative flex items-center justify-center w-4 h-4 rounded border transition-all ${pendingVisits
                                ? 'bg-[var(--ln-brand-indigo)]/20 border-[var(--ln-brand-indigo)]/40'
                                : 'bg-[var(--ln-input-bg)] border-[var(--ln-border-standard)] group-hover:border-[var(--ln-accent-violet)]'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={pendingVisits}
                                    onChange={(e) => {
                                        setPendingVisits(e.target.checked);
                                        setCurrentPage(1);
                                    }}
                                    className="absolute opacity-0 w-full h-full cursor-pointer"
                                />
                                {pendingVisits && <CheckCircle size={12} className="text-[var(--ln-accent-violet)]" weight="fill" />}
                            </div>
                            <span className={`text-sm font-[510] ${pendingVisits ? 'text-[var(--ln-accent-violet)]' : 'text-[var(--ln-text-secondary)]'}`}>
                                Pendientes por visitas
                            </span>
                        </label>

                        {/* Checkbox - Ya fueron llamados */}
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`relative flex items-center justify-center w-4 h-4 rounded border transition-all ${alreadyCalled
                                ? 'bg-[var(--ln-emerald)]/15 border-[var(--ln-emerald)]/30'
                                : 'bg-[var(--ln-input-bg)] border-[var(--ln-border-standard)] group-hover:border-[var(--ln-success)]'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={alreadyCalled}
                                    onChange={(e) => {
                                        setAlreadyCalled(e.target.checked);
                                        setCurrentPage(1);
                                    }}
                                    className="absolute opacity-0 w-full h-full cursor-pointer"
                                />
                                {alreadyCalled && <CheckCircle size={12} className="text-[var(--ln-success)]" weight="fill" />}
                            </div>
                            <span className={`text-sm font-[510] ${alreadyCalled ? 'text-[var(--ln-success)]' : 'text-[var(--ln-text-secondary)]'}`}>
                                Ya fueron llamados
                            </span>
                        </label>

                        {/* Checkbox - Ya fueron visitados */}
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`relative flex items-center justify-center w-4 h-4 rounded border transition-all ${alreadyVisited
                                ? 'bg-[var(--ln-emerald)]/15 border-[var(--ln-emerald)]/30'
                                : 'bg-[var(--ln-input-bg)] border-[var(--ln-border-standard)] group-hover:border-[var(--ln-success)]'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={alreadyVisited}
                                    onChange={(e) => {
                                        setAlreadyVisited(e.target.checked);
                                        setCurrentPage(1);
                                    }}
                                    className="absolute opacity-0 w-full h-full cursor-pointer"
                                />
                                {alreadyVisited && <CheckCircle size={12} className="text-[var(--ln-success)]" weight="fill" />}
                            </div>
                            <span className={`text-sm font-[510] ${alreadyVisited ? 'text-[var(--ln-success)]' : 'text-[var(--ln-text-secondary)]'}`}>
                                Ya fueron visitados
                            </span>
                        </label>

                        <div className="flex-1"></div>

                        {/* Botón Limpiar Filtros */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-[510] text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] rounded-md transition-colors"
                            >
                                <X size={14} weight="bold" />
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Pagination - Top */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalGuests}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                loading={loading}
                itemLabel="invitados"
            />

            <div className="bg-[var(--ln-bg-panel)] rounded-xl border border-[var(--ln-border-subtle)] overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-[var(--ln-btn-ghost)] border-b border-[var(--ln-border-subtle)]">
                            <tr>
                                <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Invitado</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Contacto / Dirección</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Quién Invitó / Petición</th>
                                <th className="px-4 sm:px-6 py-3 text-center text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Encuentro / Celula</th>
                                <th className="px-4 sm:px-6 py-3 text-center text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Llamada</th>
                                <th className="px-4 sm:px-6 py-3 text-center text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Visita</th>
                                <th className="px-4 sm:px-6 py-3 text-center text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Acciones</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guests.map((guest) => {
                                const alerts = getAlerts(guest);
                                const callCount = guest.calls?.length || 0;
                                const visitCount = guest.visits?.length || 0;
                                const lastCall = guest.calls?.[0];
                                const lastVisit = guest.visits?.[0];

                                return (
                                    <tr key={guest.id} className="hover:bg-[var(--ln-btn-ghost)] border-b border-[var(--ln-border-subtle)] transition-colors">
                                        <td className="px-4 sm:px-6 py-4">
                                            <div className="text-sm font-[510] text-[var(--ln-text-primary)]">{guest.name}</div>
                                            <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-[510]">
                                                <span className={`px-1.5 py-0.5 rounded-md ${guest.status === 'GANADO'
                                                    ? 'bg-[var(--ln-emerald)]/15 text-[var(--ln-success)] border border-[var(--ln-emerald)]/30'
                                                    : 'bg-[var(--ln-bg-secondary)] text-[var(--ln-text-secondary)] border border-[var(--ln-border-subtle)]'
                                                    }`}>
                                                    {guest.status === 'GANADO' ? 'Consolidado' :
                                                        guest.status === 'CONSOLIDADO' ? 'Visitado' :
                                                            guest.status === 'CONTACTADO' ? 'Llamado' :
                                                                guest.status}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {alerts.map((alert, idx) => (
                                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-[510] bg-red-500/10 text-red-500 border border-red-500/20">
                                                        <WarningCircleIcon className="w-3 h-3 mr-1" />
                                                        {alert.message}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            <div className="flex items-center text-sm text-[var(--ln-text-secondary)]">
                                                <div className="flex items-center flex-1">
                                                    <Phone className="w-4 h-4 mr-2 text-[var(--ln-text-quaternary)]" />
                                                    {guest.phone}
                                                </div>
                                                {(isAdmin() || hasRole('PASTOR') || isModuleCoordinator || hasRole('LIDER_DOCE')) && guest.phone && (
                                                    <button
                                                        onClick={() => handleOpenModal(guest, 'whatsapp')}
                                                        className="ml-2 p-1 text-[var(--ln-success)] hover:bg-[var(--ln-emerald)]/10 rounded transition-colors"
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <WhatsappLogoIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center mt-1 text-sm text-[var(--ln-text-secondary)]">
                                                <House className="w-4 h-4 mr-2 text-[var(--ln-text-quaternary)]" />
                                                {guest.address || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            <div className="flex items-center text-sm text-[var(--ln-text-secondary)]">
                                                <User className="w-4 h-4 mr-2 text-[var(--ln-text-quaternary)]" />
                                                Invitó: {guest.invitedBy?.fullName}
                                            </div>
                                            {guest.assignedTo && guest.assignedTo.id !== guest.invitedBy?.id && (
                                                <div className="flex items-center mt-1 text-sm text-[var(--ln-accent-violet)]">
                                                    <User className="w-4 h-4 mr-2 text-[var(--ln-accent-violet)]" />
                                                    Asignado a: {guest.assignedTo.fullName || guest.assignedTo.profile?.fullName || guest.assignedTo.email}
                                                </div>
                                            )}
                                            <div className="flex items-start mt-1 text-sm text-[var(--ln-text-tertiary)] italic">
                                                <HandsPrayingIcon className="w-4 h-4 mr-2 mt-0.5 text-[var(--ln-text-quaternary)]" />
                                                {guest.prayerRequest || 'Sin petición'}
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {/* Encuentro Registration Status */}
                                                {guest.encuentroRegistrations && guest.encuentroRegistrations.length > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-[510] bg-[var(--ln-emerald)]/15 text-[var(--ln-success)] border border-[var(--ln-emerald)]/30">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Registrado a encuentro
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-[510] bg-[var(--ln-bg-secondary)] text-[var(--ln-text-tertiary)] border border-[var(--ln-border-subtle)]">
                                                        Sin encuentro
                                                    </span>
                                                )}
                                                {/* Cell Alert - Show warning if not assigned to cell */}
                                                {!guest.cell ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-[510] bg-red-500/10 text-red-500 border border-red-500/20">
                                                        <WarningCircleIcon className="w-3 h-3 mr-1" />
                                                        Sin celula asignada
                                                    </span>
                                                ) : (
                                                    <div className="text-xs text-[var(--ln-text-secondary)]">
                                                        <span className="font-[510]">Celula:</span> {guest.cell.name}
                                                    </div>
                                                )}
                                                {/* Last Cell Attendance */}
                                                {guest.cell && (
                                                    <span className="text-[10px] text-[var(--ln-text-quaternary)]">
                                                        Ult. iglesia: {guest.churchAttendances && guest.churchAttendances.length > 0 ? new Date(guest.churchAttendances[0].date).toLocaleDateString() : 'Pendiente'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-[510] rounded-full ${callCount > 0
                                                        ? 'bg-[var(--ln-emerald)]/15 text-[var(--ln-success)]'
                                                        : 'bg-[var(--ln-bg-secondary)] text-[var(--ln-text-quaternary)]'
                                                        }`}>
                                                        {callCount}
                                                    </span>
                                                    <button
                                                        onClick={() => handleOpenModal(guest, 'call')}
                                                        className="p-1 hover:bg-[var(--ln-btn-subtle)] rounded text-[var(--ln-text-tertiary)] hover:text-[var(--ln-accent-violet)] transition-colors"
                                                        title="Agregar llamada"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {lastCall && (
                                                    <p className="text-[10px] text-[var(--ln-text-tertiary)] truncate max-w-[100px]" title={lastCall.observation}>
                                                        {lastCall.observation}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-[510] rounded-full ${visitCount > 0
                                                        ? 'bg-[var(--ln-brand-indigo)]/15 text-[var(--ln-accent-violet)]'
                                                        : 'bg-[var(--ln-bg-secondary)] text-[var(--ln-text-quaternary)]'
                                                        }`}>
                                                        {visitCount}
                                                    </span>
                                                    <button
                                                        onClick={() => handleOpenModal(guest, 'visit')}
                                                        className="p-1 hover:bg-[var(--ln-btn-subtle)] rounded text-[var(--ln-text-tertiary)] hover:text-[var(--ln-accent-violet)] transition-colors"
                                                        title="Agregar visita"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {lastVisit && (
                                                    <p className="text-[10px] text-[var(--ln-text-tertiary)] truncate max-w-[100px]" title={lastVisit.observation}>
                                                        {lastVisit.observation}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleOpenModal(guest, 'history')}
                                                className="p-1.5 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] rounded-md transition-colors"
                                                title="Ver historial"
                                            >
                                                <ClockCounterClockwiseIcon className="w-5 h-5" />
                                            </button>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            <div className="text-sm text-[var(--ln-text-secondary)] max-w-[200px] truncate" title={guest.observations}>
                                                {guest.observations || <span className="text-[var(--ln-text-quaternary)] italic text-xs">Sin observaciones</span>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-[var(--ln-border-subtle)]">
                    {guests.map((guest) => {
                        const alerts = getAlerts(guest);
                        const callCount = guest.calls?.length || 0;
                        const visitCount = guest.visits?.length || 0;
                        return (
                            <div key={guest.id} className="p-4 hover:bg-[var(--ln-btn-ghost)] transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="text-sm font-[510] text-[var(--ln-text-primary)]">{guest.name}</span>
                                    <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-[510] ${guest.status === 'GANADO'
                                        ? 'bg-[var(--ln-emerald)]/15 text-[var(--ln-success)] border border-[var(--ln-emerald)]/30'
                                        : 'bg-[var(--ln-bg-secondary)] text-[var(--ln-text-secondary)] border border-[var(--ln-border-subtle)]'
                                    }`}>
                                        {guest.status === 'GANADO' ? 'Consolidado' :
                                            guest.status === 'CONSOLIDADO' ? 'Visitado' :
                                                guest.status === 'CONTACTADO' ? 'Llamado' :
                                                    guest.status}
                                    </span>
                                </div>
                                {alerts.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {alerts.map((alert, idx) => (
                                            <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-[510] bg-red-500/10 text-red-500 border border-red-500/20">
                                                <WarningCircleIcon className="w-3 h-3 mr-0.5" />
                                                {alert.message}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="text-xs text-[var(--ln-text-tertiary)] space-y-0.5 mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="w-3 h-3 shrink-0" />
                                        <span>{guest.phone}</span>
                                        {(isAdmin() || hasRole('PASTOR') || isModuleCoordinator || hasRole('LIDER_DOCE')) && guest.phone && (
                                            <button
                                                onClick={() => handleOpenModal(guest, 'whatsapp')}
                                                className="text-[var(--ln-success)] hover:underline"
                                            >
                                                WhatsApp
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <House className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{guest.address || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3 h-3 shrink-0" />
                                        <span>Invitó: {guest.invitedBy?.fullName}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--ln-border-subtle)]">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-[510] ${callCount > 0 ? 'bg-[var(--ln-emerald)]/15 text-[var(--ln-success)]' : 'bg-[var(--ln-bg-secondary)] text-[var(--ln-text-quaternary)]'}`}>
                                                {callCount}
                                            </span>
                                            <button
                                                onClick={() => handleOpenModal(guest, 'call')}
                                                className="p-0.5 hover:bg-[var(--ln-btn-subtle)] rounded text-[var(--ln-text-tertiary)] hover:text-[var(--ln-accent-violet)] transition-colors"
                                                title="Agregar llamada"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-[510] ${visitCount > 0 ? 'bg-[var(--ln-brand-indigo)]/15 text-[var(--ln-accent-violet)]' : 'bg-[var(--ln-bg-secondary)] text-[var(--ln-text-quaternary)]'}`}>
                                                {visitCount}
                                            </span>
                                            <button
                                                onClick={() => handleOpenModal(guest, 'visit')}
                                                className="p-0.5 hover:bg-[var(--ln-btn-subtle)] rounded text-[var(--ln-text-tertiary)] hover:text-[var(--ln-accent-violet)] transition-colors"
                                                title="Agregar visita"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleOpenModal(guest, 'history')}
                                        className="p-1.5 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] rounded-md transition-colors"
                                        title="Ver historial"
                                    >
                                        <ClockCounterClockwiseIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {guests.length === 0 && !loading && (
                        <div className="p-8 text-center text-[var(--ln-text-quaternary)] text-sm">
                            No se encontraron invitados
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination - Bottom */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalGuests}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                loading={loading}
                itemLabel="invitados"
            />

            {/* Add Action Modal (Call or Visit) */}
            {(modalType === 'call' || modalType === 'visit') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ln-overlay)] backdrop-blur-[2px]">
                    <div
                        className="bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] rounded-xl w-full max-w-md overflow-hidden"
                        style={{ boxShadow: 'rgba(0, 0, 0, 0.1) 0px 8px 24px, rgba(0, 0, 0, 0.05) 0px 2px 4px' }}
                    >
                        <div className="px-6 py-4 border-b border-[var(--ln-border-subtle)] flex items-center justify-between bg-[var(--ln-bg-panel)]">
                            <h3 className="text-lg font-[590] text-[var(--ln-text-primary)] tracking-[-0.24px]">
                                {modalType === 'call' ? 'Registrar Llamada' : 'Registrar Visita'}
                            </h3>
                            <button
                                onClick={() => setModalType(null)}
                                className="text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] rounded-md p-1 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Fecha y Hora</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ln-text-quaternary)]" />
                                    <input
                                        type="datetime-local"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 text-sm bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Observación (Obligatoria)</label>
                                <textarea
                                    value={formData.observation}
                                    onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                                    className="w-full px-3 py-2 text-sm bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-[var(--ln-text-primary)] placeholder-[var(--ln-text-tertiary)] focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all resize-none"
                                    placeholder="Escribe lo que sucedió durante el contacto..."
                                    rows="4"
                                    required
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-[var(--ln-bg-panel)] border-t border-[var(--ln-border-subtle)] flex justify-end gap-3">
                            <button
                                onClick={() => setModalType(null)}
                                className="px-4 py-2 text-sm font-[510] text-[var(--ln-text-secondary)] hover:bg-[var(--ln-btn-subtle)] rounded-md transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAction}
                                className="px-4 py-2 text-sm font-[510] text-white bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-accent-hover)] rounded-md transition-colors flex items-center gap-2"
                                style={{ boxShadow: 'rgba(94, 106, 210, 0.3) 0px 4px 12px' }}
                            >
                                <CheckCircle className="w-4 h-4" />
                                Crear contacto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp Modal */}
            {modalType === 'whatsapp' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ln-overlay)] backdrop-blur-[2px]">
                    <div
                        className="bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] rounded-xl w-full max-w-md overflow-hidden"
                        style={{ boxShadow: 'rgba(0, 0, 0, 0.1) 0px 8px 24px, rgba(0, 0, 0, 0.05) 0px 2px 4px' }}
                    >
                        <div className="px-6 py-4 border-b border-[var(--ln-border-subtle)] flex items-center justify-between bg-[var(--ln-bg-panel)]">
                            <div className="flex items-center gap-2">
                                <WhatsappLogoIcon className="w-5 h-5 text-[var(--ln-success)]" />
                                <h3 className="text-lg font-[590] text-[var(--ln-text-primary)] tracking-[-0.24px]">
                                    Enviar Mensaje
                                </h3>
                            </div>
                            <button
                                onClick={() => setModalType(null)}
                                className="text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] rounded-md p-1 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Elige el tipo de mensaje</label>
                                <select
                                    value={whatsappData.stage}
                                    onChange={(e) => handleWhatsappStageChange(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all"
                                >
                                    <option value="">Seleccione una etapa...</option>
                                    <option value="Bienvenida">Bienvenida (Inmediato)</option>
                                    <option value="Consolidacion">Consolidación (Seguimiento)</option>
                                    <option value="Integracion">Integración (Llamado a la acción)</option>
                                    <option value="Recuperacion">Recuperación (Cuando deja de asistir)</option>
                                </select>
                            </div>

                            {whatsappData.stage && (
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Plantilla</label>
                                    <div className="flex gap-2">
                                        {Object.keys(WHATSAPP_TEMPLATES[whatsappData.stage]).map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => handleWhatsappTemplateChange(key)}
                                                className={`flex-1 px-3 py-2 text-sm font-[510] rounded-md border transition-colors ${whatsappData.templateKey === key
                                                    ? 'bg-[var(--ln-emerald)]/15 border-[var(--ln-emerald)]/40 text-[var(--ln-success)]'
                                                    : 'bg-[var(--ln-btn-ghost)] border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] hover:bg-[var(--ln-btn-subtle)]'
                                                    }`}
                                            >
                                                Opción {key}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {whatsappData.templateKey && (
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">
                                        Previsualización (Puedes editarlo)
                                    </label>
                                    <textarea
                                        value={whatsappData.previewText}
                                        onChange={(e) => setWhatsappData({ ...whatsappData, previewText: e.target.value })}
                                        className="w-full px-3 py-2 text-sm bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-[var(--ln-text-primary)] placeholder-[var(--ln-text-tertiary)] focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all resize-none"
                                        rows="6"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-[var(--ln-bg-panel)] border-t border-[var(--ln-border-subtle)] flex justify-end gap-3">
                            <button
                                onClick={() => setModalType(null)}
                                className="px-4 py-2 text-sm font-[510] text-[var(--ln-text-secondary)] hover:bg-[var(--ln-btn-subtle)] rounded-md transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSendWhatsapp}
                                disabled={!whatsappData.previewText.trim()}
                                className="px-4 py-2 text-sm font-[510] text-white bg-[var(--ln-success)] hover:bg-[var(--ln-emerald)] disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
                                style={{ boxShadow: 'rgba(39, 166, 68, 0.3) 0px 4px 12px' }}
                            >
                                <WhatsappLogoIcon className="w-4 h-4" />
                                Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {modalType === 'history' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ln-overlay)] backdrop-blur-[2px]">
                    <div
                        className="bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
                        style={{ boxShadow: 'rgba(0, 0, 0, 0.1) 0px 8px 24px, rgba(0, 0, 0, 0.05) 0px 2px 4px' }}
                    >
                        <div className="px-6 py-4 border-b border-[var(--ln-border-subtle)] flex items-center justify-between bg-[var(--ln-bg-panel)]">
                            <div>
                                <h3 className="text-lg font-[590] text-[var(--ln-text-primary)] tracking-[-0.24px]">Historial de Seguimiento</h3>
                                <p className="text-xs text-[var(--ln-text-tertiary)] mt-0.5">Invitado: {selectedGuest?.name}</p>
                            </div>
                            <button
                                onClick={() => setModalType(null)}
                                className="text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] rounded-md p-1 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Calls History */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-[510] uppercase tracking-wider text-[var(--ln-text-primary)] mb-4">
                                    <Phone className="w-4 h-4 text-[var(--ln-success)]" />
                                    Llamadas Realizadas ({selectedGuest.calls?.length || 0})
                                </h4>
                                <div className="space-y-4">
                                    {selectedGuest.calls?.length > 0 ? (
                                        selectedGuest.calls.map((call, idx) => (
                                            <div key={idx} className="bg-[var(--ln-bg-panel)] rounded-xl p-4 border border-[var(--ln-border-subtle)]">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-[510] text-[var(--ln-accent-violet)] bg-[var(--ln-brand-indigo)]/10 px-2 py-0.5 rounded-md">
                                                        {format(new Date(call.date), "PPP p", { locale: es })}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-[var(--ln-text-tertiary)] uppercase font-[510]">
                                                            Por: {call.caller?.fullName}
                                                        </span>
                                                        {canDeleteRecords() && (
                                                            <button
                                                                onClick={() => handleDeleteCall(call.id)}
                                                                className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                                                title="Eliminar llamada"
                                                            >
                                                                <Trash className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-[var(--ln-text-secondary)] leading-relaxed italic border-l-2 border-[var(--ln-border-subtle)] pl-3">
                                                    "{call.observation}"
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-[var(--ln-text-tertiary)] italic text-center py-4 bg-[var(--ln-bg-panel)] rounded-xl border border-dashed border-[var(--ln-border-subtle)]">
                                            No hay registros de llamadas.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Visits History */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-[510] uppercase tracking-wider text-[var(--ln-text-primary)] mb-4">
                                    <House className="w-4 h-4 text-[var(--ln-accent-violet)]" />
                                    Visitas Realizadas ({selectedGuest.visits?.length || 0})
                                </h4>
                                <div className="space-y-4">
                                    {selectedGuest.visits?.length > 0 ? (
                                        selectedGuest.visits.map((visit, idx) => (
                                            <div key={idx} className="bg-[var(--ln-bg-panel)] rounded-xl p-4 border border-[var(--ln-border-subtle)]">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-[510] text-[var(--ln-accent-violet)] bg-[var(--ln-brand-indigo)]/10 px-2 py-0.5 rounded-md">
                                                        {format(new Date(visit.date), "PPP p", { locale: es })}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-[var(--ln-text-tertiary)] uppercase font-[510]">
                                                            Por: {visit.visitor?.fullName}
                                                        </span>
                                                        {canDeleteRecords() && (
                                                            <button
                                                                onClick={() => handleDeleteVisit(visit.id)}
                                                                className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                                                title="Eliminar visita"
                                                            >
                                                                <Trash className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-[var(--ln-text-secondary)] leading-relaxed italic border-l-2 border-[var(--ln-border-subtle)] pl-3">
                                                    "{visit.observation}"
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-[var(--ln-text-tertiary)] italic text-center py-4 bg-[var(--ln-bg-panel)] rounded-xl border border-dashed border-[var(--ln-border-subtle)]">
                                            No hay registros de visitas.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-[var(--ln-bg-panel)] border-t border-[var(--ln-border-subtle)] flex justify-end">
                            <button
                                onClick={() => setModalType(null)}
                                className="px-4 py-2 text-sm font-[510] text-white bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-accent-hover)] rounded-md transition-colors"
                                style={{ boxShadow: 'rgba(94, 106, 210, 0.3) 0px 4px 12px' }}
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
                    <div className="bg-[var(--ln-bg-panel)] p-4 rounded-lg mb-4 border border-[var(--ln-border-subtle)]">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--ln-text-tertiary)]">Fecha:</span>
                                <span className="font-[510] text-[var(--ln-text-primary)]">
                                    {format(new Date(callToDelete.date), "PPP 'a las' p", { locale: es })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--ln-text-tertiary)]">Realizada por:</span>
                                <span className="font-[510] text-[var(--ln-text-primary)]">
                                    {callToDelete.caller?.fullName || 'Usuario desconocido'}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[var(--ln-text-tertiary)] mb-1">Observación:</span>
                                <span className="font-[510] text-[var(--ln-text-primary)] italic">
                                    "{callToDelete.observation}"
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="text-red-500 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-red-500 font-[590] mb-1">
                                ⚠️ Acción Irreversible
                            </h4>
                            <ul className="text-red-500/80 text-sm space-y-1">
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

GuestTracking.propTypes = {
    refreshTrigger: PropTypes.number,
};
