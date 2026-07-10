import { useMemo, useState } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, BarChart, Bar, Cell as ReCell, PieChart, Pie
} from 'recharts';
import {
    User, Calendar, FunnelIcon, MagnifyingGlassIcon, Download, Trash,
    Pen, PlusCircle, CaretCircleDownIcon, SignInIcon, PulseIcon, BarbellIcon, ShieldCheck
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import useAuditDashboard from '../hooks/useAuditDashboard';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import api from '../utils/api';

const LN_COLORS = ['var(--ln-brand-indigo)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AuditDashboard = () => {
    const { logs, stats, loading, pagination, filters, setFilters, handleFilterChange } = useAuditDashboard();
    const [selectedLog, setSelectedLog] = useState(null);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [pendingRestoreFile, setPendingRestoreFile] = useState(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreProgress, setRestoreProgress] = useState(0);
    const [restoreStatus, setRestoreStatus] = useState('');
    const [restorePassword, setRestorePassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [requirePasswordConfirm] = useState(true);
    const memoizedStats = useMemo(() => stats, [stats]);

    const performBackupDownload = async () => {
        const button = document.getElementById('downloadBackupBtn');
        const originalText = button?.innerHTML || 'Descargar Backup SQL';
        
        try {
            if (button) {
                button.innerHTML = `<span class="animate-spin">⏳</span> Generando backup...`;
                button.disabled = true;
            }

            const response = await api.post('/audit/backup', {}, {
                responseType: 'blob'
            });

            const contentDisposition = response.headers['content-disposition'];
            let fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;

            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch) {
                    fileName = fileNameMatch[1];
                }
            }

            const blob = new Blob([response.data], { type: 'application/sql' });
            const url_window = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url_window;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url_window);

            toast.success('Backup correctamente generado y descargado');
        } catch (error) {
            console.error('Error downloading backup:', error);
            toast.error(`Error: ${error.response?.data?.error || error.message}`);
        } finally {
            if (button) {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        }
    };

    const handleRestoreBackup = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.sql')) {
            toast.error('Solo se permiten archivos de backup SQL (.sql)');
            event.target.value = '';
            return;
        }

        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('El archivo es demasiado grande. Máximo permitido: 100MB');
            event.target.value = '';
            return;
        }

        setPendingRestoreFile(file);
        setRestorePassword('');
        setPasswordError('');
        setShowRestoreConfirm(true);
        event.target.value = '';
    };

    const performRestoreBackup = async () => {
        const file = pendingRestoreFile;
        if (!file) return;

        if (requirePasswordConfirm && !restorePassword) {
            setPasswordError('Ingresa tu contraseña para confirmar esta acción');
            return;
        }

        setIsRestoring(true);
        setRestoreProgress(0);
        setRestoreStatus('Preparando restauración...');

        const progressInterval = setInterval(() => {
            setRestoreProgress(prev => {
                if (prev < 90) return prev + Math.random() * 5;
                return prev;
            });
        }, 800);

        try {
            setRestoreStatus('Restaurando datos...');
            
            const formData = new FormData();
            formData.append('backupFile', file);
            formData.append('password', restorePassword);
            
            const response = await api.post('/audit/restore', formData, {
                timeout: 300000
            });

            clearInterval(progressInterval);

            if (response.status !== 200) {
                throw new Error(response.data.error || 'Error al restaurar el backup');
            }

            setRestoreProgress(100);
            setRestoreStatus('Restauración completada.');
            toast.success('Sistema restaurado con éxito');

            await new Promise((resolve) => {
                let secondsLeft = 3;
                const reloadInterval = setInterval(() => {
                    secondsLeft -= 1;
                    if (secondsLeft <= 0) {
                        clearInterval(reloadInterval);
                        window.location.reload();
                        resolve();
                    } else {
                        setRestoreStatus(`Recargando aplicación en ${secondsLeft}s...`);
                    }
                }, 1000);
            });

        } catch (error) {
            clearInterval(progressInterval);
            console.error('Error restoring backup:', error);
            const errorMsg = error.response?.data?.details || error.response?.data?.error || error.message;
            toast.error(`Error crítico: ${errorMsg}`);
            setIsRestoring(false);
            setPendingRestoreFile(null);
            setShowRestoreConfirm(false);
        }
    };

    const formatDate = (dateStr, showSeconds = false) => {
        return new Date(dateStr).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: showSeconds ? '2-digit' : undefined
        });
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'LOGIN': return <PulseIcon className="text-[var(--ln-brand-indigo)]" size={18} weight="bold" />;
            case 'CREATE': return <PlusCircle className="text-emerald-500" size={18} weight="bold" />;
            case 'UPDATE': return <Pen className="text-amber-500" size={18} weight="bold" />;
            case 'DELETE': return <Trash className="text-red-500" size={18} weight="bold" />;
            default: return <BarbellIcon className="text-[var(--ln-text-tertiary)]" size={18} weight="bold" />;
        }
    };

    const getEntityColor = (type) => {
        const colors = {
            'CELL': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'CONVENTION': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
            'ENCUENTRO': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
            'USER': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            'SESSION': 'bg-[var(--ln-text-tertiary)]/10 text-[var(--ln-text-tertiary)] border-[var(--ln-border-standard)]',
            'GOAL': 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        };
        return colors[type] || 'bg-white/5 text-[var(--ln-text-tertiary)] border-[var(--ln-border-standard)]';
    };

    const propertyMap = {
        'UserId': 'ID Usuario',
        'fullName': 'Nombre Completo',
        'email': 'Email',
        'role': 'Rol',
        'phone': 'Teléfono',
        'status': 'Estado'
    };

    const renderDetails = (detailsStr, action) => {
        if (!detailsStr) return '-';
        try {
            const details = typeof detailsStr === 'object' ? detailsStr : JSON.parse(detailsStr);

            if (details.targetUser) {
                const changeEntries = details.changes ? Object.entries(details.changes) : [];
                return (
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ln-brand-indigo)] flex-shrink-0" />
                            <span className="weight-590 text-[13px] text-[var(--ln-text-primary)]">
                                {details.targetUser}
                            </span>
                        </div>
                        {changeEntries.map(([field, change]) => (
                            <div key={field} className="flex items-center gap-1 text-[11px]">
                                <span className="weight-590 text-[var(--ln-text-primary)]/60 flex-shrink-0">{propertyMap[field] || field}:</span>
                                <span className="text-[var(--ln-text-tertiary)] line-through">{String(change.old ?? '')}</span>
                                <span className="text-[var(--ln-text-tertiary)] opacity-50">→</span>
                                <span className="text-emerald-400 weight-510">{String(change.new ?? '')}</span>
                            </div>
                        ))}
                    </div>
                );
            }

            if (action === 'LOGIN') {
                return (
                    <div className="text-[12px] text-[var(--ln-text-tertiary)]">
                        {details.method ? `Via ${details.method}` : 'Credenciales'}
                        {details.ip && <span className="ml-2 font-mono opacity-60">{details.ip}</span>}
                    </div>
                );
            }

            const entries = Object.entries(details);
            return (
                <div className="flex flex-col gap-0.5">
                    {entries.map(([key, val]) => {
                        const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
                        return (
                            <span key={key} className="text-[11px] text-[var(--ln-text-tertiary)]">
                                <span className="weight-590 text-[var(--ln-text-primary)]/60">{propertyMap[key] || key}:</span>{' '}
                                <span className="text-[var(--ln-text-primary)]/80">{displayVal}</span>
                            </span>
                        );
                    })}
                </div>
            );
        } catch {
            return typeof detailsStr === 'string' ? detailsStr : JSON.stringify(detailsStr);
        }
    };

    return (
        <div className="space-y-10 pb-32 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl weight-590 text-[var(--ln-text-primary)] tracking-tight flex items-center gap-4">
                        <ShieldCheck className="text-[var(--ln-brand-indigo)]" size={32} weight="bold" />
                        Auditoría del Sistema
                    </h1>
                    <p className="text-[var(--ln-text-tertiary)] mt-2 weight-510 opacity-70">
                        Trazabilidad completa de operaciones y seguridad de datos.
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            {memoizedStats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl p-8 rounded-[24px] border border-[var(--ln-border-standard)] shadow-sm">
                        <h3 className="text-sm weight-590 mb-8 text-[var(--ln-text-primary)] uppercase tracking-widest opacity-60">Frecuencia de Actividad</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={memoizedStats.loginsPerDay}>
                                    <defs>
                                        <linearGradient id="colorLogin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--ln-brand-indigo)" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="var(--ln-brand-indigo)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ln-border-standard)" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'var(--ln-bg-panel)', borderColor: 'var(--ln-border-standard)', borderRadius: '12px', color: 'var(--ln-text-primary)' }}
                                        itemStyle={{ color: 'var(--ln-brand-indigo)' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="var(--ln-brand-indigo)" strokeWidth={2} fillOpacity={1} fill="url(#colorLogin)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl p-8 rounded-[24px] border border-[var(--ln-border-standard)] shadow-sm">
                        <h3 className="text-sm weight-590 mb-8 text-[var(--ln-text-primary)] uppercase tracking-widest opacity-60">Tipología de Operaciones</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={memoizedStats.actionDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ln-border-standard)" />
                                    <XAxis dataKey="action" axisLine={false} tickLine={false} tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 10, weight: 700 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 10 }} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'var(--ln-bg-panel)', borderColor: 'var(--ln-border-standard)', borderRadius: '12px' }}
                                    />
                                    <Bar dataKey="_count" radius={[6, 6, 0, 0]}>
                                        {memoizedStats.actionDistribution.map((entry, index) => (
                                            <ReCell key={`cell-${index}`} fill={LN_COLORS[index % LN_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-[var(--ln-bg-panel)]/30 backdrop-blur-md p-6 rounded-[24px] border border-[var(--ln-border-standard)] flex flex-wrap gap-6">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] weight-590 text-[var(--ln-text-primary)] uppercase tracking-widest mb-2 opacity-60">Operación</label>
                    <select
                        name="action"
                        value={filters.action}
                        onChange={handleFilterChange}
                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 outline-none transition-all text-[var(--ln-text-primary)]"
                    >
                        <option value="">Todas las acciones</option>
                        <option value="LOGIN">Inicio de Sesión</option>
                        <option value="CREATE">Registro / Creación</option>
                        <option value="UPDATE">Modificación</option>
                        <option value="DELETE">Eliminación</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] weight-590 text-[var(--ln-text-primary)] uppercase tracking-widest mb-2 opacity-60">Entidad / Módulo</label>
                    <select
                        name="entityType"
                        value={filters.entityType}
                        onChange={handleFilterChange}
                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 outline-none transition-all text-[var(--ln-text-primary)]"
                    >
                        <option value="">Todos los módulos</option>
                        <option value="USER">Usuarios</option>
                        <option value="CELL">Células</option>
                        <option value="ENCUENTRO">Encuentros</option>
                        <option value="CONVENTION">Convenciones</option>
                        <option value="SESSION">Sesiones de Clase</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] weight-590 text-[var(--ln-text-primary)] uppercase tracking-widest mb-2 opacity-60">Desde</label>
                    <input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 outline-none text-[var(--ln-text-primary)]"
                    />
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] weight-590 text-[var(--ln-text-primary)] uppercase tracking-widest mb-2 opacity-60">Hasta</label>
                    <input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                        className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 outline-none text-[var(--ln-text-primary)]"
                    />
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[24px] border border-[var(--ln-border-standard)] overflow-hidden shadow-2xl">
                <DataTable
                    columns={[
                        {
                            key: 'createdAt',
                            title: 'Marca de Tiempo',
                            render: (_, log) => (
                                <div className="text-[13px] weight-510 text-[var(--ln-text-primary)] font-mono opacity-80">
                                    {formatDate(log.createdAt)}
                                </div>
                            )
                        },
                        {
                            key: 'user',
                            title: 'Responsable',
                            render: (_, log) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[var(--ln-brand-indigo)]/10 border border-[var(--ln-brand-indigo)]/20 flex items-center justify-center text-[var(--ln-brand-indigo)] weight-590 text-sm">
                                        {log.user?.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-[14px] weight-590 text-[var(--ln-text-primary)] tracking-tight">
                                            {log.user?.fullName || 'Sistema MCU'}
                                        </p>
                                        <p className="text-[11px] text-[var(--ln-text-tertiary)] weight-510 uppercase tracking-widest opacity-60">
                                            {log.user?.role || 'Service Account'}
                                        </p>
                                    </div>
                                </div>
                            )
                        },
                        {
                            key: 'action',
                            title: 'Operación',
                            render: (_, log) => (
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-[var(--ln-border-standard)]">
                                        {getActionIcon(log.action)}
                                    </div>
                                    <span className="text-[13px] weight-590 text-[var(--ln-text-primary)]">{log.action}</span>
                                </div>
                            )
                        },
                        {
                            key: 'entityType',
                            title: 'Módulo',
                            render: (_, log) => (
                                <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[9px] weight-590 uppercase tracking-widest border ${getEntityColor(log.entityType)}`}>
                                    {log.entityType}
                                </span>
                            )
                        },
                        {
                            key: 'details',
                            title: 'Cambios / Registros',
                            render: (_, log) => renderDetails(log.details, log.action)
                        },
                        {
                            key: 'actions',
                            title: '',
                            render: (_, log) => (
                                <div className="text-right">
                                    <button
                                        onClick={() => setSelectedLog(log)}
                                        className="text-[12px] weight-590 text-[var(--ln-brand-indigo)] hover:text-[var(--ln-brand-indigo)]/80 bg-[var(--ln-brand-indigo)]/10 hover:bg-[var(--ln-brand-indigo)]/20 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                    >
                                        Auditar
                                    </button>
                                </div>
                            )
                        }
                    ]}
                    data={logs}
                    loading={loading}
                    emptyMessage="Sin registros históricos en este intervalo."
                    pagination={{
                        page: pagination.currentPage,
                        pages: pagination.pages,
                        total: pagination.total,
                        pageSize: 50,
                        onPrev: () => setFilters(f => ({ ...f, page: f.page - 1 })),
                        onNext: () => setFilters(f => ({ ...f, page: f.page + 1 })),
                        onPageChange: (pageNum) => setFilters(f => ({ ...f, page: pageNum })),
                    }}
                />
            </div>

            {/* Database Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                <div className="p-8 bg-emerald-500/[0.03] border border-emerald-500/20 rounded-[32px] group hover:border-emerald-500/40 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                            <Download size={24} weight="bold" />
                        </div>
                        <div>
                            <h3 className="text-lg weight-590 text-[var(--ln-text-primary)]">Respaldo SQL</h3>
                            <p className="text-sm text-[var(--ln-text-tertiary)] opacity-70">Copia completa compatible con PostgreSQL</p>
                        </div>
                    </div>
                    <button
                        id="downloadBackupBtn"
                        onClick={performBackupDownload}
                        className="w-full py-3.5 bg-emerald-500 text-white rounded-2xl weight-590 text-[14px] hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
                    >
                        <Download size={18} weight="bold" />
                        Descargar Backup
                    </button>
                </div>

                <div className="p-8 bg-red-500/[0.03] border border-red-500/20 rounded-[32px] group hover:border-red-500/40 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20 group-hover:scale-110 transition-transform">
                            <PulseIcon size={24} weight="bold" />
                        </div>
                        <div>
                            <h3 className="text-lg weight-590 text-[var(--ln-text-primary)]">Restauración Forzada</h3>
                            <p className="text-sm text-[var(--ln-text-tertiary)] opacity-70">Sobrescribir base de datos desde respaldo</p>
                        </div>
                    </div>
                    <input
                        type="file"
                        id="backupUpload"
                        accept=".sql"
                        className="hidden"
                        onChange={handleRestoreBackup}
                    />
                    <button
                        onClick={() => document.getElementById('backupUpload').click()}
                        className="w-full py-3.5 bg-red-500 text-white rounded-2xl weight-590 text-[14px] hover:bg-red-600 active:scale-[0.98] transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-3"
                    >
                        <ShieldCheck size={18} weight="bold" />
                        Ejecutar Restauración
                    </button>
                </div>
            </div>

            {/* Modal de Detalles y Restauración se mantienen con lógica similar pero refinando UI en los componentes compartidos */}
            <ConfirmationModal
                isOpen={showRestoreConfirm}
                onClose={() => {
                    setShowRestoreConfirm(false);
                    setPendingRestoreFile(null);
                    setRestorePassword('');
                    setPasswordError('');
                }}
                onConfirm={performRestoreBackup}
                title={isRestoring ? "Proceso en Curso" : "⚠️ Confirmar Restauración"}
                message={isRestoring ? "Reconstruyendo estructura de datos..." : "Esta acción es irreversible y reemplazará toda la información actual."}
                confirmText="Proceder con la Restauración"
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white rounded-xl py-3"
            >
                {/* ... existing content with minor visual tweaks for the inputs ... */}
                {pendingRestoreFile && (
                    <div className="bg-white/5 border border-[var(--ln-border-standard)] p-5 rounded-2xl mb-6 flex items-center gap-4">
                        <div className="w-10 h-10 bg-[var(--ln-text-primary)]/10 rounded-xl flex items-center justify-center">
                            <Download size={20} className="text-[var(--ln-text-tertiary)]" />
                        </div>
                        <div>
                            <p className="text-sm weight-590 text-[var(--ln-text-primary)]">{pendingRestoreFile.name}</p>
                            <p className="text-[11px] text-[var(--ln-text-tertiary)] opacity-60">{(pendingRestoreFile.size / 1024 / 1024).toFixed(2)} MB • SQL Script</p>
                        </div>
                    </div>
                )}
                {!isRestoring && requirePasswordConfirm && (
                    <div className="space-y-4">
                        <label className="text-xs weight-590 uppercase tracking-widest text-red-500 opacity-80">Contraseña de Administrador</label>
                        <input
                            type="password"
                            value={restorePassword}
                            onChange={(e) => {
                                setRestorePassword(e.target.value);
                                setPasswordError('');
                            }}
                            className="w-full px-4 py-3 bg-[var(--ln-input-bg)] border border-red-500/20 rounded-xl focus:ring-2 focus:ring-red-500/20 outline-none text-[var(--ln-text-primary)]"
                            placeholder="••••••••"
                        />
                        {passwordError && <p className="text-xs text-red-500 weight-590">{passwordError}</p>}
                    </div>
                )}
                {isRestoring && (
                    <div className="py-6">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[13px] weight-590 text-[var(--ln-brand-indigo)] animate-pulse">{restoreStatus}</span>
                            <span className="text-[13px] weight-700">{Math.round(restoreProgress)}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--ln-brand-indigo)] transition-all duration-300 shadow-[0_0_10px_var(--ln-brand-indigo)]" style={{ width: `${restoreProgress}%` }} />
                        </div>
                    </div>
                )}
            </ConfirmationModal>

            {/* Log Detail Modal */}
            {selectedLog && (
                <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Detalle de Auditoría" size="lg">
                    <Modal.Content>
                        {/* User Info */}
                        <div className="flex items-center gap-4 mb-8 p-4 bg-white/[0.03] rounded-2xl border border-[var(--ln-border-standard)]">
                            <div className="w-12 h-12 rounded-xl bg-[var(--ln-brand-indigo)]/10 border border-[var(--ln-brand-indigo)]/20 flex items-center justify-center text-[var(--ln-brand-indigo)] weight-590 text-lg flex-shrink-0">
                                {selectedLog.user?.fullName?.charAt(0) || 'S'}
                            </div>
                            <div>
                                <p className="text-[16px] weight-590 text-[var(--ln-text-primary)]">
                                    {selectedLog.user?.fullName || 'Sistema MCU'}
                                </p>
                                <p className="text-[12px] text-[var(--ln-text-tertiary)]">
                                    {selectedLog.user?.email || ''}
                                    {selectedLog.user?.roles?.length > 0 && ` \u00B7 ${selectedLog.user.roles.join(', ')}`}
                                </p>
                            </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] opacity-60">Acci\u00F3n</span>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-[var(--ln-border-standard)]">
                                            {getActionIcon(selectedLog.action)}
                                        </div>
                                        <span className="text-[14px] weight-590 text-[var(--ln-text-primary)]">{selectedLog.action}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] opacity-60">Entidad</span>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] weight-590 uppercase tracking-widest border ${getEntityColor(selectedLog.entityType)}`}>
                                            {selectedLog.entityType}
                                        </span>
                                        {selectedLog.entityId && (
                                            <span className="text-[12px] font-mono text-[var(--ln-text-tertiary)]">#{selectedLog.entityId}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] opacity-60">Fecha y Hora</span>
                                    <p className="text-[13px] weight-510 text-[var(--ln-text-primary)] mt-1.5 font-mono">
                                        {formatDate(selectedLog.createdAt, true)}
                                    </p>
                                </div>
                                {selectedLog.ipAddress && (
                                    <div>
                                        <span className="text-[10px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] opacity-60">Direcci\u00F3n IP</span>
                                        <p className="text-[13px] weight-510 text-[var(--ln-text-primary)] mt-1.5 font-mono">
                                            {selectedLog.ipAddress}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* User Agent */}
                        {selectedLog.userAgent && (
                            <div className="mb-8 p-3 bg-white/[0.03] rounded-xl border border-[var(--ln-border-standard)]">
                                <span className="text-[10px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] opacity-60">User Agent</span>
                                <p className="text-[11px] text-[var(--ln-text-tertiary)] mt-1 truncate font-mono">
                                    {selectedLog.userAgent}
                                </p>
                            </div>
                        )}

                        {/* Changes Table */}
                        {(() => {
                            try {
                                const details = typeof selectedLog.details === 'object' ? selectedLog.details : JSON.parse(selectedLog.details);
                                if (details.changes && Object.keys(details.changes).length > 0) {
                                    const changeEntries = Object.entries(details.changes);
                                    return (
                                        <div className="mb-6">
                                            <h4 className="text-[11px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] opacity-60 mb-3">
                                                Cambios Realizados ({changeEntries.length})
                                            </h4>
                                            <div className="overflow-hidden rounded-xl border border-[var(--ln-border-standard)]">
                                                <table className="w-full text-[12px]">
                                                    <thead>
                                                        <tr className="bg-white/[0.03]">
                                                            <th className="text-left px-4 py-2.5 weight-590 text-[var(--ln-text-tertiary)]">Campo</th>
                                                            <th className="text-left px-4 py-2.5 weight-590 text-[var(--ln-text-tertiary)]">Valor Anterior</th>
                                                            <th className="text-left px-4 py-2.5 weight-590 text-[var(--ln-text-tertiary)]">Valor Nuevo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {changeEntries.map(([field, change]) => (
                                                            <tr key={field} className="border-t border-[var(--ln-border-standard)] hover:bg-white/[0.02]">
                                                                <td className="px-4 py-2.5 weight-590 text-[var(--ln-text-primary)]">
                                                                    {propertyMap[field] || field}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-[var(--ln-text-tertiary)] font-mono">
                                                                    {change.old !== undefined && change.old !== null ? String(change.old) : '-'}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-emerald-400 font-mono weight-510">
                                                                    {String(change.new ?? '')}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            } catch {
                                return null;
                            }
                        })()}

                        {/* Raw JSON */}
                        {(() => {
                            try {
                                const details = typeof selectedLog.details === 'object' ? selectedLog.details : JSON.parse(selectedLog.details);
                                const jsonStr = JSON.stringify(details, null, 2);
                                return (
                                    <details className="group">
                                        <summary className="text-[11px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] opacity-40 cursor-pointer hover:opacity-60 transition-all select-none">
                                            JSON Raw
                                        </summary>
                                        <pre className="mt-2 p-4 bg-black/30 rounded-xl text-[10px] text-[var(--ln-text-tertiary)] font-mono overflow-x-auto leading-relaxed max-h-48 overflow-y-auto">
                                            {jsonStr}
                                        </pre>
                                    </details>
                                );
                            } catch {
                                return null;
                            }
                        })()}
                    </Modal.Content>
                </Modal>
            )}
        </div>
    );
};

export default AuditDashboard;
