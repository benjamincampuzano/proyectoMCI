import { useMemo } from 'react';import {
    SquaresFour, UserPlus, CheckCircle, GraduationCap, Users, Handshake,
    Palette, ChartBar, Pulse,
} from '@phosphor-icons/react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
    PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { StatCard, ChartCard, ActivityFeed, DashboardSkeleton } from '../index';
import DashboardFilters from './DashboardFilters';
import UserActivityList from '../../UserActivityList';
import useUnifiedDashboard from '../../../hooks/useUnifiedDashboard';
import { exportUnifiedDashboard } from '../../../utils/dashboardExport';

const MODULES = [
    { id: 'resumen', label: 'Resumen', icon: SquaresFour },
    { id: 'ganar', label: 'Ganar', icon: UserPlus },
    { id: 'consolidar', label: 'Consolidar', icon: CheckCircle },
    { id: 'discipular', label: 'Discipular', icon: GraduationCap },
    { id: 'enviar', label: 'Enviar', icon: Users },
    { id: 'encuentros', label: 'Encuentros', icon: Handshake },
    { id: 'convenciones', label: 'Convenciones', icon: ChartBar },
    { id: 'artes', label: 'Artes', icon: Palette },
    { id: 'actividad', label: 'Actividad', icon: Pulse },
];

const tooltipStyle = {
    backgroundColor: '#0f1011',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    fontSize: 12,
};

const formatCOP = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v || 0));

const FunnelMini = ({ funnel, onSelect }) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {funnel.map((f, i) => (
            <button key={f.key} type="button" onClick={() => onSelect(f.key)} className="p-3.5 rounded-xl bg-white/[0.02] border border-[var(--ln-border-standard)] text-left hover:border-white/20 transition-all" title={`Filtrar por ${f.label}`}>
                <span className="text-[11px] text-[var(--ln-text-tertiary)] weight-510 block">{i + 1}. {f.label}</span>
                <span className="text-xl weight-590 mt-1 block" style={{ color: f.color }}>{f.value}</span>
            </button>
        ))}
    </div>
);

