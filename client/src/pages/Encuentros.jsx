import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Calendar, Users, DollarSign, ChevronRight, Trash2, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EncuentroDetails from '../components/EncuentroDetails';
import MultiUserSelect from '../components/MultiUserSelect';
import { AsyncSearchSelect, PageHeader, Button } from '../components/ui';
import ActionModal from '../components/ActionModal';

const Encuentros = () => {
    const { user, hasAnyRole } = useAuth();
    const [encuentros, setEncuentros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEncuentro, setSelectedEncuentro] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

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
            alert('Error loading details');
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
            alert('Error creating encuentro');
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
            alert('Error deleting');
        }
    };

    if (selectedEncuentro) {
        return (
            <EncuentroDetails
                encuentro={selectedEncuentro}
                onBack={() => setSelectedEncuentro(null)}
                onRefresh={() => fetchEncuentroDetails(selectedEncuentro.id)}
            />
        );
    }

    const canCreateOrDelete = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);

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
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                                    {enc.name}
                                </h3>

                                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                        <Calendar size={16} className="mr-2 text-blue-500" />
                                        {new Date(enc.startDate).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                        <Users size={16} className="mr-2 text-blue-500" />
                                        {enc._count?.registrations || 0} Inscritos
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
