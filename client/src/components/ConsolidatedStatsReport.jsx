import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend} from 'recharts';
import toast from 'react-hot-toast';
import { Lock, Medal, TrendUp, Users, Calendar, ChartLine, Envelope, CurrencyDollar, Student, PrinterIcon, MapPin, BookOpenIcon } from '@phosphor-icons/react';

const LN_COLORS = ['var(--ln-brand-indigo)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const ConsolidatedStatsReport = ({ simpleMode = false }) => {
    const { user, hasAnyRole } = useAuth();
    const [stats, setStats] = useState(null);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 5);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const ALLOWED_ROLES = ['PASTOR', 'LIDER_DOCE', 'ADMIN'];
    const hasAccess = hasAnyRole(ALLOWED_ROLES);

    useEffect(() => {
        if (hasAccess) {
            fetchStats();
        }
    }, [startDate, endDate, hasAccess]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await api.get('/consolidar/stats/general', {
                params: { startDate, endDate }
            });
            setStats(response.data);
        } catch (error) {
            toast.error('Error al cargar estadísticas consolidadas.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
    };

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center p-16 bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[32px] border border-[var(--ln-border-standard)] text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl mb-6">
                    <Lock className="w-12 h-12 text-red-500" weight="bold" />
                </div>
                <h2 className="text-2xl weight-590 text-[var(--ln-text-primary)] mb-3 tracking-tight">Acceso Reservado</h2>
                <p className="text-[var(--ln-text-tertiary)] max-w-sm weight-510 leading-relaxed opacity-70">
                    Este panel contiene información estratégica disponible únicamente para la línea de liderazgo principal.
                </p>
            </div>
        );
    }

    if (!stats && loading) return <div className="text-center py-20 text-[var(--ln-text-tertiary)] weight-590 animate-pulse">Analizando registros históricos...</div>;
    if (!stats) return <div className="text-center py-20 text-[var(--ln-text-tertiary)] weight-590">No hay información para este intervalo.</div>;

    const transformToChartData = (dataObj) => {
        if (!dataObj) return [];
        return Object.keys(dataObj).map(key => ({
            name: key,
            ...dataObj[key]
        }));
    };

    const transformGuestsData = (dataObj) => {
        if (!dataObj) return [];
        return Object.keys(dataObj).map(leader => ({
            name: leader,
            count: dataObj[leader]
        }));
    };

    const attendanceData = transformToChartData(stats.attendanceByMonth);
    const guestsData = transformGuestsData(stats.guestsByLeader);

    const getAllLeaders = (dataObj) => {
        const leaders = new Set();
        Object.values(dataObj).forEach(monthObj => {
            Object.keys(monthObj).forEach(l => leaders.add(l));
        });
        return Array.from(leaders);
    };

    const attendanceLeaders = getAllLeaders(stats.attendanceByMonth || {});
    const getColor = (index) => LN_COLORS[index % LN_COLORS.length];

    return (
        <div className={`space-y-10 animate-in fade-in duration-700 ${simpleMode ? 'p-0' : 'p-4'} print:p-0`}>
            {/* Control Bar */}
            <div className={`flex flex-col md:flex-row justify-between items-center gap-6 print:hidden ${simpleMode ? '' : 'bg-[var(--ln-bg-panel)]/30 backdrop-blur-md p-6 rounded-[24px] border border-[var(--ln-border-standard)]'}`}>
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] weight-590 text-[var(--ln-text-primary)] uppercase tracking-widest opacity-60">Desde:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 outline-none text-[var(--ln-text-primary)] transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] weight-590 text-[var(--ln-text-primary)] uppercase tracking-widest opacity-60">Hasta:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 outline-none text-[var(--ln-text-primary)] transition-all"
                        />
                    </div>
                </div>

                {!simpleMode && (
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-3 bg-[var(--ln-brand-indigo)] text-white px-6 py-2.5 rounded-xl weight-590 text-[13px] hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[var(--ln-brand-indigo)]/20"
                    >
                        <PrinterIcon size={18} weight="bold" />
                        Imprimir Reporte
                    </button>
                )}
            </div>

            {/* Document Body */}
            <div className={`bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[32px] border border-[var(--ln-border-standard)] shadow-2xl ${simpleMode ? 'p-6' : 'p-12'} print:shadow-none print:p-0`} id="printable-report">
                
                {!simpleMode && (
                    <div className="text-center border-b border-[var(--ln-border-standard)] pb-10 mb-12">
                        <h1 className="text-4xl weight-590 text-[var(--ln-text-primary)] tracking-tight mb-3">Reporte General</h1>
                        <p className="text-[var(--ln-text-tertiary)] weight-510 tracking-wide opacity-60 uppercase text-[10px]">Consolidado Histórico de Operaciones</p>
                    </div>
                )}

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                    <div className="group bg-blue-500/[0.03] p-6 rounded-[28px] border border-blue-500/10 hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20 group-hover:scale-110 transition-transform">
                                <Users size={20} weight="bold" />
                            </div>
                            <span className="text-[10px] weight-590 text-blue-500 uppercase tracking-widest opacity-80">Total Invitados</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-4xl weight-590 text-[var(--ln-text-primary)] tracking-tighter">{stats.summary.totalGuests}</span>
                            <span className="text-[11px] text-[var(--ln-text-tertiary)] weight-510 mt-1">Invitados Registrados</span>
                        </div>
                    </div>

                    <div className="group bg-emerald-500/[0.03] p-6 rounded-[28px] border border-emerald-500/10 hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                <Medal size={20} weight="bold" />
                            </div>
                            <span className="text-[10px] weight-590 text-emerald-500 uppercase tracking-widest opacity-80">Conversión</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl weight-590 text-[var(--ln-text-primary)] tracking-tighter">{stats.summary.totalConversions}</span>
                                <span className="text-lg weight-590 text-emerald-500">{stats.summary.conversionRate}%</span>
                            </div>
                            <span className="text-[11px] text-[var(--ln-text-tertiary)] weight-510 mt-1">Invitados Ganados</span>
                        </div>
                    </div>

                    <div className="group bg-red-500/[0.03] p-6 rounded-[28px] border border-red-500/10 hover:border-red-500/30 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20 group-hover:scale-110 transition-transform">
                                <MapPin size={20} weight="bold" />
                            </div>
                            <span className="text-[10px] weight-590 text-red-500 uppercase tracking-widest opacity-80">Células</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-4xl weight-590 text-[var(--ln-text-primary)] tracking-tighter">{stats.summary.totalCells}</span>
                            <span className="text-[11px] text-[var(--ln-text-tertiary)] weight-510 mt-1">Células Activas</span>
                        </div>
                    </div>

                    <div className="group bg-indigo-500/[0.03] p-6 rounded-[28px] border border-indigo-500/10 hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                <BookOpenIcon size={20} weight="bold" />
                            </div>
                            <span className="text-[10px] weight-590 text-indigo-500 uppercase tracking-widest opacity-80">Formación</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-4xl weight-590 text-[var(--ln-text-primary)] tracking-tighter">{stats.summary.activeStudents}</span>
                            <span className="text-[11px] text-[var(--ln-text-tertiary)] weight-510 mt-1">Alumnos Inscritos</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                    <div className="p-8 bg-white/5 rounded-[32px] border border-[var(--ln-border-standard)] shadow-sm">
                        <h3 className="text-sm weight-590 text-[var(--ln-text-primary)] uppercase tracking-widest opacity-60 mb-8 flex items-center gap-3">
                            <TrendUp className="text-[var(--ln-brand-indigo)]" size={18} weight="bold" />
                            Efectividad de Seguimiento
                        </h3>
                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[13px] weight-590 text-[var(--ln-text-primary)] opacity-80">Llamada de Contacto</span>
                                    <span className="text-[13px] weight-700">{Math.round((stats.trackingStats.withCall / stats.summary.totalGuests * 100) || 0)}%</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-[var(--ln-brand-indigo)] transition-all duration-1000 shadow-[0_0_8px_var(--ln-brand-indigo)]" 
                                        style={{ width: `${(stats.trackingStats.withCall / stats.summary.totalGuests * 100) || 0}%` }} 
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[13px] weight-590 text-[var(--ln-text-primary)] opacity-80">Visita en Hogar</span>
                                    <span className="text-[13px] weight-700">{Math.round((stats.trackingStats.withVisit / stats.summary.totalGuests * 100) || 0)}%</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                                        style={{ width: `${(stats.trackingStats.withVisit / stats.summary.totalGuests * 100) || 0}%` }} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-white/5 rounded-[32px] border border-[var(--ln-border-standard)] shadow-sm flex flex-col items-center justify-center text-center">
                        <h3 className="text-sm weight-590 text-[var(--ln-text-primary)] uppercase tracking-widest opacity-60 mb-8 w-full text-left flex items-center gap-3">
                            <Medal className="text-amber-500" size={18} weight="bold" />
                            Conversión Estratégica
                        </h3>
                        <div className="relative w-full max-w-[240px]">
                            <div className="aspect-square rounded-full border-[12px] border-emerald-500/10 flex items-center justify-center relative">
                                <div className="text-center">
                                    <span className="text-5xl weight-590 text-[var(--ln-text-primary)] tracking-tighter">{stats.summary.conversionRate}%</span>
                                    <p className="text-[10px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] mt-1">Éxito Total</p>
                                </div>
                                <svg className="absolute inset-0 w-full h-full -rotate-90">
                                    <circle
                                        cx="50%"
                                        cy="50%"
                                        r="46%"
                                        fill="none"
                                        stroke="var(--ln-brand-indigo)"
                                        strokeWidth="12"
                                        strokeDasharray="290"
                                        strokeDashoffset={290 - (290 * stats.summary.conversionRate / 100)}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="space-y-16">
                    <div className="p-8 bg-white/5 rounded-[32px] border border-[var(--ln-border-standard)] shadow-sm">
                        <h3 className="text-sm weight-590 text-[var(--ln-text-primary)] uppercase tracking-widest opacity-60 mb-10 flex items-center gap-3">
                            <Users className="text-purple-500" size={18} weight="bold" />
                            Invitados por Lider Doce
                        </h3>
                        <div className="h-80 w-full">
                            {mounted && guestsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={guestsData} layout="vertical" margin={{ left: 40 }}>
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 10 }} />
                                        <YAxis dataKey="name" type="category" width={180} axisLine={false} tickLine={false} tick={{ fill: 'var(--ln-text-primary)', fontSize: 12, weight: 510 }} />
                                        <Tooltip 
                                            cursor={{ fill: 'var(--ln-bg-panel)', opacity: 0.1 }}
                                            contentStyle={{ backgroundColor: 'var(--ln-bg-panel)', borderColor: 'var(--ln-border-standard)', borderRadius: '12px' }}
                                        />
                                        <Bar dataKey="count" fill="var(--ln-brand-indigo)" radius={[0, 8, 8, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="text-gray-400 italic text-center pt-10">Sin registros.</p>}
                        </div>
                    </div>

                    <div className="p-8 bg-white/5 rounded-[32px] border border-[var(--ln-border-standard)] shadow-sm">
                        <h3 className="text-sm weight-590 text-[var(--ln-text-primary)] uppercase tracking-widest opacity-60 mb-10 flex items-center gap-3">
                            <TrendUp className="text-emerald-500" size={18} weight="bold" />
                            Dinámica de Asistencia Mensual
                        </h3>
                        <div className="h-96 w-full">
                            {mounted && attendanceData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={attendanceData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ln-border-standard)" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 11 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 11 }} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: 'var(--ln-bg-panel)', borderColor: 'var(--ln-border-standard)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px', fontSize: '11px', weight: 590, textTransform: 'uppercase', letterSpacing: '1px' }} />
                                        {attendanceLeaders.map((leader, index) => (
                                            <Bar key={leader} dataKey={leader} stackId="a" fill={getColor(index)} radius={index === attendanceLeaders.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="text-gray-400 italic text-center pt-10">Sin datos registrados.</p>}
                        </div>
                    </div>
                </div>

                {/* Academic & Structure Tables */}
                <div className="mt-20 space-y-16">
                    <div>
                        <h2 className="text-xl weight-590 text-[var(--ln-text-primary)] mb-8 flex items-center gap-4">
                            <BookOpenIcon className="text-[var(--ln-brand-indigo)]" size={24} weight="bold" />
                            Desempeño Académico
                        </h2>
                        <div className="overflow-hidden rounded-2xl border border-[var(--ln-border-standard)] bg-white/5">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[var(--ln-bg-panel)]/50 text-[10px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] group">
                                    <tr>
                                        <th className="px-6 py-5">Módulo Académico</th>
                                        <th className="px-6 py-5 text-center">Cantidad de Estudiantes</th>
                                        <th className="px-6 py-5 text-center">Calificación Media</th>
                                        <th className="px-6 py-5 text-center">Asistencia Promedio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--ln-border-standard)] text-[var(--ln-text-primary)]">
                                    {stats.studentStats && stats.studentStats.map((item, index) => (
                                        <tr key={index} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-5 weight-590">{item.moduleName}</td>
                                            <td className="px-6 py-5 text-center">{item.studentCount}</td>
                                            <td className="px-6 py-5 text-center"><span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg weight-700">{item.avgGrade}</span></td>
                                            <td className="px-6 py-5 text-center">{item.avgAttendance}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div>
                            <h2 className="text-xl weight-590 text-[var(--ln-text-primary)] mb-8 flex items-center gap-4">
                                <MapPin className="text-red-500" size={24} weight="bold" />
                                Células
                            </h2>
                            <div className="rounded-2xl border border-[var(--ln-border-standard)] bg-white/5 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-[var(--ln-bg-panel)]/50 text-[10px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)]">
                                        <tr>
                                            <th className="px-4 py-4">Líder Doce</th>
                                            <th className="px-4 py-4 text-center">Células</th>
                                            <th className="px-4 py-4 text-center">Asist. Media</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--ln-border-standard)] text-[var(--ln-text-primary)]">
                                        {Object.keys(stats.cellsByLeader || {}).map((leader, index) => (
                                            <tr key={index} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-4 weight-590">{leader}</td>
                                                <td className="px-4 py-4 text-center">{stats.cellsByLeader[leader].count}</td>
                                                <td className="px-4 py-4 text-center">{stats.cellsByLeader[leader].avgAttendance}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-500/[0.03] border border-[var(--ln-border-standard)] rounded-[32px]">
                            <h3 className="text-[10px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest mb-6 px-2">Geolocalización Ministerial</h3>
                            <div className="space-y-6 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                                {Object.keys(stats.cellsByLeader || {}).map((leader) => (
                                    <div key={leader} className="p-4 bg-white/5 rounded-2xl border border-[var(--ln-border-standard)] group hover:border-[var(--ln-brand-indigo)]/40 transition-all">
                                        <p className="text-[12px] weight-590 text-[var(--ln-brand-indigo)] mb-3">{leader}</p>
                                        <ul className="space-y-2">
                                            {stats.cellsByLeader[leader].locations.map((loc, idx) => (
                                                <li key={idx} className="flex items-center justify-between gap-3 text-[11px] text-[var(--ln-text-tertiary)]">
                                                    <span className="truncate opacity-80">• {loc.address}, {loc.city}</span>
                                                    {loc.lat && (
                                                        <a href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer" className="shrink-0 text-[var(--ln-brand-indigo)] weight-590 hover:underline">MAPA</a>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl weight-590 text-[var(--ln-text-primary)] mb-8 flex items-center gap-4">
                            <Medal className="text-purple-600" size={24} weight="bold" />
                            Encuentros
                        </h2>
                        <div className="overflow-hidden rounded-2xl border border-[var(--ln-border-standard)] bg-white/5">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[var(--ln-bg-panel)]/50 text-[10px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)]">
                                    <tr>
                                        <th className="px-6 py-5">Líder Doce</th>
                                        <th className="px-6 py-5">Célula</th>
                                        <th className="px-6 py-5 text-center">Inscritos</th>
                                        <th className="px-6 py-5 text-right">Recaudado</th>
                                        <th className="px-6 py-5 text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--ln-border-standard)] text-[var(--ln-text-primary)]">
                                    {Object.keys(stats.encuentrosInfo || {}).map((leader) => (
                                        Object.keys(stats.encuentrosInfo[leader]).map((cell, idx) => {
                                            const data = stats.encuentrosInfo[leader][cell];
                                            return (
                                                <tr key={`${leader}-${cell}-${idx}`} className="hover:bg-white/5 transition-colors">
                                                    {idx === 0 && (
                                                        <td className="px-6 py-5 weight-590 border-r border-[var(--ln-border-standard)]" rowSpan={Object.keys(stats.encuentrosInfo[leader]).length}>
                                                            {leader}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-5 text-[var(--ln-text-tertiary)]">{cell}</td>
                                                    <td className="px-6 py-5 text-center weight-700">{data.count}</td>
                                                    <td className="px-6 py-5 text-right text-emerald-500 weight-590">{formatCurrency(data.totalPaid)}</td>
                                                    <td className="px-6 py-5 text-right text-red-500 weight-590">{formatCurrency(data.balance)}</td>
                                                </tr>
                                            );
                                        })
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl weight-590 text-[var(--ln-text-primary)] mb-8 flex items-center gap-4">
                            <Medal className="text-pink-600" size={24} weight="bold" />
                            Información de Convenciones
                        </h2>
                        <div className="overflow-hidden rounded-2xl border border-[var(--ln-border-standard)] bg-white/5">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[var(--ln-bg-panel)]/50 text-[10px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)]">
                                    <tr>
                                        <th className="px-6 py-5">Líder Doce</th>
                                        <th className="px-6 py-5 text-center">Inscritos</th>
                                        <th className="px-6 py-5 text-right">Recaudado Total</th>
                                        <th className="px-6 py-5 text-right">Saldo Pendiente</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--ln-border-standard)] text-[var(--ln-text-primary)]">
                                    {Object.keys(stats.conventionsInfo || {}).map((leader, index) => {
                                        const data = stats.conventionsInfo[leader];
                                        return (
                                            <tr key={index} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-5 weight-590">{leader}</td>
                                                <td className="px-6 py-5 text-center weight-700">{data.count}</td>
                                                <td className="px-6 py-5 text-right text-emerald-500 weight-590">{formatCurrency(data.totalPaid)}</td>
                                                <td className="px-6 py-5 text-right text-red-500 weight-590">{formatCurrency(data.balance)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-24 pt-10 border-t border-[var(--ln-border-standard)] text-center">
                        <p className="text-[11px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-[0.2em] opacity-40">
                            Producido por media MCI Manizales • {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        #printable-report, #printable-report * { visibility: visible; }
                        #printable-report { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; padding: 0 !important; border: none !important; }
                        .rounded-[32px], .rounded-[28px], .rounded-2xl { border-radius: 4px !important; }
                        .bg-[var(--ln-bg-panel)]/50 { background: white !important; }
                        .text-[var(--ln-text-primary)] { color: black !important; }
                        .text-[var(--ln-text-tertiary)] { color: #666 !important; }
                    }
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--ln-border-standard); border-radius: 10px; }
                `}</style>
            </div>
        </div>
    );
};

export default ConsolidatedStatsReport;
