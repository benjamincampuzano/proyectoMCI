import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Plus, Calendar, Users, MoneyIcon, CaretRight, Trash, UserCheck, SquaresFour, List, FileTextIcon, TrendUpIcon } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ConventionDetails from '../components/ConventionDetails';
import ConvencionTable from '../components/ConvencionTable';
import ConvencionesReport from '../components/ConvencionesReport';
import ActionModal from '../components/ActionModal';
import { Button, Modal, Skeleton, PageHeader, AsyncSearchSelect } from '../components/ui';

const Convenciones = () => {
    const { user, hasAnyRole } = useAuth();
    const [conventions, setConventions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedConvention, setSelectedConvention] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // 'cards' or 'table'
    const [showReport, setShowReport] = useState(false);

    // Create Form State
    const [formData, setFormData] = useState({
        type: 'FAMILIAS',
        year: new Date().getFullYear(),
        theme: '',
        cost: '',
        transportCost: '',
        accommodationCost: '',
        startDate: '',
        endDate: '',
        coordinatorId: null
    });

    useEffect(() => {
        fetchConventions();
    }, []);

    const fetchConventions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/convenciones');
            setConventions(res.data);
        } catch (error) {
            console.error('Error fetching conventions:', error);
        } finally {
            setLoading(false);
        }
    };

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
        try {
            await api.post('/convenciones', {
                ...formData,
                cost: parseFloat(formData.cost),
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
                transportCost: '',
                accommodationCost: '',
                startDate: '',
                endDate: '',
                coordinatorId: null
            });
        } catch (error) {
            console.error('Error creating convention:', error);
            toast.error('Error creating convention: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('¿Estás seguro de eliminar esta convención? Se eliminarán todos los registros y pagos asociados.')) {
            return;
        }
        try {
            await api.delete(`/convenciones/${id}`);
            fetchConventions();
        } catch (error) {
            console.error('Error deleting convention:', error);
            toast.error('Error deleting convention');
        }
    };

    const canModify = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);
    const canViewReport = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);

    // Calculo de estadísticas para reporte
    const stats = useMemo(() => {
        if (!conventions || conventions.length === 0) {
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

        conventions.forEach(conv => {
            totalInscritos += conv.registrations?.length || 0;
            conv.registrations?.forEach(reg => {
                totalRecaudado += reg.totalPaid || 0;
                totalPendiente += reg.balance || 0;
            });
        });

        return {
            total: conventions.length,
            recaudado: totalRecaudado,
            pendiente: totalPendiente,
            inscritos: totalInscritos
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

        if (viewMode === 'cards') {
            // Vista de tarjetas (actual)
            return (
                <>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Skeleton variant="card" lines={4} />
                            <Skeleton variant="card" lines={4} />
                            <Skeleton variant="card" lines={4} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {conventions.map((conv) => (
                                <div
                                    key={conv.id}
                                    onClick={() => fetchConventionDetails(conv.id)}
                                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fetchConventionDetails(conv.id)}
                                    role="button"
                                    tabIndex={0}
                                    className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 cursor-pointer overflow-hidden relative"
                                >
                                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 group-hover:bg-blue-600 transition-colors"></div>
                                    <div className="p-6 pl-8">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {conv.type}
                                                </h3>
                                                <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded mt-1">
                                                    {conv.year}
                                                </span>
                                            </div>
                                            <CaretRight className="text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" size={24} />
                                        </div>

                                        <div className="absolute top-4 right-12 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {canModify && (
                                                <button
                                                    onClick={(e) => handleDelete(e, conv.id)}
                                                    className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                                                    title="Eliminar Convención"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            )}
                                        </div>

                                        {conv.theme && (
                                            <p className="text-gray-600 dark:text-gray-300 italic mb-4 line-clamp-2">
                                                "{conv.theme}"
                                            </p>
                                        )}

                                        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                <Calendar size={16} className="mr-2 text-blue-500" />
                                                {new Date(conv.startDate).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                <MoneyIcon size={16} className="mr-2 text-orange-500" />
                                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(conv.cost)}
                                            </div>
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                <UserCheck size={16} className="mr-2 text-blue-500" />
                                                Coord: {conv.coordinator?.fullName || 'Sin Asignar'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {conventions.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                    No hay convenciones creadas.<br />
                                    ¡Crea una nueva convención para comenzar!
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
                <ConvencionTable
                    conventions={conventions}
                    onSelect={fetchConventionDetails}
                    canModify={canModify}
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
                action={canModify && (
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        icon={Plus}
                        className="shadow-lg shadow-blue-500/30"
                    >
                        Nueva Convención
                    </Button>
                )}
            />

            {/* Estadísticas Resumidas */}
            {!showReport && conventions.length > 0 && (
            		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                                <Users size={20} />
                            </div>
                            <span className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Total Convenciones</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-blue-900 dark:text-white">{stats.total}</span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Cantidad de Personas</span>
                        </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg text-purple-600 dark:text-purple-300">
                                <MoneyIcon size={20} />
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
            <Modal
                isOpen={showCreateModal}
                title="Nueva Convención"
                onClose={() => setShowCreateModal(false)}
                size="lg"
            >
                <form onSubmit={handleCreate}>
                    <Modal.Content className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo Total ($)</label>
                            <input
                                type="number"
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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

                        <div className="grid grid-cols-2 gap-4">
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
                                selectedValue={formData.coordinatorId}
                                onSelect={(user) => setFormData({ ...formData, coordinatorId: user?.id || null })}
                                placeholder="Seleccionar coordinador..."
                                labelKey="fullName"
                            />
                        </div>
                    </Modal.Content>

                    <Modal.Footer>
                        <div className="flex space-x-3">
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
                                loading={loading}
                                className="flex-1"
                            >
                                Crear Convención
                            </Button>
                        </div>
                    </Modal.Footer>
                </form>
            </Modal>
        </div >
    );
};

export default Convenciones;
