import { useState, useEffect } from 'react';
import { Users, Phone, House, Calendar, FunnelIcon, ChartBarIcon, PhoneDisconnect, Handshake } from '@phosphor-icons/react';
import api from '../utils/api';

const GuestTrackingStats = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchStats();
    }, [startDate, endDate]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const url = `/consolidar/stats/guest-tracking${params.toString() ? '?' + params.toString() : ''}`;
            const response = await api.get(url);
            setStats(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching guest tracking stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const totals = stats.reduce((acc, curr) => ({
        total: acc.total + curr.total,
        withCall: acc.withCall + curr.withCall,
        withoutCall: acc.withoutCall + curr.withoutCall,
        withVisit: acc.withVisit + curr.withVisit,
        withoutVisit: acc.withoutVisit + curr.withoutVisit,
    }), { total: 0, withCall: 0, withoutCall: 0, withVisit: 0, withoutVisit: 0 });

    if (loading && stats.length === 0) {
        return <div className="text-center py-8">Cargando reporte...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <ChartBarIcon className="w-6 h-6 text-blue-600" />
                        Reporte de Seguimiento
                    </h2>
                    <div className="flex items-center gap-3">
                        <FunnelIcon className="w-5 h-5 text-gray-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                        />
                        <span className="text-gray-400">a</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                        />
                    </div>
                </div>

                {/* Summary Cards - Unified Style */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                                <Users size={20} />
                            </div>
                            <span className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Total Invitados</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-blue-900 dark:text-white">{totals.total}</span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Personas registradas</span>
                        </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-100 dark:border-green-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg text-green-600 dark:text-green-300">
                                <Phone size={20} />
                            </div>
                            <span className="text-sm font-bold text-green-800 dark:text-green-200 uppercase tracking-tight">Con Llamada</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-green-900 dark:text-white">{totals.withCall}</span>
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">Contactados</span>
                        </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-5 rounded-xl border border-orange-100 dark:border-orange-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg text-orange-600 dark:text-orange-300">
                                <Phone size={20} />
                            </div>
                            <span className="text-sm font-bold text-orange-800 dark:text-orange-200 uppercase tracking-tight">Sin Llamada</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-orange-900 dark:text-white">{totals.withoutCall}</span>
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">Pendientes</span>
                        </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg text-purple-600 dark:text-purple-300">
                                <Handshake size={20} />
                            </div>
                            <span className="text-sm font-bold text-purple-800 dark:text-purple-200 uppercase tracking-tight">Con Visita</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-purple-900 dark:text-white">{totals.withVisit}</span>
                            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">Visitados</span>
                        </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-100 dark:border-red-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg text-red-600 dark:text-red-300">
                                <House size={20} />
                            </div>
                            <span className="text-sm font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Sin Visita</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-red-900 dark:text-white">{totals.withoutVisit}</span>
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">Pendientes</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Líder</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Llamadas (Sí/No)</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Visitas (Sí/No)</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">% Efectividad</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {stats.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                    {row.leaderName}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                    {row.total}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">{row.withCall}</span>
                                        <span className="text-gray-300 dark:text-gray-600">/</span>
                                        <span className="text-sm font-bold text-red-400 dark:text-red-500">{row.withoutCall}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{row.withVisit}</span>
                                        <span className="text-gray-300 dark:text-gray-600">/</span>
                                        <span className="text-sm font-bold text-red-400 dark:text-red-500">{row.withoutVisit}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-blue-600 h-full"
                                                style={{ width: `${(row.total > 0 ? ((row.withCall + row.withVisit) / (row.total * 2)) * 100 : 0)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {row.total > 0 ? (((row.withCall + row.withVisit) / (row.total * 2)) * 100).toFixed(1) : 0}%
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GuestTrackingStats;
