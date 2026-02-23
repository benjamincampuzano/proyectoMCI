import { useState, useEffect } from 'react';
import { Plus, Users, Calendar, Phone, CheckCircle, Clock, Edit2, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import MultiUserSelect from './MultiUserSelect';
import { Button } from './ui';

const OracionDeTresManagement = () => {
    const { user, hasRole, hasAnyRole } = useAuth();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        fetchGroups();
    }, [refreshTrigger]);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const res = await api.get('/oracion-de-tres');
            setGroups(res.data);
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (formData) => {
        try {
            await api.post('/oracion-de-tres', formData);
            setShowModal(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al crear el grupo');
        }
    };

    const handleUpdateGroup = async (groupId, formData) => {
        try {
            const res = await api.put(`/oracion-de-tres/${groupId}`, formData);
            setShowModal(false);
            setEditingGroup(null);
            setRefreshTrigger(prev => prev + 1);
            if (selectedGroup && selectedGroup.id === groupId) {
                setSelectedGroup(res.data);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al actualizar el grupo');
        }
    };

    const handleDeleteGroup = async (groupId) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este grupo de oración? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await api.delete(`/oracion-de-tres/${groupId}`);
            setSelectedGroup(null);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al eliminar el grupo');
        }
    };

    const handleAddMeeting = async (groupId, meetingData) => {
        try {
            await api.post('/oracion-de-tres/meeting', { oracionDeTresId: groupId, ...meetingData });
            setRefreshTrigger(prev => prev + 1);
            if (selectedGroup && selectedGroup.id === groupId) {
                const res = await api.get(`/oracion-de-tres/${groupId}`);
                setSelectedGroup(res.data);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al registrar la reunión');
        }
    };

    if (loading && groups.length === 0) {
        return <div className="p-8 text-center text-gray-500">Cargando grupos de oración...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Grupos Oración de Tres</h2>
                {hasAnyRole(['LIDER_DOCE', 'ADMIN']) && (
                    <Button
                        variant="success"
                        icon={Plus}
                        onClick={() => {
                            setEditingGroup(null);
                            setShowModal(true);
                        }}
                    >
                        Crear Nuevo Grupo
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map(group => (
                    <div
                        key={group.id}
                        className={`p-6 rounded-xl border cursor-pointer transition-all hover:shadow-lg ${selectedGroup?.id === group.id
                            ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/10'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                            }`}
                        onClick={() => setSelectedGroup(group)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedGroup(group)}
                        role="button"
                        tabIndex={0}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="text-blue-500" size={24} />
                                <span className="font-bold text-gray-900 dark:text-white">Grupo #{group.id}</span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${group.estado === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                {group.estado}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} />
                                <span>{new Date(group.fechaInicio).toLocaleDateString()} - {new Date(group.fechaFin).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle size={16} />
                                <span>{group._count.reuniones} reuniones registradas</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {selectedGroup && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 mt-8">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Detalles del Grupo #{selectedGroup.id}</h3>
                            <p className="text-gray-500">Líder responsable: {selectedGroup.liderDoce?.profile?.fullName}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {(hasRole('ADMIN') || selectedGroup.liderDoceId === user.id) && (
                                <>
                                    <button
                                        onClick={() => {
                                            setEditingGroup(selectedGroup);
                                            setShowModal(true);
                                        }}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Editar Grupo"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteGroup(selectedGroup.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar Grupo"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </>
                            )}
                            <button onClick={() => setSelectedGroup(null)} className="p-2 text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-8">
                            <div>
                                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Users size={20} className="text-blue-500" />
                                    Miembros (3 Discípulos)
                                </h4>
                                <div className="space-y-3">
                                    {selectedGroup.miembros.map(m => (
                                        <div key={m.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <p className="font-medium text-gray-900 dark:text-white">{m.discipulo.profile?.fullName}</p>
                                            <p className="text-xs text-gray-500">{m.discipulo.email}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Phone size={20} className="text-green-500" />
                                    Personas Objetivo (3)
                                </h4>
                                <div className="space-y-3">
                                    {selectedGroup.personas.map(p => (
                                        <div key={p.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
                                            <p className="font-medium text-gray-900 dark:text-white">{p.nombre}</p>
                                            <p className="text-sm text-gray-500">{p.telefono}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Clock size={20} className="text-purple-500" />
                                    Historial de Reuniones
                                </h4>
                                <div className="space-y-3">
                                    {selectedGroup.reuniones?.length > 0 ? (
                                        selectedGroup.reuniones.map(r => (
                                            <div key={r.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
                                                <span>{new Date(r.fecha).toLocaleDateString()}</span>
                                                <span className="text-gray-500 font-mono">{r.hora}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 italic">No hay reuniones registradas aún.</p>
                                    )}
                                </div>
                            </div>

                            {selectedGroup.estado === 'ACTIVO' && (
                                <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                    <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-4">Registrar Nueva Reunión</h4>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.target);
                                        handleAddMeeting(selectedGroup.id, {
                                            fecha: formData.get('fecha'),
                                            hora: formData.get('hora')
                                        });
                                        e.target.reset();
                                    }} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <input
                                                type="date"
                                                name="fecha"
                                                required
                                                className="p-2 rounded border bg-white dark:bg-gray-800 text-sm"
                                            />
                                            <input
                                                type="time"
                                                name="hora"
                                                required
                                                className="p-2 rounded border bg-white dark:bg-gray-800 text-sm"
                                            />
                                        </div>
                                        <Button type="submit" className="w-full" size="sm">
                                            Guardar Reunión
                                        </Button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <GroupModal
                    onClose={() => {
                        setShowModal(false);
                        setEditingGroup(null);
                    }}
                    onSubmit={editingGroup ? (data) => handleUpdateGroup(editingGroup.id, data) : handleCreateGroup}
                    initialData={editingGroup}
                />
            )}
        </div>
    );
};

const GroupModal = ({ onClose, onSubmit, initialData }) => {
    const [miembros, setMiembros] = useState(initialData ? initialData.miembros.map(m => m.discipuloId) : []);
    const [personas, setPersonas] = useState(initialData ? initialData.personas.map(p => ({ nombre: p.nombre, telefono: p.telefono })) : [{ nombre: '', telefono: '' }, { nombre: '', telefono: '' }, { nombre: '', telefono: '' }]);
    const [fechaInicio, setFechaInicio] = useState(initialData ? new Date(initialData.fechaInicio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [estado, setEstado] = useState(initialData?.estado || 'ACTIVO');

    const handlePersonChange = (index, field, value) => {
        const newPersonas = [...personas];
        newPersonas[index][field] = value;
        setPersonas(newPersonas);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (miembros.length !== 3) {
            toast.error('Debes seleccionar exactamente 3 discípulos.');
            return;
        }
        onSubmit({ fechaInicio, miembros, personas, estado });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {initialData ? `Editar Grupo #${initialData.id}` : 'Nuevo Grupo Oración de Tres'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fecha de Inicio</label>
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                                required
                            />
                        </div>
                        {initialData && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estado</label>
                                <select
                                    value={estado}
                                    onChange={(e) => setEstado(e.target.value)}
                                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                                >
                                    <option value="ACTIVO">ACTIVO</option>
                                    <option value="FINALIZADO">FINALIZADO</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <MultiUserSelect
                            label="Discípulos (Selecciona 3)"
                            roleFilter="DISCIPULO"
                            value={miembros}
                            onChange={(ids) => {
                                if (ids.length <= 3) setMiembros(ids);
                            }}
                            placeholder="Buscar discípulos..."
                        />
                        <p className="text-xs text-blue-500 mt-1">{miembros.length} de 3 seleccionados</p>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Personas Objetivo (3)</label>
                        {personas.map((p, i) => (
                            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                <input
                                    placeholder="Nombre completo"
                                    value={p.nombre}
                                    onChange={(e) => handlePersonChange(i, 'nombre', e.target.value)}
                                    className="p-2 rounded border bg-white dark:bg-gray-800 text-sm"
                                    required
                                />
                                <input
                                    placeholder="Teléfono"
                                    value={p.telefono}
                                    onChange={(e) => handlePersonChange(i, 'telefono', e.target.value)}
                                    className="p-2 rounded border bg-white dark:bg-gray-800 text-sm"
                                    required
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={miembros.length !== 3}
                            className="flex-1"
                        >
                            {initialData ? 'Guardar Cambios' : 'Crear Grupo'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OracionDeTresManagement;
