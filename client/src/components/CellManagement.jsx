import { useState, useEffect } from 'react';
import { Plus, Users, MapPin, Clock, Calendar, Trash2, Edit2, X } from 'lucide-react';
import api from '../utils/api';
import { AsyncSearchSelect, Button } from './ui';

const CellManagement = () => {
    const [cells, setCells] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingCellId, setEditingCellId] = useState(null);
    const [assignedMembers, setAssignedMembers] = useState([]);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        leaderId: '',
        hostId: '',
        liderDoceId: '',
        address: '',
        city: '',
        dayOfWeek: 'Viernes',
        time: '19:00',
        cellType: 'ABIERTA'
    });
    const [eligibleLeaders, setEligibleLeaders] = useState([]);
    const [eligibleHosts, setEligibleHosts] = useState([]);
    const [eligibleDoceLeaders, setEligibleDoceLeaders] = useState([]);

    // Filtering
    const [filterDoce, setFilterDoce] = useState('');

    // Management State
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        fetchCells();
        fetchEligibleLeaders();
        fetchEligibleDoceLeaders();
        const storedUser = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(storedUser);
    }, []);

    // When leader changes, fetch eligible hosts (members of that leader's network)
    useEffect(() => {
        if (formData.leaderId) {
            fetchEligibleHosts(formData.leaderId);
            // Reset host ONLY if we are creating a new cell (not during initial edit setup)
            if (!isEditing) {
                setFormData(prev => ({ ...prev, hostId: '' }));
            }
        }
    }, [formData.leaderId, isEditing]);

    // Handle default values for PASTOR and LIDER_DOCE roles when opening create form
    useEffect(() => {
        if (showCreateForm && currentUser) {
            const roles = currentUser.roles || [];
            if (roles.includes('PASTOR')) {
                setFormData(prev => ({
                    ...prev,
                    leaderId: currentUser.id.toString(),
                    liderDoceId: '' // Pastor might need to select a specific leader 12 or leave empty if supervising directly
                }));
            } else if (roles.includes('LIDER_DOCE')) {
                setFormData(prev => ({
                    ...prev,
                    liderDoceId: currentUser.id.toString()
                }));
            }
        }
    }, [showCreateForm, currentUser]);

    // Fetch eligible members and assigned members when manage view opens
    useEffect(() => {
        if (selectedCell) {
            fetchAssignedMembers(selectedCell.id);
        }
    }, [selectedCell]);

    const fetchCells = async () => {
        try {
            const response = await api.get('/enviar/cells');
            setCells(response.data);

            // If we are currently managing a cell, update its data too
            if (selectedCell) {
                const updated = response.data.find(c => c.id === selectedCell.id);
                if (updated) setSelectedCell(updated);
            }
        } catch (error) {
            console.error('Error fetching cells:', error);
        }
    };

    const fetchEligibleLeaders = async () => {
        try {
            const response = await api.get('/enviar/eligible-leaders');
            setEligibleLeaders(response.data);
        } catch (error) {
            console.error('Error fetching leaders:', error);
        }
    };

    const fetchEligibleHosts = async (leaderId) => {
        try {
            const response = await api.get('/enviar/eligible-hosts', {
                params: { leaderId }
            });
            setEligibleHosts(response.data);
        } catch (error) {
            console.error('Error fetching hosts:', error);
        }
    };

    const fetchAssignedMembers = async (cellId) => {
        try {
            const response = await api.get(`/enviar/cells/${cellId}/members`);
            setAssignedMembers(response.data);
        } catch (error) {
            console.error('Error fetching assigned members:', error);
        }
    };

    const fetchEligibleDoceLeaders = async () => {
        try {
            const response = await api.get('/enviar/eligible-doce-leaders');
            setEligibleDoceLeaders(response.data);
        } catch (error) {
            console.error('Error fetching doce leaders:', error);
        }
    };

    const handleDeleteCell = async (cellId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta célula? Esta acción desvinculará a todos sus Discípulos.')) return;

        try {
            setLoading(true);
            await api.delete(`/enviar/cells/${cellId}`);
            alert('Célula eliminada exitosamente');
            fetchCells();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let response;
            if (isEditing) {
                response = await api.put(`/enviar/cells/${editingCellId}`, formData);
                alert('Célula actualizada exitosamente');
            } else {
                response = await api.post('/enviar/cells', formData);
                const newCell = response.data;
                const geoStatus = (newCell.latitude && newCell.longitude)
                    ? 'y georreferenciada correctamente'
                    : 'pero no se pudo obtener su ubicación en el mapa. Verifique la dirección más tarde.';
                alert(`Célula creada exitosamente ${geoStatus}`);
            }

            setShowCreateForm(false);
            setIsEditing(false);
            setEditingCellId(null);
            setFormData({
                name: '',
                leaderId: '',
                hostId: '',
                liderDoceId: '',
                address: '',
                city: '',
                dayOfWeek: 'Viernes',
                time: '19:00',
                cellType: 'ABIERTA'
            });
            fetchCells();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (cell) => {
        setIsEditing(true);
        setEditingCellId(cell.id);
        setFormData({
            name: cell.name,
            leaderId: cell.leaderId.toString(),
            hostId: cell.hostId ? cell.hostId.toString() : '',
            liderDoceId: cell.liderDoceId ? cell.liderDoceId.toString() : '',
            address: cell.address,
            city: cell.city,
            dayOfWeek: cell.dayOfWeek,
            time: cell.time,
            cellType: cell.cellType
        });
        setShowCreateForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAssignMember = async () => {
        if (!selectedMember) return;
        try {
            setLoading(true);
            await api.post(`/enviar/cells/${selectedCell.id}/members`, {
                memberId: selectedMember.id
            });
            alert('Discípulo asignado exitosamente');
            setSelectedMember(null);
            fetchAssignedMembers(selectedCell.id);
            fetchCells();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!confirm('¿Estás seguro de que deseas desvincular a este Discípulo de la célula?')) return;
        try {
            setLoading(true);
            await api.delete(`/enviar/cells/${selectedCell.id}/members/${memberId}`);
            alert('Discípulo desvinculado exitosamente');
            fetchAssignedMembers(selectedCell.id);
            fetchCells();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredCells = cells.filter(cell => !filterDoce || cell.liderDoceId === parseInt(filterDoce));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Gestión de Células</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        Administra las células de tu red
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setShowCreateForm(!showCreateForm);
                        if (showCreateForm) {
                            setIsEditing(false);
                            setEditingCellId(null);
                            setFormData({
                                name: '',
                                leaderId: '',
                                hostId: '',
                                liderDoceId: '',
                                address: '',
                                city: '',
                                dayOfWeek: 'Viernes',
                                time: '19:00',
                                cellType: 'ABIERTA'
                            });
                        }
                    }}
                    icon={showCreateForm ? X : Plus}
                    variant={showCreateForm ? "outline" : "primary"}
                >
                    {showCreateForm ? 'Cancelar' : 'Nueva Célula'}
                </Button>
            </div>

            {/* Management Modal */}
            {selectedCell && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                Administrar Célula: {selectedCell.name}
                            </h3>
                            <button onClick={() => setSelectedCell(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Cell Info */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2">
                                <div className="flex items-center gap-2">
                                    <Users size={16} className="text-gray-600 dark:text-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300"><strong>Líder:</strong> {selectedCell.leader?.fullName}</span>
                                </div>
                                {selectedCell.host && (
                                    <div className="flex items-center gap-2">
                                        <MapPin size={16} className="text-gray-600 dark:text-gray-400" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300"><strong>Anfitrión:</strong> {selectedCell.host?.fullName}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-gray-600 dark:text-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300"><strong>Horario:</strong> {selectedCell.dayOfWeek} {selectedCell.time}</span>
                                </div>
                            </div>

                            {/* Assign Member Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Asignar Discípulo</h4>
                                <div className="flex gap-2">
                                    <AsyncSearchSelect
                                        fetchItems={(term) =>
                                            api.get('/users/search', { params: { search: term } })
                                                .then(res => res.data)
                                        }
                                        selectedValue={selectedMember}
                                        onSelect={setSelectedMember}
                                        labelKey="fullName"
                                        placeholder="Buscar discípulo..."
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleAssignMember}
                                        disabled={!selectedMember || loading}
                                        variant="primary"
                                    >
                                        Asignar
                                    </Button>
                                </div>
                            </div>

                            {/* Assigned Members List */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                                    Discípulos Asignados ({assignedMembers.length})
                                </h4>
                                {assignedMembers.length === 0 ? (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                                        No hay discípulos asignados a esta célula
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {assignedMembers.map(member => (
                                            <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                <div>
                                                    <p className="font-medium text-gray-800 dark:text-white">{member.fullName}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                                                </div>
                                                <Button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700"
                                                    icon={Trash2}
                                                >
                                                    Desvincular
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Form */}
            {showCreateForm && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                        {isEditing ? 'Editar Célula' : 'Nueva Célula'}
                    </h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la Célula</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Ej: Célula Centro"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Célula</label>
                            <select
                                required
                                value={formData.cellType}
                                onChange={e => setFormData({ ...formData, cellType: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="ABIERTA">Abierta</option>
                                <option value="CERRADA">Cerrada</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Líder 12</label>
                            <select
                                value={formData.liderDoceId}
                                onChange={e => setFormData({ ...formData, liderDoceId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                disabled={currentUser?.roles?.includes('LIDER_DOCE')}
                            >
                                <option value="">Sin Líder 12</option>
                                {eligibleDoceLeaders.map(l => (
                                    <option key={l.id} value={l.id}>{l.fullName}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Líder de la Célula</label>
                            <select
                                required
                                value={formData.leaderId}
                                onChange={e => setFormData({ ...formData, leaderId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                disabled={currentUser?.roles?.includes('PASTOR')}
                            >
                                <option value="">Seleccionar Líder</option>
                                {eligibleLeaders.map(l => (
                                    <option key={l.id} value={l.id}>{l.fullName} ({l.role})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anfitrión</label>
                            <select
                                value={formData.hostId}
                                onChange={e => setFormData({ ...formData, hostId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                disabled={!formData.leaderId}
                            >
                                <option value="">Sin anfitrión</option>
                                {eligibleHosts.map(h => (
                                    <option key={h.id} value={h.id}>{h.fullName} ({h.role})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Día</label>
                            <select
                                required
                                value={formData.dayOfWeek}
                                onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                            <input
                                type="time"
                                required
                                value={formData.time}
                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ciudad</label>
                            <input
                                type="text"
                                required
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                            <input
                                type="text"
                                required
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>

                        <div className="md:col-span-2 pt-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                variant="success"
                                className="w-full"
                            >
                                {loading ? (isEditing ? 'Actualizando...' : 'Creando...') : (isEditing ? 'Actualizar Célula' : 'Guardar Célula')}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                        value={filterDoce}
                        onChange={(e) => setFilterDoce(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-blue-100 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none bg-white dark:bg-gray-700 dark:text-white text-sm"
                    >
                        <option value="">{currentUser?.roles?.includes('PASTOR') ? 'Todos los Pastores' : 'Todos los Líderes 12'}</option>
                        {eligibleDoceLeaders.map(l => (
                            <option key={l.id} value={l.id}>{l.fullName}</option>
                        ))}
                    </select>
                </div>
                <p className="text-xs text-gray-500 whitespace-nowrap">
                    Mostrando {filteredCells.length} células
                </p>
            </div>

            {/* List of Cells */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCells.map(cell => (
                    <div key={cell.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{cell.name}</h3>
                            <div className="flex gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cell.cellType === 'CERRADA' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                                    {cell.cellType}
                                </span>
                                <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                    {cell._count?.members || 0}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-gray-400" />
                                <span><strong className="text-gray-700 dark:text-gray-300">Líder:</strong> {cell.leader?.fullName}</span>
                            </div>
                            {cell.liderDoce && (
                                <div className="flex items-center gap-2">
                                    <Users size={16} className="text-blue-300" />
                                    <span><strong className="text-gray-700 dark:text-gray-300">Líder 12:</strong> {cell.liderDoce?.fullName}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <MapPin size={16} className="text-gray-400" />
                                <span><strong className="text-gray-700 dark:text-gray-300">Ciudad:</strong> {cell.city}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-gray-400" />
                                <span><strong className="text-gray-700 dark:text-gray-300">Horario:</strong> {cell.dayOfWeek} {cell.time}</span>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <MapPin size={16} className="text-blue-400" />
                                <span className="text-xs text-gray-500 italic">
                                    {cell.latitude && cell.longitude
                                        ? `${cell.latitude.toFixed(4)}, ${cell.longitude.toFixed(4)}`
                                        : 'Sin ubicación en mapa'
                                    }
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex gap-4">
                                <Button
                                    onClick={() => setSelectedCell(cell)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    Administrar
                                </Button>
                                <Button
                                    onClick={() => handleEditClick(cell)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-amber-600 hover:text-amber-800"
                                >
                                    Editar
                                </Button>
                            </div>
                            <Button
                                onClick={() => handleDeleteCell(cell.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                icon={Trash2}
                            >
                                Eliminar
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CellManagement;
