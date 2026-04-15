import { useState } from 'react';
import { SpinnerIcon, MagnifyingGlass, Funnel, PencilIcon, Trash, UserPlus, X, FloppyDiskIcon, UserCheckIcon, Users, Calendar, Clock, Phone, MapPin, Star, CheckCircle } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import { AsyncSearchSelect, Button } from './ui';
import useGuestManagement from '../hooks/useGuestManagement';
import { useAuth } from '../context/AuthContext';
import { DATA_POLICY_URL } from '../constants/policies';
import api from '../utils/api';

const GuestList = ({ refreshTrigger }) => {
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
        currentUser,
        fetchGuests,
        updateGuest,
        deleteGuest,
        convertGuestToMember,
        loadMore,
        pagination,
    } = useGuestManagement({ refreshTrigger });

    const [editingGuest, setEditingGuest] = useState(null);
    const [convertingGuest, setConvertingGuest] = useState(null);
    const [conversionEmail, setConversionEmail] = useState('');
    const [conversionPassword, setConversionPassword] = useState('');
    const [conversionConsent, setConversionConsent] = useState({
        dataPolicyAccepted: false,
        dataTreatmentAuthorized: false,
        minorConsentAuthorized: false
    });

    const handleSearch = () => {
        fetchGuests(1);
    };

    const handleUpdateGuest = async (guestId, updates) => {
        const res = await updateGuest(guestId, updates);
        if (res.success) setEditingGuest(null);
    };

    const handleDeleteGuest = async (guestId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este invitado?')) return;
        await deleteGuest(guestId);
    };

    const handleConvertToMember = async () => {
        if (!conversionEmail || !conversionPassword) {
            setError('Email y contraseña son requeridos');
            return;
        }

        const res = await convertGuestToMember(convertingGuest.id, {
            email: conversionEmail,
            password: conversionPassword,
            ...conversionConsent
        });
        if (!res.success) return;

        setConvertingGuest(null);
        setConversionEmail('');
        setConversionPassword('');
        setConversionConsent({
            dataPolicyAccepted: false,
            dataTreatmentAuthorized: false,
            minorConsentAuthorized: false
        });
        toast.success('Invitado consolidado a Discípulo exitosamente');
    };

    const getStatusBadgeColor = (status) => {
        const colors = {
            NUEVO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            CONTACTADO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            CONSOLIDADO: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
            GANADO: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        };
        return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
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

    // Estado para el filtro activo
    const [activeQuickFilter, setActiveQuickFilter] = useState('all');

    // Filtros rápidos modernos con iconos y colores
    const quickFilters = [
        { 
            id: 'all', 
            label: 'Todos', 
            icon: Users, 
            color: 'bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#272729] dark:text-white/80 border-[#d1d1d6] dark:border-[#3a3a3c]',
            activeColor: 'bg-blue-500 text-white border-blue-600 dark:bg-blue-600'
        },
        { 
            id: 'mine', 
            label: 'Mis invitados', 
            icon: UserPlus, 
            color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700',
            activeColor: 'bg-green-500 text-white border-green-600 dark:bg-green-600'
        },
        { 
            id: 'uncontacted', 
            label: 'Sin contactar', 
            icon: Clock, 
            color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
            activeColor: 'bg-yellow-500 text-white border-yellow-600 dark:bg-yellow-600'
        },
        { 
            id: 'contacted', 
            label: 'Contactados', 
            icon: Phone, 
            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700',
            activeColor: 'bg-blue-500 text-white border-blue-600 dark:bg-blue-600'
        },
        { 
            id: 'visited', 
            label: 'Visitados', 
            icon: MapPin, 
            color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300 dark:border-purple-700',
            activeColor: 'bg-purple-500 text-white border-purple-600 dark:bg-purple-600'
        },
        { 
            id: 'consolidated', 
            label: 'Consolidados', 
            icon: Star, 
            color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700',
            activeColor: 'bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600'
        },
        { 
            id: 'this_week', 
            label: 'Esta semana', 
            icon: Calendar, 
            color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700',
            activeColor: 'bg-indigo-500 text-white border-indigo-600 dark:bg-indigo-600'
        },
        { 
            id: 'this_month', 
            label: 'Este mes', 
            icon: Calendar, 
            color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-300 dark:border-pink-700',
            activeColor: 'bg-pink-500 text-white border-pink-600 dark:bg-pink-600'
        },
    ];

    const handleQuickFilter = (filterId) => {
        // Limpiar filtros anteriores
        setStatusFilter('');
        setInvitedByFilter(null);
        setLiderDoceFilter(null);
        setSearchTerm('');
        
        // Establecer filtro activo
        setActiveQuickFilter(filterId);

        switch (filterId) {
            case 'mine':
                setInvitedByFilter(currentUser?.id);
                break;
            case 'uncontacted':
                setStatusFilter('NUEVO');
                break;
            case 'contacted':
                setStatusFilter('CONTACTADO');
                break;
            case 'visited':
                setStatusFilter('CONSOLIDADO');
                break;
            case 'consolidated':
                setStatusFilter('GANADO');
                break;
            case 'this_week':
                // El backend manejará este filtro
                setSearchTerm('__this_week__');
                break;
            case 'this_month':
                setSearchTerm('__this_month__');
                break;
            default:
                // 'all' - no aplicar filtros específicos
                break;
        }

        // Aplicar el filtro
        setTimeout(() => fetchGuests(), 0);
    };

    // Función para verificar si un filtro está activo
    const isFilterActive = (filterId) => {
        if (activeQuickFilter === filterId) return true;
        
        // Verificación adicional basada en los valores actuales de los filtros
        switch (filterId) {
            case 'mine':
                return invitedByFilter === currentUser?.id;
            case 'uncontacted':
                return statusFilter === 'NUEVO';
            case 'contacted':
                return statusFilter === 'CONTACTADO';
            case 'visited':
                return statusFilter === 'CONSOLIDADO';
            case 'consolidated':
                return statusFilter === 'GANADO';
            case 'this_week':
                return searchTerm === '__this_week__';
            case 'this_month':
                return searchTerm === '__this_month__';
            default:
                return false;
        }
    };

    // Funciones auxiliares de permisos
    const canEditAllFields = (guest) => {
        const roles = currentUser?.roles || [];
        return roles.includes('ADMIN') || roles.includes('LIDER_DOCE');
    };

    const canDelete = (guest) => {
        const roles = currentUser?.roles || [];
        // Solo ADMIN y LIDER_DOCE pueden eliminar invitados
        // DISCIPULO no tiene permiso para eliminar
        return roles.includes('ADMIN') || roles.includes('LIDER_DOCE');
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-[#1d1d1f] dark:text-white mb-6">Lista de Invitados</h2>

            {error && (
                <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Filtros rápidos modernos */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Funnel size={18} className="text-[#86868b] dark:text-gray-400" />
                    <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white/80">Filtros rápidos</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {quickFilters.map((filter) => {
                        const isActive = isFilterActive(filter.id);
                        const Icon = filter.icon;
                        return (
                            <button
                                key={filter.id}
                                onClick={() => handleQuickFilter(filter.id)}
                                className={`
                                    px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 transform hover:scale-105
                                    flex items-center gap-2 shadow-sm hover:shadow-md
                                    ${isActive 
                                        ? filter.activeColor + ' shadow-md ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' 
                                        : filter.color + ' hover:opacity-80'
                                    }
                                `}
                                title={filter.label}
                            >
                                {Icon && <Icon size={16} weight={isActive ? 'fill' : 'regular'} />}
                                <span className="whitespace-nowrap">{filter.label}</span>
                                {isActive && (
                                    <CheckCircle size={14} weight="fill" className="ml-1" />
                                )}
                            </button>
                        );
                    })}
                </div>
                {activeQuickFilter !== 'all' && (
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-[#86868b] dark:text-gray-400">
                            Filtro activo: <strong>{quickFilters.find(f => f.id === activeQuickFilter)?.label}</strong>
                        </span>
                        <button
                            onClick={() => handleQuickFilter('all')}
                            className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                            Limpiar filtro
                        </button>
                    </div>
                )}
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Buscar por nombre..."
                        className="w-full pl-10 pr-4 py-2 bg-[#f5f5f7] dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                    />
                </div>

                <div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 bg-[#f5f5f7] dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                    >
                        <option value="">Estado (Todos)</option>
                        <option value="NUEVO">Nuevo</option>
                        <option value="CONTACTADO">Llamado</option>
                        <option value="CONSOLIDADO">Visitado</option>
                        <option value="GANADO">Consolidado</option>
                    </select>
                </div>

                <div>
                    <AsyncSearchSelect
                        fetchItems={(term) =>
                            api.get('/users/search', { params: { search: term } })
                                .then(res => res.data)
                        }
                        selectedValue={invitedByFilter}
                        onSelect={(user) => setInvitedByFilter(user || null)}
                        placeholder="Invitado por..."
                        labelKey="fullName"
                        renderItem={(user) => (
                            <div>
                                <div className="font-medium">{user.fullName}</div>
                                <div className="text-xs text-[#86868b]">{user.email}</div>
                            </div>
                        )}
                    />
                </div>

                <div>
                    <AsyncSearchSelect
                        fetchItems={(term) => {
                            const roleFilter = currentUser?.roles?.includes('PASTOR') ? "LIDER_DOCE,PASTOR" : "LIDER_DOCE";
                            return api.get('/users/search', {
                                params: { search: term, role: roleFilter }
                            }).then(res => res.data);
                        }}
                        selectedValue={liderDoceFilter}
                        onSelect={(user) => setLiderDoceFilter(user || null)}
                        placeholder={currentUser?.roles?.includes('PASTOR') ? "Líder de Célula..." : "Ministerio de..."}
                        labelKey="fullName"
                        renderItem={(user) => (
                            <div>
                                <div className="font-medium">{user.fullName}</div>
                                <div className="text-xs text-[#86868b]">{user.email}</div>
                            </div>
                        )}
                    />
                </div>
            </div>

            <Button
                onClick={handleSearch}
                icon={Funnel}
                className="mb-6"
            >
                Aplicar Filtros
            </Button>

            {/* Tabla de Invitados */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[#f5f5f7] dark:bg-gray-900/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Nombre</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Teléfono</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Estado</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Invitado Por</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Asignado a</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-200">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
                                    <SpinnerIcon size={24} className="animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : guests.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                                    No se encontraron invitados
                                </td>
                            </tr>
                        ) : (
                            guests.map((guest) => (
                                <tr key={guest.id} className="hover:bg-[#f5f5f7] dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={editingGuest.name}
                                                    onChange={(e) =>
                                                        setEditingGuest({ ...editingGuest, name: e.target.value })
                                                    }
                                                    disabled={!canEditAllFields(guest)}
                                                    className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-[#d1d1d6] dark:border-gray-500 rounded text-[#1d1d1f] dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    placeholder="Nombre"
                                                />
                                                <input
                                                    type="text"
                                                    value={editingGuest.address || ''}
                                                    onChange={(e) =>
                                                        setEditingGuest({ ...editingGuest, address: e.target.value })
                                                    }
                                                    disabled={!canEditAllFields(guest)}
                                                    className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-[#d1d1d6] dark:border-gray-500 rounded text-[#1d1d1f] dark:text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                    placeholder="Dirección"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-[#1d1d1f] dark:text-white text-sm font-medium">{guest.name}</p>
                                                {guest.address && (
                                                    <p className="text-[#86868b] dark:text-gray-400 text-xs">{guest.address}</p>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <input
                                                type="text"
                                                value={editingGuest.phone}
                                                onChange={(e) =>
                                                    setEditingGuest({ ...editingGuest, phone: e.target.value })
                                                }
                                                disabled={!canEditAllFields(guest)}
                                                className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-[#d1d1d6] dark:border-gray-500 rounded text-[#1d1d1f] dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        ) : (
                                            <span className="text-gray-600 dark:text-white/80 text-sm">{guest.phone}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <select
                                                value={editingGuest.status}
                                                onChange={(e) =>
                                                    setEditingGuest({ ...editingGuest, status: e.target.value })
                                                }
                                                className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-[#d1d1d6] dark:border-gray-500 rounded text-[#1d1d1f] dark:text-white text-sm"
                                            >
                                                <option value="NUEVO">Nuevo</option>
                                                <option value="CONTACTADO">Llamado</option>
                                                <option value="CONSOLIDADO">Visitado</option>
                                                <option value="GANADO">Consolidado</option>
                                            </select>
                                        ) : (
                                            <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusBadgeColor(guest.status)}`}>
                                                {getStatusLabel(guest.status)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            canEditAllFields(guest) ? (
                                                <AsyncSearchSelect
                                                    fetchItems={(term) =>
                                                        api.get('/users/search', { params: { search: term } })
                                                            .then(res => res.data)
                                                    }
                                                    selectedValue={editingGuest.invitedBy}
                                                    onSelect={(user) => setEditingGuest({ ...editingGuest, invitedById: user?.id, invitedBy: user })}
                                                    placeholder="Invitado por..."
                                                    labelKey="fullName"
                                                />
                                            ) : (
                                                <p className="text-[#1d1d1f] dark:text-white text-sm">{guest.invitedBy?.fullName || 'N/A'}</p>
                                            )
                                        ) : (
                                            <p className="text-[#1d1d1f] dark:text-white text-sm">{guest.invitedBy?.fullName || 'N/A'}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingGuest?.id === guest.id ? (
                                            <AsyncSearchSelect
                                                fetchItems={(term) =>
                                                    api.get('/users/search', { params: { search: term } })
                                                        .then(res => res.data)
                                                }
                                                selectedValue={editingGuest.assignedTo}
                                                onSelect={(user) => setEditingGuest({ ...editingGuest, assignedToId: user?.id, assignedTo: user })}
                                                placeholder="Asignar a..."
                                                labelKey="fullName"
                                            />
                                        ) : (
                                            <p className="text-[#1d1d1f] dark:text-white text-sm">{guest.assignedTo?.fullName || 'Pendiente'}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end space-x-2">
                                            {editingGuest?.id === guest.id ? (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            handleUpdateGuest(guest.id, {
                                                                name: editingGuest.name,
                                                                phone: editingGuest.phone,
                                                                address: editingGuest.address,
                                                                status: editingGuest.status,
                                                                invitedById: editingGuest.invitedById,
                                                                assignedToId: editingGuest.assignedToId
                                                            })
                                                        }
                                                        className="p-1 text-green-400 hover:text-green-300"
                                                        title="Guardar"
                                                    >
                                                        <FloppyDiskIcon size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingGuest(null)}
                                                        className="p-1 text-gray-400 hover:text-gray-300"
                                                        title="Cancelar"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setEditingGuest({
                                                            ...guest,
                                                            invitedById: guest.invitedBy?.id,
                                                            assignedToId: guest.assignedTo?.id,
                                                            invitedBy: typeof guest.invitedBy === 'object' ? guest.invitedBy : null,
                                                            assignedTo: typeof guest.assignedTo === 'object' ? guest.assignedTo : null
                                                        })}
                                                        className="p-1 text-blue-400 hover:text-blue-300"
                                                        title="Editar"
                                                    >
                                                        <PencilIcon size={18} />
                                                    </button>
                                                    {canDelete(guest) && (
                                                        <button
                                                            onClick={() => handleDeleteGuest(guest.id)}
                                                            className="p-1 text-red-400 hover:text-red-300"
                                                            title="Eliminar"
                                                        >
                                                            <Trash size={18} />
                                                        </button>
                                                    )}
                                                    {!currentUser?.roles?.includes('PASTOR') && (
                                                        <button
                                                            onClick={() => setConvertingGuest(guest)}
                                                            className="p-1 text-green-400 hover:text-green-300"
                                                            title="Convertir a Discípulo"
                                                        >
                                                            <UserCheckIcon size={18} />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación - Cargar más */}
            {pagination.hasMore && (
                <div className="mt-6 text-center">
                    <Button
                        onClick={loadMore}
                        disabled={loading}
                        variant="secondary"
                    >
                        {loading ? (
                            <>
                                <SpinnerIcon size={18} className="animate-spin mr-2" />
                                Cargando...
                            </>
                        ) : (
                            `Cargar más (${pagination.total - guests.length} restantes)`
                        )}
                    </Button>
                </div>
            )}

            {/* Información de paginación */}
            {pagination.total > 0 && (
                <div className="mt-4 text-center text-sm text-[#86868b] dark:text-gray-400">
                    Mostrando {guests.length} de {pagination.total} invitados
                </div>
            )}

            {/* Modal para convertir a Discípulo */}
            {
                convertingGuest && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-xl">
                            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white mb-4">
                                Convertir a Discípulo: {convertingGuest.name}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={conversionEmail}
                                        onChange={(e) => setConversionEmail(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#272729] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                        placeholder="correo@ejemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-1">
                                        Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        value={conversionPassword}
                                        onChange={(e) => setConversionPassword(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#272729] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                        placeholder="Contraseña"
                                    />
                                </div>

                                {/* Data Authorization Checks */}
                                <div className="bg-[#f5f5f7] dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                                    <label className="flex items-start gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            required
                                            className="mt-1 w-3.5 h-3.5 rounded border-[#d1d1d6] dark:border-[#3a3a3c] text-blue-600 focus:ring-blue-500"
                                            checked={conversionConsent.dataPolicyAccepted}
                                            onChange={e => setConversionConsent({ ...conversionConsent, dataPolicyAccepted: e.target.checked })}
                                        />
                                        <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-[#1d1d1f] dark:group-hover:text-white transition-colors">
                                            Acepto la <a href={DATA_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-semibold">Política de Tratamiento de Datos</a>.
                                        </span>
                                    </label>
                                    <label className="flex items-start gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            required
                                            className="mt-1 w-3.5 h-3.5 rounded border-[#d1d1d6] dark:border-[#3a3a3c] text-blue-600 focus:ring-blue-500"
                                            checked={conversionConsent.dataTreatmentAuthorized}
                                            onChange={e => setConversionConsent({ ...conversionConsent, dataTreatmentAuthorized: e.target.checked })}
                                        />
                                        <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-[#1d1d1f] dark:group-hover:text-white transition-colors">
                                            Autorizo el tratamiento de mis datos personales.
                                        </span>
                                    </label>
                                </div>
                                <div className="flex justify-end space-x-2 mt-6">
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            setConvertingGuest(null);
                                            setConversionEmail('');
                                            setConversionPassword('');
                                            setConversionConsent({
                                                dataPolicyAccepted: false,
                                                dataTreatmentAuthorized: false,
                                                minorConsentAuthorized: false
                                            });
                                        }}
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
                )
            }
        </div >
    );
};

export default GuestList;

GuestList.propTypes = {
    refreshTrigger: PropTypes.any,
};