const UnifiedDashboard = () => {
    const {
        filters, updateFilter, applyPreset, clearFilters,
        module, setModule,
        dashboard, guestStats, lideresDoce,
        activityRows, activityTotal,
        funnel, topInviters, byRed,
        dailyChurch, cellTrend,
        loading, error, refresh,
    } = useUnifiedDashboard();

    const ganar = useMemo(() => dashboard?.ganar || {}, [dashboard]);
    const consolidar = useMemo(() => dashboard?.consolidar || {}, [dashboard]);
    const discipular = useMemo(() => dashboard?.discipular || {}, [dashboard]);
    const enviar = useMemo(() => dashboard?.enviar || {}, [dashboard]);
    const encuentros = useMemo(() => dashboard?.encuentros || {}, [dashboard]);
    const convenciones = useMemo(() => dashboard?.convenciones || {}, [dashboard]);
    const artes = useMemo(() => dashboard?.artes || {}, [dashboard]);
    const recentActivity = useMemo(() => dashboard?.recentActivity || [], [dashboard]);

    const attendanceTrend = useMemo(() => {
        if (dailyChurch?.length) return dailyChurch.map((d) => ({ name: String(d.date).slice(5), asistencia: d.present ?? 0 }));
        return (consolidar.attendanceHistory || []).map((h) => ({ name: String(h.date).slice(5), asistencia: h.count }));
    }, [dailyChurch, consolidar]);

    const cellChart = useMemo(() => (cellTrend || []).map((d) => ({ name: String(d.date).slice(5), presentes: d.present ?? 0, ausentes: d.absent ?? 0 })), [cellTrend]);

    const pieData = useMemo(() => funnel.map((f) => ({ name: f.label, value: f.value, color: f.color })), [funnel]);

    const handleExport = () => exportUnifiedDashboard({ dashboard, guestStats, filters, module }).catch(() => {});

    if (loading && !dashboard) return <DashboardSkeleton />;
    if (error && !dashboard) {
        return (
            <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl text-center">
                <p className="text-sm text-red-400 weight-590 mb-3">{error}</p>
                <button onClick={refresh} className="px-4 py-2 bg-white text-black rounded-xl text-xs weight-590">Reintentar</button>
            </div>
        );
    }

    const resultCount = module === 'ganar' ? (guestStats?.totalGuests ?? ganar.totalGuests ?? 0) : module === 'actividad' ? activityTotal : undefined;

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <DashboardFilters
                filters={filters}
                lideresDoce={lideresDoce}
                onChange={updateFilter}
                onPreset={applyPreset}
                onClear={clearFilters}
                onExport={handleExport}
                resultCount={resultCount}
            />

            {/* Selector de módulo tipo Power BI (páginas del informe) */}
            <div className="overflow-x-auto whitespace-nowrap -mx-1 px-1">
                <nav className="flex gap-1.5" aria-label="Módulos del dashboard">
                    {MODULES.map((m) => {
                        const Icon = m.icon;
                        const active = module === m.id;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setModule(m.id)}
                                className={`py-2 px-4 rounded-xl weight-510 text-[12px] sm:text-[13px] transition-all flex items-center gap-2 border ${active ? 'bg-[var(--ln-brand-indigo)]/15 text-[var(--ln-brand-indigo)] border-[var(--ln-brand-indigo)]/30' : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/5 border-transparent'}`}
                            >
                                <Icon size={16} weight={active ? 'bold' : 'regular'} />
                                {m.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {module === 'resumen' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Invitados" value={ganar.totalGuests ?? guestStats?.totalGuests ?? 0} icon={UserPlus} color="var(--ln-brand-indigo)" subtitle={`${ganar.ganadosGuests ?? 0} ganados (${ganar.conversionRate ?? 0}%)`} onClick={() => setModule('ganar')} />
                        <StatCard title="Asistencia reciente" value={consolidar.recentAttendance ?? 0} icon={CheckCircle} color="#10b981" subtitle={`Promedio: ${consolidar.averageWeekly ?? 0}`} onClick={() => setModule('consolidar')} />
                        <StatCard title="Estudiantes" value={discipular.enrolledStudents ?? 0} icon={GraduationCap} color="#8b5cf6" subtitle={`${discipular.activeModules ?? 0} módulos · ${discipular.graduatedStudents ?? 0} grad.`} onClick={() => setModule('discipular')} />
                        <StatCard title="Células creadas" value={enviar.totalCells ?? 0} icon={Users} color="#f59e0b" subtitle={`${enviar.activeLeaders ?? 0} líderes`} onClick={() => setModule('enviar')} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Encuentros activos" value={encuentros.activeEncuentros ?? 0} icon={Handshake} color="#ec4899" subtitle={`${encuentros.registeredCount ?? 0} inscritos · ${encuentros.baptizedCount ?? 0} bautizados`} onClick={() => setModule('encuentros')} />
                        <StatCard title="Convenciones activas" value={convenciones.activeConventions ?? 0} icon={ChartBar} color="#14b8a6" subtitle={`${convenciones.registeredCount ?? 0} registrados`} onClick={() => setModule('convenciones')} />
                        <StatCard title="Clases de arte" value={artes.totalClasses ?? 0} icon={Palette} color="#a855f7" subtitle={`${artes.enrolledCount ?? 0} inscritos`} onClick={() => setModule('artes')} />
                        <StatCard title="Saldos por cobrar" value={(encuentros.pendingPayments || 0) + (convenciones.pendingPayments || 0) + (artes.pendingCount || 0)} icon={Handshake} color="#f59e0b" subtitle={`Arte pendiente: ${formatCOP(artes.pending)}`} onClick={() => setModule('convenciones')} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <ChartCard title="Tendencia de asistencia" subtitle="Clic en un módulo (arriba) para profundizar. Filtros aplicados a todo el informe." isEmpty={attendanceTrend.length === 0}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--ln-text-tertiary)" fontSize={12} tickLine={false} />
                                        <YAxis stroke="var(--ln-text-tertiary)" fontSize={12} tickLine={false} allowDecimals={false} />
                                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                        <Bar dataKey="asistencia" fill="var(--ln-brand-indigo)" radius={[6, 6, 0, 0]} maxBarSize={44} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>
                        <ChartCard title="Actividad reciente" subtitle="Audit trail del periodo filtrado">
                            <ActivityFeed activities={recentActivity.slice(0, 8)} />
                        </ChartCard>
                    </div>
                    <ChartCard title="Embudo de consolidación" subtitle="Clic en una etapa para filtrar el módulo Ganar">
                        <FunnelMini funnel={funnel} onSelect={(key) => { updateFilter({ guestStatus: key }); setModule('ganar'); }} />
                    </ChartCard>
                </div>
            )}

            {module === 'ganar' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <StatCard title="Total" value={guestStats?.totalGuests ?? ganar.totalGuests ?? 0} icon={UserPlus} color="var(--ln-brand-indigo)" subtitle={`Prom./mes: ${Number(guestStats?.monthlyAverage || 0).toFixed(1)}`} />
                        {funnel.map((f) => <StatCard key={f.key} title={f.label} value={f.value} icon={UserPlus} color={f.color} onClick={() => updateFilter({ guestStatus: filters.guestStatus === f.key ? '' : f.key })} />)}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Distribución por estado" subtitle="Interactivas: cambian con los segmentadores" isEmpty={pieData.every((d) => !d.value)}>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={105} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartCard>
                        <ChartCard title="Top invitadores" subtitle="Filtrado por búsqueda y red" isEmpty={topInviters.length === 0}>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={topInviters.slice(0, 10)} layout="vertical" margin={{ left: 30 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={150} tick={{ fill: 'var(--ln-text-primary)', fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Bar dataKey="count" fill="var(--ln-brand-indigo)" radius={[0, 8, 8, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>
                    <ChartCard title="Invitaciones por Red (Líder 12)" subtitle="Cruce jerárquico calculado en backend" isEmpty={byRed.length === 0}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={byRed.slice(0, 12)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 11 }} tickLine={false} interval={0} angle={-18} dy={10} height={60} />
                                <YAxis tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={44} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            )}

            {module === 'consolidar' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard title="Asistencia reciente" value={consolidar.recentAttendance ?? 0} icon={CheckCircle} color="#10b981" />
                        <StatCard title="Promedio semanal" value={consolidar.averageWeekly ?? 0} icon={CheckCircle} color="var(--ln-brand-indigo)" />
                        <StatCard title="Registros en tendencia" value={attendanceTrend.reduce((a, b) => a + (b.asistencia || 0), 0)} icon={CheckCircle} color="#f59e0b" subtitle="Suma del periodo filtrado" />
                    </div>
                    <ChartCard title="Asistencia diaria — Iglesia" subtitle="Origen: /consolidar/church-attendance/daily-stats con filtros" isEmpty={attendanceTrend.length === 0}>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={attendanceTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Line type="monotone" dataKey="asistencia" stroke="var(--ln-brand-indigo)" strokeWidth={2.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            )}

            {module === 'discipular' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <StatCard title="Módulos activos" value={discipular.activeModules ?? 0} icon={GraduationCap} color="#8b5cf6" />
                        <StatCard title="Inscritos" value={discipular.enrolledStudents ?? 0} icon={GraduationCap} color="var(--ln-brand-indigo)" />
                        <StatCard title="Graduados" value={discipular.graduatedStudents ?? 0} icon={GraduationCap} color="#10b981" />
                        <StatCard title="Finalización" value={`${discipular.completionRate ?? 0}%`} icon={GraduationCap} color="#f59e0b" />
                    </div>
                    <ChartCard title="Embudo formación" subtitle="Inscritos vs graduados en el periodo">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={[{ name: 'Inscritos', valor: discipular.enrolledStudents || 0 }, { name: 'Graduados', valor: discipular.graduatedStudents || 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="valor" fill="#8b5cf6" radius={[8, 8, 0, 0]} maxBarSize={80} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            )}

            {module === 'enviar' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard title="Células creadas" value={enviar.totalCells ?? 0} icon={Users} color="#f59e0b" />
                        <StatCard title="Líderes activos" value={enviar.activeLeaders ?? 0} icon={Users} color="var(--ln-brand-indigo)" />
                        <StatCard title="Asistencia reciente" value={enviar.recentAttendance ?? 0} icon={Users} color="#10b981" />
                    </div>
                    <ChartCard title="Tendencia células (presentes vs ausentes)" subtitle="" isEmpty={cellChart.length === 0}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={cellChart}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="presentes" stackId="a" fill="#10b981" />
                                <Bar dataKey="ausentes" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            )}

            {module === 'encuentros' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Activos" value={encuentros.activeEncuentros ?? 0} icon={Handshake} color="#ec4899" />
                        <StatCard title="Inscritos" value={encuentros.registeredCount ?? 0} icon={Handshake} color="var(--ln-brand-indigo)" />
                        <StatCard title="Bautizados" value={encuentros.baptizedCount ?? 0} icon={Handshake} color="#10b981" />
                        <StatCard title="Pagos pendientes" value={encuentros.pendingPayments ?? 0} icon={Handshake} color="#f59e0b" />
                    </div>
                    <ChartCard title="Conversión encuentros" subtitle="Inscritos vs bautizados">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={[{ name: 'Inscritos', valor: encuentros.registeredCount || 0 }, { name: 'Bautizados', valor: encuentros.baptizedCount || 0 }, { name: 'Pendientes pago', valor: encuentros.pendingPayments || 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="valor" fill="#ec4899" radius={[8, 8, 0, 0]} maxBarSize={80} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            )}

            {module === 'convenciones' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <StatCard title="Activas" value={convenciones.activeConventions ?? 0} icon={ChartBar} color="#14b8a6" />
                        <StatCard title="Registrados" value={convenciones.registeredCount ?? 0} icon={ChartBar} color="var(--ln-brand-indigo)" />
                        <StatCard title="Pagos pendientes" value={convenciones.pendingPayments ?? 0} icon={ChartBar} color="#f59e0b" />
                    </div>
                    <ChartCard title="Estado convenciones" subtitle="Registros vs saldos pendientes">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={[{ name: 'Registrados', valor: convenciones.registeredCount || 0 }, { name: 'Pendientes', valor: convenciones.pendingPayments || 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="valor" fill="#14b8a6" radius={[8, 8, 0, 0]} maxBarSize={80} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            )}

            {module === 'artes' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Clases" value={artes.totalClasses ?? 0} icon={Palette} color="#a855f7" />
                        <StatCard title="Inscritos" value={artes.enrolledCount ?? 0} icon={Palette} color="var(--ln-brand-indigo)" />
                        <StatCard title="Recaudado" value={formatCOP(artes.collected)} icon={Palette} color="#10b981" />
                        <StatCard title="Pendiente" value={formatCOP(artes.pending)} icon={Palette} color="#f59e0b" subtitle={`${artes.pendingCount ?? 0} saldos`} />
                    </div>
                    <ChartCard title="Finanzas arte" subtitle="Recaudado vs pendiente en el periodo">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={[{ name: 'Recaudado', valor: artes.collected || 0 }, { name: 'Pendiente', valor: artes.pending || 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 12 }} tickLine={false} />
                                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCOP(v)} />
                                <Bar dataKey="valor" fill="#a855f7" radius={[8, 8, 0, 0]} maxBarSize={80} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            )}

            {module === 'actividad' && (
                <div className="space-y-6">
                    <ChartCard title="Actividad del sistema" subtitle={`Audit trail filtrado (${recentActivity.length} eventos) + matriz ministerial (${activityTotal} personas). Usa la búsqueda de arriba para filtrar la tabla.`}>
                        <ActivityFeed activities={recentActivity.slice(0, 10)} />
                    </ChartCard>
                    <UserActivityList filters={filters} lideresDoce={lideresDoce} showFilters={false} />
                    {activityRows.length > 0 && (
                        <p className="text-[11px] text-[var(--ln-text-tertiary)]">Coincidencias de búsqueda en matriz: {activityRows.length}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default UnifiedDashboard;
