import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Plus, Calendar, UserIcon,Users, MoneyIcon, CaretRight, Trash, UserCheck, SquaresFour, List, FileTextIcon, TrendUpIcon } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import EncuentroDetails from '../components/EncuentroDetails';
import EncuentroTable from '../components/EncuentroTable';
import EncuentrosReport from '../components/EncuentrosReport';
import MultiUserSelect from '../components/MultiUserSelect';
import { AsyncSearchSelect, PageHeader, Button } from '../components/ui';
import ActionModal from '../components/ActionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import CoordinatorSelector from '../components/CoordinatorSelector';
import { ROLES } from '../constants/roles';

const Encuentros = () => {
    const { user, hasAnyRole, isCoordinator } = useAuth();
    const [encuentros, setEncuentros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEncuentro, setSelectedEncuentro] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // 'cards' or 'table'
    const [showReport, setShowReport] = useState(false);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);

    // Handler for coordinator changes
    const handleCoordinatorChange = (newCoordinator) => {
        setModuleCoordinator(newCoordinator);
        
        // After a short delay, refresh the coordinator data from server
        if (newCoordinator) {
            setTimeout(() => {
                fetchModuleCoordinator();
            }, 500);
        } else {
            setTimeout(() => {
                fetchModuleCoordinator();
            }, 500);
        }
    };

    // Delete Confirmation Modal State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [encuentroToDelete, setEncuentroToDelete] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        type: 'HOMBRES',
        name: '',
        description: '',
        cost: '',
        transportCost: '',
        accommodationCost: '',
        startDate: '',
        endDate: '',
        coordinatorId: null
    });

    const hasAdminOrCoordinator = hasAnyRole(['ADMIN']) || isCoordinator();

    useEffect(() => {
        fetchEncuentros();
        fetchModuleCoordinator();
    }, []);

    const fetchModuleCoordinator = async () => {
        try {
            const res = await api.get('/coordinators/module/encuentros');
            setModuleCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching coordinator:', error);
            setModuleCoordinator(null);
        }
    };

    const fetchEncuentros = async () => {
        setLoading(true);
        try {
            const res = await api.get('/encuentros');
            setEncuentros(res.data);
        } catch (error) {
            console.error('Error fetching encuentros:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEncuentroDetails = async (id) => {
        try {
            const res = await api.get(`/encuentros/${id}`);
            setSelectedEncuentro(res.data);
        } catch (error) {
            console.error('Error fetching details:', error);
            toast.error('Error loading details');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/encuentros', {
                ...formData,
                cost: parseFloat(formData.cost),
                transportCost: parseFloat(formData.transportCost || 0),
                accommodationCost: parseFloat(formData.accommodationCost || 0)
            });
            setShowCreateModal(false);
            fetchEncuentros();
            setFormData({
                type: 'HOMBRES',
                name: '',
                description: '',
                cost: '',
                transportCost: '',
                accommodationCost: '',
                startDate: '',
                endDate: '',
                coordinatorId: null
            });
        } catch (error) {
            console.error('Error creating:', error);
            toast.error('Error creating encuentro');
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        // Find the encuentro to show details in the confirmation modal
        const encuentro = encuentros.find(enc => enc.id === id);
        setEncuentroToDelete(encuentro);
        setShowDeleteConfirm(true);
    };

    const performDelete = async () => {
        if (!encuentroToDelete) return;

        try {
            await api.delete(`/encuentros/${encuentroToDelete.id}`);
            fetchEncuentros();
        } catch (error) {
            console.error(error);
            toast.error('Error deleting');
        }
    };

    // Calculo de estadísticas para reporte
    const stats = useMemo(() => {
        if (!encuentros || encuentros.length === 0) {
            return {
                total: 0,
                recaudado: 0,
                pendiente: 0,
                inscritos: 0
            };
        }

        let totalRecaudado = 0;
        let totalPendiente = 0;
        let totalInscritos = 0;

        encuentros.forEach(enc => {
            totalInscritos += enc.registrations?.length || 0;
            enc.registrations?.forEach(reg => {
                totalRecaudado += reg.totalPaid || 0;
                totalPendiente += reg.balance || 0;
            });
        });

        return {
            total: encuentros.length,
            recaudado: totalRecaudado,
            pendiente: totalPendiente,
            inscritos: totalInscritos
        };
    }, [encuentros]);

    const canCreateOrDelete = hasAdminOrCoordinator;
    const canViewReport = hasAdminOrCoordinator;

    // Renderizar contenido según vista
    const renderContent = () => {
        if (showReport) {
            return (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reporte de Encuentros</h2>
                        <Button variant="secondary" onClick={() => setShowReport(false)}>
                            Volver a Lista
                        </Button>
                    </div>
                    <EncuentrosReport encuentros={encuentros} />
                </div>
            );
        }

        if (viewMode === 'cards') {
            // Vista de tarjetas (actual)
            return (
                <>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {encuentros.map((enc) => (
                                <div
                                    key={enc.id}
                                    onClick={() => fetchEncuentroDetails(enc.id)}
                                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fetchEncuentroDetails(enc.id)}
                                    role="button"
                                    tabIndex={0}
                                    className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 cursor-pointer overflow-hidden relative"
                                >
                                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 group-hover:bg-blue-600 transition-colors"></div>

                                    <div className="p-6 pl-8">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase">
                                                {enc.type}
                                            </span>
                                            <div className="flex items-center space-x-2">
                                                {canCreateOrDelete && (
                                                    <button
                                                        onClick={(e) => handleDelete(e, enc.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors z-10"
                                                        title="Eliminar Encuentro"
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                                            {enc.name}
                                        </h3>

                                        {enc.description && (
                                            <p className="text-gray-600 dark:text-gray-300 italic mb-4 line-clamp-2 text-sm">
                                                "{enc.description}"
                                            </p>
                                        )}

                                        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                <Calendar size={16} className="mr-2 text-blue-500" />
                                                {new Date(enc.startDate).toLocaleDateString()} - {new Date(enc.endDate).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                <Users size={16} className="mr-2 text-blue-500" />
                                                {enc._count?.registrations || enc.registrations?.length || 0} Inscritos
                                            </div>
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                <MoneyIcon size={16} className="mr-2 text-orange-500" />
                                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(enc.cost)}
                                            </div>
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                <UserCheck size={16} className="mr-2 text-green-500" />
                                                Coord: {enc.coordinator?.fullName || 'Sin Asignar'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {encuentros.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                    No hay encuentros activos.<br />
                                    ¡Crea un nuevo encuentro para comenzar!
                                </div>
                            )}
                        </div>
                    )}
                </>
            );
        }

        // Vista de tabla
        return (
            <div className="animate-fade-in">
                <EncuentroTable
                    encuentros={encuentros}
                    onSelect={fetchEncuentroDetails}
                    canModify={canCreateOrDelete}
                    onDelete={handleDelete}
                />
            </div>
        );
    };

    // Early return if selectedEncuentro is set
    if (selectedEncuentro) {
        return (
            <EncuentroDetails
                encuentro={selectedEncuentro}
                onBack={() => setSelectedEncuentro(null)}
                onRefresh={() => fetchEncuentroDetails(selectedEncuentro.id)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Encuentros"
                description="Gestión de Encuentros (Pre y Pos encuentros)"
                action={
                    <div className="flex items-center gap-4">
                        <CoordinatorSelector 
                            moduleCoordinator={moduleCoordinator}
                            moduleName="Encuentros"
                            onCoordinatorChange={handleCoordinatorChange}
                            disabled={!hasAnyRole([ROLES.ADMIN])}
                        />
                        {canCreateOrDelete && (
                            <Button
                                variant="primary"
                                icon={Plus}
                                onClick={() => setShowCreateModal(true)}
                                className="shadow-lg shadow-blue-500/30"
                            >
                                Nuevo Encuentro
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Estadísticas Resumidas - Solo cuando no estamos en reporte */}
                        {!showReport && encuentros.length > 0 && (
            		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                                <Users size={20} />
                            </div>
                            <span className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Total Encuentros</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-blue-900 dark:text-white">{stats.total}</span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Cantidad de Encuentros Realizados</span>
                        </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg text-purple-600 dark:text-purple-300">
                                <UserIcon size={20} />
                            </div>
                            <span className="text-sm font-bold text-purple-800 dark:text-purple-200 uppercase tracking-tight">Total Inscritos</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-purple-900 dark:text-white">{stats.inscritos}</span>
                            </div>
                            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">Total Inscritos</span>
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
                            <span className="text-3xl font-extrabold text-emerald-900 dark:text-white">${stats.recaudado.toLocaleString()}</span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">Dinero Recaudado</span>
                        </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-100 dark:border-red-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg text-red-600 dark:text-red-300">
                                <MoneyIcon size={20} />
                            </div>
                            <span className="text-sm font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Pendiente</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-red-900 dark:text-white">${stats.pendiente.toLocaleString()}</span>
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">Pendiente por Recaudar</span>
                        </div>
                    </div>
                </div>
            )}
            {/* Toggle de Vista y Reporte */}
            {!showReport && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'cards'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            title="Vista de tarjetas"
                        >
                            <SquaresFour size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'table'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            title="Vista de tabla"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    {canViewReport && (
                        <button
                            onClick={() => setShowReport(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                showReport
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FileTextIcon size={16} />
                            Ver Reporte
                        </button>
                    )}
                </div>
            )}

            {renderContent()}

            {/* Create Modal */}
            <ActionModal
                isOpen={showCreateModal}
                title="Nuevo Encuentro"
                onClose={() => setShowCreateModal(false)}
                containerClassName="max-w-lg"
            >
                <form onSubmit={handleCreate} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Palabra Rhema</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="HOMBRES">HOMBRES</option>
                                <option value="MUJERES">MUJERES</option>
                                <option value="JOVENES">JOVENES</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Donación Encuentro ($)</label>
                            <input
                                type="number"
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo Transporte ($)</label>
                            <input
                                type="number"
                                value={formData.transportCost}
                                onChange={(e) => setFormData({ ...formData, transportCost: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo Hospedaje ($)</label>
                            <input
                                type="number"
                                value={formData.accommodationCost}
                                onChange={(e) => setFormData({ ...formData, accommodationCost: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coordinador del Encuentro</label>
                        <AsyncSearchSelect
                            fetchItems={(term) => {
                                const params = { search: term, role: 'LIDER_DOCE' };
                                return api.get('/users/search', { params })
                                    .then(res => res.data);
                            }}
                            selectedValue={formData.coordinatorId}
                            onSelect={(user) => setFormData({ ...formData, coordinatorId: user?.id || null })}
                            placeholder="Seleccionar coordinador..."
                            labelKey="fullName"
                        />
                    </div>
                    <div className="pt-4 flex space-x-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowCreateModal(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                        >
                            Crear Encuentro
                        </Button>
                    </div>
                </form>
            </ActionModal>
        </div>
    );

    {/* Delete Confirmation Modal */}
    <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
            setShowDeleteConfirm(false);
            setEncuentroToDelete(null);
        }}
        onConfirm={performDelete}
        title="Eliminar Encuentro"
        message="¿Estás seguro de eliminar este encuentro?"
        confirmText="Eliminar Encuentro"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
    >
        {encuentroToDelete && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Encuentro:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{encuentroToDelete.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{encuentroToDelete.type}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Inscritos:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{encuentroToDelete._count?.registrations || encuentroToDelete.registrations?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Coordinador:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{encuentroToDelete.coordinator?.fullName || 'Sin asignar'}</span>
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
                        <li>• Se eliminará el encuentro completo</li>
                        <li>• Se perderán todos los registros de inscritos</li>
                        <li>• Se perderán todos los pagos y abonos asociados</li>
                        <li>• No se puede deshacer esta acción</li>
                    </ul>
                </div>
            </div>
        </div>
    </ConfirmationModal>
};

export default Encuentros;
