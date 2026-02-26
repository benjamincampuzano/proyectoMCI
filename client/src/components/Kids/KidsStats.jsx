import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from "../../context/AuthContext";
import * as XLSX from 'xlsx';
import { Download, Users, BookOpen, UserCheck, TrendUp } from '@phosphor-icons/react';
import { Button } from '../ui';

const KidsStats = () => {
    const { user, hasAnyRole } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.get('/kids/stats/leader');
            setData(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching stats:', error);
            setLoading(false);
        }
    };

    const downloadExcel = () => {
        const ws = XLSX.utils.json_to_sheet(data.map(item => ({
            'Líder 12': item.leaderName,
            'Total Estudiantes': item.students,
            'Promedio Notas': item.avgGrade,
            'Asistencia Promedio (%)': item.avgAttendance,
            'Aprobados': item.passed
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Estadísticas Kids");
        XLSX.writeFile(wb, "Reporte_Kids_Lideres.xlsx");
    };

    if (loading) return <div className="text-center py-10">Cargando reporte...</div>;

    const totalStudents = data.reduce((acc, curr) => acc + curr.students, 0);
    const totalPassed = data.reduce((acc, curr) => acc + curr.passed, 0);
    const avgGrade = data.length > 0 ? (data.reduce((acc, curr) => acc + parseFloat(curr.avgGrade), 0) / data.length).toFixed(1) : 0;
    const avgAttendance = data.length > 0 ? (data.reduce((acc, curr) => acc + parseFloat(curr.avgAttendance), 0) / data.length).toFixed(1) : 0;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Reporte Estadístico Kids</h2>
                    <p className="text-gray-500 dark:text-gray-400">Desempeño de estudiantes Kids agrupado por Líder de 12</p>
                </div>
                {hasAnyRole(['ADMIN', 'LIDER_DOCE']) && (
                    <Button
                        onClick={downloadExcel}
                        variant="success"
                        icon={Download}
                    >
                        Exportar Excel
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-pink-50 dark:bg-pink-900/20 p-5 rounded-xl border border-pink-100 dark:border-pink-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-pink-100 dark:bg-pink-800 rounded-lg text-pink-600 dark:text-pink-300">
                            <Users size={20} />
                        </div>
                        <span className="text-sm font-bold text-pink-800 dark:text-pink-200 uppercase tracking-tight">Total Kids</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-pink-900 dark:text-white">{totalStudents}</span>
                        <span className="text-xs text-pink-600 dark:text-pink-400 font-medium mt-1">Estudiantes inscritos</span>
                    </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg text-purple-600 dark:text-purple-300">
                            <BookOpen size={20} />
                        </div>
                        <span className="text-sm font-bold text-purple-800 dark:text-purple-200 uppercase tracking-tight">Promedio General</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-purple-900 dark:text-white">{avgGrade}</span>
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">Nota promedio</span>
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-100 dark:border-green-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg text-green-600 dark:text-green-300">
                            <UserCheck size={20} />
                        </div>
                        <span className="text-sm font-bold text-green-800 dark:text-green-200 uppercase tracking-tight">Aprobados</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-green-900 dark:text-white">{totalPassed}</span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">Clases completadas</span>
                    </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                            <TrendUp size={20} />
                        </div>
                        <span className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">% Asistencia</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-blue-900 dark:text-white">{avgAttendance}%</span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Asistencia global</span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white">Estudiantes y Aprobados por Líder</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="leaderName"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                interval={0}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', color: '#fff', border: 'none' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="students" name="Estudiantes" fill="#ec4899" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="passed" name="Aprobados" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Detalle por Red</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Líder 12</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Estudiantes</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Promedio Notas</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Asistencia Promedio</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aprobados</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {data.map((item) => (
                                <tr key={item.leaderName} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {item.leaderName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                                        {item.students}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${parseFloat(item.avgGrade) >= 4.0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                            parseFloat(item.avgGrade) >= 3.0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                            }`}>
                                            {item.avgGrade}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                                        {item.avgAttendance}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">
                                        {item.passed}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default KidsStats;
