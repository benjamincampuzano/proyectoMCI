import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, UserPlus, MoneyIcon, X, XCircle, Trash, Calendar, BookOpen, FileTextIcon, Clock, MagnifyingGlass, PencilSimple, Users, Check } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';
import { AsyncSearchSelect } from './ui';
import EncuentroClassTracker from './EncuentroClassTracker';
import BalanceReport from './BalanceReport';
import { DATA_POLICY_URL } from '../constants/policies';
import ConfirmationModal from './ConfirmationModal';
import GuestRegistrationForm from './GuestRegistrationForm';

const EncuentroDetails = ({ encuentro, onBack, onRefresh }) => {
    const { user, isAdmin, hasAnyRole, isCoordinator, isSubCoordinator, isTreasurer } = useAuth();
    
    const [activeTab, setActiveTab] = useState('general'); // general | classes | report
    const [reportData, setReportData] = useState([]);
    const [loadingReport, setLoadingReport] = useState(false);
    const [showStatsMobile, setShowStatsMobile] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Calculated statistics
    const totalRegistrations = encuentro?.registrations?.length || 0;
    const totalPaid = useMemo(() => {
        return encuentro?.registrations?.reduce((acc, reg) => acc + (Number(reg.totalPaid) || 0), 0) || 0;
    }, [encuentro?.registrations]);
    const totalBalance = useMemo(() => {
        return encuentro?.registrations?.reduce((acc, reg) => acc + (Number(reg.balance) || 0), 0) || 0;
    }, [encuentro?.registrations]);

    // Filtered registrations based on search term
    const filteredRegistrations = useMemo(() => {
        if (!encuentro?.registrations) return [];
        if (!searchTerm.trim()) return encuentro.registrations;
        const term = searchTerm.toLowerCase();
        return encuentro.registrations.filter(reg => {
            const name = (reg.guest?.name || reg.user?.fullName || '').toLowerCase();
            const phone = (reg.guest?.phone || reg.user?.phone || '').toLowerCase();
            const leader = (reg.liderDoce?.fullName || '').toLowerCase();
            return name.includes(term) || phone.includes(term) || leader.includes(term);
        });
    }, [encuentro?.registrations, searchTerm]);

    // Filtered pending registrations based on search term
    const filteredPendingRegistrations = useMemo(() => {
        if (!encuentro?.pendingRegistrations) return [];
        if (!searchTerm.trim()) return encuentro.pendingRegistrations;
        const term = searchTerm.toLowerCase();
        return encuentro.pendingRegistrations.filter(reg => {
            const name = (reg.guest?.name || reg.user?.fullName || reg.fullName || '').toLowerCase();
            const phone = (reg.guest?.phone || reg.user?.phone || reg.phone || '').toLowerCase();
            const leader = (reg.liderDoce?.fullName || '').toLowerCase();
            return name.includes(term) || phone.includes(term) || leader.includes(term);
        });
    }, [encuentro?.pendingRegistrations, searchTerm]);

    // Approve Pending Registration Modal State
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [pendingRegToApprove, setPendingRegToApprove] = useState(null);
    const [approveMode, setApproveMode] = useState('link'); // 'link' | 'create'
    const [approveUser, setApproveUser] = useState(null);
    const [approveGuest, setApproveGuest] = useState(null);
    const [approveLeaderId, setApproveLeaderId] = useState(null);
    const [createdGuestId, setCreatedGuestId] = useState(null);
    const [createdGuestName, setCreatedGuestName] = useState('');
    const [showGuestForm, setShowGuestForm] = useState(false);

    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentType, setPaymentType] = useState('ENCUENTRO');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedHistoryRegistration, setSelectedHistoryRegistration] = useState(null);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [convertData, setConvertData] = useState({
        email: '',
        password: '',
        dataPolicyAccepted: false,
        dataTreatmentAuthorized: false,
        minorConsentAuthorized: false
    });

    // Delete Confirmation Modal State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [registrationToDelete, setRegistrationToDelete] = useState(null);
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);
    const [pendingRegToReject, setPendingRegToReject] = useState(null);

    // Payment Delete Confirmation State
    const [showPaymentDeleteConfirm, setShowPaymentDeleteConfirm] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        description: '',
        cost: '',
        transportCost: '',
        accommodationCost: '',
        startDate: '',
        endDate: '',
        type: ''
    });

    // Registration Form State
    const [registrationType, setRegistrationType] = useState('GUEST'); // GUEST or USER
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [discount, setDiscount] = useState(0);
    const [needsTransport, setNeedsTransport] = useState(false);
    const [needsAccommodation, setNeedsAccommodation] = useState(false);


    
    // Administrative permission: Admin, Pastor, or Module Coordinator
    const hasModuleAccess = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR]) || 
        isCoordinator('encuentro') || 
        isSubCoordinator('encuentro') || 
        isTreasurer('encuentro');
    
    const isEncuentroCoordinator = parseInt(user?.id) === parseInt(encuentro?.coordinatorId) || parseInt(user?.id) === parseInt(encuentro?.coordinator?.id);
    
    const canManageEncuentro = hasModuleAccess || isEncuentroCoordinator;
    
    const canManagePayments = hasModuleAccess || isEncuentroCoordinator;
    
    const canModify = canManageEncuentro;

    useEffect(() => {
        if (activeTab === 'report' && encuentro) {
            fetchReport();
        }
    }, [activeTab, encuentro]);

    const fetchReport = async () => {
        if (!encuentro) return;
        setLoadingReport(true);
        try {
            const response = await api.get(`/encuentros/${encuentro?.id}/report/balance`);
            setReportData(response.data);
        } catch (error) {
            console.error('Error fetching report:', error);
            toast.error('Error cargando el reporte financiero');
        } finally {
            setLoadingReport(false);
        }
    };

    const handleOpenApproveModal = (reg) => {
        setPendingRegToApprove(reg);
        setApproveMode('link');
        setApproveUser(null);
        setApproveGuest(null);
        setApproveLeaderId(null);
        setCreatedGuestId(null);
        setCreatedGuestName('');
        setShowApproveModal(true);
    };

    const handleConfirmApprove = async () => {
        if (!pendingRegToApprove) return;

        // If in 'create' mode, require guest registration first
        if (approveMode === 'create' && !createdGuestId) {
            setShowGuestForm(true);
            return;
        }

        setLoading(true);
        try {
            const body = {};
            if (approveMode === 'link' && approveUser) {
                body.userId = approveUser.id;
            } else if (approveMode === 'guest' && approveGuest) {
                body.guestId = approveGuest.id;
            } else if (approveMode === 'create') {
                body.guestId = createdGuestId;
                body.createUser = true;
                if (approveLeaderId) body.leaderId = approveLeaderId;
            }

            await api.patch(`/encuentros/registrations/${pendingRegToApprove.id}/approve`, body);
            toast.success('Registro aprobado exitosamente!');
            setShowApproveModal(false);
            setPendingRegToApprove(null);
            onRefresh();
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error approving registration:', error);
            toast.error(error.response?.data?.error || 'Error al aprobar registro');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectPendingRegistration = (registrationId) => {
        const reg = filteredPendingRegistrations.find(r => r.id === registrationId);
        setPendingRegToReject(reg || { id: registrationId });
        setShowRejectConfirm(true);
    };

    const handleConfirmReject = async () => {
        if (!pendingRegToReject) return;
        setLoading(true);
        try {
            await api.patch(`/encuentros/registrations/${pendingRegToReject.id}/reject`);
            toast.success('Solicitud rechazada');
            setShowRejectConfirm(false);
            setPendingRegToReject(null);
            onRefresh();
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error rejecting registration:', error);
            toast.error('Error al rechazar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        // Log registration data for debugging
        const registrationData = {
            guestId: registrationType === 'GUEST' ? selectedGuest?.id : null,
            userId: registrationType === 'USER' ? selectedUser?.id : null,
            discountPercentage: parseFloat(discount) || 0,
            needsTransport,
            needsAccommodation
        };
                
        try {
            await api.post(`/encuentros/${encuentro.id}/register`, registrationData);
            setShowRegisterModal(false);
            setSelectedGuest(null);
            setSelectedUser(null);
            setDiscount(0);
            setNeedsTransport(false);
            setNeedsAccommodation(false);
            onRefresh();
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error registering guest:', error);
            console.error('Error response:', error.response);
            console.error('Error data:', error.response?.data);
            console.error('Error status:', error.response?.status);
            console.error('Error headers:', error.response?.headers);
            
            const errorData = error.response?.data;
            let errorMessage = errorData?.error || errorData?.message || error.message;

            // If the error indicates guest needs update, show a more helpful message
            if (errorData?.requiresGuestUpdate) {
                if (errorData?.missingField === 'sex') {
                    errorMessage = `Este invitado necesita tener especificado el sexo (${errorData?.expectedValue}) para inscribirse en este encuentro. Por favor, edite el invitado y agregue esta información.`;
                } else if (errorData?.missingField === 'birthDate') {
                    errorMessage = 'Este invitado necesita tener especificado la fecha de nacimiento para inscribirse en el encuentro de jóvenes. Por favor, edite el invitado y agregue esta información.';
                }
            }

            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/encuentros/registrations/${selectedRegistration.id}/payments`, {
                amount: parseFloat(paymentAmount),
                paymentType,
                notes: paymentNotes
            });
            setShowPaymentModal(false);
            setSelectedRegistration(null);
            setPaymentAmount('');
            setPaymentType('ENCUENTRO');
            setPaymentNotes('');
            onRefresh();
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error adding payment:', error);
            toast.error('Error adding payment');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (registrationId) => {
        // Find the registration to show details in the confirmation modal
        const registration = encuentro.registrations.find(r => r.id === registrationId);
        setRegistrationToDelete(registration);
        setShowDeleteConfirm(true);
    };

    const performDelete = async () => {
        if (!registrationToDelete) return;

        try {
            await api.delete(`/encuentros/registrations/${registrationToDelete.id}`);
            toast.success('Registro eliminado exitosamente');
            onRefresh();
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error deleting registration:', error);
            toast.error('Error al eliminar');
        } finally {
            setShowDeleteConfirm(false);
            setRegistrationToDelete(null);
        }
    };

    const handleDeletePayment = (payment) => {
        setPaymentToDelete(payment);
        setShowPaymentDeleteConfirm(true);
    };

    const performDeletePayment = async () => {
        if (!paymentToDelete) return;

        try {
            await api.delete(`/encuentros/payments/${paymentToDelete.id}`);
            toast.success('Abono eliminado exitosamente');
            onRefresh();
            if (activeTab === 'report') fetchReport();
            // Close history modal to force refresh when reopened
            setShowHistoryModal(false);
            setSelectedHistoryRegistration(null);
        } catch (error) {
            console.error('Error deleting payment:', error);
            toast.error('Error al eliminar abono');
        } finally {
            setShowPaymentDeleteConfirm(false);
            setPaymentToDelete(null);
        }
    };

    const handleConvertMember = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const guestId = selectedRegistration?.guest?.id;

            if (!guestId) {
                toast.error('No guest selected');
                return;
            }

            await api.post(`/guests/${guestId}/convert-to-member`, {
                email: convertData.email,
                password: convertData.password,
                dataPolicyAccepted: convertData.dataPolicyAccepted,
                dataTreatmentAuthorized: convertData.dataTreatmentAuthorized,
                minorConsentAuthorized: convertData.minorConsentAuthorized,
            });
            setShowConvertModal(false);
            setConvertData({
                email: '',
                password: '',
                dataPolicyAccepted: false,
                dataTreatmentAuthorized: false,
                minorConsentAuthorized: false
            });
            toast.success('Invitado convertido a Discípulo exitosamente!');
            onRefresh();
        } catch (error) {
            console.error('Error converting guest:', error);
            toast.error('Error al convertir: ' + (error.response?.data?.message || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
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

    const openEditModal = () => {
        setEditData({
            name: encuentro.name,
            description: encuentro.description || '',
            cost: encuentro.cost,
            transportCost: encuentro.transportCost || 0,
            accommodationCost: encuentro.accommodationCost || 0,
            startDate: formatDateLocal(encuentro.startDate),
            endDate: formatDateLocal(encuentro.endDate),
            type: encuentro.type,
            coordinatorId: encuentro.coordinator || null
        });
        setShowEditModal(true);
    };

    // Auto-open edit modal if requested from parent
    useEffect(() => {
        if (encuentro?.openEditModal && canModify) {
            openEditModal();
        }
    }, [encuentro?.openEditModal, canModify]);

    const handleUpdateEncuentro = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSend = {
                ...editData,
                coordinatorId: editData.coordinatorId?.id || null
            };
            await api.put(`/encuentros/${encuentro.id}`, dataToSend);
            setShowEditModal(false);
            toast.success('Encuentro actualizado exitosamente!');
            onRefresh();
        } catch (error) {
            console.error('Error updating encuentro:', error);
            toast.error('Error al actualizar: ' + (error.response?.data?.error || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    const openHistoryModal = (registration) => {
        setSelectedHistoryRegistration(registration);
        setShowHistoryModal(true);
    };

    const openConvertModal = (registration) => {
        setSelectedRegistration(registration);
        setShowConvertModal(true);
    };

    const openPaymentModal = (registration) => {
        setSelectedRegistration(registration);
        setShowPaymentModal(true);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount);
    };

    return (
        <div className="space-y-6">
            {!encuentro ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500 dark:text-gray-400">Cargando detalles del encuentro...</div>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={onBack}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors shrink-0 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shadow-sm"
                          title="Volver a Encuentros"
                        >
                          <ArrowLeft size={20} />
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                              {encuentro.name}
                            </h2>
                            {encuentro.type && (
                              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                {encuentro.type}
                              </span>
                            )}
                          </div>
                          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            📅 {formatDateLocal(encuentro.startDate)} - {formatDateLocal(encuentro.endDate)}
                          </p>
                          <p className="text-[11px] md:text-sm font-medium text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                            Coordinador: {encuentro.coordinator?.fullName || 'Sin Asignar'}
                          </p>
                        </div>
                      </div>

                      {canModify && (
                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          <button
                            onClick={openEditModal}
                            className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm flex items-center gap-1.5"
                          >
                            <PencilSimple size={16} />
                            <span>Editar</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Vista Móvil: Barra Sutil y Colapsable de Estadísticas */}
                    <div className="sm:hidden mb-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm transition-all">
                        <button
                            type="button"
                            onClick={() => setShowStatsMobile(!showStatsMobile)}
                            className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none"
                        >
                            <div className="flex items-center gap-2 truncate">
                                <Users size={16} className="text-blue-500 shrink-0" />
                                <span className="truncate">Estadísticas: <strong className="text-blue-600 dark:text-blue-400">{totalRegistrations}</strong> inscritos ({formatCurrency(totalPaid)})</span>
                            </div>
                            <span className="text-blue-600 dark:text-blue-400 text-xs font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full shrink-0 ml-2">
                                {showStatsMobile ? 'Ocultar ▲' : 'Ver resumen ▼'}
                            </span>
                        </button>

                        {showStatsMobile && (
                            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Users size={14} className="text-blue-600 dark:text-blue-300" />
                                        <span className="text-[10px] font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Inscritos</span>
                                    </div>
                                    <span className="text-lg font-extrabold text-blue-900 dark:text-white">{totalRegistrations}</span>
                                </div>

                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <MoneyIcon size={14} className="text-emerald-600 dark:text-emerald-300" />
                                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-tight">Recaudado</span>
                                    </div>
                                    <span className="text-sm font-extrabold text-emerald-900 dark:text-white">{formatCurrency(totalPaid)}</span>
                                </div>

                                <div className="col-span-2 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-100 dark:border-red-800 flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                        <MoneyIcon size={14} className="text-red-600 dark:text-red-300" />
                                        <span className="text-[10px] font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Pendiente por Cobrar</span>
                                    </div>
                                    <span className="text-sm font-extrabold text-red-900 dark:text-white">{formatCurrency(totalBalance)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Vista Desktop: Grid Completo */}
                    <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-10">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 md:p-5 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                          <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                            <MoneyIcon size={16} />
                          </div>
                          <span className="text-[10px] md:text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Inscritos</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xl md:text-3xl font-extrabold text-blue-900 dark:text-white">{totalRegistrations}</span>
                          <span className="hidden md:block text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5 md:mt-1">Cantidad Inscritos</span>
                        </div>
                      </div>

                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 md:p-5 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                          <div className="p-1.5 md:p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-300">
                            <MoneyIcon size={16} />
                          </div>
                          <span className="text-[10px] md:text-sm font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-tight">Recaudado</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm md:text-3xl font-extrabold text-emerald-900 dark:text-white">{formatCurrency(totalPaid)}</span>
                          <span className="hidden md:block text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 md:mt-1">Dinero Recaudado</span>
                        </div>
                      </div>

                      <div className="bg-red-50 dark:bg-red-900/20 p-3 md:p-5 rounded-xl border border-red-100 dark:border-red-800 shadow-sm">
                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                          <div className="p-1.5 md:p-2 bg-red-100 dark:bg-red-800 rounded-lg text-red-600 dark:text-red-300">
                            <MoneyIcon size={16} />
                          </div>
                          <span className="text-[10px] md:text-sm font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Pendiente por Cobrar</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm md:text-3xl font-extrabold text-red-900 dark:text-white">{formatCurrency(totalBalance)}</span>
                          <span className="hidden md:block text-xs text-red-600 dark:text-red-400 font-medium mt-0.5 md:mt-1">Dinero Pendiente</span>
                        </div>
                      </div>
                    </div>
            {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <nav className="-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto">
                        <button
                          onClick={() => setActiveTab('general')}
                          className={`py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center whitespace-nowrap ${activeTab === 'general'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                          <Calendar size={16} className="mr-1.5" />
                          Pagos y Estado
                        </button>
                        <button
                          onClick={() => setActiveTab('classes')}
                          className={`py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center whitespace-nowrap ${activeTab === 'classes'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                          <BookOpen size={16} className="mr-1.5" />
                          Universidad de la Vida
                        </button>
                        {canModify && (
                          <button
                            onClick={() => setActiveTab('pending')}
                            className={`py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center whitespace-nowrap ${activeTab === 'pending'
                              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                              }`}
                          >
                            <Clock size={16} className="mr-1.5" />
                            Pendientes
                            {encuentro.pendingRegistrations?.length > 0 && (
                              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                {encuentro.pendingRegistrations.length}
                              </span>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => setActiveTab('report')}
                          className={`py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center whitespace-nowrap ${activeTab === 'report'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                          <FileTextIcon size={16} className="mr-1.5" />
                          Reporte Financiero
                        </button>
                      </nav>
                    </div>

                    {/* Filter & Action Controls Bar */}
                    {activeTab !== 'report' && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4">
                        <div className="relative flex-1 min-w-[200px]">
                          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="Buscar por nombre, teléfono o líder..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                          />
                          {searchTerm && (
                            <button
                              onClick={() => setSearchTerm('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold bg-gray-100 dark:bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {canModify && activeTab === 'general' && (
                          <button
                            onClick={() => setShowRegisterModal(true)}
                            className="flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm shrink-0 w-full sm:w-auto"
                          >
                            <UserPlus size={16} className="mr-1.5" />
                            Inscribir Participante
                          </button>
                        )}
                      </div>
                    )}

            {/* Content Switcher */}
            {activeTab === 'pending' && canModify && (
                <div className="mt-4">
                    <div className="flex justify-between items-center mb-3 px-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Solicitudes de Inscripción Pendientes
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            {filteredPendingRegistrations.length} pendientes
                        </span>
                    </div>

                    {/* Mobile Cards */}
                    <div className="flex flex-col gap-3 sm:hidden">
                        {filteredPendingRegistrations.map((reg) => (
                            <div key={reg.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="min-w-0">
                                        <div className="font-bold text-gray-900 dark:text-white truncate">
                                            {reg.guest?.name || reg.user?.fullName || reg.fullName}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                            {reg.guest?.phone || reg.user?.phone || reg.phone || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => handleOpenApproveModal(reg)}
                                            className="p-2 bg-green-600 text-white rounded-lg"
                                            title="Aprobar"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleRejectPendingRegistration(reg.id)}
                                            className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300 rounded-lg"
                                            title="Rechazar"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-500 block mb-1">Líder Doce</span>
                                        <span className="font-medium">{reg.liderDoce?.fullName || 'N/A'}</span>
                                    </div>
                                    <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-500 block mb-1">Libro U.V.</span>
                                        <span className="font-medium">{reg.needsTransport ? 'Sí' : 'No'}</span>
                                    </div>
                                    <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-500 block mb-1">Otros Gastos</span>
                                        <span className="font-medium">{reg.needsAccommodation ? 'Sí' : 'No'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredPendingRegistrations.length === 0 && (
                            <div className="text-center py-10 text-sm text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                No hay solicitudes pendientes de aprobación.
                            </div>
                        )}
                    </div>

                    {/* Tabla desktop — pendientes */}
                    <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Teléfono</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Líder Doce</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Incluye libro U. de la V.</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Incluye otros gastos</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredPendingRegistrations.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {reg.guest?.name || reg.user?.fullName || reg.fullName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {reg.guest?.phone || reg.user?.phone || reg.phone || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {reg.liderDoce?.fullName || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {reg.needsTransport ? 'Sí' : 'No'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {reg.needsAccommodation ? 'Sí' : 'No'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button
                                                    onClick={() => handleOpenApproveModal(reg)}
                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none transition-colors"
                                                >
                                                    Aprobar
                                                </button>
                                                <button
                                                    onClick={() => handleRejectPendingRegistration(reg.id)}
                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 focus:outline-none transition-colors"
                                                >
                                                    Rechazar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPendingRegistrations.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                                No hay solicitudes pendientes de aprobación.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'general' && (
                <>
                    {/* Payment/Status — Tarjetas móviles */}
                    <div className="sm:hidden mt-4 space-y-3">
                        {filteredRegistrations.map((reg) => (
                            <div key={reg.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                {/* Nombre y estado */}
                                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700/60">
                                    <button
                                        onClick={() => openHistoryModal(reg)}
                                        className="text-left group flex-1 min-w-0"
                                    >
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate border-b border-dotted border-gray-300 dark:border-gray-600 pb-0.5">
                                            {reg.guest?.name || reg.user?.fullName}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">{reg.guest?.phone || reg.user?.phone || 'Sin teléfono'}</p>
                                    </button>
                                    <span className={`ml-2 shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide ${
                                        reg.status === 'ATTENDED'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                    }`}>
                                        {reg.status}
                                    </span>
                                </div>

                                {/* Montos */}
                                <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100 dark:divide-gray-700/60 px-0 py-2">
                                    <div className="flex flex-col items-center px-2">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Costo</span>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-0.5">{formatCurrency(Number(reg.finalCost) || 0)}</span>
                                    </div>
                                    <div className="flex flex-col items-center px-2">
                                        <span className="text-[10px] text-emerald-500 uppercase tracking-wide">Pagado</span>
                                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(Number(reg.totalPaid) || 0)}</span>
                                    </div>
                                    <div className="flex flex-col items-center px-2">
                                        <span className="text-[10px] text-red-400 uppercase tracking-wide">Saldo</span>
                                        <span className="text-xs font-semibold text-red-500 dark:text-red-400 mt-0.5">{formatCurrency(Number(reg.balance) || 0)}</span>
                                    </div>
                                </div>

                                {/* Acciones */}
                                {(canManagePayments || canModify) && (
                                    <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/20">
                                        {canManagePayments && (
                                            <button
                                                onClick={() => openPaymentModal(reg)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                            >
                                                <MoneyIcon size={14} />
                                                Abonar
                                            </button>
                                        )}
                                        {canModify && reg.guest && (
                                            <button
                                                onClick={() => openConvertModal(reg)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                                                title="Convertir a Discípulo"
                                            >
                                                <UserPlus size={14} />
                                                Convertir
                                            </button>
                                        )}
                                        {canModify && (
                                            <button
                                                onClick={() => handleDelete(reg.id)}
                                                className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                                title="Eliminar Registro"
                                            >
                                                <Trash size={14} />
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredRegistrations.length === 0 && (
                            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                {searchTerm ? 'Sin resultados para la búsqueda.' : 'No hay inscritos aún.'}
                            </div>
                        )}
                    </div>

                    {/* Payment/Status Table — desktop */}
                    <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 mt-4">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Participante</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pagado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredRegistrations.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => openHistoryModal(reg)}
                                                    className="text-left group"
                                                >
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors border-b border-dotted border-gray-400">
                                                        {reg.guest?.name || reg.user?.fullName}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{reg.guest?.phone || reg.user?.phone || 'N/A'}</div>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${reg.status === 'ATTENDED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                    }`}>
                                                    {reg.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {formatCurrency(Number(reg.finalCost) || 0)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                                                {formatCurrency(Number(reg.totalPaid) || 0)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 dark:text-red-400 font-medium">
                                                <div className="flex flex-col items-end">
                                                    <span>{formatCurrency(Number(reg.balance) || 0)}</span>
                                                    {(Number(reg.balance) || 0) > 0 && (
                                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight text-right">
                                                            {((Number(reg.baseCost) || 0) - (reg.paymentsByType?.ENCUENTRO || 0)) > 0 && (
                                                                <div className="flex justify-between w-32">
                                                                    <span>Encuentro:</span>
                                                                    <span>{formatCurrency((Number(reg.baseCost) || 0) - (reg.paymentsByType?.ENCUENTRO || 0))}</span>
                                                                </div>
                                                            )}
                                                            {((Number(reg.transportCost) || 0) - (reg.paymentsByType?.TRANSPORT || 0)) > 0 && (
                                                                <div className="flex justify-between w-32">
                                                                    <span>Libro:</span>
                                                                    <span>{formatCurrency((Number(reg.transportCost) || 0) - (reg.paymentsByType?.TRANSPORT || 0))}</span>
                                                                </div>
                                                            )}
                                                            {((Number(reg.accommodationCost) || 0) - (reg.paymentsByType?.ACCOMMODATION || 0)) > 0 && (
                                                                <div className="flex justify-between w-32">
                                                                    <span>Otros:</span>
                                                                    <span>{formatCurrency((Number(reg.accommodationCost) || 0) - (reg.paymentsByType?.ACCOMMODATION || 0))}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end space-x-3">
                                                {canManagePayments && (
                                                    <button
                                                        onClick={() => openPaymentModal(reg)}
                                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center"
                                                        title="Abonar"
                                                    >
                                                        <MoneyIcon size={16} className="mr-1" />
                                                        Abonar
                                                    </button>
                                                )}

                                                {canModify && (
                                                    <>
                                                        {reg.guest && (
                                                            <button
                                                                onClick={() => openConvertModal(reg)}
                                                                className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 inline-flex items-center"
                                                                title="Convertir a Discípulo"
                                                            >
                                                                <UserPlus size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(reg.id)}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center"
                                                            title="Eliminar Registro"
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRegistrations.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                {searchTerm ? 'Sin resultados para la búsqueda.' : 'No hay inscritos aún.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'classes' && (
                <div className="mt-4">
                    <EncuentroClassTracker
                        registrations={encuentro.registrations || []}
                        onRefresh={onRefresh}
                        onConvert={openConvertModal}
                        canModify={canModify}
                    />
                </div>
            )}

            {activeTab === 'report' && (
                <div className="mt-6 animate-fade-in">
                    {loadingReport ? (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-500">Cargando reporte financiero...</p>
                        </div>
                    ) : (
                        <BalanceReport data={reportData} title={`Reporte_${encuentro.name}`} />
                    )}
                </div>
            )}

            {/* Modals */}
            <>
                {/* Registration Modal */}
                {showRegisterModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Inscribir Participante</h3>
                            <button onClick={() => setShowRegisterModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleRegister} className="p-6 space-y-4">
                            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                                <button
                                    type="button"
                                    onClick={() => setRegistrationType('GUEST')}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${registrationType === 'GUEST' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                                >
                                    Invitado
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRegistrationType('USER')}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${registrationType === 'USER' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                                >
                                    Discípulo
                                </button>
                            </div>

                            {registrationType === 'GUEST' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Buscar Invitado (Desde 'Ganar')
                                    </label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) => {
                                            const params = { search: term };
                                            if (encuentro.type === 'HOMBRES') params.sex = 'HOMBRE';
                                            if (encuentro.type === 'MUJERES') params.sex = 'MUJER';
                                            if (encuentro.type === 'JOVENES') {
                                                const d = new Date();
                                                d.setFullYear(d.getFullYear() - 18);
                                                params.minBirthDate = d.toISOString().split('T')[0];
                                            }
                                            return api.get('/guests', { params })
                                                .then(res => res.data.guests || []);
                                        }}
                                        selectedValue={selectedGuest}
                                        onSelect={(guest) => setSelectedGuest(guest)}
                                        placeholder="Nombre del invitado..."
                                        labelKey="name"
                                        renderItem={(guest) => (
                                            <div>
                                                <div className="font-medium">{guest.name}</div>
                                                <div className="text-xs text-gray-500">{guest.phone}</div>
                                            </div>
                                        )}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Buscar Discípulo (Usuario)
                                    </label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) => {
                                            const params = { search: term };
                                            if (encuentro.type === 'HOMBRES') params.sex = 'HOMBRE';
                                            if (encuentro.type === 'MUJERES') params.sex = 'MUJER';
                                            if (encuentro.type === 'JOVENES') {
                                                const d = new Date();
                                                d.setFullYear(d.getFullYear() - 18);
                                                params.minBirthDate = d.toISOString().split('T')[0];
                                            }
                                            return api.get('/users/search', { params })
                                                .then(res => res.data);
                                        }}
                                        selectedValue={selectedUser}
                                        onSelect={(user) => setSelectedUser(user)}
                                        placeholder="Nombre del discípulo..."
                                        labelKey="fullName"
                                        renderItem={(user) => (
                                            <div>
                                                <div className="font-medium">{user.fullName}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                        )}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Descuento (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discount}
                                    onChange={(e) => setDiscount(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={needsTransport}
                                        onChange={(e) => setNeedsTransport(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Libro</span>
                                </label>
                                <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={needsAccommodation}
                                        onChange={(e) => setNeedsAccommodation(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hospedaje</span>
                                </label>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading || (registrationType === 'GUEST' ? !selectedGuest : !selectedUser)}
                                    className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                                >
                                    {loading ? 'Procesando...' : 'Confirmar Inscripción'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedRegistration && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Registrar Abono</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 mx-6 mt-6 rounded-lg">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-400">{selectedRegistration.guest ? 'Invitado:' : 'Usuario:'}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{selectedRegistration.guest?.name || selectedRegistration.user?.fullName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Saldo Pendiente:</span>
                                <span className="font-bold text-red-500 dark:text-red-400">{formatCurrency(selectedRegistration.balance)}</span>
                            </div>
                        </div>
                        <form onSubmit={handlePayment} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Monto a Abonar
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tipo de Pago
                                </label>
                                <select
                                    value={paymentType}
                                    onChange={(e) => setPaymentType(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="ENCUENTRO">Encuentro</option>
                                    <option value="TRANSPORT">Libro</option>
                                    <option value="ACCOMMODATION">Otros Gastos</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Observación (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    placeholder="A quien se realiza el pago."
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                >
                                    Registrar Pago
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Approve Pending Registration Modal */}
            {showApproveModal && pendingRegToApprove && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aprobar Inscripción</h3>
                            <button onClick={() => setShowApproveModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Nombre:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{pendingRegToApprove.guest?.name || pendingRegToApprove.user?.fullName || pendingRegToApprove.fullName}</span>
                                </div>
                                {(pendingRegToApprove.guest?.phone || pendingRegToApprove.user?.phone || pendingRegToApprove.phone) && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Tel├®fono:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{pendingRegToApprove.guest?.phone || pendingRegToApprove.user?.phone || pendingRegToApprove.phone}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Libro U. de la V.:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{pendingRegToApprove.needsTransport ? 'Sí' : 'No'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Otros Gastos:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{pendingRegToApprove.needsAccommodation ? 'Sí' : 'No'}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
                                <button
                                    onClick={() => { setApproveMode('link'); setApproveLeaderId(null); setApproveGuest(null); }}
                                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${approveMode === 'link'
                                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Vincular a Cuenta Existente
                                </button>
                                <button
                                    onClick={() => { setApproveMode('guest'); setApproveUser(null); setApproveLeaderId(null); }}
                                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${approveMode === 'guest'
                                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Vincular a Invitado
                                </button>
                                <button
                                    onClick={() => { setApproveMode('create'); setApproveUser(null); setApproveGuest(null); }}
                                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${approveMode === 'create'
                                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Crear Nueva Cuenta
                                </button>
                            </div>

                            {approveMode === 'link' ? (
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Buscar Cuenta Existente</label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) => {
                                            const params = { search: term };
                                            return api.get('/users/search', { params })
                                                .then(res => res.data);
                                        }}
                                        selectedValue={approveUser}
                                        onSelect={(user) => setApproveUser(user || null)}
                                        placeholder="Buscar por nombre o correo..."
                                        labelKey="fullName"
                                    />
                                </div>
                            ) : approveMode === 'guest' ? (
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Buscar Invitado Existente</label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) => {
                                            const params = { search: term };
                                            return api.get('/guests', { params })
                                                .then(res => res.data?.guests || []);
                                        }}
                                        selectedValue={approveGuest}
                                        onSelect={(guest) => setApproveGuest(guest || null)}
                                        placeholder="Buscar invitado por nombre..."
                                        labelKey="name"
                                        renderItem={(guest) => (
                                            <div>
                                                <div className="font-medium">{guest.name}</div>
                                                <div className="text-xs text-gray-500">{guest.phone}</div>
                                            </div>
                                        )}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                                    {!createdGuestId ? (
                                        <div className="space-y-3">
                                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                                                Primero registra a la persona como invitado usando el formulario. Luego se creará su cuenta de Discípulo automáticamente.
                                            </div>
                                            <button
                                                onClick={() => setShowGuestForm(true)}
                                                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                Registrar Invitado
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 p-3 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">✓ Invitado registrado:</span>
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{createdGuestName}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asignar Líder *</label>
                                                <AsyncSearchSelect
                                                    fetchItems={(term) => {
                                                        const params = { search: term, role: 'LIDER_CELULA' };
                                                        return api.get('/users/search', { params })
                                                            .then(res => res.data);
                                                    }}
                                                    selectedValue={approveLeaderId}
                                                    onSelect={(user) => setApproveLeaderId(user?.id || null)}
                                                    placeholder="Buscar líder de célula..."
                                                    labelKey="fullName"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex gap-3">
                            <button
                                onClick={() => setShowApproveModal(false)}
                                className="flex-1 py-2 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmApprove}
                                disabled={loading || (approveMode === 'link' && !approveUser)}
                                className="flex-1 py-2 px-4 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Aprobar Registro
                            </button>
                        </div>
                    </div>

                    {showGuestForm && (
                        <GuestRegistrationForm
                            isOpen={showGuestForm}
                            onClose={() => setShowGuestForm(false)}
                            onGuestCreated={(guest) => {
                                setCreatedGuestId(guest.id);
                                setCreatedGuestName(guest.name);
                                setShowGuestForm(false);
                            }}
                            initialData={{
                                name: pendingRegToApprove.fullName || '',
                                phone: pendingRegToApprove.phone || '',
                                invitedById: user?.id,
                                assignedToId: user?.id,
                            }}
                        />
                    )}
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && selectedHistoryRegistration && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Historial de Pagos - {selectedHistoryRegistration.guest?.name || selectedHistoryRegistration.user?.fullName || 'N/A'}
                            </h3>
                            <button onClick={() => setShowHistoryModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6">
                            {selectedHistoryRegistration.payments && selectedHistoryRegistration.payments.length > 0 ? (
                                <div className="space-y-4">
                                    {selectedHistoryRegistration.payments.map((payment) => (
                                        <div key={payment.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-green-600 dark:text-green-400">
                                                        {formatCurrency(payment.amount)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                                                        {payment.paymentType === 'TRANSPORT' ? 'Libro' : payment.paymentType === 'ACCOMMODATION' ? 'Otros' : 'Encuentro'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(payment.date).toLocaleDateString()}
                                                    </span>
                                                    {canManagePayments && (
                                                        <button
                                                            onClick={() => handleDeletePayment(payment)}
                                                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                            title="Eliminar abono"
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {payment.notes && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                                                    "{payment.notes}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    No hay abonos registrados.
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Total Abonado:</span>
                                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(Number(selectedHistoryRegistration.totalPaid) || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Convert User Modal */}
            {showConvertModal && selectedRegistration && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Convertir a Discípulo</h3>
                            <button onClick={() => setShowConvertModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="px-6 pt-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Estás convirtiendo a <strong className="text-gray-900 dark:text-white">{selectedRegistration.guest?.name || selectedRegistration.user?.fullName || 'N/A'}</strong> en un usuario Discípulo de la plataforma.
                            </p>
                        </div>
                        <form onSubmit={handleConvertMember} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={convertData.email}
                                    onChange={(e) => setConvertData({ ...convertData, email: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Contrase├▒a
                                </label>
                                <input
                                    type="password"
                                    value={convertData.password}
                                    onChange={(e) => setConvertData({ ...convertData, password: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                    minLength={6}
                                />
                            </div>

                            {/* Data Authorization Checks */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        required
                                        className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                        checked={convertData.dataPolicyAccepted}
                                        onChange={e => setConvertData({ ...convertData, dataPolicyAccepted: e.target.checked })}
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                        Declaro que he leído y acepto la <a href={DATA_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-semibold">Política de Tratamiento de Datos Personales</a>.
                                    </span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        required
                                        className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                        checked={convertData.dataTreatmentAuthorized}
                                        onChange={e => setConvertData({ ...convertData, dataTreatmentAuthorized: e.target.checked })}
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                        Autorizo de manera expresa el tratamiento de mis datos personales.
                                    </span>
                                </label>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium shadow-lg hover:shadow-xl"
                                >
                                    {loading ? 'Procesando...' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Encuentro Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-[2px] z-[100] flex items-center justify-center sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] sm:rounded-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 shadow-[rgba(0,0,0,0)_0px_8px_2px,rgba(0,0,0,0.01)_0px_5px_2px,rgba(0,0,0,0.04)_0px_3px_2px,rgba(0,0,0,0.07)_0px_1px_1px,rgba(0,0,0,0.08)_0px_0px_1px]">
                        {/* Header */}
                        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-center flex-shrink-0">
                            <h3 className="text-lg sm:text-[20px] font-[590] text-[var(--ln-text-primary)] tracking-[-0.24px] leading-[1.33]">
                                Editar Encuentro
                            </h3>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] transition-colors p-2 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)]"
                                aria-label="Cerrar modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
                            <form onSubmit={handleUpdateEncuentro} className="space-y-4">
                                <div>
                                    <label className="block text-[13px] font-medium text-[var(--ln-text-secondary)] mb-1.5">
                                        Palabra Rhema
                                    </label>
                                    <input
                                        type="text"
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-lg text-[13.5px] text-[var(--ln-text-primary)] placeholder:text-[var(--ln-text-tertiary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] hover:border-[var(--ln-border-primary)] transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-[var(--ln-text-secondary)] mb-1.5">
                                        Descripción
                                    </label>
                                    <textarea
                                        value={editData.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-lg text-[13.5px] text-[var(--ln-text-primary)] placeholder:text-[var(--ln-text-tertiary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] hover:border-[var(--ln-border-primary)] transition-all resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[13px] font-medium text-[var(--ln-text-secondary)] mb-1.5">
                                            Donación Encuentro ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editData.cost}
                                            onChange={(e) => setEditData({ ...editData, cost: e.target.value })}
                                            className="w-full px-3 py-2 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-lg text-[13.5px] text-[var(--ln-text-primary)] placeholder:text-[var(--ln-text-tertiary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] hover:border-[var(--ln-border-primary)] transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-medium text-[var(--ln-text-secondary)] mb-1.5">
                                            Tipo
                                        </label>
                                        <select
                                            value={editData.type}
                                            onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                                            className="w-full px-3 py-2 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-lg text-[13.5px] text-[var(--ln-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] hover:border-[var(--ln-border-primary)] transition-all"
                                            required
                                        >
                                            <option value="MUJERES">Mujeres</option>
                                            <option value="JOVENES">Jóvenes</option>
                                            <option value="HOMBRES">Hombres</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[13px] font-medium text-[var(--ln-text-secondary)] mb-1.5">
                                            Costo Libro ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editData.transportCost}
                                            onChange={(e) => setEditData({ ...editData, transportCost: e.target.value })}
                                            className="w-full px-3 py-2 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-lg text-[13.5px] text-[var(--ln-text-primary)] placeholder:text-[var(--ln-text-tertiary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] hover:border-[var(--ln-border-primary)] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-medium text-[var(--ln-text-secondary)] mb-1.5">
                                            Costo Hospedaje ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editData.accommodationCost}
                                            onChange={(e) => setEditData({ ...editData, accommodationCost: e.target.value })}
                                            className="w-full px-3 py-2 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-lg text-[13.5px] text-[var(--ln-text-primary)] placeholder:text-[var(--ln-text-tertiary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] hover:border-[var(--ln-border-primary)] transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[13px] font-medium text-[var(--ln-text-secondary)] mb-1.5">
                                            Fecha Inicio
                                        </label>
                                        <input
                                            type="date"
                                            value={editData.startDate}
                                            onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                                            className="w-full px-3 py-2 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-lg text-[13.5px] text-[var(--ln-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] hover:border-[var(--ln-border-primary)] transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-medium text-[var(--ln-text-secondary)] mb-1.5">
                                            Fecha Fin
                                        </label>
                                        <input
                                            type="date"
                                            value={editData.endDate}
                                            onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                                            className="w-full px-3 py-2 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-lg text-[13.5px] text-[var(--ln-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] hover:border-[var(--ln-border-primary)] transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-[var(--ln-text-secondary)] mb-1.5">Coordinador del Encuentro</label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) => {
                                            const params = { search: term, role: 'LIDER_DOCE' };
                                            return api.get('/users/search', { params })
                                                .then(res => res.data);
                                        }}
                                        selectedValue={editData.coordinatorId}
                                        onSelect={(user) => setEditData({ ...editData, coordinatorId: user })}
                                        placeholder="Seleccionar coordinador..."
                                        labelKey="fullName"
                                    />
                                </div>
                            </form>
                        </div>

                        {/* Footer with Cancel and Save buttons */}
                        <div className="px-4 sm:px-6 py-4 sm:py-5 bg-[rgba(255,255,255,0.02)] border-t border-[rgba(255,255,255,0.08)] flex-shrink-0">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-[var(--ln-bg-panel)] hover:bg-[rgba(255,255,255,0.06)] text-[var(--ln-text-secondary)] border border-[var(--ln-border-standard)] rounded-lg text-[13.5px] font-medium transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUpdateEncuentro}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-brand-violet)] text-white rounded-lg text-[13.5px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--ln-brand-indigo)]/20"
                                >
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setRegistrationToDelete(null);
                }}
                onConfirm={performDelete}
                title="Eliminar Registro"
                message="Estás seguro de que deseas eliminar este registro?"
                confirmText="Eliminar Registro"
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            >
                {registrationToDelete && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Participante:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{registrationToDelete.guest?.name || registrationToDelete.user?.fullName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Total a Pagar:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(Number(registrationToDelete.finalCost) || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Abonado:</span>
                                <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(Number(registrationToDelete.totalPaid) || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Saldo Pendiente:</span>
                                <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(Number(registrationToDelete.balance) || 0)}</span>
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
                                Acción Irreversible
                            </h4>
                            <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                                <li> Se eliminará el registro del encuentro</li>
                                <li> Se perderán todos los abonos asociados</li>
                                <li> No se puede deshacer esta acción</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </ConfirmationModal>

            {/* Reject Pending Registration Confirmation Modal */}
            <ConfirmationModal
                isOpen={showRejectConfirm}
                onClose={() => {
                    setShowRejectConfirm(false);
                    setPendingRegToReject(null);
                }}
                onConfirm={handleConfirmReject}
                title="Rechazar Solicitud"
                message="¿Estás seguro de rechazar esta solicitud pendiente?"
                confirmText="Rechazar Solicitud"
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            >
                {pendingRegToReject && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Nombre:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {pendingRegToReject.fullName}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Contacto:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {pendingRegToReject.phone || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </ConfirmationModal>

            {/* Payment Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showPaymentDeleteConfirm}
                onClose={() => {
                    setShowPaymentDeleteConfirm(false);
                    setPaymentToDelete(null);
                }}
                onConfirm={performDeletePayment}
                title="Eliminar Abono"
                message="Estás seguro de que deseas eliminar este abono?"
                confirmText="Eliminar Abono"
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            >
                {paymentToDelete && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Monto:</span>
                                <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(paymentToDelete.amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {paymentToDelete.paymentType === 'TRANSPORT' ? 'Libro' : paymentToDelete.paymentType === 'ACCOMMODATION' ? 'Otros' : 'Encuentro'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{new Date(paymentToDelete.date).toLocaleDateString()}</span>
                            </div>
                            {paymentToDelete.notes && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Notas:</span>
                                    <span className="font-medium text-gray-900 dark:text-white italic">"{paymentToDelete.notes}"</span>
                                </div>
                            )}
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
                                Acción Irreversible
                            </h4>
                            <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                                <li> Se eliminará el abono permanentemente</li>
                                <li> El saldo del participante se actualizará</li>
                                <li> No se puede deshacer esta acción</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </ConfirmationModal>
                    </>
                </>
            )}
        </div>
    );
};

export default EncuentroDetails;
