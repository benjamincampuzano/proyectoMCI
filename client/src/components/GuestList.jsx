import { useState, useEffect } from 'react';
import { SpinnerIcon, Funnel, PencilIcon, Trash, X, FloppyDiskIcon, UserCheckIcon, Users, CheckCircle, FileXls } from '@phosphor-icons/react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import { AsyncSearchSelect, Button } from './ui';
import useGuestManagement from '../hooks/useGuestManagement';
import { useAuth } from '../hooks/useAuth';
import { DATA_POLICY_URL } from '../constants/policies';
import api from '../utils/api';
import GuestEditModal from './GuestEditModal';
import ConfirmationModal from './ConfirmationModal';


const GuestList = ({ refreshTrigger }) => {
    const { isCoordinator, isDoceLeader, user } = useAuth();
    const isModuleCoordinator = isCoordinator('ganar');
    const {
        guests,
        loading,
        error,
        setError,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        invitedByFilter,
        setInvitedByFilter,
        liderDoceFilter,
        setLiderDoceFilter,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        pendingCalls,
        setPendingCalls,
        pendingVisits,
        setPendingVisits,
        currentUser,
        fetchGuests,
        fetchAllGuests,
        updateGuest,
        deleteGuest,
        convertGuestToMember,
        // Paginación
        currentPage,
        setCurrentPage,
        guestsPerPage,
        pagination,
    } = useGuestManagement({ refreshTrigger });

    const [editingGuest, setEditingGuest] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedGuestForEdit, setSelectedGuestForEdit] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [guestToDelete, setGuestToDelete] = useState(null);
    const [convertingGuest, setConvertingGuest] = useState(null);
    const [conversionEmail, setConversionEmail] = useState('');
    const [conversionPassword, setConversionPassword] = useState('');
    const [conversionConsent, setConversionConsent] = useState({
        dataPolicyAccepted: false,
        dataTreatmentAuthorized: false,
        minorConsentAuthorized: false
    });
    const [exporting, setExporting] = useState(false);

    // Auto-apply filter for LIDER_DOCE who are not coordinators
    useEffect(() => {
        if (isDoceLeader() && !isModuleCoordinator && user) {
            // Automatically set filter to current user
            setLiderDoceFilter({
                id: user.id,
                fullName: user.profile?.fullName || user.email
            });
        }
    }, [isDoceLeader, isModuleCoordinator, user, setLiderDoceFilter]);

    const handleSearch = () => {
        fetchGuests(1);
    };

    const handleUpdateGuest = async (guestId, updates) => {
        const res = await updateGuest(guestId, updates);
        if (res.success) {
            setEditingGuest(null);
            setIsEditModalOpen(false);
            setSelectedGuestForEdit(null);
        }
    };

    const handleOpenEditModal = (guest) => {
        setSelectedGuestForEdit(guest);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedGuestForEdit(null);
    };

    const handleGuestUpdated = (updatedGuest) => {
        fetchGuests(1);
    };

    const handleOpenDeleteModal = (guest) => {
        setGuestToDelete(guest);
        setIsDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setGuestToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!guestToDelete) return;
        await deleteGuest(guestToDelete.id);
        setGuestToDelete(null);
    };

    const handleConvertToMember = async () => {
        if (!conversionEmail || !conversionPassword) {
            setError('Email y contraseña son requeridos');
            return;
        }

        const res = await convertGuestToMember(convertingGuest.id, {
            email: conversionEmail,
            password: conversionPassword,
            ...conversionConsent
        });
        if (!res.success) return;

        setConvertingGuest(null);
        setConversionEmail('');
        setConversionPassword('');
        setConversionConsent({
            dataPolicyAccepted: false,
            dataTreatmentAuthorized: false,
            minorConsentAuthorized: false
        });
        toast.success('Invitado consolidado a Discípulo exitosamente');
    };

    const getStatusBadgeColor = (status) => {
        const colors = {
            NUEVO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            CONTACTADO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            CONSOLIDADO: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
            GANADO: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        };
        return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    };

    const getStatusLabel = (status) => {
        const labels = {
            NUEVO: 'Nuevo',
            CONTACTADO: 'Llamado',
            CONSOLIDADO: 'Visitado',
            GANADO: 'Consolidado',
        };
        return labels[status] || status;
    };

    // Calcular edad a partir de la fecha de nacimiento
    const calculateAge = (birthDate) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    // Estado para mostrar/ocultar filtros avanzados (ocultos por defecto en móvil)
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Funciones auxiliares de permisos
    const canEditAllFields = (guest) => {
        const roles = currentUser?.roles || [];
        return roles.includes('ADMIN') || roles.includes('LIDER_DOCE');
    };

    const canDelete = (guest) => {
        const roles = currentUser?.roles || [];
        // Solo ADMIN y LIDER_DOCE pueden eliminar invitados
        // DISCIPULO no tiene permiso para eliminar
        return roles.includes('ADMIN') || roles.includes('LIDER_DOCE');
    };

    const canExport = () => {
        const roles = currentUser?.roles || [];
        // Solo ADMIN, PASTOR y LIDER_DOCE (coordinador del módulo) pueden exportar
        return roles.includes('ADMIN') || roles.includes('PASTOR') || roles.includes('LIDER_DOCE');
    };


    // Check if liderDoceFilter is auto-applied (for non-coordinator LIDER_DOCE)
    const isLiderDoceFilterAutoApplied = isDoceLeader() && !isModuleCoordinator && liderDoceFilter?.id === user?.id;
    
    const hasAdvancedFilters = searchTerm || statusFilter || invitedByFilter || (liderDoceFilter && !isLiderDoceFilterAutoApplied) || startDate || endDate || pendingCalls || pendingVisits;
    const activeAdvancedCount = [searchTerm, statusFilter, invitedByFilter, (liderDoceFilter && !isLiderDoceFilterAutoApplied), startDate, endDate, pendingCalls, pendingVisits].filter(Boolean).length;

    const clearAdvancedFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setInvitedByFilter(null);
        setLiderDoceFilter(null);
        setStartDate('');
        setEndDate('');
        setPendingCalls(false);
        setPendingVisits(false);
        setTimeout(() => fetchGuests(), 0);
    };

    const exportToExcel = async () => {
        setExporting(true);
        try {
            // Obtener todos los invitados filtrados (sin paginación)
            const allGuests = await fetchAllGuests();

            if (allGuests.length === 0) {
                toast.error('No hay datos para exportar');
                return;
            }

            // Crear libro de trabajo
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Invitados');

            // Definir columnas
            worksheet.columns = [
                { header: 'Fecha Creación', key: 'createdAt', width: 15 },
                { header: 'Registrado Por', key: 'registeredBy', width: 20 },
                { header: 'Nombre', key: 'name', width: 25 },
                { header: 'Edad', key: 'age', width: 8 },
                { header: 'Teléfono', key: 'phone', width: 15 },
                { header: 'Dirección', key: 'address', width: 30 },
                { header: 'Petición de Oración', key: 'prayerRequest', width: 40 },
                { header: 'Estado', key: 'status', width: 12 },
                { header: 'Invitado Por', key: 'invitedBy', width: 20 },
                { header: 'Asignado a', key: 'assignedTo', width: 20 },
                { header: 'Célula', key: 'cell', width: 20 },
                { header: 'Líder de Célula', key: 'cellLeader', width: 20 },
                { header: 'Encuentro', key: 'encuentro', width: 30 }
            ];

            // Añadir datos
            allGuests.forEach(guest => {
                worksheet.addRow({
                    createdAt: guest.createdAt ? new Date(guest.createdAt).toLocaleDateString('es-ES') : 'N/A',
                    registeredBy: guest.registeredBy?.fullName || 'N/A',
                    name: guest.name || 'N/A',
                    age: calculateAge(guest.birthDate) || 'N/A',
                    phone: guest.phone || 'N/A',
                    address: guest.address || 'N/A',
                    prayerRequest: guest.prayerRequest || 'N/A',
                    status: getStatusLabel(guest.status) || 'N/A',
                    invitedBy: guest.invitedBy?.fullName || 'N/A',
                    assignedTo: guest.assignedTo?.fullName || 'Pendiente',
                    cell: guest.cell?.name || 'No asignado',
                    cellLeader: guest.cell?.leader?.fullName || 'N/A',
                    encuentro: guest.encuentroRegistrations?.map(r => r.encuentro?.name || r.encuentro?.type).join(', ') || 'No registrado'
                });
            });

            // Estilar encabezados
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF10B981' } // Green-500
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            // Generar archivo Excel
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            // Descargar archivo
            saveAs(blob, `invitados_${new Date().toISOString().split('T')[0]}.xlsx`);

            toast.success(`Exportados ${allGuests.length} invitados a Excel`);
        } catch (err) {
            toast.error(err.message || 'Error al exportar invitados');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-[#1d1d1f] dark:text-white mb-6">Lista de Invitados</h2>

            {error && (
                <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Sección de Filtros - Estilo Guía */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                {/* Header con botón de filtros */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filtros</h3>
                        {activeAdvancedCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-medium">
                                {activeAdvancedCount}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {hasAdvancedFilters && (
                            <button
                                onClick={clearAdvancedFilters}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                                <X size={14} /> Limpiar
                            </button>
                        )}
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                hasAdvancedFilters
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            <Funnel size={16} weight={showAdvancedFilters ? "fill" : "bold"} />
                            Filtros
                            {hasAdvancedFilters && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                                    {activeAdvancedCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Filtros expandibles */}
                <div className={`transition-all duration-300 overflow-hidden ${showAdvancedFilters ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4 space-y-4">
                        {/* Fila 1: Búsqueda y Estado */}
                        <div className="flex flex-wrap gap-4 items-end">
                            {/* Búsqueda por nombre */}
                            <div className="flex-[2] min-w-[200px]">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    Buscar por nombre
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Escribe un nombre..."
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                    {searchTerm && (
                                        <button 
                                            onClick={() => {
                                                setSearchTerm('');
                                                setCurrentPage(1);
                                            }} 
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Filtro de Estado */}
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    Estado
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    <option value="">Todos los estados</option>
                                    <option value="NUEVO">Nuevo</option>
                                    <option value="CONTACTADO">Llamado</option>
                                    <option value="CONSOLIDADO">Visitado</option>
                                    <option value="GANADO">Consolidado</option>
                                </select>
                            </div>

                            {/* Filtro de Invitado por */}
                            <div className="flex-[2] min-w-[200px]">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    Invitado por
                                </label>
                                <AsyncSearchSelect
                                    fetchItems={(term) =>
                                        api.get('/users/search', { params: { search: term } })
                                            .then(res => res.data)
                                    }
                                    selectedValue={invitedByFilter}
                                    onSelect={(user) => {
                                        setInvitedByFilter(user || null);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Buscar invitador..."
                                    labelKey="fullName"
                                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                                />
                            </div>
                        </div>

                        {/* Fila 2: Fechas y Líder */}
                        <div className="flex flex-wrap gap-4 items-end">
                            {/* Fecha inicio */}
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    Fecha desde
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Fecha fin */}
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    Fecha hasta
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Filtro de Líder Doce */}
                            {(!isDoceLeader() || isModuleCoordinator) && (
                                <div className="flex-[2] min-w-[250px]">
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                        Líder de 12
                                    </label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) => {
                                            const roleFilter = currentUser?.roles?.includes('PASTOR') ? "LIDER_DOCE,PASTOR" : "LIDER_DOCE";
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
                                        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Fila 2: Checkboxes de pendientes */}
                        <div className="flex flex-wrap gap-6 pt-2">
                            {/* Checkbox Pendientes por llamar */}
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`relative flex items-center justify-center w-5 h-5 rounded border-2 transition-all ${
                                    pendingCalls
                                        ? 'bg-green-500 border-green-500'
                                        : 'border-gray-300 dark:border-gray-600 group-hover:border-green-400'
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
                                    {pendingCalls && <CheckCircle size={14} className="text-white" weight="fill" />}
                                </div>
                                <span className={`text-sm font-medium ${pendingCalls ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                    Pendientes por llamar
                                </span>
                            </label>

                            {/* Checkbox Pendientes por visitar */}
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`relative flex items-center justify-center w-5 h-5 rounded border-2 transition-all ${
                                    pendingVisits
                                        ? 'bg-green-500 border-green-500'
                                        : 'border-gray-300 dark:border-gray-600 group-hover:border-green-400'
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
                                    {pendingVisits && <CheckCircle size={14} className="text-white" weight="fill" />}
                                </div>
                                <span className={`text-sm font-medium ${pendingVisits ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                    Pendientes por visitar
                                </span>
                            </label>
                        </div>

                        {/* Botón Aplicar */}
                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                onClick={handleSearch}
                                icon={Funnel}
                                className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                            >
                                Aplicar Filtros
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Barra de estado */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-gray-500" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {pagination?.total || guests.length} invitados
                                </span>
                            </div>
                            
                            {/* Badges de filtros activos */}
                            {hasAdvancedFilters && (
                                <div className="flex flex-wrap gap-1.5">
                                    {startDate && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
                                            Desde: {new Date(startDate).toLocaleDateString('es-ES')}
                                        </span>
                                    )}
                                    {endDate && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
                                            Hasta: {new Date(endDate).toLocaleDateString('es-ES')}
                                        </span>
                                    )}
                                    {liderDoceFilter && (!isDoceLeader() || isModuleCoordinator) && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs">
                                            Líder: {liderDoceFilter.fullName}
                                        </span>
                                    )}
                                    {pendingCalls && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                                            Por llamar
                                        </span>
                                    )}
                                    {pendingVisits && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                                            Por visitar
                                        </span>
                                    )}
                                    {searchTerm && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
                                            Búsqueda: {searchTerm}
                                        </span>
                                    )}
                                    {statusFilter && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs">
                                            Estado: {getStatusLabel(statusFilter)}
                                        </span>
                                    )}
                                    {invitedByFilter && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs">
                                            Invitado por: {invitedByFilter.fullName}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {canExport() && (
                            <button
                                onClick={exportToExcel}
                                disabled={loading || exporting || guests.length === 0}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
                                title="Exportar a Excel"
                            >
                                {exporting ? (
                                    <SpinnerIcon size={14} className="animate-spin" />
                                ) : (
                                    <FileXls size={16} />
                                )}
                                {exporting ? 'Exportando...' : 'Exportar Excel'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabla de Invitados */}
            {/* Paginación numérica - Superior */}
            {pagination.pages > 1 && (
                <div className="mb-4 flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                        Mostrando {(pagination.page - 1) * guestsPerPage + 1} - {Math.min(pagination.page * guestsPerPage, pagination.total)} de {pagination.total} invitados
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={pagination.onPrev}
                            disabled={!pagination.hasPrev || loading}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Anterior
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                let pageNum;
                                if (pagination.pages <= 5) {
                                    pageNum = i + 1;
                                } else if (pagination.page <= 3) {
                                    pageNum = i + 1;
                                } else if (pagination.page >= pagination.pages - 2) {
                                    pageNum = pagination.pages - 4 + i;
                                } else {
                                    pageNum = pagination.page - 2 + i;
                                }

                                const isActive = pagination.page === pageNum;

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
                            onClick={pagination.onNext}
                            disabled={!pagination.hasNext || loading}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[#f5f5f7] dark:bg-gray-900/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Fecha Creación</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Registrado Por</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Nombre</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Edad</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Teléfono</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Dirección</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Petición de Oración</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Estado</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Invitado Por</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Asignado a</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Célula</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Encuentro</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-200">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan="13" className="px-4 py-8 text-center text-gray-400">
                                    <SpinnerIcon size={24} className="animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : guests.length === 0 ? (
                            <tr>
                                <td colSpan="13" className="px-4 py-8 text-center text-gray-400">
                                    No se encontraron invitados
                                </td>
                            </tr>
                        ) : (
                            guests.map((guest) => (
                                <tr key={guest.id} className="hover:bg-[#f5f5f7] dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="text-gray-600 dark:text-white/80 text-sm">
                                            {guest.createdAt ? new Date(guest.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-[#1d1d1f] dark:text-white text-sm">{guest.registeredBy?.fullName || 'N/A'}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <input
                                                type="text"
                                                value={editingGuest.name}
                                                onChange={(e) =>
                                                    setEditingGuest({ ...editingGuest, name: e.target.value })
                                                }
                                                disabled={!canEditAllFields(guest)}
                                                className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-[#d1d1d6] dark:border-gray-500 rounded text-[#1d1d1f] dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                placeholder="Nombre"
                                            />
                                        ) : (
                                            <p className="text-[#1d1d1f] dark:text-white text-sm font-medium">{guest.name}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-gray-600 dark:text-white/80 text-sm">
                                            {calculateAge(guest.birthDate) || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <input
                                                type="text"
                                                value={editingGuest.phone}
                                                onChange={(e) =>
                                                    setEditingGuest({ ...editingGuest, phone: e.target.value })
                                                }
                                                disabled={!canEditAllFields(guest)}
                                                className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-[#d1d1d6] dark:border-gray-500 rounded text-[#1d1d1f] dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        ) : (
                                            <span className="text-gray-600 dark:text-white/80 text-sm">{guest.phone}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <input
                                                type="text"
                                                value={editingGuest.address || ''}
                                                onChange={(e) =>
                                                    setEditingGuest({ ...editingGuest, address: e.target.value })
                                                }
                                                disabled={!canEditAllFields(guest)}
                                                className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-[#d1d1d6] dark:border-gray-500 rounded text-[#1d1d1f] dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                placeholder="Dirección"
                                            />
                                        ) : (
                                            <span className="text-gray-600 dark:text-white/80 text-sm">{guest.address || 'N/A'}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-gray-600 dark:text-white/80 text-sm max-w-[150px] block truncate" title={guest.prayerRequest || ''}>
                                            {guest.prayerRequest || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <select
                                                value={editingGuest.status}
                                                onChange={(e) =>
                                                    setEditingGuest({ ...editingGuest, status: e.target.value })
                                                }
                                                className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-[#d1d1d6] dark:border-gray-500 rounded text-[#1d1d1f] dark:text-white text-sm"
                                            >
                                                <option value="NUEVO">Nuevo</option>
                                                <option value="CONTACTADO">Llamado</option>
                                                <option value="CONSOLIDADO">Visitado</option>
                                                <option value="GANADO">Consolidado</option>
                                            </select>
                                        ) : (
                                            <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusBadgeColor(guest.status)}`}>
                                                {getStatusLabel(guest.status)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            canEditAllFields(guest) ? (
                                                <AsyncSearchSelect
                                                    fetchItems={(term) =>
                                                        api.get('/users/search', { params: { search: term } })
                                                            .then(res => res.data)
                                                    }
                                                    selectedValue={editingGuest.invitedBy}
                                                    onSelect={(user) => setEditingGuest({ ...editingGuest, invitedById: user?.id, invitedBy: user })}
                                                    placeholder="Invitado por..."
                                                    labelKey="fullName"
                                                />
                                            ) : (
                                                <p className="text-[#1d1d1f] dark:text-white text-sm">{guest.invitedBy?.fullName || 'N/A'}</p>
                                            )
                                        ) : (
                                            <p className="text-[#1d1d1f] dark:text-white text-sm">{guest.invitedBy?.fullName || 'N/A'}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <AsyncSearchSelect
                                                fetchItems={(term) =>
                                                    api.get('/users/search', { params: { search: term } })
                                                        .then(res => res.data)
                                                }
                                                selectedValue={editingGuest.assignedTo}
                                                onSelect={(user) => setEditingGuest({ ...editingGuest, assignedToId: user?.id, assignedTo: user })}
                                                placeholder="Asignar a..."
                                                labelKey="fullName"
                                            />
                                        ) : (
                                            <p className="text-[#1d1d1f] dark:text-white text-sm">{guest.assignedTo?.fullName || 'Pendiente'}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {guest.cell ? (
                                            <div>
                                                <p className="text-[#1d1d1f] dark:text-white text-sm font-medium">{guest.cell.name}</p>
                                                <p className="text-[#86868b] dark:text-gray-400 text-xs">
                                                    Líder: {guest.cell.leader?.fullName || 'N/A'}
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-500 text-sm">No asignado</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {guest.encuentroRegistrations && guest.encuentroRegistrations.length > 0 ? (
                                            <div>
                                                {guest.encuentroRegistrations.map((reg) => (
                                                    <div key={reg.id} className="text-sm">
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                            {reg.encuentro?.type || 'Encuentro'}
                                                        </span>
                                                        <p className="text-[#86868b] dark:text-gray-400 text-xs mt-1">
                                                            {reg.encuentro?.name || 'Sin nombre'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-500 text-sm">No registrado</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => handleOpenEditModal(guest)}
                                                className="p-1 text-blue-400 hover:text-blue-300"
                                                title="Editar"
                                            >
                                                <PencilIcon size={18} />
                                            </button>
                                                    {canDelete(guest) && (
                                                        <button
                                                            onClick={() => handleOpenDeleteModal(guest)}
                                                            className="p-1 text-red-400 hover:text-red-300"
                                                            title="Eliminar"
                                                        >
                                                            <Trash size={18} />
                                                        </button>
                                                    )}
                                                    {!currentUser?.roles?.includes('PASTOR') && (
                                                        <button
                                                            onClick={() => setConvertingGuest(guest)}
                                                            className="p-1 text-green-400 hover:text-green-300"
                                                            title="Convertir a Discípulo"
                                                        >
                                                            <UserCheckIcon size={18} />
                                                        </button>
                                                    )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación numérica */}
            {pagination.pages > 1 && (
                <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                        Mostrando {(pagination.page - 1) * guestsPerPage + 1} - {Math.min(pagination.page * guestsPerPage, pagination.total)} de {pagination.total} invitados
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={pagination.onPrev}
                            disabled={!pagination.hasPrev || loading}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Anterior
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                let pageNum;
                                if (pagination.pages <= 5) {
                                    pageNum = i + 1;
                                } else if (pagination.page <= 3) {
                                    pageNum = i + 1;
                                } else if (pagination.page >= pagination.pages - 2) {
                                    pageNum = pagination.pages - 4 + i;
                                } else {
                                    pageNum = pagination.page - 2 + i;
                                }

                                const isActive = pagination.page === pageNum;

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
                            onClick={pagination.onNext}
                            disabled={!pagination.hasNext || loading}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}

            {/* Información de paginación */}
            {pagination.total > 0 && (
                <div className="mt-4 text-center text-sm text-[#86868b] dark:text-gray-400">
                    Página {pagination.page} de {pagination.pages} - {pagination.total} invitados en total
                </div>
            )}

            {/* Modal para convertir a Discípulo */}
            {
                convertingGuest && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-xl">
                            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white mb-4">
                                Convertir a Discípulo: {convertingGuest.name}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={conversionEmail}
                                        onChange={(e) => setConversionEmail(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#272729] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                        placeholder="correo@ejemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-1">
                                        Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        value={conversionPassword}
                                        onChange={(e) => setConversionPassword(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#272729] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                        placeholder="Contraseña"
                                    />
                                </div>

                                {/* Data Authorization Checks */}
                                <div className="bg-[#f5f5f7] dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                                    <label className="flex items-start gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            required
                                            className="mt-1 w-3.5 h-3.5 rounded border-[#d1d1d6] dark:border-[#3a3a3c] text-blue-600 focus:ring-blue-500"
                                            checked={conversionConsent.dataPolicyAccepted}
                                            onChange={e => setConversionConsent({ ...conversionConsent, dataPolicyAccepted: e.target.checked })}
                                        />
                                        <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-[#1d1d1f] dark:group-hover:text-white transition-colors">
                                            Acepto la <a href={DATA_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-semibold">Política de Tratamiento de Datos</a>.
                                        </span>
                                    </label>
                                    <label className="flex items-start gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            required
                                            className="mt-1 w-3.5 h-3.5 rounded border-[#d1d1d6] dark:border-[#3a3a3c] text-blue-600 focus:ring-blue-500"
                                            checked={conversionConsent.dataTreatmentAuthorized}
                                            onChange={e => setConversionConsent({ ...conversionConsent, dataTreatmentAuthorized: e.target.checked })}
                                        />
                                        <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-[#1d1d1f] dark:group-hover:text-white transition-colors">
                                            Autorizo el tratamiento de mis datos personales.
                                        </span>
                                    </label>
                                </div>
                                <div className="flex justify-end space-x-2 mt-6">
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            setConvertingGuest(null);
                                            setConversionEmail('');
                                            setConversionPassword('');
                                            setConversionConsent({
                                                dataPolicyAccepted: false,
                                                dataTreatmentAuthorized: false,
                                                minorConsentAuthorized: false
                                            });
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        variant="success"
                                        onClick={handleConvertToMember}
                                    >
                                        Convertir
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Edición */}
            <GuestEditModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                guest={selectedGuestForEdit}
                onGuestUpdated={handleGuestUpdated}
            />

            {/* Modal de Confirmación para Eliminar */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
                title="Eliminar Invitado"
                message={`¿Estás seguro de que deseas eliminar a "${guestToDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
            />
        </div >
    );
};

export default GuestList;

GuestList.propTypes = {
    refreshTrigger: PropTypes.any,
};
