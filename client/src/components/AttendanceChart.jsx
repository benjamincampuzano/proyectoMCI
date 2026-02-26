import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useAttendance from '../hooks/useAttendance';
import { Calendar, TrendUp } from '@phosphor-icons/react';

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
    } = useAttendance();
    const [isDarkMode, setIsDarkMode] = useState(false);

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

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="cellSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Célula (Opcional)
                        </label>
                        <select
                            id="cellSelect"
                            value={selectedCell}
                            onChange={(e) => setSelectedCell(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="inline w-4 h-4 mr-1" />
                            Fecha Inicio
                        </label>
                        <input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="inline w-4 h-4 mr-1" />
                            Fecha Fin
                        </label>
                        <input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    Tendencia de Asistencia
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
        </div>
    );
};

export default AttendanceChart;
