import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Users, MapPin, Clock, Calendar, DotIcon, Trash, Pen, X, List, SquaresFour, MapTrifold, Tag, Image, UserIcon } from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { AsyncSearchSelect, Button, Icon } from './ui';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from './ConfirmationModal';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CellManagement = ({ moduleCoordinator }) => {
    const { hasAnyRole, isCoordinator } = useAuth();
    const [cells, setCells] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingCellId, setEditingCellId] = useState(null);
    const [assignedMembers, setAssignedMembers] = useState([]);

    // Check if user can manage cells
    const canManageCells = () => {
        const hasRoleAccess = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);
        const isModuleCoordinator = moduleCoordinator && 
            moduleCoordinator.id === JSON.parse(localStorage.getItem('user') || '{}').id;
        return hasRoleAccess || isModuleCoordinator;
    };

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        leaderId: '',
        hostId: '',
        liderDoceId: '',
        address: '',
        city: 'Ciudad',
        barrio: 'Barrio',
        network: '',
        spiritualMappingUrl: '',
        fastingDate: '',
        rhemaWord: '',
        pastorsMeeting: false,
        dayOfWeek: 'Domingo',
        time: '19:00',
        cellType: 'ABIERTA',
        latitude: null,
        longitude: null
    });
    const [eligibleLeaders, setEligibleLeaders] = useState([]);
    const [eligibleHosts, setEligibleHosts] = useState([]);
    const [eligibleDoceLeaders, setEligibleDoceLeaders] = useState([]);
    const [selectedLeaderRole, setSelectedLeaderRole] = useState('');
    const [selectedLeader, setSelectedLeader] = useState(null);
    const [selectedHost, setSelectedHost] = useState(null);
    const [selectedLiderDoce, setSelectedLiderDoce] = useState(null);

    // Filtering
    const [filterDoce, setFilterDoce] = useState('');
    const [filterLeader, setFilterLeader] = useState('');
    const [filterBarrio, setFilterBarrio] = useState('');
    const [filterDayOfWeek, setFilterDayOfWeek] = useState('');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

    // Management State
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [selectedGuestId, setSelectedGuestId] = useState(null);
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [memberType, setMemberType] = useState('USER'); // GUEST or USER
    const [currentUser, setCurrentUser] = useState(null);

    // Map Modal State
    const [showMapModal, setShowMapModal] = useState(false);
    const [mapAddress, setMapAddress] = useState('');
    const [mapResults, setMapResults] = useState([]);
    const [mapLoading, setMapLoading] = useState(false);
    const [selectedCoords, setSelectedCoords] = useState(null);
    const [mapError, setMapError] = useState('');
    const [mapCenter, setMapCenter] = useState([5.0689, -75.5174]); // Manizales default

    // Confirmation Modal State
    const [showDeleteCellModal, setShowDeleteCellModal] = useState(false);
    const [cellToDelete, setCellToDelete] = useState(null);
    const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState(null);
    const [memberTypeToRemove, setMemberTypeToRemove] = useState(null);

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
            fetchEligibleLeaders(formData.liderDoceId, selectedLeaderRole);
        } else {
            fetchEligibleLeaders(null, selectedLeaderRole);
        }
    }, [formData.liderDoceId, selectedLeaderRole]);

    // When leaderId changes, determine the role of the selected leader
    useEffect(() => {
        if (formData.leaderId && eligibleLeaders.length > 0) {
            const selectedLeader = eligibleLeaders.find(leader => leader.id.toString() === formData.leaderId);
            if (selectedLeader) {
                const roles = selectedLeader.roles || [];
                if (roles.includes('LIDER_DOCE')) {
                    setSelectedLeaderRole('LIDER_DOCE');
                } else if (roles.includes('LIDER_CELULA')) {
                    setSelectedLeaderRole('LIDER_CELULA');
                } else {
                    setSelectedLeaderRole('');
                }
            }
        } else {
            setSelectedLeaderRole('');
        }
    }, [formData.leaderId, eligibleLeaders]);

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
                setSelectedLeader(currentUser);
            } else if (roles.includes('LIDER_DOCE')) {
                setFormData(prev => ({
                    ...prev,
                    liderDoceId: currentUser.id.toString()
                }));
                setSelectedLiderDoce(currentUser);
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
            toast.error('Error al cargar células. Por favor intenta nuevamente.');
        }
    };

    const fetchEligibleLeaders = async (liderDoceId = null, selectedLeaderRole = null) => {
        try {
            const params = {};
            if (liderDoceId) {
                params.liderDoceId = liderDoceId;
            }
            // Add parameter to specify if we want leaders from a specific role's network
            if (selectedLeaderRole) {
                params.selectedRole = selectedLeaderRole;
            }
            const response = await api.get('/enviar/eligible-leaders', { params });
            setEligibleLeaders(response.data);
        } catch (error) {
            console.error('Error fetching leaders:', error);
            toast.error('Error al cargar líderes disponibles. Por favor intenta nuevamente.');
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
            toast.error('Error al cargar anfitriones disponibles. Por favor intenta nuevamente.');
        }
    };

    const fetchAssignedMembers = async (cellId) => {
        try {
            const response = await api.get(`/enviar/cells/${cellId}/members`);
            setAssignedMembers(response.data);
        } catch (error) {
            console.error('Error fetching assigned members:', error);
            toast.error('Error al cargar miembros asignados. Por favor intenta nuevamente.');
        }
    };

    const fetchEligibleDoceLeaders = async () => {
        try {
            const response = await api.get('/enviar/eligible-doce-leaders');
            setEligibleDoceLeaders(response.data);
        } catch (error) {
            console.error('Error fetching doce leaders:', error);
            toast.error('Error al cargar líderes de 12 disponibles. Por favor intenta nuevamente.');
        }
    };

    // Map Functions
    const searchAddress = async (query) => {
        if (!query || query.length < 3) return;
        setMapLoading(true);
        setMapError('');
        try {
            // Add delay to respect rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
                { 
                    headers: { 
                        'User-Agent': 'ProyectoIglesia/1.0',
                        'Accept': 'application/json'
                    } 
                }
            );
            
            // Handle rate limiting
            if (response.status === 429) {
                setMapError('Demasiadas solicitudes. Por favor espera unos segundos y vuelve a intentar.');
                return;
            }
            
            const data = await response.json();
            setMapResults(data);
            if (data.length === 0) {
                setMapError('No se encontraron resultados para esta dirección');
            }
        } catch (error) {
            if (error.message.includes('429')) {
                setMapError('Demasiadas solicitudes. Por favor espera unos segundos y vuelve a intentar.');
            } else {
                setMapError('Error al buscar dirección');
            }
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
            // Add delay to respect rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`,
                { 
                    headers: { 
                        'User-Agent': 'ProyectoIglesia/1.0',
                        'Accept': 'application/json'
                    } 
                }
            );
            
            // Handle rate limiting
            if (response.status === 429) {
                console.warn('Rate limit hit on reverse geocoding');
                return;
            }
            
            const data = await response.json();
            if (data.display_name) {
                setSelectedCoords(prev => ({
                    ...prev,
                    displayName: data.display_name
                }));
            }
        } catch (error) {
            console.warn('Error getting address from coordinates:', error);
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
        setCellToDelete(cellId);
        setShowDeleteCellModal(true);
    };

    const confirmDeleteCell = async () => {
        if (!cellToDelete) return;

        try {
            setLoading(true);
            await api.delete(`/enviar/cells/${cellToDelete}`);
            toast.success('Célula eliminada exitosamente');
            fetchCells();
            setShowDeleteCellModal(false);
            setCellToDelete(null);
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
            setSelectedLeaderRole('');
            setSelectedLeader(null);
            setSelectedHost(null);
            setSelectedLiderDoce(null);
            setFormData({
                name: '',
                leaderId: '',
                hostId: '',
                liderDoceId: '',
                address: '',
                city: '',
                barrio: '',
                network: '',
                spiritualMappingUrl: '',
                fastingDate: '',
                rhemaWord: '',
                pastorsMeeting: false,
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
            barrio: cell.barrio || '',
            network: cell.network || '',
            spiritualMappingUrl: cell.spiritualMappingUrl || '',
            fastingDate: cell.fastingDate ? cell.fastingDate.split('T')[0] : '',
            rhemaWord: cell.rhemaWord || '',
            pastorsMeeting: cell.pastorsMeeting || false,
            dayOfWeek: cell.dayOfWeek,
            time: cell.time,
            cellType: cell.cellType,
            latitude: cell.latitude || null,
            longitude: cell.longitude || null
        });
        setSelectedLeader(cell.leader);
        setSelectedHost(cell.host);
        setSelectedLiderDoce(cell.liderDoce);
        setShowCreateForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAssignMember = async () => {
        if (!selectedMember && !selectedGuestId) return;
        try {
            setLoading(true);
            const data = memberType === 'GUEST' 
                ? { guestId: selectedGuestId }
                : { memberId: selectedMember?.id };
            
            await api.post(`/enviar/cells/${selectedCell.id}/members`, data);
            toast.success(memberType === 'GUEST' ? 'Invitado asignado exitosamente' : 'Discípulo asignado exitosamente');
            setSelectedMember(null);
            setSelectedGuestId(null);
            setSelectedGuest(null);
            fetchAssignedMembers(selectedCell.id);
            fetchCells();
        } catch (error) {
            console.error('Error assigning member:', error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId, memberType) => {
        setMemberToRemove(memberId);
        setMemberTypeToRemove(memberType);
        setShowRemoveMemberModal(true);
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove || !memberTypeToRemove) return;

        try {
            setLoading(true);
            const data = memberTypeToRemove === 'GUEST' ? { guestId: memberToRemove } : { userId: memberToRemove };
            await api.post('/enviar/cells/unassign', data);
            toast.success(memberTypeToRemove === 'GUEST' ? 'Invitado desvinculado exitosamente' : 'Discípulo desvinculado exitosamente');
            fetchAssignedMembers(selectedCell.id);
            fetchCells();
            setShowRemoveMemberModal(false);
            setMemberToRemove(null);
            setMemberTypeToRemove(null);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredCells = cells.filter(cell => {
        const matchesDoce = !filterDoce || cell.liderDoceId === parseInt(filterDoce);
        const matchesLeader = !filterLeader || cell.leaderId === parseInt(filterLeader);
        const matchesBarrio = !filterBarrio || (cell.barrio && cell.barrio.toLowerCase().includes(filterBarrio.toLowerCase()));
        const matchesDayOfWeek = !filterDayOfWeek || cell.dayOfWeek === filterDayOfWeek;
        return matchesDoce && matchesLeader && matchesBarrio && matchesDayOfWeek;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1d1d1f] dark:text-white">Gestión de Células</h2>
                    <p className="text-[#1d1d1f] dark:text-[#98989d] text-sm mt-1">
                        Administra las células de tu red
                    </p>
                </div>
                {canManageCells() && (
                    <Button
                        onClick={() => {
                            setShowCreateForm(!showCreateForm);
                            if (showCreateForm) {
                                setIsEditing(false);
                                setEditingCellId(null);
                                setSelectedLeaderRole('');
                                setSelectedLeader(null);
                                setSelectedHost(null);
                                setSelectedLiderDoce(null);
                                setFormData({
                                    name: '',
                                    leaderId: '',
                                    hostId: '',
                                    liderDoceId: '',
                                    address: '',
                                    city: 'Manizales',
                                    barrio: '',
                                    network: '',
                                    spiritualMappingUrl: '',
                                    fastingDate: '',
                                    rhemaWord: '',
                                    pastorsMeeting: false,
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
                )}
            </div>

            {/* Management Modal */}
            {selectedCell && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] sm:p-4">
                    <div className="bg-white dark:bg-[#272729] sm:rounded-lg shadow-xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto">
                        <div className="p-4 sm:p-6 border-b border-[#d1d1d6] dark:border-[#3a3a3c] flex justify-between items-center sticky top-0 bg-white dark:bg-[#272729]">
                            <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white">
                                Agregar Usuarios a la Célula: {selectedCell.name}
                            </h3>
                            <button onClick={() => setSelectedCell(null)} className="text-[#86868b] hover:text-[#1d1d1f] dark:text-[#98989d] dark:hover:text-gray-200">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-6">
                            {/* Cell Info */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2">
                                <div className="flex items-center gap-2">
                                    <UserIcon size={16} className="text-[#1d1d1f] dark:text-[#98989d]" />
                                    <span className="text-sm text-[#1d1d1f] dark:text-white/80"><strong>Líder Doce:</strong> {selectedCell.liderDoce?.fullName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users size={16} className="text-[#1d1d1f] dark:text-[#98989d]" />
                                    <span className="text-sm text-[#1d1d1f] dark:text-white/80"><strong>Líder de la Célula:</strong> {selectedCell.leader?.fullName}</span>
                                </div>
                                {selectedCell.host && (
                                    <div className="flex items-center gap-2">
                                        <MapPin size={16} className="text-[#1d1d1f] dark:text-[#98989d]" />
                                        <span className="text-sm text-[#1d1d1f] dark:text-white/80"><strong>Anfitrión:</strong> {selectedCell.host?.fullName}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-[#1d1d1f] dark:text-[#98989d]" />
                                    <span className="text-sm text-[#1d1d1f] dark:text-white/80"><strong>Horario:</strong> {selectedCell.dayOfWeek} {selectedCell.time}</span>
                                </div>
                                                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-[#1d1d1f] dark:text-[#98989d]" />
                                    <span className="text-sm text-[#1d1d1f] dark:text-white/80"><strong>Barrio:</strong> {selectedCell.barrio}</span>
                                </div>
                            </div>

                            {/* Assign Member Section */}
                            <div>
                                <h4 className="text-lg font-semibold text-[#1d1d1f] dark:text-white mb-3">Asignar Persona</h4>
                                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMemberType('GUEST');
                                            setSelectedMember(null);
                                            setSelectedGuest(null);
                                            setSelectedGuestId(null);
                                        }}
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${memberType === 'GUEST' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                                    >
                                        Invitado
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMemberType('USER');
                                            setSelectedGuest(null);
                                            setSelectedGuestId(null);
                                        }}
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${memberType === 'USER' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                                    >
                                        Discípulo
                                    </button>
                                </div>
                                <div className="mb-2">
                                    <p className="text-sm text-[#1d1d1f] dark:text-[#98989d]">
                                        {memberType === 'USER' ? 'Solo puedes asignar usuarios que pertenecen a tu red de discipulado' : 'Selecciona un invitado de la base de datos de Ganar'}
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    {memberType === 'GUEST' ? (
                                        <AsyncSearchSelect
                                            fetchItems={async (term) => {
                                                const params = { search: term };
                                                try {
                                                    const res = await api.get('/guests', { params });
                                                    const guests = res.data.guests || [];
                                                    return guests;
                                                } catch (error) {
                                                    console.error('Error fetching guests:', error);
                                                    return [];
                                                }
                                            }}
                                            selectedValue={selectedGuest}
                                            onSelect={(guest) => {
                                                // Simplify the guest object to only include necessary properties
                                                const simplifiedGuest = {
                                                    id: guest.id,
                                                    name: guest.name,
                                                    phone: guest.phone
                                                };
                                                setSelectedGuest(simplifiedGuest);
                                                setSelectedGuestId(guest?.id || null);
                                            }}
                                            placeholder="Nombre del invitado..."
                                            labelKey="name"
                                            renderItem={(guest) => (
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {guest.name}
                                                    </div>
                                                    <div className="text-xs text-[#86868b] dark:text-[#98989d]">
                                                        {guest.phone || 'Sin teléfono'}
                                                    </div>
                                                </div>
                                            )}
                                            className="flex-1"
                                        />
                                    ) : (
                                        <AsyncSearchSelect
                                            fetchItems={async (term) => {
                                                try {
                                                    // Get users from my network only (ADMIN gets all users)
                                                    const networkResponse = await api.get('/users/my-network/all');
                                                    const networkUsers = networkResponse.data;

                                                    // Check if current user is ADMIN
                                                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                                    const isAdmin = currentUser.roles?.includes('ADMIN');

                                                    // If no network users, provide helpful feedback
                                                    if (!networkUsers || networkUsers.length === 0) {
                                                        // Return a special indicator to show a message
                                                        return [{ 
                                                            _specialMessage: true,
                                                            message: isAdmin 
                                                                ? 'No hay usuarios disponibles en el sistema.' 
                                                                : 'No tienes usuarios en tu red de discipulado. Solo los líderes (Líder de 12, Pastor) pueden asignar discípulos a células.',
                                                            fullName: 'Sin usuarios disponibles',
                                                            disabled: true,
                                                            id: 'special-no-network'
                                                        }];
                                                    }

                                                    // Filter to include only LIDER_DOCE, LIDER_CELULA, and DISCIPULO roles
                                                    const filteredUsers = networkUsers.filter(user => {
                                                        const userRoles = user.roles || [];
                                                        return userRoles.includes('LIDER_DOCE') || 
                                                               userRoles.includes('LIDER_CELULA') || 
                                                               userRoles.includes('DISCIPULO');
                                                    });

                                                    // If no users after filtering, show appropriate message
                                                    if (filteredUsers.length === 0) {
                                                        return [{ 
                                                            _specialMessage: true,
                                                            message: isAdmin 
                                                                ? 'No hay usuarios con roles compatibles para asignar a células (se necesitan roles: Líder de 12, Líder de Célula, Discípulo).'
                                                                : 'Los usuarios en tu red no tienen roles compatibles para asignar a células (se necesitan roles: Líder de 12, Líder de Célula, Discípulo).',
                                                            fullName: 'Sin usuarios compatibles',
                                                            disabled: true,
                                                            id: 'special-no-compatible'
                                                        }];
                                                    }

                                                    // Filter by search term if provided
                                                    if (term && term.length > 0) {
                                                        const searchTerm = term.toLowerCase();
                                                        const searchFiltered = filteredUsers.filter(user =>
                                                            user.fullName.toLowerCase().includes(searchTerm) ||
                                                            user.email.toLowerCase().includes(searchTerm)
                                                        );
                                                        
                                                        if (searchFiltered.length === 0) {
                                                            return [{ 
                                                                _specialMessage: true,
                                                                message: `No se encontraron usuarios que coincidan con "${term}" ${isAdmin ? 'en el sistema' : 'en tu red'}.`,
                                                                fullName: 'Sin resultados',
                                                                disabled: true,
                                                                id: 'special-no-search'
                                                            }];
                                                        }
                                                        
                                                        return searchFiltered;
                                                    }

                                                    return filteredUsers;
                                                } catch (error) {
                                                    console.error('Error fetching users for assignment:', error);
                                                    toast.error('Error al cargar usuarios disponibles');
                                                    return [];
                                                }
                                            }}
                                            selectedValue={selectedMember}
                                            labelKey="fullName"
                                            placeholder="Buscar discípulo..."
                                            className="flex-1"
                                            renderItem={(item) => {
                                                if (item._specialMessage) {
                                                    return (
                                                        <div className="p-3 text-center">
                                                            <div className="font-medium text-[#1d1d1f] dark:text-[#98989d] mb-1">
                                                                {item.fullName}
                                                            </div>
                                                            <div className="text-xs text-[#86868b] dark:text-[#86868b] leading-relaxed">
                                                                {item.message}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                
                                                // Regular user display
                                                return (
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">
                                                            {item.fullName}
                                                        </div>
                                                        <div className="text-xs text-[#86868b] dark:text-[#98989d]">
                                                            {item.email}
                                                        </div>
                                                        <div className="flex gap-1 mt-1">
                                                            {item.roles.map(role => (
                                                                <span 
                                                                    key={role}
                                                                    className={`px-2 py-1 text-xs rounded-full ${
                                                                        role === 'LIDER_DOCE' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                                        role === 'LIDER_CELULA' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                                        role === 'DISCIPULO' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                                        'bg-[#f5f5f7] text-[#1d1d1f] dark:bg-gray-900 dark:text-gray-200'
                                                                    }`}
                                                                >
                                                                    {role === 'LIDER_DOCE' ? 'Líder 12' :
                                                                     role === 'LIDER_CELULA' ? 'Líder Célula' :
                                                                     role === 'DISCIPULO' ? 'Discípulo' : role}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                            onSelect={(item) => {
                                                // Prevent selection of special message items
                                                if (item._specialMessage) {
                                                    return;
                                                }
                                                setSelectedMember(item);
                                            }}
                                        />
                                    )}
                                    <Button
                                        onClick={handleAssignMember}
                                        disabled={(!selectedMember && !selectedGuestId) || loading}
                                        variant="primary"
                                    >
                                        Asignar
                                    </Button>
                                </div>
                            </div>

                            {/* Assigned Members List */}
                            <div>
                                <h4 className="text-lg font-semibold text-[#1d1d1f] dark:text-white mb-3">
                                    Discípulos Asignados ({assignedMembers.length})
                                </h4>
                                {assignedMembers.length === 0 ? (
                                    <p className="text-[#86868b] dark:text-[#98989d] text-sm italic">
                                        No hay discípulos asignados a esta célula
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {assignedMembers.map(member => (
                                            <div key={member.id} className="flex justify-between items-center p-3 bg-[#f5f5f7] dark:bg-[#272729] rounded-lg">
                                                <div>
                                                    <p className="font-medium text-[#1d1d1f] dark:text-white">{member.fullName}</p>
                                                    <p className="text-xs text-[#86868b] dark:text-[#98989d]">{member.email}</p>
                                                </div>
                                                <Button
                                                    onClick={() => handleRemoveMember(member.id, member.type)}
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center sm:p-4">
                    <div className="bg-white dark:bg-[#272729] sm:rounded-2xl shadow-xl w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[95vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-4 sm:p-6 border-b border-[#d1d1d6] dark:border-[#3a3a3c] flex justify-between items-center flex-shrink-0">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Users className="w-6 h-6 text-blue-600" />
                                {isEditing ? 'Editar Célula' : 'Nueva Célula'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setIsEditing(false);
                                    setEditingCellId(null);
                                    setSelectedLeaderRole('');
                                    setSelectedLeader(null);
                                    setSelectedHost(null);
                                    setSelectedLiderDoce(null);
                                    setFormData({
                                        name: '',
                                        leaderId: '',
                                        hostId: '',
                                        liderDoceId: '',
                                        address: '',
                                        city: '',
                                        barrio: '',
                                        network: '',
                                        spiritualMappingUrl: '',
                                        fastingDate: '',
                                        rhemaWord: '',
                                        pastorsMeeting: false,
                                        dayOfWeek: 'Viernes',
                                        time: '19:00',
                                        cellType: 'ABIERTA'
                                    });
                                }}
                                className="text-gray-400 hover:text-[#1d1d1f] dark:hover:text-gray-300 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="space-y-4 sm:space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Nombre de la Célula <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                                placeholder="Ej: Célula Centro"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Tipo de Célula <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                required
                                                value={formData.cellType}
                                                onChange={e => setFormData({ ...formData, cellType: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                            >
                                                <option value="ABIERTA">Abierta</option>
                                                <option value="CERRADA">Cerrada</option>
                                                <option value="VIRTUAL">Virtual</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Líder 12
                                            </label>
                                            <AsyncSearchSelect
                                                fetchItems={async (term) => {
                                                    const response = await api.get('/enviar/eligible-doce-leaders');
                                                    const leaders = response.data || [];
                                                    if (!term) return leaders;
                                                    return leaders.filter(l => 
                                                        l.fullName.toLowerCase().includes(term.toLowerCase()) ||
                                                        (l.spouseName && l.spouseName.toLowerCase().includes(term.toLowerCase()))
                                                    );
                                                }}
                                                selectedValue={selectedLiderDoce}
                                                onSelect={(user) => {
                                                    setFormData({ ...formData, liderDoceId: user?.id || '' });
                                                    setSelectedLiderDoce(user);
                                                }}
                                                placeholder="Seleccionar Líder 12"
                                                labelKey="fullName"
                                                disabled={currentUser?.roles?.includes('LIDER_DOCE')}
                                                renderItem={(leader) => (
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">
                                                            {leader.fullName}
                                                        </div>
                                                        {leader.spouseName && (
                                                            <div className="text-xs text-[#86868b] dark:text-[#98989d]">
                                                                Pareja: {leader.spouseName}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Líder de la Célula <span className="text-red-400">*</span>
                                            </label>
                                            <AsyncSearchSelect
                                                fetchItems={(term) => api.get('/users/search', { params: { search: term, role: ['LIDER_DOCE', 'LIDER_CELULA'] } }).then(res => res.data)}
                                                selectedValue={selectedLeader}
                                                onSelect={(user) => {
                                                    setFormData({ ...formData, leaderId: user?.id || '' });
                                                    setSelectedLeader(user);
                                                }}
                                                placeholder="Seleccionar Líder"
                                                labelKey="fullName"
                                                disabled={currentUser?.roles?.includes('PASTOR')}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Anfitrión <span className="text-red-400">*</span>
                                            </label>
                                            <AsyncSearchSelect
                                                fetchItems={(term) => {
                                                    // Búsqueda de anfitriones (pueden ser discípulos o líderes)
                                                    return api.get('/users/search', { params: { search: term } }).then(res => res.data);
                                                }}
                                                selectedValue={selectedHost}
                                                onSelect={(user) => {
                                                    setFormData({ ...formData, hostId: user?.id || '' });
                                                    setSelectedHost(user);
                                                }}
                                                placeholder="Sin anfitrión"
                                                labelKey="fullName"
                                                disabled={!formData.leaderId}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Día <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                required
                                                value={formData.dayOfWeek}
                                                onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                            >
                                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Hora <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                required
                                                value={formData.time}
                                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Ciudad <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.city}
                                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                                placeholder="Ej: Manizales"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Barrio
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.barrio}
                                                onChange={e => setFormData({ ...formData, barrio: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                                placeholder="Ej: La Estrella"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                {formData.cellType === 'VIRTUAL' ? 'URL de Reunión' : 'Dirección'} <span className="text-red-400">*</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type={formData.cellType === 'VIRTUAL' ? 'url' : 'text'}
                                                    required
                                                    value={formData.address}
                                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                    className="flex-1 px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                                />
                                                {formData.cellType !== 'VIRTUAL' && (
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
                                                )}
                                            </div>
                                        </div>
                                        {formData.cellType === 'VIRTUAL' && formData.address && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                ✓ URL configurada: <a href={formData.address} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">Abrir reunión</a>
                                            </p>
                                        )}
                                        {(formData.latitude && formData.longitude) && formData.cellType !== 'VIRTUAL' && (
                                            <p className="text-xs text-green-600 mt-1">
                                                ✓ Coordenadas: {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Red
                                            </label>
                                            <select
                                                value={formData.network}
                                                onChange={e => setFormData({ ...formData, network: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                            >
                                                <option value="MIXTA">Mixta</option>
                                                <option value="HOMBRES">Hombres</option>
                                                <option value="MUJERES">Mujeres</option>
                                                <option value="JOVENES">Jóvenes</option>
                                                <option value="NIÑOS">Niños</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Mapeo Espiritual (URL)
                                            </label>
                                            <input
                                                type="url"
                                                value={formData.spiritualMappingUrl}
                                                onChange={e => setFormData({ ...formData, spiritualMappingUrl: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                                placeholder="https://..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Fecha de Ayuno
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.fastingDate}
                                                onChange={e => setFormData({ ...formData, fastingDate: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Palabra Rhema
                                            </label>
                                            <textarea
                                                value={formData.rhemaWord}
                                                onChange={e => setFormData({ ...formData, rhemaWord: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                                placeholder="Palabra de Dios para la célula..."
                                                rows={2}
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                                                Reunión de Pastores
                                            </label>
                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    type="checkbox"
                                                    id="pastorsMeeting"
                                                    checked={formData.pastorsMeeting}
                                                    onChange={e => setFormData({ ...formData, pastorsMeeting: e.target.checked })}
                                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                                />
                                                <label htmlFor="pastorsMeeting" className="text-sm text-[#1d1d1f] dark:text-white/80">
                                                    Esta célula asiste a reunión de pastores
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-[#d1d1d6] dark:border-[#3a3a3c] bg-[#f5f5f7] dark:bg-gray-900 p-4 flex justify-end gap-2 flex-shrink-0">
                                <Button
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setIsEditing(false);
                                        setEditingCellId(null);
                                        setSelectedLeaderRole('');
                                        setSelectedLeader(null);
                                        setSelectedHost(null);
                                        setSelectedLiderDoce(null);
                                        setFormData({
                                            name: '',
                                            leaderId: '',
                                            hostId: '',
                                            liderDoceId: '',
                                            address: '',
                                            city: '',
                                            barrio: '',
                                            network: '',
                                            spiritualMappingUrl: '',
                                            fastingDate: '',
                                            rhemaWord: '',
                                            pastorsMeeting: false,
                                            dayOfWeek: 'Viernes',
                                            time: '19:00',
                                            cellType: 'ABIERTA'
                                        });
                                    }}
                                    variant="outline"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    variant="primary"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{isEditing ? 'Actualizar' : 'Guardar'}</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Map Selection Modal */}
            {showMapModal && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center sm:p-4">
                    <div className="bg-white dark:bg-[#272729] sm:rounded-2xl shadow-xl w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-3 sm:p-4 border-b border-[#d1d1d6] dark:border-[#3a3a3c] flex justify-between items-center flex-shrink-0">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
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
                                className="text-gray-400 hover:text-[#1d1d1f] dark:hover:text-gray-300 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col">
                            {/* Search bar */}
                            <div className="p-3 bg-[#f5f5f7] dark:bg-gray-900 border-b border-[#d1d1d6] dark:border-[#3a3a3c]">
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
                                        className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#34c759]"
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
                                <div className="max-h-32 overflow-y-auto bg-white dark:bg-[#272729] border-b border-[#d1d1d6] dark:border-[#3a3a3c]">
                                    {mapResults.map((result, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleSelectAddress(result)}
                                            className="w-full text-left px-3 py-2 hover:bg-[#f5f5f7] dark:hover:bg-gray-700 border-b border-gray-100 dark:border-[#3a3a3c] last:border-0"
                                        >
                                            <p className="text-xs text-[#1d1d1f] dark:text-gray-200 line-clamp-1">
                                                {result.display_name}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Map */}
                            <div className="flex-1 relative min-h-[400px]">
                                <MapContainer
                                    center={mapCenter}
                                    zoom={13}
                                    style={{ height: '100%', width: '100%', minHeight: '400px' }}
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
                                    <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-[#272729] rounded-lg shadow-lg p-3 z-[1000]">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                                                    Ubicación seleccionada
                                                </p>
                                                <p className="text-xs text-[#86868b] dark:text-[#98989d] line-clamp-2">
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

                        <div className="border-t border-[#d1d1d6] dark:border-[#3a3a3c] bg-[#f5f5f7] dark:bg-gray-900 p-4 flex justify-end gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMapModal(false);
                                    setSelectedCoords(null);
                                    setMapAddress('');
                                    setMapResults([]);
                                }}
                                className="px-3 py-2 text-sm text-[#1d1d1f] dark:text-white/80 bg-white dark:bg-[#272729] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCoords}
                                disabled={!selectedCoords}
                                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                <MapPin size={16} />
                                <span>Confirmar</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                    <DotIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <AsyncSearchSelect
                        fetchItems={(term) => {
                            const params = { search: term };
                            if (currentUser?.roles?.includes('PASTOR')) {
                                params.role = 'LIDER_DOCE';
                            } else {
                                params.role = 'LIDER_DOCE';
                            }
                            return api.get('/users/search', { params }).then(res => res.data);
                        }}
                        selectedValue={eligibleDoceLeaders.find(l => l.id === parseInt(filterDoce)) || (filterDoce ? { id: filterDoce, fullName: 'Cargando...' } : null)}
                        onSelect={(user) => setFilterDoce(user?.id || '')}
                        placeholder="Buscar Líder 12..."
                        labelKey="fullName"
                        className="w-full"
                    />
                </div>
                <div className="relative">
                    <DotIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <AsyncSearchSelect
                        fetchItems={(term) => {
                            const params = { search: term, role: 'LIDER_CELULA' };
                            return api.get('/users/search', { params }).then(res => res.data);
                        }}
                        selectedValue={eligibleLeaders.find(l => l.id === parseInt(filterLeader)) || (filterLeader ? { id: filterLeader, fullName: 'Cargando...' } : null)}
                        onSelect={(user) => setFilterLeader(user?.id || '')}
                        placeholder="Buscar Líder de Célula..."
                        labelKey="fullName"
                        className="w-full"
                    />
                </div>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        value={filterBarrio}
                        onChange={(e) => setFilterBarrio(e.target.value)}
                        placeholder="Filtrar por Barrio..."
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                    />
                </div>
                <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                        value={filterDayOfWeek}
                        onChange={(e) => setFilterDayOfWeek(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                    >
                        <option value="">Todos los días</option>
                        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
                    <div className="flex items-center p-1.5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-2xl shadow-inner">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 text-[12px] weight-590 ${viewMode === 'cards' 
                                ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg shadow-[var(--ln-brand-indigo)]/20 active:scale-95' 
                                : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'
                            }`}
                        >
                            <SquaresFour size={18} weight="bold" />
                            Tarjetas
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 text-[12px] weight-590 ${viewMode === 'table' 
                                ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg shadow-[var(--ln-brand-indigo)]/20 active:scale-95' 
                                : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'
                            }`}
                        >
                            <List size={18} weight="bold" />
                            Tabla
                        </button>
                    </div>
                        <p className="text-xs text-[#86868b] whitespace-nowrap">
                            Mostrando {filteredCells.length} células
                        </p>
            </div>

            {/* List of Cells */}
            {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCells.map(cell => (
                        <div key={cell.id} className="bg-white dark:bg-[#272729] rounded-lg shadow p-6 border border-gray-100 dark:border-[#3a3a3c] hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white">{cell.name}</h3>
                                <div className="flex gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        cell.cellType === 'CERRADA' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 
                                        cell.cellType === 'VIRTUAL' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    }`}>
                                        {cell.cellType}
                                    </span>
                                    <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                        {(cell._count?.members ?? 0) + (cell._count?.guests ?? 0)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-[#1d1d1f] dark:text-white/80">
                                <div className="flex items-center gap-2">
                                    <Users size={16} className="text-gray-400" />
                                    <span><strong className="text-[#1d1d1f] dark:text-white/80">Líder:</strong> {cell.leader?.fullName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-gray-400" />
                                    <span><strong className="text-[#1d1d1f] dark:text-white/80">Horario:</strong> {cell.dayOfWeek} {cell.time}</span>
                                </div>
                                {cell.liderDoce && (
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-blue-300" />
                                        <span><strong className="text-[#1d1d1f] dark:text-white/80">Líder 12:</strong> {cell.liderDoce?.fullName}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Tag size={16} className="text-gray-400" />
                                    <span><strong className="text-[#1d1d1f] dark:text-white/80">Tipo:</strong> {cell.cellType}</span>
                                </div>
                                {cell.spiritualMappingUrl && (
                                    <div className="flex items-center gap-2">
                                        <Image size={16} className="text-purple-400" />
                                        <span className="text-xs text-[#86868b] italic">
                                            <a href={cell.spiritualMappingUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 underline">
                                                Ver Cartografía Espiritual
                                            </a>
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span><strong className="text-[#1d1d1f] dark:text-white/80">Ciudad:</strong> {cell.city}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-gray-400" />
                                    <span><strong className="text-[#1d1d1f] dark:text-white/80">Horario:</strong> {cell.dayOfWeek} {cell.time}</span>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    {cell.cellType === 'VIRTUAL' ? (
                                        <>
                                            <MapPin size={16} className="text-purple-400" />
                                            <span className="text-xs text-[#86868b] italic">
                                                {cell.address ? (
                                                    <a href={cell.address} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 underline">
                                                        Unirse a virtual
                                                    </a>
                                                ) : (
                                                    'Sin URL configurada'
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <MapPin size={16} className="text-blue-400" />
                                            <span className="text-xs text-[#86868b] italic">
                                                {cell.latitude && cell.longitude
                                                    ? `${cell.latitude.toFixed(4)}, ${cell.longitude.toFixed(4)}`
                                                    : 'Sin ubicación en mapa'
                                                }
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#3a3a3c] flex justify-between items-center">
                                <div className="flex gap-4">
                                    <Button
                                        onClick={() => setSelectedCell(cell)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        Agregar Usuarios
                                    </Button>
                                    {canManageCells() && (
                                        <Button
                                            onClick={() => handleEditClick(cell)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-amber-600 hover:text-amber-800"
                                        >
                                            Editar
                                        </Button>
                                    )}
                                </div>
                                {canManageCells() && (
                                    <Button
                                        onClick={() => handleDeleteCell(cell.id)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700"
                                        icon={Trash}
                                    >
                                        Eliminar
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-[#272729] rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-[#f5f5f7] dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase tracking-wider">
                                    Líder
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase tracking-wider">
                                    Barrio / URL
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase tracking-wider">
                                    Horario
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase tracking-wider">
                                    Discípulos
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#272729] divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredCells.map(cell => (
                                <tr key={cell.id} className="hover:bg-[#f5f5f7] dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{cell.name}</div>
                                            <div className="flex gap-2 mt-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    cell.cellType === 'CERRADA' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 
                                                    cell.cellType === 'VIRTUAL' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                }`}>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d]">
                                        {cell.leader?.fullName || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d]">
                                        {cell.cellType === 'VIRTUAL' ? (
                                            cell.address ? (
                                                <a href={cell.address} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 underline">
                                                    Url de la reunión
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">Sin URL</span>
                                            )
                                        ) : (
                                            cell.barrio
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d]">
                                        {cell.dayOfWeek} {cell.time}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                            {(cell._count?.members ?? 0) + (cell._count?.guests ?? 0)}
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
                                                Agregar Usuarios
                                            </Button>
                                            {canManageCells() && (
                                                <Button
                                                    onClick={() => handleEditClick(cell)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-amber-600 hover:text-amber-800"
                                                >
                                                    Editar
                                                </Button>
                                            )}
                                            {canManageCells() && (
                                                <Button
                                                    onClick={() => handleDeleteCell(cell.id)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700"
                                                    icon={Trash}
                                                >
                                                    Eliminar
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            {/* Delete Cell Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteCellModal}
                onClose={() => {
                    setShowDeleteCellModal(false);
                    setCellToDelete(null);
                }}
                onConfirm={confirmDeleteCell}
                title="Eliminar Célula"
                message="¿Estás seguro de que deseas eliminar esta célula? Esta acción desvinculará a todos sus Discípulos."
                confirmText="Eliminar"
                cancelText="Cancelar"
            />

            {/* Remove Member Confirmation Modal */}
            <ConfirmationModal
                isOpen={showRemoveMemberModal}
                onClose={() => {
                    setShowRemoveMemberModal(false);
                    setMemberToRemove(null);
                    setMemberTypeToRemove(null);
                }}
                onConfirm={confirmRemoveMember}
                title="Desvincular Persona"
                message={memberTypeToRemove === 'GUEST' 
                    ? '¿Estás seguro de que deseas desvincular a este Invitado de la célula?'
                    : '¿Estás seguro de que deseas desvincular a este Discípulo de la célula?'
                }
                confirmText="Desvincular"
                cancelText="Cancelar"
            />
        </div>
    );
};

export default CellManagement;
