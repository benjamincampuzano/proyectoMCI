import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useAttendance from '../hooks/useAttendance';
import { Calendar, TrendUp, Users, UserCircle, MapPin, Clock, CheckCircle, XCircle, Buildings } from '@phosphor-icons/react';
import api from '../utils/api';

const AttendanceChart = () => {
    const {
        stats,
        cells,
        selectedCell,
        setSelectedCell,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        loading,
        error,
    } = useAttendance();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [doceLeaders, setDoceLeaders] = useState([]);

    useEffect(() => {
        const fetchDoceLeaders = async () => {
            try {
                const res = await api.get('/enviar/eligible-doce-leaders');
                setDoceLeaders(res.data || []);
            } catch (err) {
                console.error('Error fetching doce leaders:', err);
            }
        };
        fetchDoceLeaders();
    }, []);

    useEffect(() => {
        const checkDarkMode = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };

        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    };

    const totalPresent = stats.reduce((sum, day) => sum + day.present, 0);
    const totalAbsent = stats.reduce((sum, day) => sum + day.absent, 0);
    const totalRecords = totalPresent + totalAbsent;
    const attendanceRate = totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(1) : 0;

    // --- Computed Statistics ---

    // 1. Liderazgo: cells per LIDER_DOCE and LIDER_CELULA (grouped by couples)
    const liderDoceStats = useMemo(() => {
        // Build spouse map: id -> spouseId
        const spouseMap = {};
        doceLeaders.forEach(l => {
            if (l.spouseId) {
                spouseMap[l.id] = l.spouseId;
                spouseMap[l.spouseId] = l.id;
            }
        });
        // Name map from cells + doceLeaders
        const nameMap = {};
        cells.forEach(c => { if (c.liderDoceId && c.liderDoce?.fullName) nameMap[c.liderDoceId] = c.liderDoce.fullName; });
        doceLeaders.forEach(l => { if (l.fullName) nameMap[l.id] = l.fullName; });

        const map = {};
        cells.forEach(cell => {
            if (!cell.liderDoceId) return;
            // Canonical key: couple grouped by smaller ID
            const spouseId = spouseMap[cell.liderDoceId];
            const key = spouseId ? Math.min(cell.liderDoceId, spouseId) : cell.liderDoceId;
            if (!map[key]) {
                const name2 = spouseId ? nameMap[spouseId] : null;
                map[key] = {
                    id: key,
                    name: nameMap[cell.liderDoceId] || 'Sin asignar',
                    spouseName: name2 || null,
                    cellCount: 0,
                    totalPeople: 0,
                };
            }
            map[key].cellCount += 1;
            map[key].totalPeople += (cell._count?.members ?? 0) + (cell._count?.guests ?? 0);
        });
        return Object.values(map).sort((a, b) => b.cellCount - a.cellCount);
    }, [cells, doceLeaders]);

    const liderCelulaStats = useMemo(() => {
        const map = {};
        cells.forEach(cell => {
            if (!cell.leaderId) return;
            if (!map[cell.leaderId]) {
                map[cell.leaderId] = {
                    id: cell.leaderId,
                    name: cell.leader?.fullName || 'Sin asignar',
                    cellCount: 0,
                    totalPeople: 0,
                };
            }
            map[cell.leaderId].cellCount += 1;
            map[cell.leaderId].totalPeople += (cell._count?.members ?? 0) + (cell._count?.guests ?? 0);
        });
        return Object.values(map).sort((a, b) => b.cellCount - a.cellCount);
    }, [cells]);

    // 2. Network type distribution
    const networkStats = useMemo(() => {
        const map = {};
        cells.forEach(cell => {
            const net = cell.network || 'MIXTA';
            map[net] = (map[net] || 0) + 1;
        });
        const labels = { MIXTA: 'Mixta', HOMBRES: 'Hombres', MUJERES: 'Mujeres', JOVENES: 'Jóvenes', NIÑOS: 'Niños' };
        const colors = { MIXTA: 'teal', HOMBRES: 'blue', MUJERES: 'pink', JOVENES: 'purple', NIÑOS: 'orange' };
        return Object.entries(map)
            .map(([key, count]) => ({
                key,
                label: labels[key] || key,
                count,
                percent: cells.length > 0 ? ((count / cells.length) * 100).toFixed(1) : 0,
                color: colors[key] || 'gray',
            }))
            .sort((a, b) => b.count - a.count);
    }, [cells]);

    // 3. Cartografía Espiritual
    const cartografiaStats = useMemo(() => {
        let withUrl = 0;
        let withoutUrl = 0;
        cells.forEach(cell => {
            if (cell.spiritualMappingUrl && cell.spiritualMappingUrl.trim()) {
                withUrl += 1;
            } else {
                withoutUrl += 1;
            }
        });
        return { withUrl, withoutUrl, total: cells.length };
    }, [cells]);

    // 4. Día de Ayuno
    const fastingStats = useMemo(() => {
        let withFasting = 0;
        let withoutFasting = 0;
        cells.forEach(cell => {
            if (cell.fastingDate && cell.fastingDate.trim()) {
                withFasting += 1;
            } else {
                withoutFasting += 1;
            }
        });
        return { withFasting, withoutFasting, total: cells.length };
    }, [cells]);



    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-[#272729] rounded-lg shadow-sm border border-gray-100 dark:border-[#3a3a3c] p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="cellSelect" className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                            Célula (Opcional)
                        </label>
                        <select
                            id="cellSelect"
                            value={selectedCell}
                            onChange={(e) => setSelectedCell(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] outline-none"
                        >
                            <option value="">Todas las células</option>
                            {cells.map(cell => (
                                <option key={cell.id} value={cell.id}>
                                    {cell.name} - {cell.leader.fullName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                            <Calendar className="inline w-4 h-4 mr-1" />
                            Fecha Inicio
                        </label>
                        <input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                            <Calendar className="inline w-4 h-4 mr-1" />
                            Fecha Fin
                        </label>
                        <input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards - Unified Style */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-100 dark:border-green-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg text-green-600 dark:text-green-300">
                            <TrendUp size={20} />
                        </div>
                        <span className="text-sm font-bold text-green-800 dark:text-green-200 uppercase tracking-tight">Total Asistencias</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-green-900 dark:text-white">{totalPresent}</span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">Registros de presencia</span>
                    </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-100 dark:border-red-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg text-red-600 dark:text-red-300">
                            <TrendUp size={20} />
                        </div>
                        <span className="text-sm font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Total Ausencias</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-red-900 dark:text-white">{totalAbsent}</span>
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">Registros de ausencia</span>
                    </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                            <TrendUp size={20} />
                        </div>
                        <span className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Total Registros</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-blue-900 dark:text-white">{totalRecords}</span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Suma de registros</span>
                    </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg text-purple-600 dark:text-purple-300">
                            <TrendUp size={20} />
                        </div>
                        <span className="text-sm font-bold text-purple-800 dark:text-purple-200 uppercase tracking-tight">Tasa de Asistencia</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-purple-900 dark:text-white">{attendanceRate}%</span>
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">Porcentaje de presencia</span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-[#272729] rounded-xl shadow-sm border border-gray-100 dark:border-[#3a3a3c] p-6">
                <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white mb-6">
                    Tendencia de Asistencia
                </h2>
                
                {/* Error Display */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-red-700 dark:text-red-300 text-sm">
                            Error: {error}
                        </p>
                    </div>
                )}
                
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-[#86868b] dark:text-[#98989d]">Cargando estadísticas...</p>
                    </div>
                ) : stats.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-[#86868b] dark:text-[#98989d]">No hay datos de asistencia para el rango de fechas seleccionado</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={stats}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                            />
                            <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                    color: isDarkMode ? '#f3f4f6' : '#111827'
                                }}
                                itemStyle={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}
                                labelFormatter={formatDate}
                                formatter={(value, name) => [value, name]}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => (
                                    <span style={{ color: isDarkMode ? '#e5e7eb' : '#374151' }}>
                                        {value}
                                    </span>
                                )}
                            />
                            <Bar dataKey="present" fill="#10b981" name="Presentes" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="absent" fill="#ef4444" name="Ausentes" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ==================== NEW STATISTICS SECTIONS ==================== */}

            {/* Section 1: Liderazgo */}
            <div className="bg-white dark:bg-[#272729] rounded-xl shadow-sm border border-gray-100 dark:border-[#3a3a3c] p-6">
                <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white mb-1 flex items-center gap-2">
                    <Buildings size={22} className="text-blue-600 dark:text-blue-400" />
                    Estructura de Liderazgo
                </h2>
                <p className="text-sm text-[#86868b] dark:text-[#98989d] mb-6">Células y personas por líder</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LIDER_DOCE Table */}
                    <div>
                        <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <UserCircle size={16} className="text-purple-600 dark:text-purple-400" />
                            Líderes 12
                        </h3>
                        {liderDoceStats.length === 0 ? (
                            <p className="text-sm text-[#86868b] dark:text-[#98989d] italic">No hay datos disponibles</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-[#3a3a3c]">
                                            <th className="text-left py-2 px-3 text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase">Nombre</th>
                                            <th className="text-center py-2 px-3 text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase">Células</th>
                                            <th className="text-center py-2 px-3 text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase">Personas</th>
                                            <th className="text-center py-2 px-3 text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase">Promedio/Célula</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-[#3a3a3c]">
                                        {liderDoceStats.map(stat => (
                                            <tr key={stat.id} className="hover:bg-[#f5f5f7] dark:hover:bg-gray-700/30">
                                                <td className="py-2 px-3 font-medium text-[#1d1d1f]">
                                                    {stat.name}
                                                    {stat.spouseName && (
                                                        <span className="text-[#1d1d1f] font-normal"> y {stat.spouseName}</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                        {stat.cellCount}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-center text-[#1d1d1f] dark:text-white/80">{stat.totalPeople}</td>
                                                <td className="py-2 px-3 text-center text-[#1d1d1f] dark:text-white/80">
                                                    {stat.cellCount > 0 ? (stat.totalPeople / stat.cellCount).toFixed(1) : '0'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* LIDER_CELULA Table */}
                    <div>
                        <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Users size={16} className="text-blue-600 dark:text-blue-400" />
                            Líderes de Célula
                        </h3>
                        {liderCelulaStats.length === 0 ? (
                            <p className="text-sm text-[#86868b] dark:text-[#98989d] italic">No hay datos disponibles</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-[#3a3a3c]">
                                            <th className="text-left py-2 px-3 text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase">Nombre</th>
                                            <th className="text-center py-2 px-3 text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase">Células</th>
                                            <th className="text-center py-2 px-3 text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase">Personas</th>
                                            <th className="text-center py-2 px-3 text-xs font-medium text-[#86868b] dark:text-[#98989d] uppercase">Promedio/Célula</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-[#3a3a3c]">
                                        {liderCelulaStats.map(stat => (
                                            <tr key={stat.id} className="hover:bg-[#f5f5f7] dark:hover:bg-gray-700/30">
                                                <td className="py-2 px-3 font-medium text-[#1d1d1f]">{stat.name}</td>
                                                <td className="py-2 px-3 text-center">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                        {stat.cellCount}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-center text-[#1d1d1f] dark:text-white/80">{stat.totalPeople}</td>
                                                <td className="py-2 px-3 text-center text-[#1d1d1f] dark:text-white/80">
                                                    {stat.cellCount > 0 ? (stat.totalPeople / stat.cellCount).toFixed(1) : '0'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section 2: Distribución por Red */}
            <div className="bg-white dark:bg-[#272729] rounded-xl shadow-sm border border-gray-100 dark:border-[#3a3a3c] p-6">
                <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white mb-1 flex items-center gap-2">
                    <Users size={22} className="text-teal-600 dark:text-teal-400" />
                    Distribución por Red
                </h2>
                <p className="text-sm text-[#86868b] dark:text-[#98989d] mb-6">Células clasificadas por tipo de red</p>

                {networkStats.length === 0 ? (
                    <p className="text-sm text-[#86868b] dark:text-[#98989d] italic">No hay datos disponibles</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {networkStats.map(stat => {
                            const colorMap = {
                                teal: { bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-100 dark:border-teal-800', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300', text: 'text-teal-800 dark:text-teal-200', sub: 'text-teal-600 dark:text-teal-400' },
                                blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', text: 'text-blue-800 dark:text-blue-200', sub: 'text-blue-600 dark:text-blue-400' },
                                pink: { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-100 dark:border-pink-800', badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300', text: 'text-pink-800 dark:text-pink-200', sub: 'text-pink-600 dark:text-pink-400' },
                                purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-100 dark:border-purple-800', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', text: 'text-purple-800 dark:text-purple-200', sub: 'text-purple-600 dark:text-purple-400' },
                                orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-100 dark:border-orange-800', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', text: 'text-orange-800 dark:text-orange-200', sub: 'text-orange-600 dark:text-orange-400' },
                            };
                            const c = colorMap[stat.color] || colorMap.teal;
                            return (
                                <div key={stat.key} className={`${c.bg} p-4 rounded-xl border ${c.border} shadow-sm`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-bold ${c.text} uppercase tracking-wider`}>{stat.label}</span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${c.badge}`}>
                                            {stat.count}
                                        </span>
                                    </div>
                                    <div className="text-2xl font-extrabold text-[#1d1d1f] dark:text-white">{stat.count}</div>
                                    <div className={`text-xs font-medium ${c.sub} mt-1`}>{stat.percent}% del total</div>
                                    {/* Progress bar */}
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-3">
                                        <div className={`${c.badge.split(' ')[0]} h-1.5 rounded-full`} style={{ width: `${stat.percent}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Section 3 & 4: Cartografía and Ayuno side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cartografía Espiritual */}
                <div className="bg-white dark:bg-[#272729] rounded-xl shadow-sm border border-gray-100 dark:border-[#3a3a3c] p-6">
                    <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white mb-1 flex items-center gap-2">
                        <MapPin size={22} className="text-green-600 dark:text-green-400" />
                        Cartografía Espiritual
                    </h2>
                    <p className="text-sm text-[#86868b] dark:text-[#98989d] mb-6">Células con y sin cartografía configurada</p>

                    {cartografiaStats.total === 0 ? (
                        <p className="text-sm text-[#86868b] dark:text-[#98989d] italic">No hay datos disponibles</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] dark:text-white/80">
                                            <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                                            Con cartografía
                                        </span>
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">{cartografiaStats.withUrl}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                        <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${cartografiaStats.total > 0 ? (cartografiaStats.withUrl / cartografiaStats.total) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] dark:text-white/80">
                                            <XCircle size={16} className="text-red-500 dark:text-red-400" />
                                            Sin cartografía
                                        </span>
                                        <span className="text-sm font-bold text-red-500 dark:text-red-400">{cartografiaStats.withoutUrl}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                        <div className="bg-red-400 h-3 rounded-full transition-all" style={{ width: `${cartografiaStats.total > 0 ? (cartografiaStats.withoutUrl / cartografiaStats.total) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-gray-100 dark:border-[#3a3a3c] flex justify-between text-xs text-[#86868b] dark:text-[#98989d]">
                                <span>Total: {cartografiaStats.total} células</span>
                                <span>{cartografiaStats.total > 0 ? ((cartografiaStats.withUrl / cartografiaStats.total) * 100).toFixed(1) : 0}% cobertura</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Día de Ayuno */}
                <div className="bg-white dark:bg-[#272729] rounded-xl shadow-sm border border-gray-100 dark:border-[#3a3a3c] p-6">
                    <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white mb-1 flex items-center gap-2">
                        <Clock size={22} className="text-amber-600 dark:text-amber-400" />
                        Día de Ayuno
                    </h2>
                    <p className="text-sm text-[#86868b] dark:text-[#98989d] mb-6">Células con y sin día de ayuno definido</p>

                    {fastingStats.total === 0 ? (
                        <p className="text-sm text-[#86868b] dark:text-[#98989d] italic">No hay datos disponibles</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] dark:text-white/80">
                                            <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                                            Con día de ayuno
                                        </span>
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">{fastingStats.withFasting}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                        <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${fastingStats.total > 0 ? (fastingStats.withFasting / fastingStats.total) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] dark:text-white/80">
                                            <XCircle size={16} className="text-red-500 dark:text-red-400" />
                                            Sin día de ayuno
                                        </span>
                                        <span className="text-sm font-bold text-red-500 dark:text-red-400">{fastingStats.withoutFasting}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                        <div className="bg-red-400 h-3 rounded-full transition-all" style={{ width: `${fastingStats.total > 0 ? (fastingStats.withoutFasting / fastingStats.total) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-gray-100 dark:border-[#3a3a3c] flex justify-between text-xs text-[#86868b] dark:text-[#98989d]">
                                <span>Total: {fastingStats.total} células</span>
                                <span>{fastingStats.total > 0 ? ((fastingStats.withFasting / fastingStats.total) * 100).toFixed(1) : 0}% configuradas</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
};

export default AttendanceChart;
