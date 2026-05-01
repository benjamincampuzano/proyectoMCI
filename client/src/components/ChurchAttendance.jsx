import { useState, useEffect, useMemo } from 'react';
import { Calendar, Check, X, Trash, Desktop, Users, MagnifyingGlass, UserMinus, Funnel } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import AsyncSearchSelect from './ui/AsyncSearchSelect';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../constants/roles';

// Valores del enum Network de Prisma
const NETWORK_OPTIONS = [
    { value: 'MUJERES', label: 'Mujeres' },
    { value: 'HOMBRES', label: 'Hombres' },
    { value: 'JOVENES', label: 'Jóvenes' },
    { value: 'KIDS', label: 'Kids' },
    { value: 'ROCAS', label: 'Rocas' },
    { value: 'TEENS', label: 'Teens' }
];

// Helper para obtener label de red
const getNetworkLabel = (redValue) => {
    const network = NETWORK_OPTIONS.find(n => n.value === redValue);
    return network?.label || redValue;
};

const ChurchAttendance = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [members, setMembers] = useState([]);
    const [attendances, setAttendances] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados para filtros
    const { user } = useAuth();
    const [showFilters, setShowFilters] = useState(false);
    const [liderDoceFilter, setLiderDoceFilter] = useState(null);
    const [liderCelulaFilter, setLiderCelulaFilter] = useState(null);
    const [rolFilter, setRolFilter] = useState('');
    const [redFilter, setRedFilter] = useState('');

    useEffect(() => {
        fetchMembers();
        fetchAttendance();
    }, [date]);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/consolidar/church-attendance/members/all');
            const membersData = response.data;
            setMembers(membersData);
        } catch (error) {
            toast.error('Error al cargar miembros. Por favor intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendance = async () => {
        try {
            const response = await api.get(`/consolidar/church-attendance/${date}`);
            const data = response.data;

            const attendanceMap = {};
            data.forEach(att => {
                attendanceMap[att.userId] = att.status;
            });
            setAttendances(attendanceMap);
        } catch (error) {
            toast.error('Error al cargar asistencia. Por favor intenta nuevamente.');
        }
    };

    const handleAttendanceChange = (userId, status) => {
        setAttendances(prev => {
            const currentStatus = prev[userId];
            // Si hace click en el mismo estado, lo desmarca (vuelve a vacío)
            if (currentStatus === status) {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            }
            return {
                ...prev,
                [userId]: status
            };
        });
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            const attendanceData = Object.entries(attendances).map(([userId, status]) => ({
                userId: parseInt(userId),
                status
            }));

            if (attendanceData.length === 0) {
                toast.error('No hay registros de asistencia para guardar');
                return;
            }

            await api.post('/consolidar/church-attendance', {
                date,
                attendances: attendanceData
            });

            toast.success('Asistencia guardada exitosamente');
        } catch (error) {
            toast.error('Error al guardar asistencia. Por favor intenta nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAttendance = async () => {
        try {
            setDeleting(true);
            await api.delete(`/consolidar/church-attendance/${date}`);
            setAttendances({});
            setShowDeleteConfirm(false);
            toast.success('Registros de asistencia eliminados exitosamente');
        } catch (error) {
            toast.error('Error al eliminar registros de asistencia. Por favor intenta nuevamente.');
        } finally {
            setDeleting(false);
        }
    };

    // Verificar si hay filtros activos
    const hasActiveFilters = liderDoceFilter || liderCelulaFilter || rolFilter || redFilter || searchTerm;

    // Función para limpiar todos los filtros
    const clearFilters = () => {
        setLiderDoceFilter(null);
        setLiderCelulaFilter(null);
        setRolFilter('');
        setRedFilter('');
        setSearchTerm('');
    };

    const filteredMembers = useMemo(() => {
        let filtered = members;
        
        // Filtro por término de búsqueda (nombre/email)
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(m =>
                m.fullName?.toLowerCase().includes(lower) ||
                m.email?.toLowerCase().includes(lower)
            );
        }
        
        // Filtro por Líder de 12
        if (liderDoceFilter) {
            filtered = filtered.filter(m => m.liderDoceId === liderDoceFilter.id);
        }
        
        // Filtro por Líder de Célula
        if (liderCelulaFilter) {
            filtered = filtered.filter(m => m.liderCelulaId === liderCelulaFilter.id);
        }
        
        // Filtro por Rol
        if (rolFilter) {
            filtered = filtered.filter(m => m.roles?.includes(rolFilter));
        }
        
        // Filtro por Red
        if (redFilter) {
            filtered = filtered.filter(m => m.red === redFilter);
        }
        
        return filtered;
    }, [members, searchTerm, liderDoceFilter, liderCelulaFilter, rolFilter, redFilter]);

    const stats = useMemo(() => {
        // Usar filteredMembers para las estadísticas
        const filteredIds = new Set(filteredMembers.map(m => m.id));
        let totales = filteredMembers.length;
        let presentes = 0;
        let ausentes = 0;
        let virtuales = 0;

        // Solo contar asistencias de miembros filtrados
        Object.entries(attendances).forEach(([userId, status]) => {
            if (filteredIds.has(parseInt(userId))) {
                if (status === 'PRESENTE') presentes++;
                else if (status === 'AUSENTE') ausentes++;
                else if (status === 'VIRTUAL') virtuales++;
            }
        });

        let sinRegistro = totales - (presentes + ausentes + virtuales);

        return { totales, presentes, ausentes, virtuales, sinRegistro, totalMembers: members.length };
    }, [members, filteredMembers, attendances]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const renderActionButtons = (memberId, status) => (
        <div className="flex flex-wrap justify-center gap-2">
            <button
                onClick={() => handleAttendanceChange(memberId, 'PRESENTE')}
                className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm
                    ${status === 'PRESENTE'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 ring-2 ring-green-500 scale-105'
                        : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                `}
            >
                <Check className="w-4 h-4" />
                <span className="md:hidden lg:inline">Presente</span>
            </button>
            <button
                onClick={() => handleAttendanceChange(memberId, 'VIRTUAL')}
                className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm
                    ${status === 'VIRTUAL'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 ring-2 ring-purple-500 scale-105'
                        : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                `}
            >
                <Desktop className="w-4 h-4" />
                <span className="md:hidden lg:inline">Virtual</span>
            </button>
            <button
                onClick={() => handleAttendanceChange(memberId, 'AUSENTE')}
                className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm
                    ${status === 'AUSENTE'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-500 scale-105'
                        : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                `}
            >
                <X className="w-4 h-4" />
                <span className="md:hidden lg:inline">Ausente</span>
            </button>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header and Actions */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Fecha de Registro
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent text-lg font-bold text-gray-900 dark:text-white border-0 p-0 focus:ring-0 cursor-pointer"
                        />
                    </div>
                </div>
                
                <div className="flex w-full md:w-auto items-center gap-3">
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={Object.keys(attendances).length === 0}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-medium rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        <Trash className="w-5 h-5" />
                        <span className="hidden sm:inline">Eliminar</span>
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Check className="w-5 h-5" />
                        )}
                        <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm col-span-2 md:col-span-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
                            <Users size={18} weight="bold" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight">
                            {stats.totalMembers !== stats.totales ? `Mostrando ${stats.totales} de ${stats.totalMembers}` : 'Total'}
                        </span>
                    </div>
                    <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{stats.totales}</span>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-lg text-green-600 dark:text-green-300">
                            <Check size={18} weight="bold" />
                        </div>
                        <span className="text-xs font-bold text-green-800 dark:text-green-200 uppercase tracking-tight">Presentes</span>
                    </div>
                    <span className="text-2xl font-extrabold text-green-900 dark:text-white">{stats.presentes}</span>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800/30 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-800/50 rounded-lg text-purple-600 dark:text-purple-300">
                            <Desktop size={18} weight="bold" />
                        </div>
                        <span className="text-xs font-bold text-purple-800 dark:text-purple-200 uppercase tracking-tight">Virtuales</span>
                    </div>
                    <span className="text-2xl font-extrabold text-purple-900 dark:text-white">{stats.virtuales}</span>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800/30 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 dark:bg-red-800/50 rounded-lg text-red-600 dark:text-red-300">
                            <X size={18} weight="bold" />
                        </div>
                        <span className="text-xs font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Ausentes</span>
                    </div>
                    <span className="text-2xl font-extrabold text-red-900 dark:text-white">{stats.ausentes}</span>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800/30 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-100 dark:bg-orange-800/50 rounded-lg text-orange-600 dark:text-orange-300">
                            <UserMinus size={18} weight="bold" />
                        </div>
                        <span className="text-xs font-bold text-orange-800 dark:text-orange-200 uppercase tracking-tight">Sin Registro</span>
                    </div>
                    <span className="text-2xl font-extrabold text-orange-900 dark:text-white">{stats.sinRegistro}</span>
                </div>
            </div>

            {/* List and Search Container */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Search Bar with Filters Button */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlass className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por nombre o correo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                hasActiveFilters
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                        >
                            <Funnel size={18} weight={showFilters ? "fill" : "bold"} />
                            Filtros
                            {hasActiveFilters && (
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                                    {[liderDoceFilter, liderCelulaFilter, rolFilter, redFilter, searchTerm].filter(Boolean).length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
                        <div className="flex flex-wrap items-end gap-4">
                            {/* Filtro por Líder de 12 */}
                            <div className="flex-[2] min-w-[250px]">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                    Líder de 12
                                </label>
                                <AsyncSearchSelect
                                    fetchItems={(term) => {
                                        const roleFilter = user?.roles?.includes('PASTOR') ? "LIDER_DOCE,PASTOR" : "LIDER_DOCE";
                                        return api.get('/users/search', {
                                            params: { search: term, role: roleFilter }
                                        }).then(res => res.data);
                                    }}
                                    selectedValue={liderDoceFilter}
                                    onSelect={(user) => setLiderDoceFilter(user || null)}
                                    placeholder="Buscar líder de 12..."
                                    labelKey="fullName"
                                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                                />
                            </div>

                            {/* Filtro por Líder de Célula */}
                            <div className="flex-[2] min-w-[250px]">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                    Líder de Célula
                                </label>
                                <AsyncSearchSelect
                                    fetchItems={(term) => api.get('/users/search', {
                                        params: { search: term, role: "LIDER_CELULA" }
                                    }).then(res => res.data)}
                                    selectedValue={liderCelulaFilter}
                                    onSelect={(user) => setLiderCelulaFilter(user || null)}
                                    placeholder="Buscar líder de célula..."
                                    labelKey="fullName"
                                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                                />
                            </div>

                            {/* Filtro por Rol */}
                            <div className="flex-1 min-w-[180px]">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                    Rol
                                </label>
                                <select
                                    value={rolFilter}
                                    onChange={(e) => setRolFilter(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                >
                                    <option value="">Todos los roles</option>
                                    <option value={ROLES.LIDER_DOCE}>Líder de 12</option>
                                    <option value={ROLES.LIDER_CELULA}>Líder de Célula</option>
                                    <option value={ROLES.DISCIPULO}>Discípulo</option>
                                    <option value={ROLES.PASTOR}>Pastor</option>
                                </select>
                            </div>

                            {/* Filtro por Red */}
                            <div className="flex-1 min-w-[180px]">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                    Red
                                </label>
                                <select
                                    value={redFilter}
                                    onChange={(e) => setRedFilter(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                >
                                    <option value="">Todas las redes</option>
                                    {NETWORK_OPTIONS.map(network => (
                                        <option key={network.value} value={network.value}>{network.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Botón Limpiar Filtros */}
                        {hasActiveFilters && (
                            <div className="flex justify-end mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <X size={16} weight="bold" />
                                    Limpiar filtros
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Mobile View (Cards) */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredMembers.map(member => (
                        <div key={member.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200 dark:border-blue-800">
                                    {member.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                        {member.fullName}
                                    </h3>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                            {member.roles?.join(', ') || member.role || 'NA'}
                                        </span>
                                        {member.red && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                                {getNetworkLabel(member.red)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Info jerárquica en móvil */}
                            <div className="mb-3 space-y-1">
                                {member.liderDoceName && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-medium">Líder 12:</span> {member.liderDoceName}
                                    </div>
                                )}
                                {member.liderCelulaName && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-medium">Líder Célula:</span> {member.liderCelulaName}
                                    </div>
                                )}
                                {member.cellName && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-medium">Célula:</span> {member.cellName}
                                    </div>
                                )}
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                                {renderActionButtons(member.id, attendances[member.id])}
                            </div>
                        </div>
                    ))}
                    {filteredMembers.length === 0 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No se encontraron miembros con esa búsqueda.
                        </div>
                    )}
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Miembro
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Rol / Jerarquía
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Registro de Asistencia
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200 dark:border-blue-800 shadow-sm">
                                                {member.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {member.fullName}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {member.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="space-y-1.5">
                                            {/* Rol del miembro */}
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                                {member.roles?.join(', ') || member.role || 'NA'}
                                            </span>
                                            
                                            {/* Red */}
                                            {member.red && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Red:</span> {getNetworkLabel(member.red)}
                                                </div>
                                            )}
                                            
                                            {/* Líder de 12 */}
                                            {member.liderDoceName && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">L12:</span> {member.liderDoceName}
                                                </div>
                                            )}
                                            
                                            {/* Líder de Célula */}
                                            {member.liderCelulaName && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">LC:</span> {member.liderCelulaName}
                                                </div>
                                            )}
                                            
                                            {/* Celula */}
                                            {member.cellName && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Célula:</span> {member.cellName}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {renderActionButtons(member.id, attendances[member.id])}
                                    </td>
                                </tr>
                            ))}
                            {filteredMembers.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No se encontraron miembros con esa búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform scale-100">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Eliminar Registros</h3>
                            <button 
                                onClick={() => setShowDeleteConfirm(false)} 
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-4 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <div className="text-red-600 dark:text-red-400 mt-0.5 bg-red-100 dark:bg-red-900/50 p-1.5 rounded-lg">
                                        <Trash className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-red-800 dark:text-red-300 font-semibold mb-1">
                                            ¿Confirmas la eliminación?
                                        </h4>
                                        <p className="text-red-600/90 dark:text-red-400/90 text-sm">
                                            Se eliminarán <strong>{Object.keys(attendances).length}</strong> registros de asistencia del día {' '}
                                            <strong>{new Date(date).toLocaleDateString()}</strong>. Esta acción no se puede deshacer.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors shadow-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteAttendance}
                                disabled={deleting}
                                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-red-500/20 flex items-center gap-2"
                            >
                                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChurchAttendance;
