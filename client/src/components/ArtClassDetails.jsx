import { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, MoneyIcon, CheckCircle, XCircle, Trash, Calendar, BookOpen, Pen, FileTextIcon, GuitarIcon, GraduationCap } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { AsyncSearchSelect } from './ui';
import MultiUserSelect from './MultiUserSelect';
import ArtClassAttendanceTracker from './ArtClassAttendanceTracker';
import BalanceReport from './BalanceReport';
import { DATA_POLICY_URL } from '../constants/policies';
import ConfirmationModal from './ConfirmationModal';

const ArtClassDetails = ({ artClass, onBack, onRefresh }) => {
    const { user, isAdmin, hasAnyRole, isCoordinator } = useAuth();
    
    const [activeTab, setActiveTab] = useState('general'); // general | attendance | report
    const [reportData, setReportData] = useState([]);
    const [loadingReport, setLoadingReport] = useState(false);

    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedEnrollment, setSelectedEnrollment] = useState(null);
    const [loading, setLoading] = useState(false);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedHistoryEnrollment, setSelectedHistoryEnrollment] = useState(null);
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
    const [enrollmentToDelete, setEnrollmentToDelete] = useState(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        description: '',
        cost: '',
        duration: '',
        schedule: ''
    });

    // Enrollment Form State
    const [enrollmentType, setEnrollmentType] = useState('GUEST'); // GUEST or USER
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedGuestId, setSelectedGuestId] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [discount, setDiscount] = useState(0);

    // Payment Form State
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentType, setPaymentType] = useState('TUITION');
    const [paymentNotes, setPaymentNotes] = useState('');

    const hasAdminOrPastor = hasAnyRole(['ADMIN', 'PASTOR']);
    const isModuleCoordinator = isCoordinator('escuela-de-artes');
    const isModuleSubCoordinator = user?.isModuleSubCoordinator || 
                                   (user?.moduleSubCoordinations && user.moduleSubCoordinations.includes('escuela-de-artes'));
    const isModuleTreasurer = user?.isModuleTreasurer || 
                               (user?.moduleTreasurers && user.moduleTreasurers.includes('escuela-de-artes'));
    const hasFullEditAccess = hasAdminOrPastor || isModuleCoordinator || isModuleSubCoordinator || isModuleTreasurer;
    const canModify = hasFullEditAccess || parseInt(user?.id) === parseInt(artClass?.professorId);

    useEffect(() => {
        if (activeTab === 'report' && artClass) {
            fetchReport();
        }
    }, [activeTab, artClass]);

    const fetchReport = async () => {
        if (!artClass) return;
        setLoadingReport(true);
        try {
            const response = await api.get(`/arts/classes/${artClass?.id}/report/balance`);
            setReportData(response.data);
        } catch (error) {
            console.error('Error fetching report:', error);
            toast.error('Error cargando el reporte financiero');
        } finally {
            setLoadingReport(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/arts/classes/${artClass.id}/enroll`, {
                guestId: enrollmentType === 'GUEST' ? selectedGuestId : null,
                userId: enrollmentType === 'USER' ? selectedUserId : null,
                discountPercentage: parseFloat(discount)
            });
            setShowRegisterModal(false);
            setSelectedGuest(null);
            setSelectedUser(null);
            setSelectedGuestId(null);
            setSelectedUserId(null);
            setDiscount(0);
            onRefresh();
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error registering student:', error);
            toast.error('Error creating enrollment: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/arts/enrollments/${selectedEnrollment.id}/payments`, {
                amount: parseFloat(paymentAmount),
                paymentType,
                notes: paymentNotes
            });
            setShowPaymentModal(false);
            setSelectedEnrollment(null);
            setPaymentAmount('');
            setPaymentType('TUITION');
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

    const handleDelete = async (enrollmentId) => {
        // Find the enrollment to show details in the confirmation modal
        const enrollment = artClass.enrollments.find(e => e.id === enrollmentId);
        setEnrollmentToDelete(enrollment);
        setShowDeleteConfirm(true);
    };

    const performDelete = async () => {
        if (!enrollmentToDelete) return;

        try {
            await api.delete(`/arts/enrollments/${enrollmentToDelete.id}`);
            onRefresh();
            if (activeTab === 'report') fetchReport();
        } catch (error) {
            console.error('Error deleting enrollment:', error);
            toast.error('Error al eliminar');
        }
    };

    const handleConvertMember = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const guestId = selectedEnrollment?.guest?.id;

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

    const openEditModal = () => {
        setEditData({
            name: artClass.name,
            description: artClass.description || '',
            cost: artClass.cost,
            duration: artClass.duration,
            schedule: artClass.schedule
        });
        setShowEditModal(true);
    };

    const handleUpdateClass = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/arts/classes/${artClass.id}`, editData);
            setShowEditModal(false);
            toast.success('Clase actualizada exitosamente!');
            onRefresh();
        } catch (error) {
            console.error('Error updating class:', error);
            toast.error('Error al actualizar: ' + (error.response?.data?.error || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    const openHistoryModal = (enrollment) => {
        setSelectedHistoryEnrollment(enrollment);
        setShowHistoryModal(true);
    };

    const openConvertModal = (enrollment) => {
        setSelectedEnrollment(enrollment);
        setShowConvertModal(true);
    };

    const openPaymentModal = (enrollment) => {
        setSelectedEnrollment(enrollment);
        setShowPaymentModal(true);
    };

    const formatCurrency = (amount) => {
        const value = parseFloat(amount) || 0;
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
    };

    return (
        <div className="space-y-6">
            {!artClass ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500 dark:text-gray-400">Cargando detalles de la clase...</div>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold dark:text-white">
                                    {artClass.name}
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {artClass.schedule} - {artClass.duration} semanas
                                </p>
                                <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">
                                    Profesor: {artClass.professor?.profile?.fullName || artClass.professor?.fullName || 'Sin Asignar'}
                                </p>
                            </div>
                        </div>
                        {canModify && (
                            <button
                                onClick={openEditModal}
                                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                                <Pen size={20} />
                                <span>Editar Clase</span>
                            </button>
                        )}
                    </div>

                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg text-purple-600 dark:text-purple-300">
                                    <GuitarIcon size={20} />
                                </div>
                                <span className="text-sm font-bold text-purple-800 dark:text-purple-200 uppercase tracking-tight">Inscritos</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-3xl font-extrabold text-purple-900 dark:text-white"> {artClass.enrollments ? artClass.enrollments.length : 0}</span>
                                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">Cantidad Inscritos</span>
                            </div>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-300">
                                    <MoneyIcon size={20} />
                                </div>
                                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-tight">Recaudado</span>
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-extrabold text-emerald-900 dark:text-white">{formatCurrency(artClass.enrollments?.reduce((acc, enr) => acc + (enr.totalPaid || 0), 0) || 0)}</span>
                                </div>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">Dinero Recaudado</span>
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-100 dark:border-red-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg text-red-600 dark:text-red-300">
                                    <MoneyIcon size={20} />
                                </div>
                                <span className="text-sm font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Pendiente por Cobrar</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-3xl font-extrabold text-red-900 dark:text-white">{formatCurrency(artClass.enrollments?.reduce((acc, enr) => acc + (enr.balance || 0), 0) || 0)}</span>
                                <span className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">Dinero Pendiente</span>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-8 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === 'general'
                                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                <Calendar size={18} className="mr-2" />
                                Pagos y Estado
                            </button>
                            <button
                                onClick={() => setActiveTab('attendance')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === 'attendance'
                                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                <BookOpen size={18} className="mr-2" />
                                Asistencia a Clases
                            </button>
                            <button
                                onClick={() => setActiveTab('report')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === 'report'
                                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                <FileTextIcon size={18} className="mr-2" />
                                Reporte Financiero
                            </button>
                        </nav>
                    </div>

                    {/* Content Switcher */}
                    {activeTab === 'general' && (
                        <>
                            {/* Actions */}
                            {canModify && (
                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={() => setShowRegisterModal(true)}
                                        className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                    >
                                        <UserPlus size={20} className="mr-2" />
                                        Inscribir Estudiante
                                    </button>
                                </div>
                            )}
                            {/* Payment/Status Table */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 mt-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estudiante</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pagado</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {artClass.enrollments?.map((enr) => (
                                                <tr key={enr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => openHistoryModal(enr)}
                                                            className="text-left group"
                                                        >
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors border-b border-dotted border-gray-400">
                                                                {enr.guest?.name || enr.user?.profile?.fullName || enr.user?.fullName}
                                                            </div>
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${enr.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                            }`}>
                                                            {enr.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {formatCurrency(enr.finalCost)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                                                        {formatCurrency(enr.totalPaid)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 dark:text-red-400 font-medium">
                                                        {formatCurrency(enr.balance)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end space-x-3">
                                                        {canModify && (
                                                            <button
                                                                onClick={() => openPaymentModal(enr)}
                                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center"
                                                                title="Abonar"
                                                            >
                                                                <MoneyIcon size={16} className="mr-1" />
                                                                Abonar
                                                            </button>
                                                        )}

                                                        {canModify && (
                                                            <>
                                                                {enr.guest && (
                                                                    <button
                                                                        onClick={() => openConvertModal(enr)}
                                                                        className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 inline-flex items-center"
                                                                        title="Convertir a Discípulo"
                                                                    >
                                                                        <UserPlus size={16} />
                                                                    </button>
                                                                )}
                                                                {canModify && (
                                                                    <button
                                                                        onClick={() => handleDelete(enr.id)}
                                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center"
                                                                        title="Eliminar Inscripción"
                                                                    >
                                                                        <Trash size={16} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!artClass.enrollments || artClass.enrollments.length === 0) && (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                        No hay inscritos aún.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="mt-4">
                            <ArtClassAttendanceTracker
                                classId={artClass.id}
                                enrollments={artClass.enrollments || []}
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
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-500">Cargando reporte financiero...</p>
                                </div>
                            ) : (
                                <BalanceReport data={reportData} title={`Reporte_${artClass.name}`} />
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
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Inscribir Estudiante</h3>
                                    <button onClick={() => setShowRegisterModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                        <XCircle size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleRegister} className="p-6 space-y-4">
                                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setEnrollmentType('GUEST')}
                                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${enrollmentType === 'GUEST' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                                        >
                                            Invitado
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEnrollmentType('USER')}
                                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${enrollmentType === 'USER' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                                        >
                                            Discípulo
                                        </button>
                                    </div>

                                    {enrollmentType === 'GUEST' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Buscar Invitado (Desde 'Ganar')
                                            </label>
                                            <AsyncSearchSelect
                                                fetchItems={(term) => {
                                                    if (!term || term.length < 2) return Promise.resolve([]);
                                                    const params = { search: term };
                                                    return api.get('/guests', { params })
                                                        .then(res => res.data.guests || []);
                                                }}
                                                selectedValue={selectedGuest}
                                                onSelect={(guest) => {
                                                    setSelectedGuest(guest);
                                                    setSelectedGuestId(guest?.id || null);
                                                }}
                                                placeholder="Nombre del invitado..."
                                                renderSelected={(guest) => (
                                                    <div className="flex items-center">
                                                        <span className="text-sm text-gray-900 dark:text-gray-100">
                                                            {guest?.name || 'Seleccionar invitado...'}
                                                        </span>
                                                    </div>
                                                )}
                                                renderItem={(guest) => (
                                                    <div>
                                                        <div className="font-medium">{guest.name}</div>
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
                                                    if (!term || term.length < 2) return Promise.resolve([]);
                                                    const params = { 
                                                        search: term,
                                                        allowAllRoles: 'true' 
                                                    };
                                                    return api.get('/users/search', { params })
                                                        .then(res => res.data);
                                                }}
                                                selectedValue={selectedUser}
                                                onSelect={(user) => {
                                                    setSelectedUser(user);
                                                    setSelectedUserId(user?.id || null);
                                                }}
                                                placeholder="Nombre del discípulo..."
                                                renderSelected={(user) => (
                                                    <div className="flex items-center">
                                                        <span className="text-sm text-gray-900 dark:text-gray-100">
                                                            {user?.profile?.fullName || user?.fullName || 'Seleccionar discípulo...'}
                                                        </span>
                                                    </div>
                                                )}
                                                renderItem={(user) => (
                                                    <div>
                                                        <div className="font-medium">{user?.profile?.fullName || user?.fullName}</div>
                                                        <div className="text-xs text-purple-600">{user.roles?.map(r => r.role?.name).join(', ') || 'Sin rol'}</div>
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descuento (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={discount}
                                            onChange={(e) => setDiscount(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="pt-4 flex space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowRegisterModal(false)}
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading || (!selectedGuestId && !selectedUserId)}
                                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {loading ? 'Inscribiendo...' : 'Inscribir'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                        {/* Payment Modal */}
                        {showPaymentModal && selectedEnrollment && (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Registrar Abono</h3>
                                        <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                            <XCircle size={24} />
                                        </button>
                                    </div>
                                    <form onSubmit={handlePayment} className="p-6 space-y-4">
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {selectedEnrollment.guest?.name || selectedEnrollment.user?.profile?.fullName || selectedEnrollment.user?.fullName}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Saldo pendiente: {formatCurrency(selectedEnrollment.balance)}
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto del Abono ($)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={selectedEnrollment.balance}
                                                step="0.01"
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Pago</label>
                                            <select
                                                value={paymentType}
                                                onChange={(e) => setPaymentType(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="TUITION">Matrícula</option>
                                                <option value="MATERIAL">Material</option>
                                                <option value="OTHER">Otro</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas (opcional)</label>
                                            <textarea
                                                value={paymentNotes}
                                                onChange={(e) => setPaymentNotes(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                rows={2}
                                                placeholder="Notas del pago..."
                                            />
                                        </div>

                                        <div className="pt-4 flex space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowPaymentModal(false)}
                                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading || !paymentAmount || parseFloat(paymentAmount) <= 0}
                                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {loading ? 'Procesando...' : 'Registrar Abono'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Edit Modal */}
                        {showEditModal && (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Editar Clase</h3>
                                        <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                            <XCircle size={24} />
                                        </button>
                                    </div>
                                    <form onSubmit={handleUpdateClass} className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la Clase</label>
                                            <input
                                                type="text"
                                                value={editData.name}
                                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                            <textarea
                                                value={editData.description}
                                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo ($)</label>
                                                <input
                                                    type="number"
                                                    value={editData.cost}
                                                    onChange={(e) => setEditData({ ...editData, cost: e.target.value })}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duración (Horas por clase)</label>
                                                <input
                                                    type="number"
                                                    value={durationHours}
                                                    onChange={(e) => setDurationHours(e.target.value)}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horario</label>
                                            <input
                                                type="text"
                                                value={editData.schedule}
                                                onChange={(e) => setEditData({ ...editData, schedule: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                required
                                            />
                                        </div>
                                        <div className="pt-4 flex space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowEditModal(false)}
                                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {loading ? 'Actualizando...' : 'Actualizar Clase'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Delete Confirmation Modal */}
                        <ConfirmationModal
                            isOpen={showDeleteConfirm}
                            onClose={() => {
                                setShowDeleteConfirm(false);
                                setEnrollmentToDelete(null);
                            }}
                            onConfirm={performDelete}
                            title="Eliminar Inscripción"
                            message="¿Estás seguro de eliminar esta inscripción?"
                            confirmText="Eliminar Inscripción"
                            confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {enrollmentToDelete && (
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Estudiante:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{enrollmentToDelete.guest?.name || enrollmentToDelete.user?.profile?.fullName || enrollmentToDelete.user?.fullName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Pagado:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(enrollmentToDelete.totalPaid)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Saldo:</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(enrollmentToDelete.balance)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </ConfirmationModal>
                    </>
                </>
            )}
        </div>
    );
};

export default ArtClassDetails;
