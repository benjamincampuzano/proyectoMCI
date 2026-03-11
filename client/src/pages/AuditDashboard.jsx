import { useMemo, useState } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, BarChart, Bar, Cell as ReCell, PieChart, Pie
} from 'recharts';
import {User, Calendar, FunnelIcon, MagnifyingGlassIcon, Download, Trash,
    Pen, PlusCircle, CaretCircleDownIcon, ShieldCheck, SignInIcon, PulseIcon, BarbellIcon
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import useAuditDashboard from '../hooks/useAuditDashboard';
import DataTable from '../components/DataTable';
import ConfirmationModal from '../components/ConfirmationModal';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AuditDashboard = () => {
    const { logs, stats, loading, pagination, filters, setFilters, handleFilterChange } = useAuditDashboard();
    const [selectedLog, setSelectedLog] = useState(null); // Modal state
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [pendingRestoreFile, setPendingRestoreFile] = useState(null);
    const memoizedStats = useMemo(() => stats, [stats]);

    const handleDownloadBackup = async (event) => {
        try {
            // Mostrar indicador de carga
            const button = event.target;
            const originalText = button.innerHTML;
            button.innerHTML = '<span class="animate-spin">⏳</span> Creando backup...';
            button.disabled = true;

            // Llamar al endpoint profesional de backup PostgreSQL
            const baseURL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
            const response = await fetch(`${baseURL}/api/audit/backup`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al descargar el backup');
            }

            // Obtener el nombre del archivo desde los headers o usar uno predeterminado
            const contentDisposition = response.headers.get('content-disposition');
            let fileName = `backup_postgres_${new Date().toISOString().replace(/[:.]/g, '-')}.dump`;

            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch) {
                    fileName = fileNameMatch[1];
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast.success('✅ Backup de PostgreSQL descargado exitosamente');
        } catch (error) {
            console.error('Error downloading backup:', error);
            toast.error(`❌ Error: ${error.message}`);
        } finally {
            // Restaurar botón
            if (button) {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        }
    };

    const handleRestoreBackup = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validar que sea un archivo .dump de PostgreSQL
        if (!file.name.endsWith('.dump')) {
            toast.error('❌ Error: Solo se permiten archivos de backup de PostgreSQL (.dump)');
            event.target.value = '';
            return;
        }

        // Validar tamaño máximo (ej. 100MB)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            toast.error('❌ Error: El archivo es demasiado grande. Máximo permitido: 100MB');
            event.target.value = '';
            return;
        }

        // Mostrar modal de confirmación en lugar de window.confirm
        setPendingRestoreFile(file);
        setShowRestoreConfirm(true);
        event.target.value = '';
    };

    const performRestoreBackup = async () => {
        const file = pendingRestoreFile;
        if (!file) return;

        // Referencia al botón de restauración
        const restoreButton = document.querySelector('input[type="file"]').closest('div').querySelector('button');
        const originalText = restoreButton ? restoreButton.innerHTML : '';

        try {
            // Mostrar indicador de carga
            if (restoreButton) {
                restoreButton.innerHTML = '<span class="animate-spin">⏳</span> Restaurando...';
                restoreButton.disabled = true;
            }

            const baseURL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
            const response = await fetch(`${baseURL}/api/audit/restore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: (() => {
                    const formData = new FormData();
                    formData.append('backupFile', file);
                    return formData;
                })()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al restaurar el backup');
            }

            toast.success('✅ Restauración completada exitosamente.\n\nLa aplicación se recargará en 3 segundos...');

            // Recargar después de un breve delay
            setTimeout(() => {
                window.location.reload();
            }, 3000);

        } catch (error) {
            console.error('Error restoring backup:', error);
            toast.error(`❌ Error crítico: ${error.message}\n\nLa base de datos no fue modificada.`);
        } finally {
            // Restaurar botón si no se recarga
            if (restoreButton && originalText) {
                restoreButton.innerHTML = originalText;
                restoreButton.disabled = false;
            }
            setPendingRestoreFile(null);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'LOGIN': return <SignInIcon className="text-blue-500" size={18} />;
            case 'CREATE': return <PlusCircle className="text-green-500" size={18} />;
            case 'UPDATE': return <Pen className="text-amber-500" size={18} />;
            case 'DELETE': return <Trash className="text-red-500" size={18} />;
            default: return <BarbellIcon className="text-gray-500" size={18} />;
        }
    };

    const getEntityColor = (type) => {
        const colors = {
            'CELL': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'CONVENTION': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            'ENCUENTRO': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
            'USER': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'SESSION': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            'GOAL': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            'ENCUENTRO_REGISTRATION': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
            'CONVENTION_REGISTRATION': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
            'ENCUENTRO_PAYMENT': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
            'CONVENTION_PAYMENT': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
            'ENCUENTRO_ATTENDANCE': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
        };
        return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    const propertyMap = {
        'UserId': 'ID Usuario',
        'conventionId': 'ID Convención',
        'ConventionId': 'ID Convención',
        'encuentroId': 'ID Encuentro',
        'EncuentroId': 'ID Encuentro',
        'guestId': 'ID Invitado',
        'GuestId': 'ID Invitado',
        'name': 'Nombre',
        'fullName': 'Nombre Completo',
        'email': 'Email',
        'role': 'Rol',
        'phone': 'Teléfono',
        'address': 'Dirección',
        'city': 'Ciudad',
        'lastLogin': 'Último Acceso',
        'action': 'Acción',
        'cellId': 'ID Célula',
        'cellType': 'Tipo de Célula',
        'hostId': 'ID Anfitrión',
        'leaderId': 'ID Líder',
        'liderDoceId': 'ID Líder Doce',
        'liderCelulaId': 'ID Líder Célula',
        'pastorId': 'ID Pastor',
        'status': 'Estado',
        'Usuario': 'Participante',
        'Evento': 'Evento',
        'Invitado': 'Nombre del Invitado',
        'Encuentro': 'Palabra Rhema',
        'type': 'Tipo',
        'targetValue': 'Objetivo',
        'userId': 'ID Usuario',
        'responsable': 'Responsable',
        'amount': 'Monto',
        'registrationId': 'ID Registro',
        'classNumber': 'Clase Nº',
        'attended': 'Asistió'
    };

    const renderDetails = (detailsStr) => {
        if (!detailsStr) return '-';
        try {
            // Check if detailsStr is already an object (sometimes API might return parsed JSON)
            const details = typeof detailsStr === 'object' ? detailsStr : JSON.parse(detailsStr);

            if (details.targetUser) {
                return (
                    <span className="flex flex-col">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{details.targetUser}</span>
                        {details.changes && (
                            <span className="text-[10px] text-blue-500 font-medium uppercase tracking-tighter">
                                {Object.keys(details.changes).length} cambios registrados
                            </span>
                        )}
                    </span>
                );
            }
            // For registrations or creations that now have explicit Name/Event fields
            if (details.Usuario || details.Invitado) {
                return (
                    <span className="flex flex-col">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{details.Usuario || details.Invitado}</span>
                        <span className="text-[10px] text-blue-500 font-medium uppercase tracking-tighter">
                            {details.Evento || details.Encuentro}
                        </span>
                    </span>
                );
            }

            // Fallback for other objects: render a simple key-value summary or string
            return (
                <span className="flex flex-col gap-1">
                    {Object.entries(details).slice(0, 3).map(([key, val]) => (
                        <span key={key} className="text-xs text-gray-600 dark:text-gray-300">
                            <strong>{propertyMap[key] || key}:</strong> {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                    ))}
                </span>
            );

        } catch (e) {
            // If parsing fails or it's just a string, return as string
            return typeof detailsStr === 'string' ? detailsStr : JSON.stringify(detailsStr);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <PulseIcon className="text-blue-600" size={32} />
                        Panel de Auditoría
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Seguimiento detallado de actividades y modificaciones en la plataforma.
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            {memoizedStats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Inicios de Sesión (Últimos 30 días)</h3>
                        <div className="h-64 w-full min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={memoizedStats.loginsPerDay}>
                                    <defs>
                                        <linearGradient id="colorLogin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLogin)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Distribución de Acciones</h3>
                        <div className="h-64 w-full min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={memoizedStats.actionDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="action" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="_count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                        {memoizedStats.actionDistribution.map((entry, index) => (
                                            <ReCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Acción</label>
                    <select
                        name="action"
                        value={filters.action}
                        onChange={handleFilterChange}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                        <option value="">Todas</option>
                        <option value="LOGIN">Inicio de Sesión</option>
                        <option value="CREATE">Creación</option>
                        <option value="UPDATE">Edición</option>
                        <option value="DELETE">Eliminación</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Módulo</label>
                    <select
                        name="entityType"
                        value={filters.entityType}
                        onChange={handleFilterChange}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                        <option value="">Todos</option>
                        <option value="CELL">Células</option>
                        <option value="CONVENTION">Convenciones</option>
                        <option value="ENCUENTRO">Encuentros</option>
                        <option value="USER">Usuarios</option>
                        <option value="GOAL">Metas</option>
                        <option value="SESSION">Sesiones</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desde</label>
                    <input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasta</label>
                    <input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Logs Table */}
            <DataTable
                columns={[
                    {
                        key: 'createdAt',
                        header: 'Fecha y Hora',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                        cellClassName: 'px-6 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap',
                        render: (log) => formatDate(log.createdAt)
                    },
                    {
                        key: 'user',
                        header: 'Usuario',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                        cellClassName: 'px-6 py-4',
                        render: (log) => (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                                    {log.user?.fullName.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">
                                        {log.user?.fullName || 'Sistema'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {Array.isArray(log.user?.roles) ? log.user.roles.join(', ').replace(/_/g, ' ') : log.user?.role}
                                    </p>
                                </div>
                            </div>
                        )
                    },
                    {
                        key: 'action',
                        header: 'Acción',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                        cellClassName: 'px-6 py-4',
                        render: (log) => (
                            <div className="flex items-center gap-2 text-sm">
                                {getActionIcon(log.action)}
                                <span className="font-medium text-gray-700 dark:text-gray-200">{log.action}</span>
                            </div>
                        )
                    },
                    {
                        key: 'entityType',
                        header: 'Módulo',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                        cellClassName: 'px-6 py-4',
                        render: (log) => (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityColor(log.entityType)}`}>
                                {log.entityType}
                            </span>
                        )
                    },
                    {
                        key: 'details',
                        header: 'Detalles',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                        cellClassName: 'px-6 py-4 text-sm text-gray-500 dark:text-gray-400',
                        render: (log) => renderDetails(log.details)
                    },
                    {
                        key: 'actions',
                        header: 'Acciones',
                        headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right',
                        cellClassName: 'px-6 py-4 text-right',
                        render: (log) => (
                            <>
                                {log.details && (
                                    <button
                                        onClick={() => setSelectedLog(log)}
                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-semibold transition-colors"
                                    >
                                        Ver Detalles
                                    </button>
                                )}
                            </>
                        )
                    }
                ]}
                data={logs}
                loading={loading}
                skeletonRowCount={5}
                emptyMessage="No se encontraron registros."
                pagination={{
                    page: pagination.currentPage,
                    pages: pagination.pages,
                    onPrev: () => setFilters(f => ({ ...f, page: f.page - 1 })),
                    onNext: () => setFilters(f => ({ ...f, page: f.page + 1 })),
                }}
            />

            {/* Modal de Detalles */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                {getActionIcon(selectedLog.action)}
                                Detalle de la Actividad
                            </h2>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <CaretCircleDownIcon size={20} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Fecha</p>
                                    <p className="text-sm dark:text-white">{formatDate(selectedLog.createdAt)}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Usuario</p>
                                    <p className="text-sm dark:text-white">{selectedLog.user?.fullName || 'Sistema'}</p>
                                </div>
                            </div>

                            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Información Detallada</h3>

                            {(() => {
                                try {
                                    const details = JSON.parse(selectedLog.details);

                                    // Case 1: Modification Log (Diff)
                                    if (details.changes) {
                                        return (
                                            <div className="space-y-4">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Se realizaron cambios en el perfil de <span className="font-bold text-blue-600">{details.targetUser}</span>:
                                                </p>
                                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gray-100 dark:bg-gray-800">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left">Campo</th>
                                                                <th className="px-4 py-2 text-left">Anterior</th>
                                                                <th className="px-4 py-2 text-left">Nuevo</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                            {Object.entries(details.changes).map(([field, values]) => (
                                                                <tr key={field} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                    <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 capitalize">{field}</td>
                                                                    <td className="px-4 py-3 text-red-600 dark:text-red-400 line-through truncate max-w-[150px]">{values.old?.toString() || '(vacío)'}</td>
                                                                    <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium truncate max-w-[150px]">{values.new?.toString() || '(vacío)'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Case 2: Creation or other flat data log
                                    const isCreate = selectedLog.action === 'CREATE';
                                    return (
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {isCreate ? 'Información registrada en la creación:' : 'Detalles de la operación:'}
                                            </p>
                                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-100 dark:bg-gray-800">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left w-1/3">Propiedad</th>
                                                            <th className="px-4 py-2 text-left">Valor Registrado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                        {Object.entries(details).map(([key, value]) => {
                                                            // Skip targetUser if it's already in the header or just noise
                                                            if (key === 'targetUser' && isCreate) return null;
                                                            return (
                                                                <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                    <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 capitalize">{propertyMap[key] || key}</td>
                                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                        {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                } catch (e) {
                                    return (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                            <p className="text-sm dark:text-white">{selectedLog.details}</p>
                                        </div>
                                    );
                                }
                            })()}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Database Tools Section - Admin Only */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                    <ShieldCheck size={20} className="text-purple-600" />
                    Herramientas de Base de Datos
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Backup Section */}
                    <div className="p-4 border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                            <Download size={18} />
                            Copia de Seguridad
                        </h4>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                            Descarga una copia completa de la base de datos
                        </p>
                        <button
                            onClick={handleDownloadBackup}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Download size={18} />
                            Descargar Backup
                        </button>
                    </div>

                    {/* Restore Section */}
                    <div className="p-4 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 rounded-xl">
                        <h4 className="font-medium text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                            <BarbellIcon size={18} />
                            Restaurar Base de Datos
                        </h4>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                            Sube un archivo de backup para restaurar la base de datos completa.
                        </p>

                        <div className="flex gap-2">
                            <input
                                type="file"
                                id="backupUpload"
                                accept=".dump"
                                className="hidden"
                                onChange={handleRestoreBackup}
                            />
                            <button
                                onClick={() => {
                                    document.getElementById('backupUpload').click();
                                }}
                                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v3.2a1 1 0 11-2 0V12.332a7.002 7.002 0 01-11.215-1.996.999.999 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                                Restaurar Backup
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Confirmation Modal for Restore Backup */}
        <ConfirmationModal
            isOpen={showRestoreConfirm}
            onClose={() => {
                setShowRestoreConfirm(false);
                setPendingRestoreFile(null);
            }}
            onConfirm={performRestoreBackup}
            title="⚠️ Restaurar Copia de Seguridad"
            message="Estás a punto de restaurar la base de datos completa"
            confirmText="Restaurar Base de Datos"
            confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        >
            {pendingRestoreFile && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Archivo:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{pendingRestoreFile.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Tamaño:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{(pendingRestoreFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                    <div className="text-red-600 dark:text-red-400 mt-0.5">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-red-800 dark:text-red-200 font-semibold mb-1">
                            ⚠️ PELIGRO: Acción Destructiva
                        </h4>
                        <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                            <li>• Se eliminarán TODOS los datos actuales</li>
                            <li>• Los datos serán reemplazados por el archivo de respaldo</li>
                            <li>• La aplicación se recargará automáticamente</li>
                            <li>• Esta acción NO se puede deshacer</li>
                        </ul>
                    </div>
                </div>
            </div>
        </ConfirmationModal>
    );
};

export default AuditDashboard;
