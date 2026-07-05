import { useState, useEffect } from 'react';
import { User, Phone, WarningCircle, X, CheckCircle, Funnel, MagnifyingGlass, WhatsappLogo, Eye } from '@phosphor-icons/react';
import AsyncSearchSelect from './ui/AsyncSearchSelect';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import ConfirmationModal from './ConfirmationModal';
import { getWhatsAppPhone } from '../utils/phone';
import PropTypes from 'prop-types';

const DiscipleTracking = ({ refreshTrigger }) => {
    const { user, isCoordinator, isDoceLeader } = useAuth();
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [formData, setFormData] = useState({
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        observation: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [pageSize] = useState(15);

    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [liderDoceFilter, setLiderDoceFilter] = useState(null);
    const [noCell, setNoCell] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: pageSize,
                role: roleFilter || 'DISCIPULO,LIDER_CELULA'
            };

            if (search) params.search = search;
            if (liderDoceFilter) params.liderDoceId = liderDoceFilter.id;

            const response = await api.get('/consolidar/stats/disciple-users', { params });

            setUsersList(response.data.users || []);
            setTotalPages(response.data.pagination?.totalPages || 1);
            setTotalUsers(response.data.pagination?.total || 0);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, roleFilter, liderDoceFilter, noCell, refreshTrigger]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setSearch('');
        setSearchInput('');
        setRoleFilter('');
        if (liderDoceFilter) setLiderDoceFilter(null);
        setNoCell(false);
        setCurrentPage(1);
    };

    const hasActiveFilters = search || roleFilter || liderDoceFilter || noCell;

    const handleOpenModal = (usr, type) => {
        setSelectedUser(usr);
        setModalType(type);
        setFormData({
            date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            observation: ''
        });
    };

    const getAlerts = (usr) => {
        const alerts = [];

        if (!usr.cellId) {
            alerts.push({ type: 'nocell', message: 'Sin célula asignada' });
        }

        const lastChurch = usr.churchAttendances?.[0];
        if (lastChurch) {
            const daysSince = Math.floor((new Date() - new Date(lastChurch.date)) / (1000 * 60 * 60 * 24));
            if (daysSince > 30) {
                alerts.push({ type: 'attendance', message: 'Inasistencia (+1 mes)' });
            }
        } else {
            alerts.push({ type: 'attendance', message: 'Sin asistencia registrada' });
        }

        return alerts;
    };

    const getRoleBadgeClass = (roleName) => {
        switch (roleName) {
            case 'LIDER_CELULA': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'DISCIPULO': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
        }
    };

    const getRoleLabel = (roleName) => {
        switch (roleName) {
            case 'LIDER_CELULA': return 'Líder Célula';
            case 'DISCIPULO': return 'Discípulo';
            default: return roleName;
        }
    };

    if (loading && usersList.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse"></div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className="p-6 space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="space-y-3">
                                <div className="flex items-center space-x-4">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5 animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Seguimiento de Discípulos y Líderes</h2>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${hasActiveFilters
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                >
                    <Funnel size={18} weight={showFilters ? 'fill' : 'bold'} />
                    Filtros
                    {hasActiveFilters && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                            {[search, roleFilter, liderDoceFilter, noCell].filter(Boolean).length}
                        </span>
                    )}
                </button>
            </div>

            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                Buscar
                            </label>
                            <form onSubmit={handleSearch} className="relative">
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Nombre o email..."
                                    className="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                                />
                            </form>
                        </div>

                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                Rol
                            </label>
                            <select
                                value={roleFilter}
                                onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                            >
                                <option value="">Todos (Discípulos y Líderes)</option>
                                <option value="DISCIPULO">Discípulos</option>
                                <option value="LIDER_CELULA">Líderes de Célula</option>
                            </select>
                        </div>

                        {(!isDoceLeader() || isCoordinator('consolidar')) && (
                            <div className="flex-[2] min-w-[250px]">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                    Líder de 12
                                </label>
                                <AsyncSearchSelect
                                    fetchItems={(term) => {
                                        const roleFilter = user?.roles?.includes('PASTOR') ? 'LIDER_DOCE,PASTOR' : 'LIDER_DOCE';
                                        return api.get('/users/search', {
                                            params: { search: term, role: roleFilter }
                                        }).then(res => res.data);
                                    }}
                                    selectedValue={liderDoceFilter}
                                    onSelect={(u) => { setLiderDoceFilter(u || null); setCurrentPage(1); }}
                                    placeholder="Buscar líder de 12..."
                                    labelKey="fullName"
                                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`relative flex items-center justify-center w-5 h-5 rounded border-2 transition-all ${noCell
                                ? 'bg-amber-500 border-amber-500'
                                : 'border-gray-300 dark:border-gray-600 group-hover:border-amber-400'
                                }`}>
                                <input
                                    type="checkbox"
                                    checked={noCell}
                                    onChange={(e) => { setNoCell(e.target.checked); setCurrentPage(1); }}
                                    className="absolute opacity-0 w-full h-full cursor-pointer"
                                />
                                {noCell && <CheckCircle size={14} className="text-white" weight="fill" />}
                            </div>
                            <span className={`text-sm font-medium ${noCell ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                Sin célula asignada
                            </span>
                        </label>

                        <div className="flex-1"></div>

                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <X size={16} weight="bold" />
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalUsers)} de {totalUsers} usuarios
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1 || loading}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Anterior
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    const isActive = currentPage === pageNum;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            disabled={loading}
                                            className={`min-w-[32px] h-8 px-2 text-sm font-medium rounded-md transition-colors ${isActive
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages || loading}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Líder</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Célula</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Iglesia</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {usersList.map((usr) => {
                                const alerts = getAlerts(usr);
                                const liderHierarchy = usr.hierarchy?.find(h => h.role === 'LIDER_CELULA' || h.role === 'LIDER_DOCE');

                                return (
                                    <tr key={usr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {usr.fullName || 'Sin nombre'}
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {usr.roles?.filter(r => r === 'DISCIPULO' || r === 'LIDER_CELULA').map(r => (
                                                    <span key={r} className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getRoleBadgeClass(r)}`}>
                                                        {getRoleLabel(r)}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {alerts.map((alert, idx) => (
                                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                        <WarningCircle className="w-3 h-3 mr-1" />
                                                        {alert.message}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                                <User className="w-4 h-4 mr-2 text-gray-400" />
                                                {usr.email || 'N/A'}
                                            </div>
                                            {usr.phone && (
                                                <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                                    {usr.phone}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {liderHierarchy ? (
                                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                                    <span className="font-medium">{liderHierarchy.parentName}</span>
                                                    <span className="text-[10px] text-gray-500 ml-1 uppercase">
                                                        ({liderHierarchy.role === 'LIDER_CELULA' ? 'Líder' : 'Líder 12'})
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">Sin asignar</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {usr.cell ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{usr.cell.name}</span>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                    <WarningCircle className="w-3 h-3 mr-1" />
                                                    Sin célula
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {usr.churchAttendances?.[0] ? (
                                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                                    {new Date(usr.churchAttendances[0].date).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Sin registro</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {usr.phone && (
                                                    <button
                                                        onClick={() => handleOpenModal(usr, 'whatsapp')}
                                                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <WhatsappLogo className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleOpenModal(usr, 'history')}
                                                    className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    title="Ver detalle"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {!loading && usersList.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        No se encontraron usuarios con los filtros seleccionados.
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                        Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalUsers)} de {totalUsers} usuarios
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || loading}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Anterior
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                const isActive = currentPage === pageNum;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        disabled={loading}
                                        className={`min-w-[32px] h-8 px-2 text-sm font-medium rounded-md transition-colors ${isActive
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || loading}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}

            {/* WhatsApp Modal */}
            {modalType === 'whatsapp' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-2">
                                <WhatsappLogo className="w-5 h-5 text-green-500" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Enviar WhatsApp a {selectedUser?.fullName || selectedUser?.email}
                                </h3>
                            </div>
                            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mensaje personalizado</label>
                                <textarea
                                    value={formData.observation}
                                    onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 bg-transparent dark:text-white resize-none"
                                    placeholder="Escribe el mensaje a enviar..."
                                    rows="4"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setModalType(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    if (!formData.observation.trim()) {
                                        toast.error('El mensaje no puede estar vacío');
                                        return;
                                    }
                                    try {
                                        await api.post(`/users/${selectedUser.id}/whatsapp-log`, {
                                            message: formData.observation
                                        });
                                        toast.success('Mensaje registrado exitosamente');
                                    } catch (error) {
                                        console.error('Error logging WhatsApp:', error);
                                    }
                                    const text = encodeURIComponent(formData.observation);
                                    const whatsappPhone = getWhatsAppPhone(selectedUser.phone);
                                    window.open(`https://wa.me/${whatsappPhone}?text=${text}`, '_blank');
                                    setModalType(null);
                                }}
                                disabled={!formData.observation.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm flex items-center gap-2"
                            >
                                <WhatsappLogo className="w-4 h-4" />
                                Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {modalType === 'history' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detalle del Usuario</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedUser?.fullName || selectedUser?.email}</p>
                            </div>
                            <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Profile Info */}
                            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Información General</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Nombre:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{selectedUser?.fullName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Email:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{selectedUser?.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Teléfono:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{selectedUser?.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Roles:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {selectedUser?.roles?.map(r => (
                                                <span key={r} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getRoleBadgeClass(r)}`}>
                                                    {getRoleLabel(r)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Hierarchy */}
                            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Jerarquía</h4>
                                {selectedUser?.hierarchy?.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedUser.hierarchy.map((h, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                <span className="text-gray-500 dark:text-gray-400 capitalize">{h.role.toLowerCase().replace(/_/g, ' ')}:</span>
                                                <span className="font-medium text-gray-900 dark:text-white">{h.parentName}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Sin jerarquía asignada</p>
                                )}
                            </div>

                            {/* Cell Info */}
                            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Célula</h4>
                                {selectedUser?.cell ? (
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedUser.cell.name}</p>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Sin célula asignada</p>
                                )}
                            </div>

                            {/* Church Attendance */}
                            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Asistencia a la Iglesia</h4>
                                {selectedUser?.churchAttendances?.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedUser.churchAttendances.map((att, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    {new Date(att.date).toLocaleDateString()}
                                                </span>
                                                <span className="text-green-600 dark:text-green-400 font-medium">Presente</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Sin asistencias registradas</p>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                            <button
                                onClick={() => setModalType(null)}
                                className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg active:scale-95"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiscipleTracking;

DiscipleTracking.propTypes = {
    refreshTrigger: PropTypes.number,
};
