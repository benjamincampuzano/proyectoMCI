import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Plus, Calendar, Users, DollarSign, ChevronRight, Trash2, UserCheck, LayoutGrid, List, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import EncuentroDetails from '../components/EncuentroDetails';
import EncuentroTable from '../components/EncuentroTable';
import EncuentrosReport from '../components/EncuentrosReport';
import MultiUserSelect from '../components/MultiUserSelect';
import { AsyncSearchSelect, PageHeader, Button } from '../components/ui';
import ActionModal from '../components/ActionModal';

const Encuentros = () => {
    const { user, hasAnyRole } = useAuth();
    const [encuentros, setEncuentros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEncuentro, setSelectedEncuentro] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
    const [showReport, setShowReport] = useState(false);

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

    useEffect(() => {
        fetchEncuentros();
    }, []);

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
        if (!window.confirm('¿Eliminar este encuentro y todos sus datos?')) return;
        try {
            await api.delete(`/encuentros/${id}`);
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

    const canCreateOrDelete = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);
    const canViewReport = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);

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
                                                        <Trash2 size={16} />
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
                                                <DollarSign size={16} className="mr-2 text-orange-500" />
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
                action={canCreateOrDelete && (
                    <Button
                        variant="primary"
                        icon={Plus}
                        onClick={() => setShowCreateModal(true)}
                        className="shadow-lg shadow-blue-500/30"
                    >
                        Nuevo Encuentro
                    </Button>
                )}
            />

            {/* Estadísticas Resumidas - Solo cuando no estamos en reporte */}
            {!showReport && encuentros.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Encuentros</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Inscritos</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.inscritos}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Recaudado</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                            ${stats.recaudado.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pendiente</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                            ${stats.pendiente.toLocaleString()}
                        </p>
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
                            <LayoutGrid size={18} />
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
                            <FileText size={16} />
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Evento</label>
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
};

export default Encuentros;
