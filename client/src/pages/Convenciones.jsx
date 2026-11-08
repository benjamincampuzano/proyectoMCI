import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Plus, Calendar, Users, MoneyIcon, FileTextIcon, Clock } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ConventionDetails from '../components/ConventionDetails';
import ConvencionTable from '../components/ConvencionTable';
import ConvencionesReport from '../components/ConvencionesReport';
import { Button, Modal, PageHeader, AsyncSearchSelect, StatCard } from '../components/ui';
import ConfirmationModal from '../components/ConfirmationModal';
import CoordinatorDisplay from '../components/CoordinatorDisplay';
import FloatingRefreshButton from '../components/FloatingRefreshButton';
import { ROLES } from '../constants/roles';

const Convenciones = () => {
    const { hasAnyRole, isCoordinator, isSubCoordinator, isTreasurer } = useAuth();
    const [conventions, setConventions] = useState([]);
    const [, setLoading] = useState(true);
    const [selectedConvention, setSelectedConvention] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);
    const [moduleSubCoordinator, setModuleSubCoordinator] = useState(null);
    const [moduleTreasurer, setModuleTreasurer] = useState(null);

    // Delete Confirmation Modal State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [conventionToDelete, setConventionToDelete] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [showStatsMobile, setShowStatsMobile] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Edit State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingConvention, setEditingConvention] = useState(null);
    const [editFormData, setEditFormData] = useState({
        type: 'FAMILIAS',
        year: new Date().getFullYear(),
        theme: '',
        vipPlateaCost: '',
        generalCost: '',
        mezzanineCost: '',
        transportCost: '',
        accommodationCost: '',
        startDate: '',
        endDate: '',
        coordinatorId: null,
        coordinator: null
    });
    const [editSubmitting, setEditSubmitting] = useState(false);

    // Create Form State
    const [formData, setFormData] = useState({
        type: 'FAMILIAS',
        year: new Date().getFullYear(),
        theme: '',
        cost: '',
        vipPlateaCost: '',
        generalCost: '',
        mezzanineCost: '',
        transportCost: '',
        accommodationCost: '',
        startDate: '',
        endDate: '',
        coordinatorId: null,
        coordinator: null
    });

    const fetchModuleCoordinator = async () => {
        try {
            const res = await api.get('/coordinators/module/convenciones');
            setModuleCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching coordinator:', error);
            setModuleCoordinator(null);
        }
    };

    const fetchModuleSubCoordinator = async () => {
        try {
            const res = await api.get('/coordinators/module/convenciones/subcoordinator');
            setModuleSubCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching subcoordinator:', error);
            setModuleSubCoordinator(null);
        }
    };

    const fetchModuleTreasurer = async () => {
        try {
            const res = await api.get('/coordinators/module/convenciones/treasurer');
            setModuleTreasurer(res.data);
        } catch (error) {
            console.error('Error fetching treasurer:', error);
            setModuleTreasurer(null);
        }
    };

    const fetchConventions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/convenciones');
            setConventions(res.data);
            return true;
        } catch (error) {
            console.error('Error fetching conventions:', error);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            const [conventionsOk] = await Promise.all([
                fetchConventions(),
                fetchModuleCoordinator(),
                fetchModuleSubCoordinator(),
                fetchModuleTreasurer()
            ]);

            if (conventionsOk) {
                toast.success('Datos actualizados');
            } else {
                toast.error('No se pudieron actualizar las convenciones');
            }
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(fetchConventions);
        void Promise.resolve().then(fetchModuleCoordinator);
        void Promise.resolve().then(fetchModuleSubCoordinator);
        void Promise.resolve().then(fetchModuleTreasurer);
    }, []);

    const fetchConventionDetails = async (id) => {
        try {
            const res = await api.get(`/convenciones/${id}`);
            setSelectedConvention(res.data);
        } catch (error) {
            console.error('Error fetching convention details:', error);
            toast.error('Error loading details');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/convenciones', {
                ...formData,
                cost: parseFloat(formData.generalCost || 0),
                vipPlateaCost: parseFloat(formData.vipPlateaCost || 0),
                generalCost: parseFloat(formData.generalCost || 0),
                mezzanineCost: parseFloat(formData.mezzanineCost || 0),
                transportCost: parseFloat(formData.transportCost || 0),
                accommodationCost: parseFloat(formData.accommodationCost || 0)
            });
            setShowCreateModal(false);
            fetchConventions();
            setFormData({
                type: 'FAMILIAS',
                year: new Date().getFullYear(),
                theme: '',
                cost: '',
                vipPlateaCost: '',
                generalCost: '',
                mezzanineCost: '',
                transportCost: '',
                accommodationCost: '',
                startDate: '',
                endDate: '',
                coordinatorId: null,
                coordinator: null
            });
        } catch (error) {
            console.error('Error creating convention:', error);
            toast.error('Error creating convention: ' + (error.response?.data?.error || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        // Find the convention to show details in the confirmation modal
        const convention = conventions.find(c => c.id === id);
        setConventionToDelete(convention);
        setShowDeleteConfirm(true);
    };

    const performDelete = async () => {
        if (!conventionToDelete) return;

        try {
            await api.delete(`/convenciones/${conventionToDelete.id}`);
            fetchConventions();
        } catch (error) {
            console.error('Error deleting convention:', error);
            toast.error('Error deleting convention');
        }
    };

    const handleEdit = (e, convention) => {
        e.stopPropagation();
        setEditFormData({
            type: convention.type,
            year: convention.year,
            theme: convention.theme || '',
            vipPlateaCost: convention.vipPlateaCost || '',
            generalCost: convention.generalCost || '',
            mezzanineCost: convention.mezzanineCost || '',
            transportCost: convention.transportCost || '',
            accommodationCost: convention.accommodationCost || '',
            startDate: convention.startDate ? new Date(convention.startDate + 'T00:00:00').toISOString().split('T')[0] : '',
            endDate: convention.endDate ? new Date(convention.endDate + 'T00:00:00').toISOString().split('T')[0] : '',
            coordinatorId: convention.coordinatorId || null,
            coordinator: convention.coordinator || null
        });
        setEditingConvention(convention);
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setEditSubmitting(true);
        try {
            await api.put(`/convenciones/${editingConvention.id}`, {
                ...editFormData,
                vipPlateaCost: parseFloat(editFormData.vipPlateaCost || 0),
                generalCost: parseFloat(editFormData.generalCost || 0),
                mezzanineCost: parseFloat(editFormData.mezzanineCost || 0),
                transportCost: parseFloat(editFormData.transportCost || 0),
                accommodationCost: parseFloat(editFormData.accommodationCost || 0)
            });
            toast.success('Convención actualizada exitosamente!');
            setShowEditModal(false);
            setEditingConvention(null);
            fetchConventions();
        } catch (error) {
            console.error('Error updating convention:', error);
            toast.error('Error al actualizar: ' + (error.response?.data?.error || error.message));
        } finally {
            setEditSubmitting(false);
        }
    };

    const canModify = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR, ROLES.LIDER_DOCE]) 
        || isCoordinator('convencion') 
        || isSubCoordinator('convencion');

    const canViewReport = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR, ROLES.LIDER_DOCE]) 
        || isCoordinator('convencion') 
        || isSubCoordinator('convencion')
        || isTreasurer('convencion');

    // Calculo de estadísticas para reporte
    const stats = useMemo(() => {
        if (!conventions || conventions.length === 0) {
            return {
                total: 0,
                recaudado: 0,
                pendiente: 0,
                inscritos: 0,
                pendientes: 0
            };
        }

        let totalRecaudado = 0;
        let totalPendiente = 0;
        let totalInscritos = 0;
        let totalPendientes = 0;

        conventions.forEach(conv => {
            totalInscritos += Number(conv.stats?.registeredCount || 0);
            totalPendientes += Number(conv.stats?.pendingCount || 0);
            conv.registrations?.forEach(reg => {
                totalRecaudado += Number(reg.totalPaid) || 0;
                totalPendiente += Number(reg.balance) || 0;
            });
        });

        return {
            total: conventions.length,
            recaudado: totalRecaudado,
            pendiente: totalPendiente,
            inscritos: totalInscritos,
            pendientes: totalPendientes
        };
    }, [conventions]);

    // Renderizar contenido según vista
    const renderContent = () => {
        if (showReport) {
            return (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reporte de Convenciones</h2>
                        <Button variant="secondary" onClick={() => setShowReport(false)}>
                            Volver a Lista
                        </Button>
                    </div>
                    <ConvencionesReport conventions={conventions} />
                </div>
            );
        }

        // Vista de tabla
        return (
            <div className="animate-fade-in">
                <ConvencionTable
                    conventions={conventions}
                    onSelect={fetchConventionDetails}
                    canModify={canModify}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>
        );
    };

    // Early return if selectedConvention is set
    if (selectedConvention) {
        return (
            <ConventionDetails
                convention={selectedConvention}
                onBack={() => setSelectedConvention(null)}
                onRefresh={() => fetchConventionDetails(selectedConvention.id)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Convenciones"
                description="Seguimiento de Convenciones anuales"
                action={
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <CoordinatorDisplay
                            coordinator={moduleCoordinator}
                            subCoordinator={moduleSubCoordinator}
                            treasurer={moduleTreasurer}
                            moduleName="Convenciones"
                        />
                        {canModify && (
                            <Button
                                onClick={() => setShowCreateModal(true)}
                                icon={Plus}
                                className="shadow-lg shadow-blue-500/30 w-full sm:w-auto text-sm sm:text-base"
                                size="sm"
                            >
                                Nueva Convención
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Floating Refresh Button */}
            <FloatingRefreshButton onClick={handleRefresh} loading={refreshing} />

            {/* Estadísticas Resumidas */}
            {!showReport && (
                <>
                    {/* Botón toggle móvil para Estadísticas */}
                    <div className="md:hidden flex items-center justify-between mb-3 bg-[var(--ln-bg-panel)] p-2.5 rounded-xl border border-[var(--ln-border-standard)]">
                        <span className="text-[10px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-wider">Estadísticas generales</span>
                        <button
                            type="button"
                            onClick={() => setShowStatsMobile(!showStatsMobile)}
                            className="text-[11px] weight-590 text-[var(--ln-brand-indigo)] hover:underline focus:outline-none"
                        >
                            {showStatsMobile ? 'Ocultar' : 'Ver estadísticas'}
                        </button>
                    </div>

                    <div className={`${showStatsMobile ? 'grid' : 'hidden'} md:grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3 mb-6`}>
                        <StatCard
                            title="Total Convenciones"
                            value={stats.total}
                            icon={Calendar}
                            color="var(--ln-brand-indigo)"
                            subtitle="Cantidad de convenciones"
                        />
                        <StatCard
                            title="Total Inscritos"
                            value={stats.inscritos}
                            icon={Users}
                            color="#8b5cf6"
                            subtitle="Personas inscritas"
                        />
                        <StatCard
                            title="Recaudado"
                            value={`$${stats.recaudado.toLocaleString()}`}
                            icon={MoneyIcon}
                            color="#10b981"
                            subtitle="Dinero recaudado"
                        />
                        <StatCard
                            title="Pendiente"
                            value={`$${stats.pendiente.toLocaleString()}`}
                            icon={MoneyIcon}
                            color="#ef4444"
                            subtitle="Pendiente por recaudar"
                        />
                        <StatCard
                            title="Preinscritos"
                            value={stats.pendientes}
                            icon={Clock}
                            color="#f59e0b"
                            subtitle="Personas por aprobar"
                        />
                    </div>
                </>
            )}
            {/* Reporte */}
            {!showReport && canViewReport && (
                <div className="flex justify-end pb-4 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setShowReport(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                        <FileTextIcon size={16} />
                        Ver Reporte
                    </button>
                </div>
            )}

            {renderContent()}

            {/* Create Modal */}
            <Modal
                isOpen={showCreateModal}
                title="Nueva Convención"
                onClose={() => setShowCreateModal(false)}
                size="lg"
            >
                <form onSubmit={handleCreate} className="flex flex-col min-h-0">
                    <Modal.Content className="space-y-4 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="FAMILIAS">FAMILIAS</option>
                                    <option value="MUJERES">MUJERES</option>
                                    <option value="JOVENES">JOVENES</option>
                                    <option value="HOMBRES">HOMBRES</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                                <input
                                    type="number"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lema / Tema</label>
                            <input
                                type="text"
                                value={formData.theme}
                                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo VIP Platea ($)</label>
                                <input
                                    type="number"
                                    value={formData.vipPlateaCost}
                                    onChange={(e) => setFormData({ ...formData, vipPlateaCost: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo General ($)</label>
                                <input
                                    type="number"
                                    value={formData.generalCost}
                                    onChange={(e) => setFormData({ ...formData, generalCost: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo Mezzanine ($)</label>
                                <input
                                    type="number"
                                    value={formData.mezzanineCost}
                                    onChange={(e) => setFormData({ ...formData, mezzanineCost: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo Transporte ($)</label>
                                <input
                                    type="number"
                                    value={formData.transportCost}
                                    onChange={(e) => setFormData({ ...formData, transportCost: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo Hospedaje ($)</label>
                                <input
                                    type="number"
                                    value={formData.accommodationCost}
                                    onChange={(e) => setFormData({ ...formData, accommodationCost: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coordinador de la Convención</label>
                            <AsyncSearchSelect
                                fetchItems={(term) => {
                                    const params = { search: term, role: 'LIDER_DOCE' };
                                    return api.get('/users/search', { params })
                                        .then(res => res.data);
                                }}
                                selectedValue={formData.coordinator}
                                onSelect={(user) => setFormData({ ...formData, coordinator: user || null, coordinatorId: user?.id || null })}
                                placeholder="Seleccionar coordinador..."
                                labelKey="fullName"
                            />
                        </div>
                    </Modal.Content>

                    <Modal.Footer>
                        <div className="flex gap-2 sm:gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 text-sm"
                                size="sm"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                loading={submitting}
                                className="flex-1 text-sm"
                                size="sm"
                            >
                                Crear
                            </Button>
                        </div>
                    </Modal.Footer>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={showEditModal}
                title="Editar Convención"
                onClose={() => {
                    setShowEditModal(false);
                    setEditingConvention(null);
                }}
                size="lg"
            >
                <form onSubmit={handleUpdate} className="flex flex-col min-h-0">
                    <Modal.Content className="space-y-4 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                                <select
                                    value={editFormData.type}
                                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="FAMILIAS">FAMILIAS</option>
                                    <option value="MUJERES">MUJERES</option>
                                    <option value="JOVENES">JOVENES</option>
                                    <option value="HOMBRES">HOMBRES</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                                <input
                                    type="number"
                                    value={editFormData.year}
                                    onChange={(e) => setEditFormData({ ...editFormData, year: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lema / Tema</label>
                            <input
                                type="text"
                                value={editFormData.theme}
                                onChange={(e) => setEditFormData({ ...editFormData, theme: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo VIP Platea ($)</label>
                                <input
                                    type="number"
                                    value={editFormData.vipPlateaCost}
                                    onChange={(e) => setEditFormData({ ...editFormData, vipPlateaCost: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo General ($)</label>
                                <input
                                    type="number"
                                    value={editFormData.generalCost}
                                    onChange={(e) => setEditFormData({ ...editFormData, generalCost: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo Mezzanine ($)</label>
                                <input
                                    type="number"
                                    value={editFormData.mezzanineCost}
                                    onChange={(e) => setEditFormData({ ...editFormData, mezzanineCost: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo Transporte ($)</label>
                                <input
                                    type="number"
                                    value={editFormData.transportCost}
                                    onChange={(e) => setEditFormData({ ...editFormData, transportCost: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo Hospedaje ($)</label>
                                <input
                                    type="number"
                                    value={editFormData.accommodationCost}
                                    onChange={(e) => setEditFormData({ ...editFormData, accommodationCost: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                                <input
                                    type="date"
                                    value={editFormData.startDate}
                                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
                                <input
                                    type="date"
                                    value={editFormData.endDate}
                                    onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coordinador de la Convención</label>
                            <AsyncSearchSelect
                                fetchItems={(term) => {
                                    const params = { search: term, role: 'LIDER_DOCE' };
                                    return api.get('/users/search', { params })
                                        .then(res => res.data);
                                }}
                                selectedValue={editFormData.coordinator}
                                onSelect={(user) => setEditFormData({ ...editFormData, coordinator: user || null, coordinatorId: user?.id || null })}
                                placeholder="Seleccionar coordinador..."
                                labelKey="fullName"
                            />
                        </div>
                    </Modal.Content>

                    <Modal.Footer>
                        <div className="flex gap-2 sm:gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingConvention(null);
                                }}
                                className="flex-1 text-sm"
                                size="sm"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                loading={editSubmitting}
                                className="flex-1 text-sm"
                                size="sm"
                            >
                                Actualizar
                            </Button>
                        </div>
                    </Modal.Footer>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setConventionToDelete(null);
                }}
                onConfirm={performDelete}
                title="Eliminar Convención"
                message="¿Estás seguro de eliminar esta convención?"
                confirmText="Eliminar Convención"
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            >
                {conventionToDelete && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{conventionToDelete.type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Año:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{conventionToDelete.year}</span>
                            </div>
                            {conventionToDelete.theme && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Tema:</span>
                                    <span className="font-medium text-gray-900 dark:text-white line-clamp-1">{conventionToDelete.theme}</span>
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
                                ⚠️ Acción Irreversible
                            </h4>
                            <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                                <li>• Se eliminará la convención completa</li>
                                <li>• Se perderán todos los registros de inscritos</li>
                                <li>• Se perderán todos los pagos y abonos asociados</li>
                                <li>• No se puede deshacer esta acción</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </ConfirmationModal>
        </div>
    );
};

export default Convenciones;
