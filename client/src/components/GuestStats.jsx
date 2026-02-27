import { useState, useEffect } from 'react';
import { Calendar, Download, Users, TrendUpIcon, UserCheck, SpinnerIcon } from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import api from '../utils/api';

const GuestStats = () => {
    const { user: currentUser } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        // Set default date range (last 30 days)
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchStats();
        }
    }, [startDate, endDate]);

    const fetchStats = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await api.get(`/guests/stats?${params.toString()}`);

            setStats(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar estadísticas');
        } finally {
            setLoading(false);
        }
    };

    const calculateMonthlyAverage = () => {
        if (!stats || !stats.totalGuests || !startDate || !endDate) return 0;
        
        // Calculate the number of days in the date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        // Calculate months (approximately 30.44 days per month)
        const months = daysDiff / 30.44;
        
        if (months === 0) return 0;
        
        return Math.round(stats.totalGuests / months * 10) / 10; // Round to 1 decimal place
    };

    const exportToExcel = () => {

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Summary sheet
        const summaryData = [
            ['Estadísticas de Invitados'],
            ['Período', `${startDate} a ${endDate}`],
            [''],
            ['Total de Invitados', stats.totalGuests],
            ['Nuevos', stats.byStatus.NUEVO || 0],
            ['Llamados', stats.byStatus.CONTACTADO || 0],
            ['Visitados', stats.byStatus.CONSOLIDADO || 0],
            ['Consolidados', stats.byStatus.GANADO || 0],
            [''],
            ['Tasa de Conversión', `${stats.conversionRate}%`],
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumen');

        // Top inviters sheet
        if (stats.topInviters && stats.topInviters.length > 0) {
            const invitersData = [
                ['Top Invitadores'],
                ['Nombre', 'Total Invitados'],
                ...stats.topInviters.map(inv => [inv.name, inv.count])
            ];
            const invitersSheet = XLSX.utils.aoa_to_sheet(invitersData);
            XLSX.utils.book_append_sheet(wb, invitersSheet, 'Invitadores');
        }

        // Save file
        const fileName = `estadisticas_invitados_${startDate}_${endDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const statusColors = {
        NUEVO: '#3B82F6',
        CONTACTADO: '#EAB308',
        CONSOLIDADO: '#A855F7',
        GANADO: '#10B981',
    };

    const statusLabels = {
        NUEVO: 'Nuevo',
        CONTACTADO: 'Llamado',
        CONSOLIDADO: 'Visitado',
        GANADO: 'Consolidado',
    };

    const getStatusChartData = () => {
        if (!stats) return [];
        return Object.entries(stats.byStatus).map(([status, count]) => ({
            name: statusLabels[status] || status,
            value: count,
            color: statusColors[status]
        }));
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Estadísticas de Invitados</h2>

                {error && (
                    <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {/* Date Filters */}
                <div className="flex flex-wrap items-end gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <label htmlFor="startDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Desde
                        </label>
                        <input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="endDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Hasta
                        </label>
                        <input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 text-sm"
                        />
                    </div>
                    {currentUser?.roles?.some(r => ['ADMIN', 'LIDER_DOCE', 'PASTOR'].includes(r)) && (
                        <button
                            onClick={exportToExcel}
                            disabled={!stats || loading}
                            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors text-sm"
                        >
                            <Download size={16} />
                            <span>Exportar</span>
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <SpinnerIcon size={32} className="animate-spin text-blue-500" />
                    </div>
                ) : stats ? (
                    <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                                <Users size={20} />
                            </div>
                            <span className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Total Invitados</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-blue-900 dark:text-white">{stats.totalGuests}</span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Invitados en General</span>
                        </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg text-purple-600 dark:text-purple-300">
                                <TrendUpIcon size={20} />
                            </div>
                            <span className="text-sm font-bold text-purple-800 dark:text-purple-200 uppercase tracking-tight">Promedio Mensual</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-purple-900 dark:text-white">{calculateMonthlyAverage()*100}%</span>
                            </div>
                            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">Promedio de Invitados</span>
                        </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-5 rounded-xl border border-yellow-100 dark:border-yellow-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-lg text-yellow-600 dark:text-yellow-300">
                                <TrendUpIcon size={20} />
                            </div>
                            <span className="text-sm font-bold text-yellow-800 dark:text-yellow-200 uppercase tracking-tight">Nuevos</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-yellow-900 dark:text-white">{stats.byStatus.NUEVO || 0}</span>
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-1">Invitados Nuevos</span>
                        </div>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-300">
                                <UserCheck size={20} />
                            </div>
                            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-tight">Consolidados</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-emerald-900 dark:text-white">{stats.byStatus.GANADO || 0}</span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">Total de Consolidados</span>
                        </div>
                    </div>
                </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Status Distribution */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribución por Estado</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={getStatusChartData()}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {getStatusChartData().map((entry) => (
                                                <Cell key={entry.name} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Top Inviters */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Invitadores</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={stats.topInviters || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                                        <XAxis dataKey="name" stroke="#64748b" />
                                        <YAxis stroke="#64748b" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }}
                                        />
                                        <Bar dataKey="count" fill="#3B82F6" name="Invitados" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Invitations by LIDER_DOCE */}
                            {stats.invitationsByLiderDoce && stats.invitationsByLiderDoce.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700 col-span-1 lg:col-span-2">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invitaciones por Líder 12</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={stats.invitationsByLiderDoce}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                                            <XAxis dataKey="name" stroke="#64748b" />
                                            <YAxis stroke="#64748b" />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }}
                                            />
                                            <Bar dataKey="count" fill="#10B981" name="Invitados" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                        </div>

                        {/* Top Inviters Table */}
                        {stats.topInviters && stats.topInviters.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detalle de Invitadores</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-100 dark:bg-gray-800">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">#</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-200">Nombre</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-200">Total Invitados</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-600">
                                            {stats.topInviters.map((inviter, index) => (
                                                <tr key={inviter.name} className="hover:bg-white dark:hover:bg-gray-600/50 transition-colors">
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-300">{index + 1}</td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white">{inviter.name}</td>
                                                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-semibold">{inviter.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </div >
    );
};

export default GuestStats;
