import { useState, useEffect } from 'react';
import { Plus, Users, MapPin, Clock, Calendar, Trash, Pen, X, List, SquaresFourIcon, MapTrifold } from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { AsyncSearchSelect, Button } from './ui';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
        city: 'Manizales',
        dayOfWeek: 'Martes',
        time: '19:00',
        cellType: 'ABIERTA',
        latitude: null,
        longitude: null
    });
    const [eligibleLeaders, setEligibleLeaders] = useState([]);
    const [eligibleHosts, setEligibleHosts] = useState([]);
    const [eligibleDoceLeaders, setEligibleDoceLeaders] = useState([]);

    // Filtering
    const [filterDoce, setFilterDoce] = useState('');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

    // Management State
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    // Map Modal State
    const [showMapModal, setShowMapModal] = useState(false);
    const [mapAddress, setMapAddress] = useState('');
    const [mapResults, setMapResults] = useState([]);
    const [mapLoading, setMapLoading] = useState(false);
    const [selectedCoords, setSelectedCoords] = useState(null);
    const [mapError, setMapError] = useState('');
    const [mapCenter, setMapCenter] = useState([5.0689, -75.5174]); // Manizales default

    // Component to handle map clicks
    const MapClickHandler = ({ onMapClick }) => {
        useMapEvents({
            click: (e) => {
                onMapClick(e.latlng);
            },
        });
        return null;
    };

    // Component to update map center
    const MapUpdater = ({ center }) => {
        const map = useMap();
        useEffect(() => {
            if (center) {
                map.setView(center, 15);
            }
        }, [center, map]);
        return null;
    };

    useEffect(() => {
        fetchCells();
        fetchEligibleLeaders();
        fetchEligibleDoceLeaders();
        const storedUser = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(storedUser);
    }, []);

    // When liderDoceId changes, fetch eligible leaders (filtered by that LIDER_DOCE's network)
    useEffect(() => {
        if (formData.liderDoceId) {
            fetchEligibleLeaders(formData.liderDoceId);
        } else {
            fetchEligibleLeaders();
        }
    }, [formData.liderDoceId]);

    // When liderDoceId changes, fetch eligible hosts (from that LIDER_DOCE's network)
    useEffect(() => {
        if (formData.liderDoceId) {
            fetchEligibleHosts(formData.liderDoceId);
            // Reset host when liderDoceId changes (only in create mode)
            if (!isEditing) {
                setFormData(prev => ({ ...prev, hostId: '' }));
            }
        }
    }, [formData.liderDoceId, isEditing]);

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

    const fetchEligibleLeaders = async (liderDoceId = null) => {
        try {
            const params = {};
            if (liderDoceId) {
                params.liderDoceId = liderDoceId;
            }
            const response = await api.get('/enviar/eligible-leaders', { params });
            setEligibleLeaders(response.data);
        } catch (error) {
            console.error('Error fetching leaders:', error);
        }
    };

    const fetchEligibleHosts = async (liderDoceId) => {
        try {
            const params = {};
            if (liderDoceId) {
                params.liderDoceId = liderDoceId;
            }
            const response = await api.get('/enviar/eligible-hosts', { params });
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

    // Map Functions
    const searchAddress = async (query) => {
        if (!query || query.length < 3) return;
        setMapLoading(true);
        setMapError('');
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10`,
                { headers: { 'User-Agent': 'ProyectoIglesia/1.0' } }
            );
            const data = await response.json();
            setMapResults(data);
            if (data.length === 0) {
                setMapError('No se encontraron resultados para esta dirección');
            }
        } catch (error) {
            setMapError('Error al buscar dirección');
            console.error('Error searching address:', error);
        } finally {
            setMapLoading(false);
        }
    };

    const handleMapClick = async (latlng) => {
        setSelectedCoords({
            lat: latlng.lat,
            lon: latlng.lng,
            displayName: 'Ubicación seleccionada'
        });
        
        // Reverse geocode to get address
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`,
                { headers: { 'User-Agent': 'ProyectoIglesia/1.0' } }
            );
            const data = await response.json();
            if (data.display_name) {
                setSelectedCoords(prev => ({
                    ...prev,
                    displayName: data.display_name
                }));
            }
        } catch (error) {
            console.error('Error reverse geocoding:', error);
        }
    };

    const handleSelectAddress = (result) => {
        const coords = {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            displayName: result.display_name
        };
        setSelectedCoords(coords);
        setMapCenter([coords.lat, coords.lon]);
        setMapResults([]);
    };

    const handleConfirmCoords = () => {
        if (selectedCoords) {
            setFormData(prev => ({
                ...prev,
                address: selectedCoords.displayName,
                latitude: selectedCoords.lat,
                longitude: selectedCoords.lon
            }));
            setShowMapModal(false);
            setSelectedCoords(null);
            setMapAddress('');
            setMapResults([]);
        }
    };

    const handleDeleteCell = async (cellId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta célula? Esta acción desvinculará a todos sus Discípulos.')) return;

        try {
            setLoading(true);
            await api.delete(`/enviar/cells/${cellId}`);
            toast.success('Célula eliminada exitosamente');
            fetchCells();
        } catch (error) {
            toast.error(error.message);
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
                toast.success('Célula actualizada exitosamente');
            } else {
                response = await api.post('/enviar/cells', formData);
                const newCell = response.data;
                const geoStatus = (newCell.latitude && newCell.longitude)
                    ? 'y georreferenciada correctamente'
                    : 'pero no se pudo obtener su ubicación en el mapa. Verifique la dirección más tarde.';
                toast.success(`Célula creada exitosamente ${geoStatus}`);
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
                cellType: 'ABIERTA',
                latitude: null,
                longitude: null
            });
            fetchCells();
        } catch (error) {
            toast.error(error.message);
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
            cellType: cell.cellType,
            latitude: cell.latitude || null,
            longitude: cell.longitude || null
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
            toast.success('Discípulo asignado exitosamente');
            setSelectedMember(null);
            fetchAssignedMembers(selectedCell.id);
            fetchCells();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!confirm('¿Estás seguro de que deseas desvincular a este Discípulo de la célula?')) return;
        try {
            setLoading(true);
            await api.delete(`/enviar/cells/${selectedCell.id}/members/${memberId}`);
            toast.success('Discípulo desvinculado exitosamente');
            fetchAssignedMembers(selectedCell.id);
            fetchCells();
        } catch (error) {
            toast.error(error.message);
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
                                city: 'Manizales',
                                dayOfWeek: 'Lunes',
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
                                        fetchItems={async (term) => {
                                            // Get users from my network
                                            const networkResponse = await api.get('/users/my-network/all');
                                            const networkUsers = networkResponse.data;

                                            // Filter out administrators and pastors
                                            const filteredUsers = networkUsers.filter(user =>
                                                !user.roles.includes('ADMIN') &&
                                                !user.roles.includes('PASTOR')
                                            );

                                            // Filter by search term if provided
                                            if (term && term.length > 0) {
                                                const searchTerm = term.toLowerCase();
                                                return filteredUsers.filter(user =>
                                                    user.fullName.toLowerCase().includes(searchTerm) ||
                                                    user.email.toLowerCase().includes(searchTerm)
                                                );
                                            }

                                            return filteredUsers;
                                        }}
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
                                                    icon={Trash}
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

            {/* Create/Edit Form Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl h-[95vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Users className="w-6 h-6 text-blue-600" />
                                {isEditing ? 'Editar Célula' : 'Nueva Célula'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
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
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Nombre de la Célula <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                placeholder="Ej: Célula Centro"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Tipo de Célula <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                required
                                                value={formData.cellType}
                                                onChange={e => setFormData({ ...formData, cellType: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="ABIERTA">Abierta</option>
                                                <option value="CERRADA">Cerrada</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Líder 12
                                            </label>
                                            <select
                                                value={formData.liderDoceId}
                                                onChange={e => setFormData({ ...formData, liderDoceId: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                disabled={currentUser?.roles?.includes('LIDER_DOCE')}
                                            >
                                                <option value="">Sin Líder 12</option>
                                                {eligibleDoceLeaders.map(l => (
                                                    <option key={l.id} value={l.id}>{l.fullName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Líder de la Célula <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                required
                                                value={formData.leaderId}
                                                onChange={e => setFormData({ ...formData, leaderId: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                disabled={currentUser?.roles?.includes('PASTOR')}
                                            >
                                                <option value="">Seleccionar Líder</option>
                                                {eligibleLeaders.map(l => (
                                                    <option key={l.id} value={l.id}>{l.fullName} ({l.role})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Anfitrión
                                            </label>
                                            <select
                                                value={formData.hostId}
                                                onChange={e => setFormData({ ...formData, hostId: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                disabled={!formData.leaderId}
                                            >
                                                <option value="">Sin anfitrión</option>
                                                {eligibleHosts.map(h => (
                                                    <option key={h.id} value={h.id}>{h.fullName} ({h.role})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Día <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                required
                                                value={formData.dayOfWeek}
                                                onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            >
                                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Hora <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                required
                                                value={formData.time}
                                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Ciudad <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.city}
                                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Dirección <span className="text-red-400">*</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.address}
                                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                    className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMapAddress(formData.address || formData.city || 'Manizales');
                                                        setShowMapModal(true);
                                                    }}
                                                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                                                    title="Seleccionar en mapa"
                                                >
                                                    <MapTrifold size={20} />
                                                </button>
                                            </div>
                                            {(formData.latitude && formData.longitude) && (
                                                <p className="text-xs text-green-600 mt-1">
                                                    ✓ Coordenadas: {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer - Fixed at bottom outside scroll area */}
                            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                <div className="p-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
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
                                        }}
                                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        ) : (
                                            <>
                                                <Plus size={20} />
                                                <span>{isEditing ? 'Actualizar Célula' : 'Guardar Célula'}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Map Selection Modal */}
            {showMapModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <MapTrifold className="w-5 h-5 text-green-600" />
                                Seleccionar ubicación - Haz clic en el mapa
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMapModal(false);
                                    setSelectedCoords(null);
                                    setMapAddress('');
                                    setMapResults([]);
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col">
                            {/* Search bar */}
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={mapAddress}
                                        onChange={(e) => setMapAddress(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                searchAddress(mapAddress);
                                            }
                                        }}
                                        placeholder="Buscar dirección..."
                                        className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-green-500"
                                    />
                                    <Button
                                        onClick={() => searchAddress(mapAddress)}
                                        disabled={mapLoading || mapAddress.length < 3}
                                        variant="primary"
                                        size="sm"
                                    >
                                        {mapLoading ? '...' : 'Buscar'}
                                    </Button>
                                </div>
                                {mapError && (
                                    <p className="text-xs text-red-500 mt-1">{mapError}</p>
                                )}
                            </div>

                            {/* Search results */}
                            {mapResults.length > 0 && (
                                <div className="max-h-32 overflow-y-auto bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    {mapResults.map((result, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleSelectAddress(result)}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                                        >
                                            <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-1">
                                                {result.display_name}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Map */}
                            <div className="flex-1 relative">
                                <MapContainer
                                    center={mapCenter}
                                    zoom={13}
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={true}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <MapClickHandler onMapClick={handleMapClick} />
                                    <MapUpdater center={selectedCoords ? [selectedCoords.lat, selectedCoords.lon] : mapCenter} />
                                    {selectedCoords && (
                                        <Marker position={[selectedCoords.lat, selectedCoords.lon]} />
                                    )}
                                </MapContainer>

                                {/* Selected location info overlay */}
                                {selectedCoords && (
                                    <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-[1000]">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 dark:text-white">
                                                    Ubicación seleccionada
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                                    {selectedCoords.displayName}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {selectedCoords.lat.toFixed(6)}, {selectedCoords.lon.toFixed(6)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMapModal(false);
                                    setSelectedCoords(null);
                                    setMapAddress('');
                                    setMapResults([]);
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCoords}
                                disabled={!selectedCoords}
                                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <MapPin size={18} />
                                <span>Confirmar</span>
                            </button>
                        </div>
                    </div>
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
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'table'
                                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                        }`}
                        title="Vista de tabla"
                    >
                        <List size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('cards')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'cards'
                                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                        }`}
                        title="Vista de tarjetas"
                    >
                        <SquaresFourIcon size={18} />
                    </button>
                </div>
                <p className="text-xs text-gray-500 whitespace-nowrap">
                    Mostrando {filteredCells.length} células
                </p>
            </div>

            {/* List of Cells */}
            {viewMode === 'cards' ? (
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
                                    icon={Trash}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Líder
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Ciudad
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Horario
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Miembros
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredCells.map(cell => (
                                <tr key={cell.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{cell.name}</div>
                                            <div className="flex gap-2 mt-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cell.cellType === 'CERRADA' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                                                    {cell.cellType}
                                                </span>
                                                {cell.liderDoce && (
                                                    <span className="text-xs text-blue-600 dark:text-blue-400">
                                                        L12: {cell.liderDoce.fullName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {cell.leader?.fullName || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {cell.city}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {cell.dayOfWeek} {cell.time}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                            {cell._count?.members || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
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
                                            <Button
                                                onClick={() => handleDeleteCell(cell.id)}
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700"
                                                icon={Trash}
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CellManagement;
