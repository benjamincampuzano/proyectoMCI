import { useState, useEffect, useCallback } from 'react';
import { SpinnerIcon, Funnel, Trash, X, UserCheckIcon, Users, CheckCircle, FileXls } from '@phosphor-icons/react';
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
    const { isCoordinator, isSubCoordinator, isTreasurer, isDoceLeader, user } = useAuth();
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
        alreadyCalled,
        setAlreadyCalled,
        alreadyVisited,
        setAlreadyVisited,
        currentUser,
        fetchGuests,
        fetchAllGuests,
        updateGuest,
        deleteGuest,
        convertGuestToMember,
        // Paginación
        setCurrentPage,
        guestsPerPage,
        pagination,
    } = useGuestManagement({ refreshTrigger });

    // Modal unificado: { type, guest, data }
    // type: 'edit' | 'delete' | 'convert'
    // data: { email, password, ...} para 'convert'
    const [activeModal, setActiveModal] = useState(null);

    // Estado para exportación
    const [isExporting, setIsExporting] = useState(false);

    // Estado para filtros avanzados
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Auto-apply filter for LIDER_DOCE who are not coordinators
    // Extraemos propiedades primitivas de user para evitar re-renders innecesarios
    const userId = user?.id;
    const userRoles = user?.roles || [];
    const userFullName = user?.profile?.fullName;
    const userEmail = user?.email;

    useEffect(() => {
        const isDoceLeaderRole = userRoles.includes('LIDER_DOCE');
        const isSubCoordGanar = isSubCoordinator('ganar');
        const isTreasurerGanar = isTreasurer('ganar');
        const isModuleRole = isModuleCoordinator || isSubCoordGanar || isTreasurerGanar;

        if (isDoceLeaderRole && !isModuleRole && userId) {
            setLiderDoceFilter({
                id: userId,
                fullName: userFullName || userEmail
            });
        }
    }, [userId, userRoles, isModuleCoordinator, isSubCoordinator, isTreasurer, userFullName, userEmail]);

    const handleSearch = useCallback(() => {
        fetchGuests(1);
    }, [fetchGuests]);

    const canModify = useCallback(() => {
        const roles = currentUser?.roles || [];
        return roles.includes('ADMIN') || roles.includes('LIDER_DOCE');
    }, [currentUser]);

    const openModal = useCallback((type, guest) => {
        const data = {};
        if (type === 'convert') {
            data.email = '';
            data.password = '';
            data.dataPolicyAccepted = false;
            data.dataTreatmentAuthorized = false;
        }
        setActiveModal({ type, guest, data });
    }, []);

    const handleGuestUpdated = useCallback(() => {
        fetchGuests(1);
        setActiveModal(null);
    }, [fetchGuests]);

    const handleConfirmDelete = useCallback(async () => {
        if (!activeModal?.guest) return;
        await deleteGuest(activeModal.guest.id);
        setActiveModal(null);
    }, [activeModal, deleteGuest]);

    const handleConvertToMember = useCallback(async () => {
        if (!activeModal?.data?.email || !activeModal?.data?.password) {
            setError('Email y contraseña son requeridos');
            return;
        }
        if (!activeModal?.guest) return;

        try {
            const res = await convertGuestToMember(activeModal.guest.id, {
                email: activeModal.data.email,
                password: activeModal.data.password,
                dataPolicyAccepted: activeModal.data.dataPolicyAccepted,
                dataTreatmentAuthorized: activeModal.data.dataTreatmentAuthorized,
            });

            if (!res.success) return;
            toast.success('Invitado consolidado a Discípulo exitosamente');
            setActiveModal(null);
        } catch (err) {
            setError(err.message || 'Error al convertir invitado');
        }
    }, [activeModal, convertGuestToMember, setError]);

    const getStatusBadgeColor = (status) => {
        // Token-based status pills: neutral translúcido, salvo GANADO (success Linear)
        const colors = {
            NUEVO: 'bg-[var(--ln-bg-secondary)] text-[var(--ln-text-secondary)] border border-[var(--ln-border-subtle)]',
            CONTACTADO: 'bg-[var(--ln-bg-secondary)] text-[var(--ln-text-secondary)] border border-[var(--ln-border-subtle)]',
            CONSOLIDADO: 'bg-[var(--ln-bg-secondary)] text-[var(--ln-text-secondary)] border border-[var(--ln-border-subtle)]',
            GANADO: 'bg-[var(--ln-emerald)]/15 text-[var(--ln-success)] border border-[var(--ln-emerald)]/30',
        };
        return colors[status] || 'bg-[var(--ln-bg-secondary)] text-[var(--ln-text-tertiary)] border border-[var(--ln-border-subtle)]';
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

    const calculateAge = useCallback((birthDate) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }, []);

    const canExport = useCallback(() => {
        const roles = currentUser?.roles || [];
        const hasRoleAccess = roles.includes('ADMIN') || roles.includes('PASTOR') || roles.includes('LIDER_DOCE');
        return hasRoleAccess || isModuleCoordinator || isSubCoordinator('ganar') || isTreasurer('ganar');
    }, [currentUser, isModuleCoordinator, isSubCoordinator, isTreasurer]);

    // Check if liderDoceFilter is auto-applied (for non-coordinator LIDER_DOCE)
    const isModuleRoleForGanar = isModuleCoordinator || isSubCoordinator('ganar') || isTreasurer('ganar');
    const isLiderDoceFilterAutoApplied = isDoceLeader() && !isModuleRoleForGanar && liderDoceFilter?.id === user?.id;

    const hasAdvancedFilters = searchTerm || statusFilter || invitedByFilter || (liderDoceFilter && !isLiderDoceFilterAutoApplied) || startDate || endDate || pendingCalls || pendingVisits;
    const activeAdvancedCount = [searchTerm, statusFilter, invitedByFilter, (liderDoceFilter && !isLiderDoceFilterAutoApplied), startDate, endDate, pendingCalls, pendingVisits, alreadyCalled, alreadyVisited].filter(Boolean).length;

    const clearAdvancedFilters = useCallback(() => {
        setSearchTerm('');
        setStatusFilter('');
        setInvitedByFilter(null);
        setLiderDoceFilter(null);
        setStartDate('');
        setEndDate('');
        setPendingCalls(false);
        setPendingVisits(false);
        setAlreadyCalled(false);
        setAlreadyVisited(false);
    }, [setSearchTerm, setStatusFilter, setInvitedByFilter, setLiderDoceFilter, setStartDate, setEndDate, setPendingCalls, setPendingVisits, setAlreadyCalled, setAlreadyVisited]);

    const exportToExcel = useCallback(async () => {
        setIsExporting(true);
        try {
            const allGuests = await fetchAllGuests();

            if (allGuests.length === 0) {
                toast.error('No hay datos para exportar');
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Invitados');

            worksheet.columns = [
                { header: 'Fecha Creación', key: 'createdAt', width: 15 },
                { header: 'Registrado Por', key: 'registeredBy', width: 20 },
                { header: 'Nombre', key: 'name', width: 25 },
                { header: 'Edad', key: 'age', width: 8 },
                { header: 'Teléfono', key: 'phone', width: 15 },
                { header: 'Dirección', key: 'address', width: 30 },
                { header: 'Petición de Oración', key: 'prayerRequest', width: 40 },
                { header: 'Estado', key: 'status', width: 12 },
                { header: 'Líder Doce', key: 'liderDoce', width: 20 },
                { header: 'Invitado Por', key: 'invitedBy', width: 20 },
                { header: 'Asignado a', key: 'assignedTo', width: 20 },
                { header: 'Célula', key: 'cell', width: 20 },
                { header: 'Líder de Célula', key: 'cellLeader', width: 20 },
                { header: 'Encuentro', key: 'encuentro', width: 30 }
            ];

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
                    liderDoce: guest.assignedTo?.liderDoce?.fullName || guest.invitedBy?.liderDoce?.fullName || 'N/A',
                    invitedBy: guest.invitedBy?.fullName || 'N/A',
                    assignedTo: guest.assignedTo?.fullName || 'Pendiente',
                    cell: guest.cell?.name || 'No asignado',
                    cellLeader: guest.cell?.leader?.fullName || 'N/A',
                    encuentro: guest.encuentroRegistrations?.map(r => r.encuentro?.name || r.encuentro?.type).join(', ') || 'No registrado'
                });
            });

            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF10B981' }
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `invitados_${new Date().toISOString().split('T')[0]}.xlsx`);

            toast.success(`Exportados ${allGuests.length} invitados a Excel`);
        } catch (err) {
            toast.error(err.message || 'Error al exportar invitados');
        } finally {
            setIsExporting(false);
        }
    }, [fetchAllGuests, calculateAge, getStatusLabel]);

    return (
        <div className="bg-[var(--ln-bg-panel)] border border-[var(--ln-border-subtle)] rounded-xl p-6 transition-colors">
            <h2 className="text-2xl font-[590] text-[var(--ln-text-primary)] tracking-[-0.288px] mb-6">Lista de Invitados</h2>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-[var(--ln-text-primary)] px-4 py-3 rounded-lg mb-4 text-sm">
                    {error}
                </div>
            )}

            {/* Sección de Filtros */}
            <div className="bg-[var(--ln-bg-panel)] border border-[var(--ln-border-subtle)] rounded-xl overflow-hidden mb-6 transition-colors">
                <div className="flex items-center justify-between p-4 border-b border-[var(--ln-border-subtle)]">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-[510] text-[var(--ln-text-primary)] tracking-tight">Filtros</h3>
                        {activeAdvancedCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--ln-brand-indigo)]/15 text-[var(--ln-accent-violet)] text-xs font-[510]">
                                {activeAdvancedCount}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {hasAdvancedFilters && (
                            <button
                                onClick={clearAdvancedFilters}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-[510] text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] transition-colors"
                            >
                                <X size={14} /> Limpiar
                            </button>
                        )}
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-[510] transition-all ${
                                hasAdvancedFilters
                                    ? 'bg-[var(--ln-brand-indigo)] text-white shadow-[rgba(94,106,210,0.3)_0px_4px_12px]'
                                    : 'bg-[var(--ln-btn-ghost)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] border border-[var(--ln-border-subtle)]'
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
                            <div className="flex-[2] min-w-[200px]">
                                <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">
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
                                        className="w-full px-3.5 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-sm text-[var(--ln-text-primary)] placeholder:text-[var(--ln-text-tertiary)] focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setCurrentPage(1);
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">
                                    Estado
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3.5 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-sm text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] cursor-pointer transition-all"
                                >
                                    <option value="">Todos los estados</option>
                                    <option value="NUEVO">Nuevo</option>
                                    <option value="CONTACTADO">Llamado</option>
                                    <option value="CONSOLIDADO">Visitado</option>
                                    <option value="GANADO">Consolidado</option>
                                </select>
                            </div>

                            <div className="flex-[2] min-w-[200px]">
                                <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">
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
                                />
                            </div>
                        </div>

                        {/* Fila 2: Fechas y Líder */}
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">
                                    Fecha desde
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3.5 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-sm text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all"
                                />
                            </div>

                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">
                                    Fecha hasta
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3.5 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-sm text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all"
                                />
                            </div>

                            {(!isDoceLeader() || isModuleCoordinator) && (
                                <div className="flex-[2] min-w-[250px]">
                                    <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">
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
                                    />
                                </div>
                            )}
                        </div>

                        {/* Fila 3: Checkboxes de pendientes */}
                        <div className="flex flex-wrap gap-6 pt-2">
                            <FilterCheckbox
                                checked={pendingCalls}
                                onChange={(val) => { setPendingCalls(val); setCurrentPage(1); }}
                                activeColor="neutral"
                                label="Pendientes por llamar"
                            />
                            <FilterCheckbox
                                checked={pendingVisits}
                                onChange={(val) => { setPendingVisits(val); setCurrentPage(1); }}
                                activeColor="neutral"
                                label="Pendientes por visitar"
                            />
                            <FilterCheckbox
                                checked={alreadyCalled}
                                onChange={(val) => { setAlreadyCalled(val); setCurrentPage(1); }}
                                activeColor="violet"
                                label="Ya fueron llamados"
                            />
                            <FilterCheckbox
                                checked={alreadyVisited}
                                onChange={(val) => { setAlreadyVisited(val); setCurrentPage(1); }}
                                activeColor="violet"
                                label="Ya fueron visitados"
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                onClick={handleSearch}
                                icon={Funnel}
                            >
                                Aplicar Filtros
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Barra de estado */}
                <div className="px-4 py-3 bg-[var(--ln-btn-ghost)] border-t border-[var(--ln-border-subtle)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-[var(--ln-text-tertiary)]" />
                                <span className="text-sm font-[510] text-[var(--ln-text-secondary)]">
                                    {pagination?.total || guests.length} invitados
                                </span>
                            </div>

                            {hasAdvancedFilters && (
                                <div className="flex flex-wrap gap-1.5">
                                    {startDate && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--ln-bg-secondary)] border border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] text-xs font-[510]">
                                            Desde: {new Date(startDate).toLocaleDateString('es-ES')}
                                        </span>
                                    )}
                                    {endDate && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--ln-bg-secondary)] border border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] text-xs font-[510]">
                                            Hasta: {new Date(endDate).toLocaleDateString('es-ES')}
                                        </span>
                                    )}
                                    {liderDoceFilter && (!isDoceLeader() || isModuleCoordinator) && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--ln-bg-secondary)] border border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] text-xs font-[510]">
                                            Líder: {liderDoceFilter.fullName}
                                        </span>
                                    )}
                                    {pendingCalls && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--ln-bg-secondary)] border border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] text-xs font-[510]">
                                            Por llamar
                                        </span>
                                    )}
                                    {pendingVisits && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--ln-bg-secondary)] border border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] text-xs font-[510]">
                                            Por visitar
                                        </span>
                                    )}
                                    {searchTerm && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--ln-bg-secondary)] border border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] text-xs font-[510]">
                                            Búsqueda: {searchTerm}
                                        </span>
                                    )}
                                    {statusFilter && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--ln-bg-secondary)] border border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] text-xs font-[510]">
                                            Estado: {getStatusLabel(statusFilter)}
                                        </span>
                                    )}
                                    {invitedByFilter && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--ln-bg-secondary)] border border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] text-xs font-[510]">
                                            Invitado por: {invitedByFilter.fullName}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {canExport() && (
                            <button
                                onClick={exportToExcel}
                                disabled={loading || isExporting || guests.length === 0}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--ln-emerald)]/15 hover:bg-[var(--ln-emerald)]/25 border border-[var(--ln-emerald)]/30 text-[var(--ln-success)] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-[510] transition-colors"
                                title="Exportar a Excel"
                            >
                                {isExporting ? (
                                    <SpinnerIcon size={14} className="animate-spin" />
                                ) : (
                                    <FileXls size={16} />
                                )}
                                {isExporting ? 'Exportando...' : 'Exportar Excel'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabla de Invitados */}
            <PaginationBar
                pagination={pagination}
                guestsPerPage={guestsPerPage}
                loading={loading}
                onPageChange={setCurrentPage}
            />

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[var(--ln-btn-ghost)] border-b border-[var(--ln-border-subtle)]">
                        <tr>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Fecha Creación</th>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Registrado Por</th>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Nombre</th>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Edad</th>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Teléfono</th>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Dirección</th>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Petición de Oración</th>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Estado</th>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Líder Doce</th>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Invitado Por</th>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Asignado a</th>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Célula</th>
                            <th className="px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Encuentro</th>
                            <th className="px-4 py-3 text-right text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ln-border-subtle)]">
                        {loading ? (
                            <tr>
                                <td colSpan="14" className="px-4 py-8 text-center text-[var(--ln-text-quaternary)]">
                                    <SpinnerIcon size={24} className="animate-spin mx-auto text-[var(--ln-brand-indigo)]" />
                                </td>
                            </tr>
                        ) : guests.length === 0 ? (
                            <tr>
                                <td colSpan="14" className="px-4 py-8 text-center text-[var(--ln-text-quaternary)]">
                                    No se encontraron invitados
                                </td>
                            </tr>
                        ) : (
                            guests.map((guest) => (
                                <tr key={guest.id} className="hover:bg-[var(--ln-btn-ghost)] transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="text-[var(--ln-text-secondary)] text-sm">
                                            {guest.createdAt ? new Date(guest.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-[var(--ln-text-primary)] text-sm font-[510]">{guest.registeredBy?.fullName || 'N/A'}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => openModal('edit', guest)}
                                            className="text-[var(--ln-text-primary)] text-sm font-[510] hover:text-[var(--ln-accent-violet)] transition-colors text-left cursor-pointer underline decoration-dotted underline-offset-2 decoration-[var(--ln-border-subtle)] hover:decoration-[var(--ln-accent-violet)]"
                                            title="Editar invitado"
                                        >
                                            {guest.name}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-[var(--ln-text-secondary)] text-sm">
                                            {calculateAge(guest.birthDate) || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-[var(--ln-text-secondary)] text-sm">{guest.phone}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-[var(--ln-text-secondary)] text-sm">{guest.address || 'N/A'}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-[var(--ln-text-secondary)] text-sm max-w-[150px] block truncate" title={guest.prayerRequest || ''}>
                                            {guest.prayerRequest || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-[510] ${getStatusBadgeColor(guest.status)}`}>
                                            {getStatusLabel(guest.status)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {(guest.assignedTo?.liderDoce || guest.invitedBy?.liderDoce) ? (
                                            <p className="text-[var(--ln-text-primary)] text-sm">
                                                {guest.assignedTo?.liderDoce?.fullName || guest.invitedBy?.liderDoce?.fullName}
                                            </p>
                                        ) : (
                                            <span className="text-[var(--ln-text-quaternary)] text-sm">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-[var(--ln-text-primary)] text-sm">
                                            {guest.invitedBy?.fullName || (guest.invitedBy?.liderDoce ? `Invitado por: ${guest.invitedBy.liderDoce.fullName}` : 'N/A')}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-[var(--ln-text-primary)] text-sm">
                                            {guest.assignedTo?.fullName || (guest.assignedTo?.liderDoce ? `Asignado por: ${guest.assignedTo.liderDoce.fullName}` : 'Pendiente')}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        {guest.cell ? (
                                            <div>
                                                <p className="text-[var(--ln-text-primary)] text-sm font-[510]">{guest.cell.name}</p>
                                                <p className="text-[var(--ln-text-tertiary)] text-xs">
                                                    Líder: {guest.cell.leader?.fullName || 'N/A'}
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-[var(--ln-text-quaternary)] text-sm">No asignado</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {guest.encuentroRegistrations && guest.encuentroRegistrations.length > 0 ? (
                                            <div>
                                                {guest.encuentroRegistrations.map((reg) => (
                                                    <div key={reg.id} className="text-sm">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-[510] bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-accent-violet)] border border-[var(--ln-brand-indigo)]/20">
                                                            {reg.encuentro?.type || 'Encuentro'}
                                                        </span>
                                                        <p className="text-[var(--ln-text-tertiary)] text-xs mt-1">
                                                            {reg.encuentro?.name || 'Sin nombre'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-[var(--ln-text-quaternary)] text-sm">No registrado</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end space-x-1">
                                            {canModify() && (
                                                <button
                                                    onClick={() => openModal('delete', guest)}
                                                    className="p-1.5 text-[var(--ln-text-tertiary)] hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            )}
                                            {!currentUser?.roles?.includes('PASTOR') && (
                                                <button
                                                    onClick={() => openModal('convert', guest)}
                                                    className="p-1.5 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-success)] hover:bg-[var(--ln-emerald)]/10 rounded-md transition-colors"
                                                    title="Convertir a Discípulo"
                                                >
                                                    <UserCheckIcon size={16} />
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

            <PaginationBar
                pagination={pagination}
                guestsPerPage={guestsPerPage}
                loading={loading}
                onPageChange={setCurrentPage}
                className="mt-6"
            />

            {/* Modal para convertir a Discípulo */}
            {activeModal?.type === 'convert' && activeModal.guest && (
                <div className="fixed inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] rounded-xl p-6 max-w-md w-full shadow-[rgba(0,0,0,0)_0px_8px_2px,rgba(0,0,0,0.01)_0px_5px_2px,rgba(0,0,0,0.04)_0px_3px_2px,rgba(0,0,0,0.07)_0px_1px_1px,rgba(0,0,0,0.08)_0px_0px_1px]">
                        <h3 className="text-xl font-[590] text-[var(--ln-text-primary)] tracking-[-0.24px] mb-4">
                            Convertir a Discípulo: {activeModal.guest.name}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={activeModal?.data?.email}
                                    onChange={(e) => updateModalData({ email: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={activeModal?.data?.password}
                                    onChange={(e) => updateModalData({ password: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all"
                                    placeholder="Contraseña"
                                />
                            </div>

                            <div className="bg-[var(--ln-bg-panel)]/50 border border-[var(--ln-border-subtle)] p-4 rounded-xl space-y-3">
                                <label className="flex items-start gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        required
                                        className="mt-1 w-3.5 h-3.5 rounded border-[var(--ln-border-standard)] text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-accent-violet)] accent-[var(--ln-brand-indigo)]"
                                        checked={activeModal?.data?.dataPolicyAccepted}
                                        onChange={(e) => updateModalData({ dataPolicyAccepted: e.target.checked })}
                                    />
                                    <span className="text-xs text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)] transition-colors">
                                        Acepto la <a href={DATA_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--ln-accent-violet)] hover:text-[var(--ln-accent-hover)] underline font-[510]">Política de Tratamiento de Datos</a>.
                                    </span>
                                </label>
                                <label className="flex items-start gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        required
                                        className="mt-1 w-3.5 h-3.5 rounded border-[var(--ln-border-standard)] text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-accent-violet)] accent-[var(--ln-brand-indigo)]"
                                        checked={activeModal?.data?.dataTreatmentAuthorized}
                                        onChange={(e) => updateModalData({ dataTreatmentAuthorized: e.target.checked })}
                                    />
                                    <span className="text-xs text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)] transition-colors">
                                        Autorizo el tratamiento de mis datos personales.
                                    </span>
                                </label>
                            </div>

                            <div className="flex justify-end space-x-2 mt-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => setActiveModal(null)}
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
            )}

            {/* Modal de Edición */}
            <GuestEditModal
                isOpen={activeModal?.type === 'edit'}
                onClose={() => setActiveModal(null)}
                guest={activeModal?.guest}
                onGuestUpdated={handleGuestUpdated}
            />

            {/* Modal de Confirmación para Eliminar */}
            <ConfirmationModal
                isOpen={activeModal?.type === 'delete'}
                onClose={() => setActiveModal(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Invitado"
                message={`¿Estás seguro de que deseas eliminar a "${activeModal?.guest?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
            />
        </div>
    );
};

export default GuestList;

GuestList.propTypes = {
    refreshTrigger: PropTypes.any,
};

const COLOR_MAP = {
    neutral: {
        active: 'bg-[var(--ln-btn-subtle)] border-[var(--ln-border-primary)]',
        hover: 'group-hover:border-[var(--ln-text-quaternary)]',
        text: 'text-[var(--ln-text-primary)]',
    },
    violet: {
        active: 'bg-[var(--ln-brand-indigo)]/20 border-[var(--ln-brand-indigo)]/40',
        hover: 'group-hover:border-[var(--ln-accent-violet)]',
        text: 'text-[var(--ln-accent-violet)]',
    },
};

function FilterCheckbox({ checked, onChange, activeColor = 'neutral', label }) {
    const colors = COLOR_MAP[activeColor];
    return (
        <label className="flex items-center gap-2 cursor-pointer group">
            <div
                className={`relative flex items-center justify-center w-4 h-4 rounded border transition-all ${
                    checked ? colors.active : `bg-[var(--ln-input-bg)] border-[var(--ln-border-standard)] ${colors.hover}`
                }`}
            >
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="absolute opacity-0 w-full h-full cursor-pointer"
                />
                {checked && <CheckCircle size={12} className="text-[var(--ln-text-primary)]" weight="fill" />}
            </div>
            <span className={`text-sm font-[510] ${checked ? colors.text : 'text-[var(--ln-text-secondary)]'}`}>
                {label}
            </span>
        </label>
    );
}

function PaginationBar({ pagination, guestsPerPage, loading, onPageChange, className = '' }) {
    if (pagination.pages <= 1) return null;

    return (
        <div className={`flex items-center justify-between bg-[var(--ln-bg-panel)] px-4 py-3 border border-[var(--ln-border-subtle)] rounded-md ${className}`}>
            <div className="text-sm text-[var(--ln-text-secondary)]">
                Mostrando {(pagination.page - 1) * guestsPerPage + 1} - {Math.min(pagination.page * guestsPerPage, pagination.total)} de {pagination.total} invitados
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={pagination.onPrev}
                    disabled={!pagination.hasPrev || loading}
                    className="px-3 py-1.5 text-sm font-[510] text-[var(--ln-text-secondary)] bg-[var(--ln-btn-ghost)] border border-[var(--ln-border-subtle)] rounded-md hover:bg-[var(--ln-btn-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                                onClick={() => onPageChange(pageNum)}
                                disabled={loading}
                                className={`min-w-[32px] h-8 px-2 text-sm font-[510] rounded-md transition-colors ${
                                    isActive
                                        ? 'bg-[var(--ln-brand-indigo)] text-white shadow-[rgba(94,106,210,0.3)_0px_4px_12px]'
                                        : 'text-[var(--ln-text-secondary)] bg-[var(--ln-btn-ghost)] border border-[var(--ln-border-subtle)] hover:bg-[var(--ln-btn-subtle)]'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={pagination.onNext}
                    disabled={!pagination.hasNext || loading}
                    className="px-3 py-1.5 text-sm font-[510] text-[var(--ln-text-secondary)] bg-[var(--ln-btn-ghost)] border border-[var(--ln-border-subtle)] rounded-md hover:bg-[var(--ln-btn-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
}
