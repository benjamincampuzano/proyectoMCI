import { useState } from 'react';
import { SpinnerIcon, MagnifyingGlass, Funnel, PencilIcon, Trash, UserPlus, X, FloppyDiskIcon, UserCheckIcon, Users, CheckCircle, Crown, CaretCircleDownIcon, SlidersHorizontal, FileXls } from '@phosphor-icons/react';
import * as XLSX from 'xlsx';
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

// Configuración de colores para filtros (misma estética que UserFilters)
const FILTER_COLORS = {
    search: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200', ring: 'focus:ring-blue-500/20', focusBorder: 'focus:border-blue-500', icon: 'text-blue-500', label: 'Nombre' },
    status: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-200', ring: 'focus:ring-purple-500/20', focusBorder: 'focus:border-purple-500', icon: 'text-purple-500', label: 'Estado' },
    invitedBy: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'focus:ring-emerald-500/20', focusBorder: 'focus:border-emerald-500', icon: 'text-emerald-500', label: 'Invitado por' },
    liderDoce: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200', ring: 'focus:ring-amber-500/20', focusBorder: 'focus:border-amber-500', icon: 'text-amber-500', label: 'Ministerio' },
};

const GuestList = ({ refreshTrigger }) => {
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

    // Funciones auxiliares para clases de filtros
    const getInputClass = (colorKey) => {
        const colors = FILTER_COLORS[colorKey];
        return `w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border-2 ${colors.border} ${colors.focusBorder} ${colors.ring} text-[14px] font-semibold text-gray-900 dark:text-white rounded-xl outline-none transition-all placeholder:text-gray-400 hover:shadow-lg hover:shadow-${colorKey === 'search' ? 'blue' : colorKey === 'status' ? 'purple' : colorKey === 'invitedBy' ? 'emerald' : 'amber'}-500/10`;
    };

    const getLabelClass = (colorKey) => {
        const colors = FILTER_COLORS[colorKey];
        return `block text-[11px] font-extrabold ${colors.text} uppercase tracking-widest mb-2 pl-1 flex items-center gap-1.5`;
    };

    const getIconClass = (colorKey) => {
        const colors = FILTER_COLORS[colorKey];
        return `absolute left-4 top-1/2 -translate-y-1/2 ${colors.icon} transition-all duration-300 group-focus-within:scale-110`;
    };

    const FilterBadge = ({ color, children }) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white ${color} shadow-lg`}>
            {children}
        </span>
    );

    const hasAdvancedFilters = searchTerm || statusFilter || invitedByFilter || liderDoceFilter;
    const activeAdvancedCount = [searchTerm, statusFilter, invitedByFilter, liderDoceFilter].filter(Boolean).length;

    const clearAdvancedFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setInvitedByFilter(null);
        setLiderDoceFilter(null);
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

            // Preparar datos para Excel
            const data = allGuests.map(guest => ({
            'Fecha Creación': guest.createdAt ? new Date(guest.createdAt).toLocaleDateString('es-ES') : 'N/A',
            'Registrado Por': guest.registeredBy?.fullName || 'N/A',
            'Nombre': guest.name || 'N/A',
            'Edad': calculateAge(guest.birthDate) || 'N/A',
            'Teléfono': guest.phone || 'N/A',
            'Dirección': guest.address || 'N/A',
            'Petición de Oración': guest.prayerRequest || 'N/A',
            'Estado': getStatusLabel(guest.status) || 'N/A',
            'Invitado Por': guest.invitedBy?.fullName || 'N/A',
            'Asignado a': guest.assignedTo?.fullName || 'Pendiente',
            'Célula': guest.cell?.name || 'No asignado',
            'Líder de Célula': guest.cell?.leader?.fullName || 'N/A',
            'Encuentro': guest.encuentroRegistrations?.map(r => r.encuentro?.name || r.encuentro?.type).join(', ') || 'No registrado'
        }));

        // Crear hoja de trabajo
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Ajustar anchos de columna
        const colWidths = [
            { wch: 15 }, // Fecha Creación
            { wch: 20 }, // Registrado Por
            { wch: 25 }, // Nombre
            { wch: 8 },  // Edad
            { wch: 15 }, // Teléfono
            { wch: 30 }, // Dirección
            { wch: 40 }, // Petición de Oración
            { wch: 12 }, // Estado
            { wch: 20 }, // Invitado Por
            { wch: 20 }, // Asignado a
            { wch: 20 }, // Célula
            { wch: 20 }, // Líder de Célula
            { wch: 30 }, // Encuentro
        ];
        worksheet['!cols'] = colWidths;

        // Crear libro de trabajo
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Invitados');

        // Generar archivo Excel
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

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

            {/* Sección de Filtros con estética unificada */}
            <div className="bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800/80 backdrop-blur-xl rounded-[24px] border-2 border-gray-200 dark:border-gray-700 shadow-xl shadow-black/5 dark:shadow-none overflow-hidden mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                {/* Header con toggle en móvil */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50/80 to-white dark:from-gray-800 dark:to-gray-800/80">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                            <SlidersHorizontal size={20} weight="bold" className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">Filtros Avanzados</h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">Filtra invitados por múltiples criterios</p>
                        </div>
                        {activeAdvancedCount > 0 && (
                            <span className="ml-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-[11px] font-bold shadow-lg shadow-red-500/30">
                                {activeAdvancedCount} activo{activeAdvancedCount > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {hasAdvancedFilters && (
                            <button
                                onClick={clearAdvancedFilters}
                                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95"
                            >
                                <X size={14} weight="bold" /> Limpiar
                            </button>
                        )}
                        {/* Botón toggle solo en móvil */}
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className="sm:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-[13px] font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                        >
                            {showAdvancedFilters ? 'Ocultar' : 'Mostrar'}
                            <CaretCircleDownIcon size={16} weight="bold" className={`transition-transform duration-300 ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filtros avanzados - visible en PC siempre, en móvil según estado */}
                <div className={`transition-all duration-500 ease-out overflow-hidden ${showAdvancedFilters ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 md:max-h-[2000px] md:opacity-100'}`}>
                    <div className="p-4 sm:p-5 space-y-6">
                        {/* Filtros avanzados con colores llamativos */}
                        <div className="flex flex-wrap gap-3 items-start">
                            {/* Filtro de Nombre - Azul */}
                            <div className="relative group flex-1 min-w-[200px]">
                                <label className={getLabelClass('search')}>
                                    <div className="w-4 h-4 rounded-full bg-blue-500 shadow-md shadow-blue-500/30" />
                                    Nombre
                                </label>
                                <div className="relative">
                                    <MagnifyingGlass className={getIconClass('search')} size={18} weight="bold" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Buscar por nombre..."
                                        className={getInputClass('search')}
                                    />
                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            <X size={14} weight="bold" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Filtro de Estado - Púrpura */}
                            <div className="relative flex-1 min-w-[160px] group">
                                <label className={getLabelClass('status')}>
                                    <div className="w-4 h-4 rounded-full bg-purple-500 shadow-md shadow-purple-500/30" />
                                    Estado
                                </label>
                                <div className="relative">
                                    <CheckCircle className={getIconClass('status')} size={18} weight="bold" />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className={`${getInputClass('status')} appearance-none cursor-pointer`}
                                    >
                                        <option value="">Todos los estados</option>
                                        <option value="NUEVO">Nuevo</option>
                                        <option value="CONTACTADO">Llamado</option>
                                        <option value="CONSOLIDADO">Visitado</option>
                                        <option value="GANADO">Consolidado</option>
                                    </select>
                                    <CaretCircleDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" size={16} weight="bold" />
                                </div>
                            </div>

                            {/* Filtro de Invitado por - Esmeralda */}
                            <div className="relative flex-[1.5] min-w-[240px] group">
                                <label className={getLabelClass('invitedBy')}>
                                    <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/30" />
                                    Invitado por
                                </label>
                                <div className="relative">
                                    <UserPlus className={getIconClass('invitedBy')} size={18} weight="bold" />
                                    <AsyncSearchSelect
                                        fetchItems={(term) =>
                                            api.get('/users/search', { params: { search: term } })
                                                .then(res => res.data)
                                        }
                                        selectedValue={invitedByFilter}
                                        onSelect={(user) => setInvitedByFilter(user || null)}
                                        placeholder="Buscar invitador..."
                                        labelKey="fullName"
                                        className="bg-white dark:bg-gray-800 border-2 border-emerald-200 focus:border-emerald-500 rounded-xl"
                                    />
                                </div>
                                {invitedByFilter && (
                                    <FilterBadge color="bg-emerald-500">Invitador seleccionado</FilterBadge>
                                )}
                            </div>

                            {/* Filtro de Ministerio/Líder Doce - Ámbar */}
                            <div className="relative flex-[1.5] min-w-[240px] group">
                                <label className={getLabelClass('liderDoce')}>
                                    <div className="w-4 h-4 rounded-full bg-amber-500 shadow-md shadow-amber-500/30" />
                                    {currentUser?.roles?.includes('PASTOR') ? 'Líder de Célula' : 'Ministerio'}
                                </label>
                                <div className="relative">
                                    <Crown className={getIconClass('liderDoce')} size={18} weight="bold" />
                                    <AsyncSearchSelect
                                        fetchItems={(term) => {
                                            const roleFilter = currentUser?.roles?.includes('PASTOR') ? "LIDER_DOCE,PASTOR" : "LIDER_DOCE";
                                            return api.get('/users/search', {
                                                params: { search: term, role: roleFilter }
                                            }).then(res => res.data);
                                        }}
                                        selectedValue={liderDoceFilter}
                                        onSelect={(user) => setLiderDoceFilter(user || null)}
                                        placeholder={currentUser?.roles?.includes('PASTOR') ? "Buscar líder..." : "Buscar ministerio..."}
                                        labelKey="fullName"
                                        className="bg-white dark:bg-gray-800 border-2 border-amber-200 focus:border-amber-500 rounded-xl"
                                    />
                                </div>
                                {liderDoceFilter && (
                                    <FilterBadge color="bg-amber-500">{currentUser?.roles?.includes('PASTOR') ? 'Líder seleccionado' : 'Ministerio seleccionado'}</FilterBadge>
                                )}
                            </div>
                        </div>

                        {/* Botón Aplicar Filtros */}
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleSearch}
                                icon={Funnel}
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                            >
                                Aplicar Filtros
                            </Button>
                            
                            {hasAdvancedFilters && (
                                <button
                                    onClick={clearAdvancedFilters}
                                    className="md:hidden flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 transition-all active:scale-95"
                                >
                                    <X size={16} weight="bold" /> Limpiar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Barra de estado y estadísticas */}
                    <div className="px-4 sm:px-5 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2.5 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                                    <Users size={16} className="text-blue-500" />
                                    <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                                        {guests.length} invitados
                                    </span>
                                </div>
                                {canExport() && (
                                    <button
                                        onClick={exportToExcel}
                                        disabled={loading || exporting || guests.length === 0}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-[12px] font-semibold shadow-lg shadow-green-500/30 transition-all active:scale-95"
                                        title="Exportar a Excel"
                                    >
                                        {exporting ? (
                                            <SpinnerIcon size={16} className="animate-spin" />
                                        ) : (
                                            <FileXls size={18} weight="bold" />
                                        )}
                                        {exporting ? 'Exportando...' : 'Exportar Excel'}
                                    </button>
                                )}
                                
                                {hasAdvancedFilters && (
                                    <div className="flex flex-wrap gap-2">
                                        {searchTerm && <FilterBadge color="bg-blue-500">Nombre</FilterBadge>}
                                        {statusFilter && <FilterBadge color="bg-purple-500">Estado</FilterBadge>}
                                        {invitedByFilter && <FilterBadge color="bg-emerald-500">Invitado por</FilterBadge>}
                                        {liderDoceFilter && <FilterBadge color="bg-amber-500">{currentUser?.roles?.includes('PASTOR') ? 'Líder' : 'Ministerio'}</FilterBadge>}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Listo</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla de Invitados */}
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
