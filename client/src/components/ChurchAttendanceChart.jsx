import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import { Calendar, TrendingUp, Users, UserX, ClipboardList, Percent } from 'lucide-react';

const ChurchAttendanceChart = () => {
    const [stats, setStats] = useState([]);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, [startDate, endDate]);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // Verificación de fechas
            if (new Date(startDate) > new Date(endDate)) {
                console.error("La fecha de inicio no puede ser posterior a la fecha de fin.");
                return;
            }

            const response = await api.get('/consolidar/church-attendance/daily-stats', {
                params: { startDate, endDate }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // Ajustar para mostrar la fecha local correctamente
        // Dado que la fecha viene como YYYY-MM-DD, creamos la fecha usando componentes locales para evitar desfase de zona horaria
        const [year, month, day] = dateString.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);

        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'short'
        }).format(localDate);
    };
    const totalPresent = Array.isArray(stats) ? stats.reduce((sum, day) => sum + day.present, 0) : 0;
    const totalAbsent = Array.isArray(stats) ? stats.reduce((sum, day) => sum + day.absent, 0) : 0;
    const totalRecords = totalPresent + totalAbsent;
    const attendanceRate = totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(1) : 0;

    return (
        <div className="space-y-6">
            {/* Filters - Home Style */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Estadísticas de Asistencia
                    </h2>
                    <div className="flex items-center gap-3">
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
            </div>

            {/* Summary Cards - Unified Style */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-100 dark:border-green-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg text-green-600 dark:text-green-300">
                            <Users size={20} />
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
                            <UserX size={20} />
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
                            <ClipboardList size={20} />
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
                            <Percent size={20} />
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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Asistencia Diaria a la Iglesia
                </h2>
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">Cargando estadísticas...</p>
                    </div>
                ) : stats.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No hay datos de asistencia para el rango de fechas seleccionado</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={stats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={formatDate}
                                formatter={(value, name) => [value, name]}
                            />
                            <Legend
                                formatter={(value) => value}
                            />
                            <Bar dataKey="present" fill="#10b981" name="Presentes" />
                            <Bar dataKey="absent" fill="#ef4444" name="Ausentes" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default ChurchAttendanceChart;
